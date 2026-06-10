import type { DB } from "./db.ts";
import { clampText, normalizeWhitespace, normalizedHash, now, randomId } from "./util.ts";

export const PULSE_OPTIONS = ["I’m with you", "I’m confused", "Too fast", "Too slow"] as const;
export const PULSE_WINDOW_SECONDS = 300;

const ACTIVE_THEME_STATUSES = ["new", "live", "pinned"] as const;

export interface SessionRow {
  id: string;
  title: string;
  presenter: string | null;
  description: string | null;
  active: number;
  qa_state: string;
  qa_mode: string;
  qa_display_mode: string;
  qa_enabled: number;
  slides_url: string | null;
  short_code: string | null;
  feedback_state: string;
  ai_context: string | null;
}

export interface SubmissionRow {
  id: string;
  session_id: string;
  submitter_key: string;
  raw_text: string;
  normalized_hash: string;
  status: string;
  question_id: string | null;
  submitted_at: number;
  processed_at: number | null;
}

export interface ThemeRow {
  id: string;
  session_id: string;
  display_text: string;
  summary: string | null;
  status: string;
  priority: number;
  support_count: number;
  pinned: number;
  human_override: number;
  source_submission_id: string | null;
  created_at: number;
  updated_at: number;
  answered_at: number | null;
  hidden_at: number | null;
  merged_into_question_id: string | null;
}

export function getSession(db: DB, id: string): SessionRow | null {
  return db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(id);
}

export function listActiveSessions(db: DB): SessionRow[] {
  const rows = db.query<SessionRow, []>("SELECT * FROM sessions WHERE active = 1").all();
  const order = ["smart", "ktc", "checkin", "llms", "coin"];
  return rows.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.title.localeCompare(b.title);
  });
}

// ---------------------------------------------------------------------------
// Submissions

export interface EnsureSubmissionResult {
  ok: boolean;
  error?: string;
  status?: number;
  duplicate?: boolean;
  submission?: SubmissionRow;
}

export function ensureSubmission(
  db: DB,
  session: SessionRow,
  submitterKey: string,
  rawInput: string,
): EnsureSubmissionResult {
  if (!session.qa_enabled || session.qa_state !== "open") {
    return { ok: false, status: 403, error: "Questions are closed right now." };
  }
  const text = normalizeWhitespace(rawInput ?? "");
  if (text.length < 5) {
    return { ok: false, status: 400, error: "Question must be at least 5 characters." };
  }
  if (text.length > 1000) {
    return { ok: false, status: 400, error: "Question must be 1000 characters or fewer." };
  }
  const hash = normalizedHash(text);
  const existing = db
    .query<SubmissionRow, [string, string, string]>(
      `SELECT * FROM qa_question_submissions
       WHERE session_id = ? AND submitter_key = ? AND normalized_hash = ? AND status != 'rejected'
       ORDER BY submitted_at DESC LIMIT 1`,
    )
    .get(session.id, submitterKey, hash);
  if (existing) {
    return { ok: true, duplicate: true, submission: existing };
  }
  const id = randomId("sub", 8);
  const ts = now();
  db.run(
    `INSERT INTO qa_question_submissions (id, session_id, submitter_key, raw_text, normalized_hash, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, session.id, submitterKey, text, hash, ts],
  );
  db.run(
    `INSERT INTO attendee_interactions (session_id, submitter_key, kind, value, body, created_at)
     VALUES (?, ?, 'question', 'submitted', ?, ?)`,
    [session.id, submitterKey, text.slice(0, 500), ts],
  );
  const submission = db
    .query<SubmissionRow, [string]>("SELECT * FROM qa_question_submissions WHERE id = ?")
    .get(id)!;
  return { ok: true, duplicate: false, submission };
}

// ---------------------------------------------------------------------------
// Votes and support

export function voteSum(db: DB, targetId: string): number {
  const row = db
    .query<{ s: number | null }, [string]>(
      "SELECT SUM(value) AS s FROM qa_question_votes WHERE question_id = ?",
    )
    .get(targetId);
  return row?.s ?? 0;
}

export function recomputeThemeSupport(db: DB, themeId: string): number {
  const mapped = db
    .query<{ id: string }, [string]>(
      "SELECT id FROM qa_question_submissions WHERE question_id = ? AND status != 'rejected'",
    )
    .all(themeId);
  let support = mapped.length + voteSum(db, themeId);
  for (const sub of mapped) support += voteSum(db, sub.id);
  db.run("UPDATE qa_questions SET support_count = ?, updated_at = ? WHERE id = ?", [
    support,
    now(),
    themeId,
  ]);
  return support;
}

export interface VoteResult {
  ok: boolean;
  status?: number;
  error?: string;
  target_kind?: "raw" | "theme";
  score?: number;
}

export function recordVote(
  db: DB,
  sessionId: string,
  targetId: string,
  submitterKey: string,
  rawValue: number,
): VoteResult {
  const value = rawValue < 0 ? -1 : 1;
  const sub = db
    .query<SubmissionRow, [string, string]>(
      "SELECT * FROM qa_question_submissions WHERE id = ? AND session_id = ?",
    )
    .get(targetId, sessionId);
  const theme = sub
    ? null
    : db
        .query<ThemeRow, [string, string]>(
          "SELECT * FROM qa_questions WHERE id = ? AND session_id = ?",
        )
        .get(targetId, sessionId);
  if (!sub && !theme) return { ok: false, status: 404, error: "Question not found." };
  const kind: "raw" | "theme" = sub ? "raw" : "theme";
  const ts = now();
  db.run(
    `INSERT INTO qa_question_votes (question_id, submitter_key, value, target_kind, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(question_id, submitter_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [targetId, submitterKey, value, kind, ts, ts],
  );
  db.run(
    `INSERT INTO attendee_interactions (session_id, submitter_key, kind, value, target_id, created_at)
     VALUES (?, ?, 'vote', ?, ?, ?)`,
    [sessionId, submitterKey, String(value), targetId, ts],
  );
  const mappedTheme = sub?.question_id ?? (kind === "theme" ? targetId : null);
  if (mappedTheme) recomputeThemeSupport(db, mappedTheme);
  return { ok: true, target_kind: kind, score: voteSum(db, targetId) };
}

// ---------------------------------------------------------------------------
// Payloads

function publicStatus(sub: SubmissionRow, theme: ThemeRow | null): string {
  if (sub.status === "held") return "needs detail";
  if (theme && theme.status === "answered") return "answered";
  if (sub.status === "promoted" || sub.status === "merged") return "grouped";
  return "queued";
}

export function publicQaPayload(db: DB, sessionId: string) {
  const session = getSession(db, sessionId);
  if (!session) return null;
  const subs = db
    .query<SubmissionRow, [string]>(
      `SELECT * FROM qa_question_submissions
       WHERE session_id = ? AND status != 'rejected'
       ORDER BY submitted_at DESC`,
    )
    .all(sessionId);
  const themesById = new Map<string, ThemeRow>();
  for (const t of db
    .query<ThemeRow, [string]>("SELECT * FROM qa_questions WHERE session_id = ?")
    .all(sessionId)) {
    themesById.set(t.id, t);
  }
  const questions = [];
  for (const sub of subs) {
    const theme = sub.question_id ? themesById.get(sub.question_id) ?? null : null;
    if (theme && (theme.status === "hidden" || theme.status === "rejected")) continue;
    questions.push({
      id: sub.id,
      text: sub.raw_text,
      status: publicStatus(sub, theme),
      score: voteSum(db, sub.id),
      created_at: sub.submitted_at,
      theme_id: sub.question_id,
    });
  }
  // Active/newer submissions before answered items.
  questions.sort((a, b) => {
    const aa = a.status === "answered" ? 1 : 0;
    const ba = b.status === "answered" ? 1 : 0;
    if (aa !== ba) return aa - ba;
    return b.created_at - a.created_at;
  });
  const payload = {
    session: {
      id: session.id,
      title: session.title,
      presenter: session.presenter,
      qa_state: session.qa_state,
      qa_enabled: !!session.qa_enabled,
    },
    questions,
    generated_at: now(),
  };
  publishView(db, sessionId, "public", payload);
  return payload;
}

function themeSourceCount(db: DB, themeId: string): number {
  const row = db
    .query<{ c: number }, [string]>(
      "SELECT COUNT(*) AS c FROM qa_question_submissions WHERE question_id = ? AND status != 'rejected'",
    )
    .get(themeId);
  return row?.c ?? 0;
}

function orderThemes(themes: ThemeRow[]): ThemeRow[] {
  return themes.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.support_count !== b.support_count) return b.support_count - a.support_count;
    return a.created_at - b.created_at;
  });
}

function themeJson(db: DB, t: ThemeRow) {
  return {
    id: t.id,
    text: t.display_text,
    summary: t.summary,
    status: t.status,
    priority: t.priority,
    score: t.support_count,
    source_count: themeSourceCount(db, t.id),
    pinned: !!t.pinned,
    human_override: !!t.human_override,
    created_at: t.created_at,
    answered_at: t.answered_at,
    hidden_at: t.hidden_at,
  };
}

export function presenterQaPayload(db: DB, sessionId: string) {
  const session = getSession(db, sessionId);
  if (!session) return null;
  const all = db
    .query<ThemeRow, [string]>("SELECT * FROM qa_questions WHERE session_id = ?")
    .all(sessionId);
  const active = orderThemes(
    all.filter((t) => (ACTIVE_THEME_STATUSES as readonly string[]).includes(t.status)),
  );
  const answered = all
    .filter((t) => t.status === "answered")
    .sort((a, b) => (b.answered_at ?? 0) - (a.answered_at ?? 0));
  const hidden = all
    .filter((t) => t.status === "hidden")
    .sort((a, b) => (b.hidden_at ?? 0) - (a.hidden_at ?? 0));
  const pendingRow = db
    .query<{ c: number }, [string]>(
      "SELECT COUNT(*) AS c FROM qa_question_submissions WHERE session_id = ? AND status IN ('pending','held')",
    )
    .get(sessionId);
  const payload = {
    session: { id: session.id, title: session.title, presenter: session.presenter, qa_state: session.qa_state },
    themes: active.map((t) => themeJson(db, t)),
    answered: answered.slice(0, 30).map((t) => themeJson(db, t)),
    hidden: hidden.slice(0, 30).map((t) => themeJson(db, t)),
    answered_count: answered.length,
    raw_pending_count: pendingRow?.c ?? 0,
    generated_at: now(),
  };
  publishView(db, sessionId, "presenter", payload);
  return payload;
}

export function pulseSummary(db: DB, sessionId: string) {
  const cutoff = now() - PULSE_WINDOW_SECONDS;
  const rows = db
    .query<{ value: string; c: number }, [string, number]>(
      `SELECT value, COUNT(*) AS c FROM attendee_interactions
       WHERE session_id = ? AND kind = 'pulse' AND created_at >= ?
       GROUP BY value`,
    )
    .all(sessionId, cutoff);
  const counts: Record<string, number> = {};
  for (const opt of PULSE_OPTIONS) counts[opt] = 0;
  let total = 0;
  for (const r of rows) {
    counts[r.value] = (counts[r.value] ?? 0) + r.c;
    total += r.c;
  }
  return { window_seconds: PULSE_WINDOW_SECONDS, total, counts };
}

export function feedbackSummary(db: DB, sessionId: string) {
  const rows = db
    .query<{ rating: number | null; comment: string | null; submitted_at: number }, [string]>(
      "SELECT rating, comment, submitted_at FROM feedback WHERE session_id = ? ORDER BY submitted_at DESC",
    )
    .all(sessionId);
  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let ratedCount = 0;
  let ratingSum = 0;
  for (const r of rows) {
    if (r.rating != null && r.rating >= 1 && r.rating <= 5) {
      distribution[String(r.rating)]++;
      ratedCount++;
      ratingSum += r.rating;
    }
  }
  return {
    total: rows.length,
    rated_count: ratedCount,
    average: ratedCount ? Math.round((ratingSum / ratedCount) * 100) / 100 : null,
    distribution,
    recent_comments: rows
      .filter((r) => r.comment && r.comment.trim().length > 0)
      .slice(0, 20)
      .map((r) => ({ rating: r.rating, comment: r.comment, submitted_at: r.submitted_at })),
    pulse: pulseSummary(db, sessionId),
    generated_at: now(),
  };
}

export function publishView(db: DB, sessionId: string, view: string, payload: unknown) {
  db.run(
    `INSERT INTO qa_published_views (session_id, view, payload, version, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(session_id, view) DO UPDATE SET
       payload = excluded.payload,
       version = qa_published_views.version + 1,
       updated_at = excluded.updated_at`,
    [sessionId, view, JSON.stringify(payload), now()],
  );
}

// ---------------------------------------------------------------------------
// Feedback + interactions

export function recordFeedback(
  db: DB,
  sessionId: string,
  submitterKey: string,
  input: { rating?: unknown; sentiment?: unknown; comment?: unknown; tags?: unknown },
): { feedback_id: string } {
  let rating: number | null = null;
  if (typeof input.rating === "number" && Number.isFinite(input.rating)) {
    rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  }
  const sentiment = clampText(input.sentiment, 100) || null;
  const comment =
    typeof input.comment === "string" && input.comment.trim().length > 0
      ? input.comment.trim().slice(0, 2000)
      : null;
  let tags: string[] = [];
  if (Array.isArray(input.tags)) {
    tags = input.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => clampText(t, 40))
      .filter((t) => t.length > 0)
      .slice(0, 10);
  }
  const id = randomId("fb", 8);
  const ts = now();
  db.run(
    `INSERT INTO feedback (id, session_id, rating, sentiment, comment, tags, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, sessionId, rating, sentiment, comment, JSON.stringify(tags), ts],
  );
  db.run(
    `INSERT INTO attendee_interactions (session_id, submitter_key, kind, value, body, created_at)
     VALUES (?, ?, 'feedback', ?, ?, ?)`,
    [sessionId, submitterKey, rating != null ? String(rating) : null, comment?.slice(0, 500) ?? null, ts],
  );
  return { feedback_id: id };
}

export function recordInteraction(
  db: DB,
  sessionId: string,
  submitterKey: string,
  input: { kind?: unknown; value?: unknown; body?: unknown; target_id?: unknown; metadata?: unknown },
): { ok: boolean; status?: number; error?: string; kind?: string } {
  const kind = clampText(input.kind, 32);
  if (!kind) return { ok: false, status: 400, error: "kind is required" };
  const value = clampText(input.value, 200) || null;
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 2000) : null;
  const targetId = clampText(input.target_id, 100) || null;
  let metadata: string | null = null;
  if (input.metadata !== undefined && input.metadata !== null) {
    metadata = JSON.stringify(input.metadata).slice(0, 2000);
  }
  db.run(
    `INSERT INTO attendee_interactions (session_id, submitter_key, kind, value, body, target_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, submitterKey, kind, value, body, targetId, metadata, now()],
  );
  return { ok: true, kind };
}

// ---------------------------------------------------------------------------
// Theme moderation actions

export const THEME_ACTIONS = ["pin", "unpin", "answer", "hide", "restore"] as const;
export type ThemeAction = (typeof THEME_ACTIONS)[number];

export function applyThemeAction(
  db: DB,
  sessionId: string,
  themeId: string,
  action: string,
  actorScope: string,
): { ok: boolean; status?: number; error?: string; theme?: ThemeRow } {
  if (!(THEME_ACTIONS as readonly string[]).includes(action)) {
    return { ok: false, status: 400, error: `Unsupported action: ${action}` };
  }
  const theme = db
    .query<ThemeRow, [string, string]>(
      "SELECT * FROM qa_questions WHERE id = ? AND session_id = ?",
    )
    .get(themeId, sessionId);
  if (!theme) return { ok: false, status: 404, error: "Theme not found." };
  const ts = now();
  switch (action as ThemeAction) {
    case "pin":
      db.run(
        "UPDATE qa_questions SET status='pinned', pinned=1, human_override=1, updated_at=? WHERE id=?",
        [ts, themeId],
      );
      break;
    case "unpin":
      db.run(
        "UPDATE qa_questions SET status='live', pinned=0, human_override=1, updated_at=? WHERE id=?",
        [ts, themeId],
      );
      break;
    case "answer":
      db.run(
        "UPDATE qa_questions SET status='answered', pinned=0, human_override=1, answered_at=?, updated_at=? WHERE id=?",
        [ts, ts, themeId],
      );
      break;
    case "hide":
      db.run(
        "UPDATE qa_questions SET status='hidden', pinned=0, human_override=1, hidden_at=?, updated_at=? WHERE id=?",
        [ts, ts, themeId],
      );
      break;
    case "restore":
      db.run(
        "UPDATE qa_questions SET status='live', pinned=0, human_override=1, answered_at=NULL, hidden_at=NULL, updated_at=? WHERE id=?",
        [ts, themeId],
      );
      break;
  }
  db.run(
    "INSERT INTO qa_moderator_actions (session_id, question_id, action, actor_scope, created_at) VALUES (?, ?, ?, ?, ?)",
    [sessionId, themeId, action, actorScope, ts],
  );
  const updated = db
    .query<ThemeRow, [string]>("SELECT * FROM qa_questions WHERE id = ?")
    .get(themeId)!;
  return { ok: true, theme: updated };
}
