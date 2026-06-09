import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "./feedback.db";
const WORK_DIR = process.env.QA_WORK_DIR ?? ".qa-agent";
const db = new Database(DB_PATH);
mkdirSync(WORK_DIR, { recursive: true });

function randomId(prefix = "") {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return prefix + hex;
}

function truncate(text: string, max = 180) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}

function normalizedForMerge(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(the|a|an|and|or|to|of|in|for|on|with|is|are)\b/g, "").replace(/\s+/g, " ").trim();
}

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function similarEnough(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen < 10) return false;
  return editDistance(a, b) / maxLen <= 0.18;
}

function recompute(qid: string) {
  const v = db.query<{ c: number }, [string]>("SELECT COALESCE(SUM(value), 0) c FROM qa_question_votes WHERE question_id=?").get(qid)?.c ?? 0;
  const s = db.query<{ c: number }, [string]>("SELECT COUNT(*) c FROM qa_question_submissions WHERE question_id=?").get(qid)?.c ?? 0;
  db.query("UPDATE qa_questions SET support_count=?, updated_at=unixepoch() WHERE id=?").run(Math.max(0, v + s), qid);
}

function promoteOrMerge(sessionId: string, submissionId: string, text: string, priority = 0) {
  const normalized = normalizedForMerge(text);
  const existing = db.query<{ id: string; display_text: string }, [string]>("SELECT id, display_text FROM qa_questions WHERE session_id=? AND status IN ('live','pinned','new') ORDER BY created_at ASC").all(sessionId).find((q) => {
    const n = normalizedForMerge(q.display_text);
    return n && normalized && (similarEnough(n, normalized));
  });
  if (existing) {
    db.query("UPDATE qa_question_submissions SET status='merged', question_id=?, processed_at=unixepoch() WHERE id=? AND session_id=?").run(existing.id, submissionId, sessionId);
    recompute(existing.id);
    return existing.id;
  }
  const qid = randomId("q");
  db.query("INSERT INTO qa_questions (id, session_id, display_text, status, priority, source_submission_id) VALUES (?, ?, ?, 'live', ?, ?)").run(qid, sessionId, truncate(text), priority, submissionId);
  db.query("UPDATE qa_question_submissions SET status='promoted', question_id=?, processed_at=unixepoch() WHERE id=? AND session_id=?").run(qid, submissionId, sessionId);
  recompute(qid);
  return qid;
}

function consolidateExistingQuestions(sessionId: string) {
  const rows = db.query<{ id: string; display_text: string; support_count: number; created_at: number }, [string]>("SELECT id, display_text, support_count, created_at FROM qa_questions WHERE session_id=? AND status IN ('live','pinned','new') ORDER BY pinned DESC, support_count DESC, created_at ASC").all(sessionId);
  let merged = 0;
  for (let i = 0; i < rows.length; i++) {
    const keep = rows[i];
    if (!keep) continue;
    const keepNorm = normalizedForMerge(keep.display_text);
    for (let j = i + 1; j < rows.length; j++) {
      const drop = rows[j];
      if (!drop) continue;
      const dropNorm = normalizedForMerge(drop.display_text);
      if (!keepNorm || !dropNorm || !(similarEnough(keepNorm, dropNorm))) continue;
      db.query("UPDATE qa_question_submissions SET question_id=?, status=CASE WHEN status='promoted' THEN 'merged' ELSE status END WHERE question_id=? AND session_id=?").run(keep.id, drop.id, sessionId);
      db.query("UPDATE qa_question_votes SET question_id=? WHERE question_id=? AND NOT EXISTS (SELECT 1 FROM qa_question_votes v2 WHERE v2.question_id=? AND v2.submitter_key=qa_question_votes.submitter_key)").run(keep.id, drop.id, keep.id);
      db.query("UPDATE qa_questions SET status='merged', merged_into_question_id=?, updated_at=unixepoch() WHERE id=?").run(keep.id, drop.id);
      recompute(keep.id);
      rows[j] = null as any;
      merged++;
    }
  }
  return merged;
}

function fallback(sessionId: string) {
  const pending = db.query<{ id: string; raw_text: string }, [string]>("SELECT id, raw_text FROM qa_question_submissions WHERE session_id=? AND status='pending' ORDER BY submitted_at ASC LIMIT 50").all(sessionId);
  for (const p of pending) promoteOrMerge(sessionId, p.id, p.raw_text);
  consolidateExistingQuestions(sessionId);
  return pending.length;
}

function rawIdsForQuestion(questionId: string) {
  return db.query<{ id: string }, [string]>("SELECT id FROM qa_question_submissions WHERE question_id=? ORDER BY submitted_at ASC").all(questionId).map((r) => r.id);
}

function buildWorkerInput(sessionId: string) {
  const existingRows = db.query<{ id: string; display_text: string; status: string; support_count: number; priority: number; pinned: number; human_override: number; answered_at: number | null; hidden_at: number | null }, [string]>(
    "SELECT id,display_text,status,support_count,priority,pinned,human_override,answered_at,hidden_at FROM qa_questions WHERE session_id=? AND status IN ('new','live','pinned','answered','held','hidden') ORDER BY status='answered' ASC, pinned DESC, support_count DESC, created_at ASC LIMIT 80"
  ).all(sessionId);
  const existingThemes = existingRows.map((q) => ({
    theme_id: q.id,
    question: q.display_text,
    status: q.status,
    answered: q.status === "answered" || !!q.answered_at,
    hidden: q.status === "hidden" || !!q.hidden_at,
    support_count: q.support_count,
    priority: q.priority,
    pinned: !!q.pinned,
    human_override: !!q.human_override,
    raw_submission_ids: rawIdsForQuestion(q.id),
  }));
  return {
    instruction: `You produce the presenter-facing Q&A dashboard projection for a live talk.

Return JSON only with this schema:
{
  "themes": [
    {
      "theme_id": "existing qa_questions.id if updating an existing theme, otherwise omit",
      "question": "one concise presenter-ready question, <=140 chars",
      "summary": "optional one-sentence note about the audience theme",
      "priority": 0-100,
      "state": "active" | "hold" | "answered" | "hidden",
      "raw_submission_ids": ["raw audience qa_question_submissions.id values represented by this theme"],
      "existing_theme_ids": ["existing theme ids this theme supersedes or continues"]
    }
  ]
}

Rules:
- The output is a renderable projection, not database commands.
- Cluster repeated raw submissions into a small number of themes.
- Rephrase typos and vague wording into clear short questions.
- Preserve meaning; do not invent questions that nobody asked.
- If an existing theme is still relevant, reuse its theme_id.
- Answered themes are context only. Do not resurrect answered=true themes as active unless there is genuinely new raw audience demand.
- Hidden/held themes should not be shown unless new raw submissions make a safe active theme.
- Each active theme must list the raw_submission_ids and/or existing_theme_ids it represents; these IDs are how UI actions map back to underlying audience input.
- Use background_context to judge what is in scope for this talk.`,
    session: db.query("SELECT id,title,presenter,description,qa_state,qa_mode FROM sessions WHERE id=?").get(sessionId),
    background_context: db.query<{ ai_context: string }, [string]>("SELECT ai_context FROM sessions WHERE id=?").get(sessionId)?.ai_context ?? "",
    raw_audience_submissions: db.query("SELECT id,raw_text,status,question_id,submitted_at FROM qa_question_submissions WHERE session_id=? AND status IN ('pending','held') ORDER BY submitted_at ASC LIMIT 80").all(sessionId),
    existing_themes: existingThemes,
  };
}

function applyThemeProjection(sessionId: string, out: any) {
  let applied = 0;
  const themes = Array.isArray(out.themes) ? out.themes : [];
  for (const t of themes) {
    const rawIds = Array.isArray(t.raw_submission_ids) ? t.raw_submission_ids.map(String) : [];
    const existingIds = Array.isArray(t.existing_theme_ids) ? t.existing_theme_ids.map(String) : [];
    const state = ["active", "hold", "answered", "hidden"].includes(String(t.state)) ? String(t.state) : "active";
    if (state === "hold") {
      for (const sid of rawIds) db.query("UPDATE qa_question_submissions SET status='held', processed_at=unixepoch() WHERE id=? AND session_id=?").run(sid, sessionId);
      applied++;
      continue;
    }
    const questionText = truncate(String(t.question ?? "").trim(), 180);
    if (!questionText) continue;
    let qid = typeof t.theme_id === "string" ? t.theme_id : existingIds[0];
    const existing = qid ? db.query<{ id: string; status: string }, [string, string]>("SELECT id,status FROM qa_questions WHERE id=? AND session_id=?").get(qid, sessionId) : null;
    const dbStatus = state === "answered" ? "answered" : state === "hidden" ? "hidden" : "live";
    if (existing) {
      db.query("UPDATE qa_questions SET display_text=?, priority=?, status=?, updated_at=unixepoch(), answered_at=CASE WHEN ?='answered' THEN COALESCE(answered_at, unixepoch()) ELSE answered_at END, hidden_at=CASE WHEN ?='hidden' THEN COALESCE(hidden_at, unixepoch()) ELSE hidden_at END WHERE id=? AND session_id=?")
        .run(questionText, Number(t.priority ?? 0), dbStatus, dbStatus, dbStatus, existing.id, sessionId);
      qid = existing.id;
    } else {
      qid = randomId("q");
      db.query("INSERT INTO qa_questions (id, session_id, display_text, status, priority, support_count, source_submission_id, answered_at, hidden_at) VALUES (?, ?, ?, ?, ?, 0, ?, CASE WHEN ?='answered' THEN unixepoch() END, CASE WHEN ?='hidden' THEN unixepoch() END)")
        .run(qid, sessionId, questionText, dbStatus, Number(t.priority ?? 0), rawIds[0] ?? null, dbStatus, dbStatus);
    }
    for (const oldId of existingIds) {
      if (oldId !== qid) {
        db.query("UPDATE qa_question_submissions SET question_id=?, status=CASE WHEN status='promoted' THEN 'merged' ELSE status END WHERE question_id=? AND session_id=?").run(qid, oldId, sessionId);
        db.query("UPDATE qa_questions SET status='merged', merged_into_question_id=?, updated_at=unixepoch() WHERE id=? AND session_id=?").run(qid, oldId, sessionId);
      }
    }
    for (const sid of rawIds) {
      db.query("UPDATE qa_question_submissions SET status=CASE WHEN status='pending' THEN 'promoted' WHEN status='held' THEN 'promoted' ELSE status END, question_id=?, processed_at=unixepoch() WHERE id=? AND session_id=?").run(qid, sid, sessionId);
    }
    recompute(qid);
    applied++;
  }
  return applied;
}

async function run(sessionId: string) {
  const runId = randomId("run");
  const runDir = resolve(join(WORK_DIR, runId));
  mkdirSync(runDir, { recursive: true });
  const inputPath = join(runDir, "input.json");
  const outputPath = join(runDir, "output.json");
  const input = buildWorkerInput(sessionId);
  writeFileSync(inputPath, JSON.stringify(input, null, 2));
  db.query("INSERT INTO qa_agent_runs (id, session_id, status, input_path, output_path) VALUES (?, ?, 'running', ?, ?)").run(runId, sessionId, inputPath, outputPath);

  try {
    const proc = Bun.spawn([
      "codex", "--model", process.env.QA_CODEX_MODEL ?? "gpt-5.5",
      "-c", "model_provider=exe-llm",
      "-c", 'model_providers.exe-llm.name="exe-llm"',
      "-c", 'model_providers.exe-llm.base_url="https://llm.int.exe.xyz/v1"',
      "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", runDir, `Read input.json. Write valid JSON only to output.json.`
    ], { stdout: "pipe", stderr: "pipe", cwd: runDir });
    const code = await proc.exited;
    if (code !== 0 || !existsSync(outputPath)) throw new Error(`codex unavailable or failed with exit ${code}`);
    const out = JSON.parse(readFileSync(outputPath, "utf8"));
    const applied = applyThemeProjection(sessionId, out);
    const n = fallback(sessionId);
    const merged = consolidateExistingQuestions(sessionId);
    db.query("UPDATE qa_agent_runs SET status='applied', finished_at=unixepoch(), summary=? WHERE id=?").run(`rendered ${applied} themes; fallback handled ${n} unprojected submissions; consolidated ${merged} duplicate themes`, runId);
  } catch (err) {
    const n = fallback(sessionId);
    db.query("UPDATE qa_agent_runs SET status='fallback', finished_at=unixepoch(), error=?, summary=? WHERE id=?").run(String(err), `codex unavailable; fallback promoted ${n}`, runId);
  }
}

const sessionId = Bun.argv[2];
if (!sessionId) throw new Error("usage: bun run src/qa-worker.ts <session_id>");
await run(sessionId);
