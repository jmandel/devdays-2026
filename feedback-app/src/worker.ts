import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DB } from "./db.ts";
import {
  getSession,
  recomputeThemeSupport,
  type SubmissionRow,
  type ThemeRow,
} from "./qa.ts";
import { normalizeWhitespace, normalizedHash, now, randomId, similarity } from "./util.ts";

const MERGE_THRESHOLD = 0.55;
const CONSOLIDATE_THRESHOLD = 0.85;
const DEBOUNCE_MS = 900;

const AGENT_PROMPT = `You are the Q&A synthesis worker for a live conference talk.
Read ./input.json in the current directory. It contains session metadata, background
context, raw audience submissions, and existing themes.

Write ./output.json containing ONLY valid JSON matching this schema:
{
  "themes": [
    {
      "theme_id": "optional existing theme id to update",
      "question": "concise presenter-ready question",
      "summary": "optional note",
      "priority": 0,
      "state": "active" | "hold" | "answered" | "hidden",
      "raw_submission_ids": ["sub_..."],
      "existing_theme_ids": ["q_..."]
    }
  ]
}

Rules:
- Cluster repeated raw submissions into one theme.
- Rephrase typos/vague wording into clear questions; do not invent audience intent.
- Preserve answered themes as context; do not resurrect them unless new raw demand exists.
- Each active theme must map to raw submission ids and/or existing theme ids.
- Use "hold" for submissions too vague to act on (they will show as "needs detail").
- Use "hidden" only for abusive/off-topic content.
Write output.json and nothing else. Do not modify input.json.`;

// ---------------------------------------------------------------------------
// Scheduling with debounce + in-flight cancellation

interface Inflight {
  proc: ReturnType<typeof Bun.spawn> | null;
  runId: string;
  cancelled: boolean;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const inflight = new Map<string, Inflight>();
let broadcastHook: ((sessionId: string) => void) | null = null;

export function setBroadcastHook(fn: (sessionId: string) => void) {
  broadcastHook = fn;
}

export function scheduleQaProcessing(db: DB, sessionId: string, debounceMs = DEBOUNCE_MS) {
  const existingTimer = timers.get(sessionId);
  if (existingTimer) clearTimeout(existingTimer);
  // A newer submission cancels any in-flight worker for this session.
  const running = inflight.get(sessionId);
  if (running && running.proc) {
    running.cancelled = true;
    try {
      running.proc.kill();
    } catch {}
  }
  timers.set(
    sessionId,
    setTimeout(() => {
      timers.delete(sessionId);
      runQaProcessing(db, sessionId).catch((err) => {
        console.error(`[qa-worker] processing failed for ${sessionId}:`, err);
      });
    }, debounceMs),
  );
}

// ---------------------------------------------------------------------------
// Worker input

export function buildWorkerInput(db: DB, sessionId: string) {
  const session = getSession(db, sessionId);
  if (!session) return null;
  const raw = db
    .query<SubmissionRow, [string]>(
      `SELECT * FROM qa_question_submissions
       WHERE session_id = ? AND status IN ('pending', 'held')
       ORDER BY submitted_at ASC`,
    )
    .all(sessionId);
  const themes = db
    .query<ThemeRow, [string]>(
      "SELECT * FROM qa_questions WHERE session_id = ? AND status != 'merged'",
    )
    .all(sessionId);
  return {
    instructions: AGENT_PROMPT,
    session: {
      id: session.id,
      title: session.title,
      presenter: session.presenter,
      description: session.description,
    },
    background_context: session.ai_context ?? "",
    raw_submissions: raw.map((s) => ({
      id: s.id,
      text: s.raw_text,
      status: s.status,
      submitted_at: s.submitted_at,
    })),
    existing_themes: themes.map((t) => ({
      id: t.id,
      question: t.display_text,
      status: t.status,
      support_count: t.support_count,
      priority: t.priority,
      pinned: !!t.pinned,
      human_override: !!t.human_override,
      answered: t.status === "answered",
      hidden: t.status === "hidden",
      raw_ids: db
        .query<{ id: string }, [string]>(
          "SELECT id FROM qa_question_submissions WHERE question_id = ?",
        )
        .all(t.id)
        .map((r) => r.id),
    })),
  };
}

// ---------------------------------------------------------------------------
// Projection application (AI output -> database)

export interface ProjectionTheme {
  theme_id?: string;
  question?: string;
  summary?: string;
  priority?: number;
  state?: string;
  raw_submission_ids?: string[];
  existing_theme_ids?: string[];
}

function cleanThemeText(text: string): string {
  let t = normalizeWhitespace(text).slice(0, 300);
  if (t.length > 0) t = t[0]!.toUpperCase() + t.slice(1);
  return t;
}

function createTheme(
  db: DB,
  sessionId: string,
  text: string,
  opts: { summary?: string | null; priority?: number; sourceSubmissionId?: string | null } = {},
): string {
  const id = randomId("q", 8);
  const ts = now();
  db.run(
    `INSERT INTO qa_questions (id, session_id, display_text, summary, status, priority, source_submission_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'live', ?, ?, ?, ?)`,
    [id, sessionId, cleanThemeText(text), opts.summary ?? null, opts.priority ?? 0, opts.sourceSubmissionId ?? null, ts, ts],
  );
  return id;
}

function mapSubmission(db: DB, subId: string, themeId: string, status: "promoted" | "merged" | "held") {
  db.run(
    "UPDATE qa_question_submissions SET status = ?, question_id = ?, processed_at = ? WHERE id = ?",
    [status, status === "held" ? null : themeId, now(), subId],
  );
}

function mergeThemeInto(db: DB, sessionId: string, loserId: string, winnerId: string) {
  if (loserId === winnerId) return;
  const ts = now();
  db.run(
    "UPDATE qa_question_submissions SET question_id = ? WHERE question_id = ? AND session_id = ?",
    [winnerId, loserId, sessionId],
  );
  // Re-target votes; drop ones that would collide with an existing vote on the winner.
  const votes = db
    .query<{ id: number; submitter_key: string }, [string]>(
      "SELECT id, submitter_key FROM qa_question_votes WHERE question_id = ?",
    )
    .all(loserId);
  for (const v of votes) {
    const collision = db
      .query<{ id: number }, [string, string]>(
        "SELECT id FROM qa_question_votes WHERE question_id = ? AND submitter_key = ?",
      )
      .get(winnerId, v.submitter_key);
    if (collision) {
      db.run("DELETE FROM qa_question_votes WHERE id = ?", [v.id]);
    } else {
      db.run("UPDATE qa_question_votes SET question_id = ?, updated_at = ? WHERE id = ?", [
        winnerId,
        ts,
        v.id,
      ]);
    }
  }
  db.run(
    "UPDATE qa_questions SET status='merged', merged_into_question_id=?, pinned=0, updated_at=? WHERE id=?",
    [winnerId, ts, loserId],
  );
  recomputeThemeSupport(db, winnerId);
}

function recordDecision(db: DB, runId: string | null, sessionId: string, kind: string, detail: unknown) {
  db.run(
    "INSERT INTO qa_agent_decisions (run_id, session_id, kind, detail, created_at) VALUES (?, ?, ?, ?, ?)",
    [runId, sessionId, kind, JSON.stringify(detail), now()],
  );
}

export function applyProjection(
  db: DB,
  sessionId: string,
  projection: { themes?: ProjectionTheme[] },
  runId: string | null = null,
): { applied: number; held: number; answered: number; hidden: number } {
  const stats = { applied: 0, held: 0, answered: 0, hidden: 0 };
  const themes = Array.isArray(projection.themes) ? projection.themes.slice(0, 100) : [];
  const ts = now();

  for (const entry of themes) {
    const state = entry.state ?? "active";
    const rawIds = (entry.raw_submission_ids ?? []).filter((id) => typeof id === "string");
    const existingIds = (entry.existing_theme_ids ?? []).filter((id) => typeof id === "string");

    const validRaw = rawIds.filter((id) =>
      db
        .query<{ id: string }, [string, string]>(
          "SELECT id FROM qa_question_submissions WHERE id = ? AND session_id = ?",
        )
        .get(id, sessionId),
    );

    if (state === "hold") {
      for (const id of validRaw) mapSubmission(db, id, "", "held");
      stats.held += validRaw.length;
      recordDecision(db, runId, sessionId, "hold", { raw: validRaw });
      continue;
    }

    // Resolve the primary theme this entry refers to.
    let primaryId: string | null = null;
    const lookup = (id: string) =>
      db
        .query<ThemeRow, [string, string]>(
          "SELECT * FROM qa_questions WHERE id = ? AND session_id = ?",
        )
        .get(id, sessionId);
    if (entry.theme_id && lookup(entry.theme_id)) primaryId = entry.theme_id;
    if (!primaryId) {
      for (const id of existingIds) {
        if (lookup(id)) {
          primaryId = id;
          break;
        }
      }
    }

    if (state === "answered" || state === "hidden") {
      if (!primaryId) continue;
      if (state === "answered") {
        db.run(
          "UPDATE qa_questions SET status='answered', pinned=0, answered_at=?, updated_at=? WHERE id=? AND human_override=0",
          [ts, ts, primaryId],
        );
        stats.answered++;
      } else {
        db.run(
          "UPDATE qa_questions SET status='hidden', pinned=0, hidden_at=?, updated_at=? WHERE id=? AND human_override=0",
          [ts, ts, primaryId],
        );
        stats.hidden++;
      }
      for (const id of validRaw) mapSubmission(db, id, "merged", "merged");
      recordDecision(db, runId, sessionId, state, { theme: primaryId, raw: validRaw });
      continue;
    }

    // state === 'active'
    const question = typeof entry.question === "string" ? normalizeWhitespace(entry.question) : "";
    if (!primaryId && question.length === 0) continue;
    if (!primaryId && validRaw.length === 0 && existingIds.length === 0) continue;

    if (!primaryId) {
      primaryId = createTheme(db, sessionId, question, {
        summary: entry.summary ?? null,
        priority: typeof entry.priority === "number" ? entry.priority : 0,
        sourceSubmissionId: validRaw[0] ?? null,
      });
    } else {
      const existing = lookup(primaryId)!;
      const newDemand = validRaw.length > 0;
      // Respect operator overrides; only revive answered/hidden themes on new demand.
      const revive =
        (existing.status === "answered" || existing.status === "hidden") &&
        newDemand &&
        !existing.human_override;
      const keepStatus =
        existing.status === "pinned"
          ? "pinned"
          : revive || ["new", "live"].includes(existing.status)
            ? "live"
            : existing.status;
      db.run(
        `UPDATE qa_questions SET display_text = ?, summary = COALESCE(?, summary), priority = ?, status = ?,
         answered_at = CASE WHEN ? = 'live' THEN NULL ELSE answered_at END,
         hidden_at = CASE WHEN ? = 'live' THEN NULL ELSE hidden_at END,
         updated_at = ? WHERE id = ?`,
        [
          question.length > 0 ? cleanThemeText(question) : existing.display_text,
          entry.summary ?? null,
          typeof entry.priority === "number" ? entry.priority : existing.priority,
          keepStatus,
          revive ? "live" : "",
          revive ? "live" : "",
          ts,
          primaryId,
        ],
      );
    }

    for (const id of existingIds) {
      if (id !== primaryId && lookup(id)) mergeThemeInto(db, sessionId, id, primaryId);
    }
    for (let i = 0; i < validRaw.length; i++) {
      const subId = validRaw[i]!;
      const sub = db
        .query<SubmissionRow, [string]>("SELECT * FROM qa_question_submissions WHERE id = ?")
        .get(subId)!;
      const status = sub.id === lookup(primaryId)?.source_submission_id ? "promoted" : "merged";
      mapSubmission(db, subId, primaryId, status as "promoted" | "merged");
    }
    recomputeThemeSupport(db, primaryId);
    stats.applied++;
    recordDecision(db, runId, sessionId, "active", { theme: primaryId, raw: validRaw });
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Deterministic fallback

export function consolidateThemes(db: DB, sessionId: string, runId: string | null = null): number {
  const active = db
    .query<ThemeRow, [string]>(
      "SELECT * FROM qa_questions WHERE session_id = ? AND status IN ('new','live','pinned') ORDER BY created_at ASC",
    )
    .all(sessionId);
  let merged = 0;
  const alive = new Map(active.map((t) => [t.id, t]));
  for (let i = 0; i < active.length; i++) {
    const winner = active[i]!;
    if (!alive.has(winner.id)) continue;
    for (let j = i + 1; j < active.length; j++) {
      const loser = active[j]!;
      if (!alive.has(loser.id)) continue;
      if (loser.human_override || loser.pinned) continue;
      const exact =
        normalizedHash(winner.display_text) === normalizedHash(loser.display_text);
      if (exact || similarity(winner.display_text, loser.display_text) >= CONSOLIDATE_THRESHOLD) {
        mergeThemeInto(db, sessionId, loser.id, winner.id);
        alive.delete(loser.id);
        merged++;
        recordDecision(db, runId, sessionId, "consolidate", { winner: winner.id, loser: loser.id });
      }
    }
  }
  return merged;
}

export function fallbackProcess(
  db: DB,
  sessionId: string,
  runId: string | null = null,
): { promoted: number; merged: number; consolidated: number } {
  const pending = db
    .query<SubmissionRow, [string]>(
      "SELECT * FROM qa_question_submissions WHERE session_id = ? AND status = 'pending' ORDER BY submitted_at ASC",
    )
    .all(sessionId);
  let promoted = 0;
  let merged = 0;
  const touched = new Set<string>();

  for (const sub of pending) {
    const activeThemes = db
      .query<ThemeRow, [string]>(
        "SELECT * FROM qa_questions WHERE session_id = ? AND status IN ('new','live','pinned')",
      )
      .all(sessionId);
    let best: ThemeRow | null = null;
    let bestScore = 0;
    for (const theme of activeThemes) {
      const score = similarity(sub.raw_text, theme.display_text);
      if (score > bestScore) {
        bestScore = score;
        best = theme;
      }
    }
    if (best && bestScore >= MERGE_THRESHOLD) {
      mapSubmission(db, sub.id, best.id, "merged");
      touched.add(best.id);
      merged++;
      recordDecision(db, runId, sessionId, "fallback-merge", {
        sub: sub.id,
        theme: best.id,
        score: bestScore,
      });
    } else {
      const themeId = createTheme(db, sessionId, sub.raw_text, {
        sourceSubmissionId: sub.id,
      });
      mapSubmission(db, sub.id, themeId, "promoted");
      touched.add(themeId);
      promoted++;
      recordDecision(db, runId, sessionId, "fallback-promote", { sub: sub.id, theme: themeId });
    }
  }
  const consolidated = consolidateThemes(db, sessionId, runId);
  for (const id of touched) {
    const stillThere = db
      .query<{ status: string }, [string]>("SELECT status FROM qa_questions WHERE id = ?")
      .get(id);
    if (stillThere && stillThere.status !== "merged") recomputeThemeSupport(db, id);
  }
  return { promoted, merged, consolidated };
}

// ---------------------------------------------------------------------------
// Run orchestration: codex when available, deterministic fallback otherwise

function agentDir(): string {
  return resolve(process.env.QA_AGENT_DIR ?? join(process.cwd(), ".qa-agent"));
}

function agentAvailable(): boolean {
  if (process.env.QA_AGENT_DISABLE === "1") return false;
  const bin = process.env.QA_AGENT_BIN ?? "codex";
  return Bun.which(bin) !== null;
}

/** Parse QA_AGENT_EXTRA_ARGS: shell-like splitting that keeps `-c key=val` as two args. */
function parseExtraArgs(raw: string): string[] {
  const args: string[] = [];
  const re = /(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    args.push(m[1] ?? m[2] ?? m[3]);
  }
  return args;
}

export async function runQaProcessing(db: DB, sessionId: string): Promise<string | null> {
  const input = buildWorkerInput(db, sessionId);
  if (!input) return null;

  const runId = randomId("run", 6);
  const runDir = join(agentDir(), runId);
  mkdirSync(runDir, { recursive: true });
  const inputPath = join(runDir, "input.json");
  const outputPath = join(runDir, "output.json");
  await Bun.write(inputPath, JSON.stringify(input, null, 2));

  db.run(
    "INSERT INTO qa_agent_runs (id, session_id, status, input_path, output_path, started_at) VALUES (?, ?, 'running', ?, ?, ?)",
    [runId, sessionId, inputPath, outputPath, now()],
  );

  const state: Inflight = { proc: null, runId, cancelled: false };
  inflight.set(sessionId, state);

  let status = "fallback";
  let error: string | null = null;
  let summary = "";

  try {
    if (input.raw_submissions.length === 0) {
      status = "applied";
      summary = "No pending submissions; nothing to do.";
    } else if (agentAvailable()) {
      const bin = process.env.QA_AGENT_BIN ?? "codex";
      const timeoutMs = Number(process.env.QA_AGENT_TIMEOUT_MS ?? 90_000);
      const modelArgs = process.env.QA_AGENT_MODEL ? ["--model", process.env.QA_AGENT_MODEL] : [];
      const extraArgs = parseExtraArgs(process.env.QA_AGENT_EXTRA_ARGS ?? "");
      const proc = Bun.spawn(
        [bin, ...modelArgs, ...extraArgs, "exec", "--sandbox", "workspace-write", "--cd", runDir, "--skip-git-repo-check", AGENT_PROMPT],
        {
          cwd: runDir,
          stdout: Bun.file(join(runDir, "agent-stdout.log")),
          stderr: Bun.file(join(runDir, "agent-stderr.log")),
          env: { ...process.env },
        },
      );
      state.proc = proc;
      const timer = setTimeout(() => {
        try {
          proc.kill();
        } catch {}
      }, timeoutMs);
      await proc.exited;
      clearTimeout(timer);
      state.proc = null;

      if (state.cancelled) {
        db.run("UPDATE qa_agent_runs SET status='canceled', finished_at=? WHERE id=?", [now(), runId]);
        return runId;
      }

      const outFile = Bun.file(outputPath);
      if (await outFile.exists()) {
        try {
          const projection = JSON.parse(await outFile.text());
          if (projection && Array.isArray(projection.themes)) {
            const stats = applyProjection(db, sessionId, projection, runId);
            const leftovers = fallbackProcess(db, sessionId, runId);
            status = "applied";
            summary = `AI projection: ${stats.applied} active, ${stats.held} held, ${stats.answered} answered, ${stats.hidden} hidden. Fallback for leftovers: ${leftovers.promoted} promoted, ${leftovers.merged} merged.`;
          } else {
            error = "output.json missing themes array";
          }
        } catch (e) {
          error = `output.json parse failure: ${e instanceof Error ? e.message : String(e)}`;
        }
      } else {
        error = `agent exited (code ${proc.exitCode}) without writing output.json`;
      }
    } else {
      error = "AI agent unavailable";
    }

    if (status !== "applied") {
      const stats = fallbackProcess(db, sessionId, runId);
      status = "fallback";
      summary = `Deterministic fallback: ${stats.promoted} promoted, ${stats.merged} merged, ${stats.consolidated} consolidated.`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    try {
      const stats = fallbackProcess(db, sessionId, runId);
      status = "fallback";
      summary = `Fallback after error: ${stats.promoted} promoted, ${stats.merged} merged.`;
    } catch (e2) {
      status = "error";
      summary = "Processing failed entirely.";
      error = `${error}; fallback also failed: ${e2 instanceof Error ? e2.message : String(e2)}`;
    }
  } finally {
    if (inflight.get(sessionId) === state) inflight.delete(sessionId);
  }

  db.run("UPDATE qa_agent_runs SET status=?, error=?, summary=?, finished_at=? WHERE id=?", [
    status,
    error,
    summary,
    now(),
    runId,
  ]);
  broadcastHook?.(sessionId);
  return runId;
}

export function latestRun(db: DB, sessionId: string) {
  return db
    .query<
      {
        id: string;
        session_id: string;
        status: string;
        input_path: string | null;
        output_path: string | null;
        error: string | null;
        summary: string | null;
        started_at: number;
        finished_at: number | null;
      },
      [string]
    >("SELECT * FROM qa_agent_runs WHERE session_id = ? ORDER BY started_at DESC, id DESC LIMIT 1")
    .get(sessionId);
}
