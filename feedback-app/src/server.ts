import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import appHtml from "./ui/index.html";

// ─── Database setup ───────────────────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH ?? "./feedback.db";
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    presenter   TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id           TEXT PRIMARY KEY,
    session_id   TEXT NOT NULL REFERENCES sessions(id),
    rating       INTEGER,
    sentiment    TEXT,
    comment      TEXT,
    tags         TEXT,
    submitted_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL CHECK(scope IN ('global_admin', 'room_admin')),
    session_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER,
    revoked_at INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_scope_session ON auth_sessions(scope, session_id);

  CREATE TABLE IF NOT EXISTS room_capabilities (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT 'operator',
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER,
    claimed_at INTEGER,
    last_used_at INTEGER,
    revoked_at INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_room_capabilities_token_hash ON room_capabilities(token_hash);
  CREATE INDEX IF NOT EXISTS idx_room_capabilities_session_active ON room_capabilities(session_id, active);
`);


const AUTH_COOKIE = "df_auth";
const ADMIN_KEY = process.env.ADMIN_KEY || "devdays-admin";
const ADMIN_KEY_IS_DEV_DEFAULT = !process.env.ADMIN_KEY;
const GLOBAL_ADMIN_MAX_AGE = 60 * 60 * 10;
const ROOM_ADMIN_MAX_AGE = 60 * 60 * 24;
if (ADMIN_KEY_IS_DEV_DEFAULT) {
  console.warn("⚠️  ADMIN_KEY not set; dev fallback key is 'devdays-admin'. Set ADMIN_KEY in production.");
}

function publicBaseUrl() {
  return (process.env.BASE_URL || "https://devdays-feedback.exe.xyz").replace(/\/$/, "");
}

function sessionPublicUrl(sessionId: string) {
  return `${publicBaseUrl()}/t/${sessionId}`;
}


function addColumnIfMissing(table: string, column: string, ddl: string) {
  const cols = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

// ─── Inline MVP migrations: Live Q&A ──────────────────────────────────────────

addColumnIfMissing("sessions", "qa_state", "qa_state TEXT NOT NULL DEFAULT 'open'");
addColumnIfMissing("sessions", "qa_mode", "qa_mode TEXT NOT NULL DEFAULT 'moderated'");
addColumnIfMissing("sessions", "qa_display_mode", "qa_display_mode TEXT NOT NULL DEFAULT 'queue'");
addColumnIfMissing("sessions", "qa_enabled", "qa_enabled INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("sessions", "slides_url", "slides_url TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("sessions", "short_code", "short_code TEXT");
addColumnIfMissing("sessions", "feedback_state", "feedback_state TEXT NOT NULL DEFAULT 'open'");
addColumnIfMissing("sessions", "ai_context", "ai_context TEXT NOT NULL DEFAULT ''");

db.exec(`
  CREATE TABLE IF NOT EXISTS qa_questions (
    id                    TEXT PRIMARY KEY,
    session_id            TEXT NOT NULL REFERENCES sessions(id),
    display_text          TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'live',
    priority              INTEGER NOT NULL DEFAULT 0,
    support_count         INTEGER NOT NULL DEFAULT 1,
    pinned                INTEGER NOT NULL DEFAULT 0,
    human_override        INTEGER NOT NULL DEFAULT 0,
    source_submission_id  TEXT,
    created_at            INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at            INTEGER NOT NULL DEFAULT (unixepoch()),
    answered_at           INTEGER,
    hidden_at             INTEGER,
    merged_into_question_id TEXT
  );

  CREATE TABLE IF NOT EXISTS qa_question_submissions (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    submitter_key   TEXT NOT NULL,
    raw_text        TEXT NOT NULL,
    normalized_hash TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    question_id     TEXT,
    submitted_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    processed_at    INTEGER
  );

  CREATE TABLE IF NOT EXISTS qa_question_votes (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES sessions(id),
    question_id   TEXT NOT NULL REFERENCES qa_questions(id),
    submitter_key TEXT NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(question_id, submitter_key)
  );

  CREATE TABLE IF NOT EXISTS qa_agent_runs (
    id             TEXT PRIMARY KEY,
    session_id     TEXT NOT NULL REFERENCES sessions(id),
    status         TEXT NOT NULL,
    started_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    finished_at    INTEGER,
    input_path     TEXT,
    output_path    TEXT,
    error          TEXT,
    summary        TEXT
  );

  CREATE TABLE IF NOT EXISTS qa_agent_decisions (
    id            TEXT PRIMARY KEY,
    run_id        TEXT NOT NULL REFERENCES qa_agent_runs(id),
    session_id    TEXT NOT NULL REFERENCES sessions(id),
    decision_type TEXT NOT NULL,
    question_id   TEXT,
    submission_id TEXT,
    payload_json  TEXT NOT NULL DEFAULT '{}',
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS qa_published_views (
    session_id    TEXT NOT NULL,
    view_name     TEXT NOT NULL,
    payload_json  TEXT NOT NULL,
    version       INTEGER NOT NULL DEFAULT 1,
    generated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY(session_id, view_name)
  );

  CREATE TABLE IF NOT EXISTS qa_moderator_actions (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES sessions(id),
    question_id   TEXT,
    action        TEXT NOT NULL,
    payload_json  TEXT NOT NULL DEFAULT '{}',
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_qa_questions_session_status ON qa_questions(session_id, status, pinned, priority);
  CREATE INDEX IF NOT EXISTS idx_qa_submissions_session_status ON qa_question_submissions(session_id, status, submitted_at);
`);
addColumnIfMissing("qa_question_votes", "value", "value INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("qa_question_votes", "target_kind", "target_kind TEXT NOT NULL DEFAULT 'theme'");

db.exec(`
  CREATE TABLE IF NOT EXISTS attendee_interactions (
    id             TEXT PRIMARY KEY,
    session_id     TEXT NOT NULL REFERENCES sessions(id),
    attendee_key   TEXT NOT NULL,
    kind           TEXT NOT NULL,
    value          TEXT,
    body           TEXT,
    target_id      TEXT,
    metadata_json  TEXT NOT NULL DEFAULT '{}',
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_attendee_interactions_session_created ON attendee_interactions(session_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_attendee_interactions_kind ON attendee_interactions(session_id, kind, created_at);
`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomId(prefix = "") {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return prefix + hex;
}

function randomToken(prefix = "") {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = Buffer.from(bytes).toString("base64url");
  return prefix + b64;
}

async function sha256RawHex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function appShell() { return appHtml as unknown as Response; }

function html(content: string, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function redirect(location: string, status = 303, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers: { Location: location, ...headers } });
}

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function escHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


type AuthScope = "global_admin" | "room_admin";
type AuthContext = { id: string; scope: AuthScope; session_id: string | null; expires_at: number } | null;

type QaState = "disabled" | "open" | "paused" | "closed" | "archived";
type QaQuestionStatus = "new" | "live" | "pinned" | "answered" | "held" | "hidden" | "rejected" | "merged";

type SessionRow = {
  id: string; title: string; description: string; presenter: string; created_at: number; active: number;
  qa_state: QaState; qa_mode: string; qa_display_mode: string; qa_enabled: number; slides_url: string; short_code: string | null; feedback_state: string; ai_context: string;
};

type QaQuestionRow = {
  id: string; session_id: string; display_text: string; status: QaQuestionStatus; priority: number;
  support_count: number; pinned: number; human_override: number; created_at: number; updated_at: number;
  answered_at: number | null; hidden_at: number | null;
};

function normalizeQuestionText(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 1000);
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.toLowerCase()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function truncateDisplay(text: string, max = 180) {
  const clean = normalizeQuestionText(text);
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function getSubmitterKey(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const found = cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith("qa_submitter_key="));
  const existing = found?.split("=")[1];
  if (existing && /^[a-zA-Z0-9_-]{12,80}$/.test(existing)) return { key: existing, isNew: false };
  return { key: randomId("qa_") + randomId(), isNew: true };
}

function cookieHeader(key: string) {
  return `qa_submitter_key=${key}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function recordInteraction(sessionId: string, attendeeKey: string, kind: string, value: unknown = null, body: string | null = null, targetId: string | null = null, metadata: unknown = {}) {
  db.query("INSERT INTO attendee_interactions (id, session_id, attendee_key, kind, value, body, target_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(randomId("i"), sessionId, attendeeKey, kind, value == null ? null : String(value), body, targetId, JSON.stringify(metadata ?? {}));
}

function parseCookie(req: Request, name: string) {
  const cookie = req.headers.get("cookie") ?? "";
  const found = cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith(name + "="));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function authCookieHeader(token: string, maxAge: number) {
  const secure = publicBaseUrl().startsWith("https://") ? "; Secure" : "";
  return `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function clearAuthCookieHeader() {
  const secure = publicBaseUrl().startsWith("https://") ? "; Secure" : "";
  return `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

async function getAuth(req: Request): Promise<AuthContext> {
  const token = parseCookie(req, AUTH_COOKIE);
  if (!token) return null;
  const hash = await sha256RawHex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = db.query<{ id: string; scope: AuthScope; session_id: string | null; expires_at: number }, [string, number]>(
    "SELECT id, scope, session_id, expires_at FROM auth_sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?"
  ).get(hash, now);
  if (!row) return null;
  db.query("UPDATE auth_sessions SET last_seen_at = unixepoch() WHERE id = ?").run(row.id);
  return row;
}

function canManageRoom(auth: AuthContext, sessionId: string) {
  return !!auth && (auth.scope === "global_admin" || (auth.scope === "room_admin" && auth.session_id === sessionId));
}

async function createAuthSession(scope: AuthScope, sessionId: string | null, maxAge: number) {
  const token = randomToken("auth_");
  const tokenHash = await sha256RawHex(token);
  const expiresAt = Math.floor(Date.now() / 1000) + maxAge;
  db.query("INSERT INTO auth_sessions (id, token_hash, scope, session_id, expires_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomId("auth"), tokenHash, scope, sessionId, expiresAt);
  return { token, cookie: authCookieHeader(token, maxAge) };
}

async function createRoomCapability(sessionId: string) {
  db.query("UPDATE room_capabilities SET active = 0, revoked_at = unixepoch() WHERE session_id = ? AND active = 1").run(sessionId);
  const token = randomToken("roomcap_");
  const tokenHash = await sha256RawHex(token);
  db.query("INSERT INTO room_capabilities (id, session_id, token_hash) VALUES (?, ?, ?)")
    .run(randomId("cap"), sessionId, tokenHash);
  return token;
}

function operatorLink(token: string) { return `${publicBaseUrl()}/r/claim/${token}`; }

function presenterPacket(sessionId: string, token: string) {
  return `Your session is ready.

Attendees submit feedback here:
${sessionPublicUrl(sessionId)}

Manage your room here:
${operatorLink(token)}

Use the management link to open/close feedback, export responses, and moderate live Q&A.
Do not share the management link with attendees.`;
}


function wantsJson(req: Request) {
  const accept = req.headers.get("accept") || "";
  return accept.includes("application/json") || req.headers.get("content-type")?.includes("application/json");
}

function emitQaRefresh(sessionId: string) {
  qaPayload(sessionId, "public");
  qaPayload(sessionId, "presenter");
  qaPayload(sessionId, "slides");
  emitQaUpdate(sessionId);
}

function sameOriginOk(req: Request) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const expectedHost = new URL(req.url).host;
  const configuredHost = new URL(publicBaseUrl()).host;
  const source = origin || referer;
  if (!source) return true;
  try {
    const host = new URL(source).host;
    return host === expectedHost || host === configuredHost;
  } catch { return false; }
}

function lockedConsole(_kind: "admin" | "room" = "admin") { return "<!doctype html><html><body><div id=\"root\"></div><script type=\"module\" src=\"/src/ui/main.tsx\"></script></body></html>"; }

function sessionPacket(session: Pick<SessionRow, "id" | "qa_state" | "qa_mode" | "qa_display_mode" | "qa_enabled">) {
  return {
    session_id: session.id,
    attendee_url: `/t/${session.id}`,
    admin_url: `/admin/talks/${session.id}`,
    qa_admin_url: `/admin/talks/${session.id}`,
    qr_url: `/admin/talks/${session.id}/qr`,
    public_qa_json_url: `/api/sessions/${session.id}/qa/public.json`,
    presenter_qa_json_url: `/api/sessions/${session.id}/qa/presenter.json`,
    slides_qa_json_url: `/api/sessions/${session.id}/qa/slides.json`,
    overlay_url: `/slides/t/${session.id}/qa`,
    qa_state: session.qa_state,
    qa_mode: session.qa_mode,
    qa_display_mode: session.qa_display_mode,
  };
}

function publicQuestions(sessionId: string, includeAnswered = false) {
  const statuses = includeAnswered ? "'live','pinned','answered'" : "'live','pinned'";
  return db.query<QaQuestionRow, [string]>(`
    SELECT * FROM qa_questions
    WHERE session_id = ? AND status IN (${statuses})
    ORDER BY pinned DESC, status = 'pinned' DESC, priority DESC, support_count DESC, created_at ASC
    LIMIT 30
  `).all(sessionId);
}

type SseClient = { sessionId: string; controller: ReadableStreamDefaultController<Uint8Array>; includePresenter: boolean };
const sseClients = new Set<SseClient>();
const sseEncoder = new TextEncoder();

function emitQaUpdate(sessionId: string) {
  const publicPayload = attendeeQaPayload(sessionId);
  const presenterPayload = presenterQaPayload(sessionId);
  const feedbackPayload = feedbackSummaryPayload(sessionId);
  if (!publicPayload && !presenterPayload && !feedbackPayload) return;
  for (const client of [...sseClients]) {
    if (client.sessionId !== sessionId) continue;
    const payload = client.includePresenter ? { public: publicPayload, presenter: presenterPayload, feedback: feedbackPayload } : { public: publicPayload };
    const frame = `event: qa\ndata: ${JSON.stringify(payload)}\n\n`;
    try { client.controller.enqueue(sseEncoder.encode(frame)); } catch { sseClients.delete(client); }
  }
}

function rawQuestionSupport(rawId: string) {
  return db.query<{ c: number }, [string]>("SELECT COALESCE(SUM(value), 0) AS c FROM qa_question_votes WHERE target_kind='raw' AND question_id = ?").get(rawId)?.c ?? 0;
}

function presenterQaPayload(sessionId: string) {
  const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  const rows = publicQuestions(sessionId, true);
  const active = rows.filter((q) => q.status !== "answered" && q.status !== "hidden");
  const answeredCount = rows.filter((q) => q.status === "answered").length;
  const sourceCount = (questionId: string) => db.query<{ c: number }, [string]>("SELECT COUNT(*) AS c FROM qa_question_submissions WHERE question_id = ?").get(questionId)?.c ?? 0;
  return {
    view: "presenter",
    generated_at: Math.floor(Date.now() / 1000),
    session: sessionPacket(session),
    themes: active.map((q) => ({
      id: q.id,
      text: q.display_text,
      status: q.status,
      support_count: q.support_count,
      source_count: sourceCount(q.id) || 1,
      priority: q.priority,
      pinned: !!q.pinned,
      created_at: q.created_at,
    })),
    answered_count: answeredCount,
  };
}

function feedbackSummaryPayload(sessionId: string) {
  const since = Math.floor(Date.now() / 1000) - 5 * 60;
  const pulseRows = db.query<{ value: string; c: number }, [string, number]>("SELECT value, COUNT(*) AS c FROM attendee_interactions WHERE session_id = ? AND kind = 'pulse' AND created_at >= ? GROUP BY value").all(sessionId, since);
  const ratingRows = db.query<{ rating: number; c: number }, [string]>("SELECT rating, COUNT(*) AS c FROM feedback WHERE session_id = ? AND rating IS NOT NULL GROUP BY rating").all(sessionId);
  const comments = db.query<{ id: string; rating: number | null; comment: string | null; tags: string | null; submitted_at: number }, [string]>("SELECT id, rating, comment, tags, submitted_at FROM feedback WHERE session_id = ? AND (comment IS NOT NULL OR tags IS NOT NULL OR rating IS NOT NULL) ORDER BY submitted_at DESC LIMIT 50").all(sessionId);
  return {
    pulse: { window_seconds: 300, counts: Object.fromEntries(pulseRows.map((r) => [r.value, r.c])), total: pulseRows.reduce((sum, r) => sum + r.c, 0) },
    session_feedback: {
      total: db.query<{ c: number }, [string]>("SELECT COUNT(*) AS c FROM feedback WHERE session_id = ?").get(sessionId)?.c ?? 0,
      rating_distribution: Object.fromEntries(ratingRows.map((r) => [String(r.rating), r.c])),
      comments: comments.map((c) => ({ ...c, tags: c.tags ? JSON.parse(c.tags) : [] })),
    },
  };
}

function combinedQaPayload(sessionId: string) {
  return { public: attendeeQaPayload(sessionId), presenter: presenterQaPayload(sessionId), feedback: feedbackSummaryPayload(sessionId) };
}

function attendeeQaPayload(sessionId: string) {
  const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  const rows = db.query<{ id: string; raw_text: string; status: string; question_id: string | null; submitted_at: number; theme_status: string | null; answered_at: number | null; hidden_at: number | null }, [string]>(`
    SELECT s.id, s.raw_text, s.status, s.question_id, s.submitted_at,
           q.status AS theme_status, q.answered_at, q.hidden_at
    FROM qa_question_submissions s
    LEFT JOIN qa_questions q ON q.id = s.question_id
    WHERE s.session_id = ? AND s.status NOT IN ('rejected')
    ORDER BY CASE WHEN q.status='answered' THEN 1 ELSE 0 END, s.submitted_at DESC
    LIMIT 80
  `).all(sessionId);
  const questions = rows.map((r) => {
    const answered = r.theme_status === "answered" || !!r.answered_at;
    const hidden = r.theme_status === "hidden" || !!r.hidden_at;
    const held = r.status === "held";
    return {
      id: r.id,
      text: r.raw_text,
      status: answered ? "answered" : hidden ? "hidden" : held ? "needs detail" : r.question_id ? "grouped" : "queued",
      support_count: rawQuestionSupport(r.id),
      created_at: r.submitted_at,
      theme_id: r.question_id,
      answered,
      hidden,
    };
  }).filter((q) => !q.hidden);
  return { view: "public", generated_at: Math.floor(Date.now() / 1000), session: sessionPacket(session), questions };
}

function qaPayload(sessionId: string, view: "public" | "presenter" | "slides") {
  const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  if (view === "public") return attendeeQaPayload(sessionId);
  const includeAnswered = view !== "slides";
  const questions = publicQuestions(sessionId, includeAnswered).map((q) => ({
    id: q.id,
    text: q.display_text,
    status: q.status,
    support_count: q.support_count,
    pinned: !!q.pinned,
    priority: q.priority,
    created_at: q.created_at,
    answered_at: q.answered_at,
  }));
  const payload = { view, generated_at: Math.floor(Date.now() / 1000), session: sessionPacket(session), questions };
  db.query(`
    INSERT INTO qa_published_views (session_id, view_name, payload_json, generated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(session_id, view_name) DO UPDATE SET
      payload_json = excluded.payload_json,
      version = qa_published_views.version + 1,
      generated_at = unixepoch()
  `).run(sessionId, view, JSON.stringify(payload));
  return payload;
}

function recomputeSupport(questionId: string) {
  const row = db.query<{ c: number }, [string]>("SELECT COALESCE(SUM(value), 0) AS c FROM qa_question_votes WHERE question_id = ?").get(questionId);
  const submissions = db.query<{ c: number }, [string]>("SELECT COUNT(*) AS c FROM qa_question_submissions WHERE question_id = ?").get(questionId);
  db.query("UPDATE qa_questions SET support_count = ?, updated_at = unixepoch() WHERE id = ?").run(Math.max(0, (row?.c ?? 0) + (submissions?.c ?? 0)), questionId);
}

async function promoteSubmissionFallback(sessionId: string, submissionId: string, text: string) {
  const normalized = normalizeQuestionText(text).toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(the|a|an|and|or|to|of|in|for|on|with|is|are)\b/g, "").replace(/\s+/g, " ").trim();
  const existing = db.query<QaQuestionRow & { source_text?: string }, [string]>(`
    SELECT q.* FROM qa_questions q
    JOIN qa_question_submissions s ON s.question_id = q.id
    WHERE q.session_id = ? AND q.status IN ('live','pinned','new')
    ORDER BY q.created_at ASC
  `).all(sessionId).find((q) => {
    const n = q.display_text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(the|a|an|and|or|to|of|in|for|on|with|is|are)\b/g, "").replace(/\s+/g, " ").trim();
    return n && (n === normalized || n.includes(normalized) || normalized.includes(n));
  });
  if (existing) {
    db.query("UPDATE qa_question_submissions SET status = 'merged', question_id = ?, processed_at = unixepoch() WHERE id = ?").run(existing.id, submissionId);
    recomputeSupport(existing.id);
    return existing.id;
  }
  const qid = randomId("q");
  db.query(`INSERT INTO qa_questions (id, session_id, display_text, status, priority, support_count, source_submission_id)
    VALUES (?, ?, ?, 'live', 0, 1, ?)`).run(qid, sessionId, truncateDisplay(text), submissionId);
  db.query("UPDATE qa_question_submissions SET status = 'promoted', question_id = ?, processed_at = unixepoch() WHERE id = ?").run(qid, submissionId);
  return qid;
}

async function processQaFallback(sessionId: string, limit = 25) {
  const pending = db.query<{ id: string; raw_text: string }, [string, number]>(
    "SELECT id, raw_text FROM qa_question_submissions WHERE session_id = ? AND status = 'pending' ORDER BY submitted_at ASC LIMIT ?"
  ).all(sessionId, limit);
  for (const sub of pending) await promoteSubmissionFallback(sessionId, sub.id, sub.raw_text);
  emitQaRefresh(sessionId);
  return pending.length;
}

type QaQueueJob = { timer: ReturnType<typeof setTimeout> | null; proc: ReturnType<typeof Bun.spawn> | null; canceled: boolean };
const qaQueueJobs = new Map<string, QaQueueJob>();
const QA_DEBOUNCE_MS = 900;

function scheduleQaProcessing(sessionId: string) {
  const previous = qaQueueJobs.get(sessionId);
  if (previous?.timer) clearTimeout(previous.timer);
  if (previous?.proc) {
    previous.canceled = true;
    previous.proc.kill();
    console.info(JSON.stringify({ event: "qa_worker_canceled_for_new_submission", session_id: sessionId }));
  }

  const job: QaQueueJob = { timer: null, proc: null, canceled: false };
  job.timer = setTimeout(() => {
    job.timer = null;
    runQueuedQaProcessing(sessionId, job).catch((err) => {
      if (!job.canceled) console.error(JSON.stringify({ event: "qa_worker_background_error", session_id: sessionId, error: String(err) }));
    });
  }, QA_DEBOUNCE_MS);
  qaQueueJobs.set(sessionId, job);
}

async function runQueuedQaProcessing(sessionId: string, job: QaQueueJob) {
  const pending = db.query<{ c: number }, [string]>("SELECT COUNT(*) AS c FROM qa_question_submissions WHERE session_id = ? AND status = 'pending'").get(sessionId)?.c ?? 0;
  if (pending === 0) {
    if (qaQueueJobs.get(sessionId) === job) qaQueueJobs.delete(sessionId);
    return { runId: null, status: "empty" };
  }

  const proc = Bun.spawn([process.execPath, join(import.meta.dir, "qa-worker.ts"), sessionId], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, DB_PATH },
  });
  job.proc = proc;
  const [code, stderrText] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
  job.proc = null;

  if (job.canceled) return { runId: null, status: "canceled" };
  if (code !== 0) {
    const n = await processQaFallback(sessionId, 100);
    const runId = randomId("run");
    db.query("INSERT INTO qa_agent_runs (id, session_id, status, finished_at, error, summary) VALUES (?, ?, 'fallback', unixepoch(), ?, ?)")
      .run(runId, sessionId, `worker failed with exit ${code}: ${stderrText.slice(0, 800)}`, `server fallback promoted/merged ${n} queued submissions`);
  }
  emitQaRefresh(sessionId);
  if (qaQueueJobs.get(sessionId) === job) qaQueueJobs.delete(sessionId);
  const latest = db.query<{ id: string; status: string }, [string]>("SELECT id, status FROM qa_agent_runs WHERE session_id = ? ORDER BY started_at DESC LIMIT 1").get(sessionId);
  return { runId: latest?.id ?? null, status: latest?.status ?? (code === 0 ? "done" : "fallback") };
}

function recordModeratorAction(sessionId: string, questionId: string | null, action: string, Comment: unknown = {}) {
  db.query("INSERT INTO qa_moderator_actions (id, session_id, question_id, action, payload_json) VALUES (?, ?, ?, ?, ?)")
    .run(randomId("m"), sessionId, questionId, action, JSON.stringify(Comment));
}

// ─── CSS ──────────────────────────────────────────────────────────────────────


function safeReadSmall(path: string | null, maxBytes = 240_000) {
  if (!path) return { label: "not recorded", content: "" };
  if (!existsSync(path)) return { label: `${path} (missing)`, content: "" };
  const data = readFileSync(path, "utf8");
  const truncated = data.length > maxBytes;
  return { label: path + (truncated ? ` (truncated to ${maxBytes} chars)` : ""), content: truncated ? data.slice(0, maxBytes) : data };
}


// ─── Router ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "8000", 10);

Bun.serve({
  port: PORT,
  routes: {
    "/": appHtml,
    "/t/:id": appHtml,
    "/admin": appHtml,
    "/admin/dashboard": appHtml,
    "/admin/login-page": appHtml,
    "/admin/talks/:id": appHtml,
    "/admin/talks/:id/qr": appHtml,
    "/admin/talks/:id/ai-run": appHtml,
    "/slides/t/:id/qa": appHtml,
    "/slides/s/:id/qa": appHtml,
    "/embed/t/:id/qa": appHtml,
    "/embed/s/:id/qa": appHtml,
  },
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const auth = await getAuth(req);
    const isAdminPost = method === "POST" && (path === "/api/admin/sessions" || path.startsWith("/admin/") || path.startsWith("/api/admin/") || path === "/logout");
    if (isAdminPost && !sameOriginOk(req)) return html("<h1>Forbidden</h1>", 403);

    if (path === "/" && method === "GET") return appShell();

    if (path === "/api/talks" && method === "GET") {
      const rooms = db.query<{ id: string; title: string; presenter: string; description: string }, []>("SELECT id,title,presenter,description FROM sessions WHERE active = 1 ORDER BY CASE id WHEN 'smart' THEN 1 WHEN 'ktc' THEN 2 WHEN 'checkin' THEN 3 WHEN 'llms' THEN 4 WHEN 'coin' THEN 5 ELSE 9 END, title").all();
      return json({ rooms });
    }

    if (path === "/api/admin/me" && method === "GET") {
      return json({ authenticated: !!auth, scope: auth?.scope ?? null, session_id: auth?.session_id ?? null });
    }

    if ((path === "/admin" || path === "/admin/dashboard") && method === "GET") return appShell();

    if (path === "/admin/login" && method === "POST") {
      const form = await req.formData();
      const key = String(form.get("key") ?? "");
      if (key !== ADMIN_KEY) return redirect("/admin/login-page?error=bad_key");
      const session = await createAuthSession("global_admin", null, GLOBAL_ADMIN_MAX_AGE);
      return redirect("/admin/dashboard", 303, { "Set-Cookie": session.cookie });
    }

    if (path === "/logout" && method === "POST") {
      const token = parseCookie(req, AUTH_COOKIE);
      if (token) db.query("UPDATE auth_sessions SET revoked_at = unixepoch() WHERE token_hash = ?").run(await sha256RawHex(token));
      return redirect("/admin", 303, { "Set-Cookie": clearAuthCookieHeader() });
    }

    const claimMatch = path.match(/^\/r\/claim\/(roomcap_[A-Za-z0-9_-]{32,})$/);
    if (claimMatch && method === "GET") {
      const tokenHash = await sha256RawHex(claimMatch[1]);
      const now = Math.floor(Date.now() / 1000);
      const cap = db.query<{ id: string; session_id: string }, [string, number]>("SELECT id, session_id FROM room_capabilities WHERE token_hash = ? AND active = 1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?) LIMIT 1").get(tokenHash, now);
      if (!cap) return html(lockedConsole("room"), 403);
      const room = db.query<{ id: string }, [string]>("SELECT id FROM sessions WHERE id = ?").get(cap.session_id);
      if (!room) return html(lockedConsole("room"), 404);
      db.query("UPDATE room_capabilities SET claimed_at = COALESCE(claimed_at, unixepoch()), last_used_at = unixepoch() WHERE id = ?").run(cap.id);
      const session = await createAuthSession("room_admin", cap.session_id, ROOM_ADMIN_MAX_AGE);
      return redirect(`/admin/talks/${cap.session_id}`, 303, { "Set-Cookie": session.cookie });
    }

    if (path === "/api/admin/sessions" && method === "GET") {
      if (auth?.scope !== "global_admin") return json({ error: "unauthorized" }, 401);
      const sessions = db.query<{ id: string; title: string; presenter: string; created_at: number; active: number; qa_state: string; feedback_count: number }, []>(`
        SELECT s.id, s.title, s.presenter, s.created_at, s.active, s.qa_state, COUNT(f.id) AS feedback_count
        FROM sessions s
        LEFT JOIN feedback f ON f.session_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 100
      `).all();
      return json({ sessions: sessions.map((s) => ({ ...s, active: !!s.active })), totals: { sessions: sessions.length, active: sessions.filter((s) => s.active).length, feedback: sessions.reduce((sum, s) => sum + s.feedback_count, 0) } });
    }

    if (path === "/api/admin/sessions" && method === "POST") {
      if (auth?.scope !== "global_admin") return json({ error: "unauthorized" }, 401);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const title = String(body.title ?? "").trim().slice(0, 160);
      if (!title) return json({ error: "title_required" }, 400);
      const id = randomId("s");
      const presenter = String(body.presenter ?? "").trim().slice(0, 120);
      const description = String(body.description ?? "").trim().slice(0, 240);
      const qaState = ["disabled", "open", "paused", "closed"].includes(String(body.qa_state)) ? String(body.qa_state) : "open";
      db.query("INSERT INTO sessions (id, title, presenter, description, qa_state, qa_mode, qa_display_mode, qa_enabled, short_code, feedback_state, ai_context) VALUES (?, ?, ?, ?, ?, 'moderated', 'queue', 1, ?, 'open', ?)").run(id, title, presenter, description, qaState, id, [title, presenter, description].filter(Boolean).join("\n\n"));
      const capToken = await createRoomCapability(id);
      const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(id)!;
      return json({ ...sessionPacket(session), operator_link: operatorLink(capToken), presenter_message: presenterPacket(id, capToken) }, 201);
    }


    const oldAdminMatch = path.match(/^\/admin\/([a-z0-9]+)$/);
    if (oldAdminMatch && method === "GET") return redirect(`/admin/talks/${oldAdminMatch[1]}`);

    const adminMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)$/);
    if (adminMatch && method === "GET") return appShell();

    const qaStateApiMatch = path.match(/^\/api\/admin\/talks\/([a-z0-9]+)\/state$/);
    if (qaStateApiMatch && method === "POST") {
      const sid = qaStateApiMatch[1];
      if (!canManageRoom(auth, sid)) return json({ error: "unauthorized" }, 401);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const state = ["open", "paused", "closed"].includes(String(body.state)) ? String(body.state) : "open";
      db.query("UPDATE sessions SET qa_state = ? WHERE id = ?").run(state, sid);
      recordModeratorAction(sid, null, `state:${state}`);
      emitQaRefresh(sid);
      return json({ ok: true, session_id: sid, qa_state: state, presenter: presenterQaPayload(sid), public: attendeeQaPayload(sid) });
    }

    const qaStateMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/state\/(open|paused|closed)$/);
    if (qaStateMatch && method === "POST") {
      const [_, sid, state] = qaStateMatch;
      if (!canManageRoom(auth, sid)) return html(lockedConsole("room"), 401);
      db.query("UPDATE sessions SET qa_state = ? WHERE id = ?").run(state, sid);
      recordModeratorAction(sid, null, `state:${state}`);
      emitQaRefresh(sid);
      if (wantsJson(req)) {
        return json({ ok: true, session_id: sid, qa_state: state, presenter: presenterQaPayload(sid), public: attendeeQaPayload(sid) });
      }
      return redirect(`/admin/talks/${sid}#questions`);
    }

    const qaRunApiMatch = path.match(/^\/api\/admin\/talks\/([a-z0-9]+)\/qa\/run$/);
    if (qaRunApiMatch && method === "POST") {
      const sid = qaRunApiMatch[1];
      if (!canManageRoom(auth, sid)) return json({ error: "unauthorized" }, 401);
      await runQueuedQaProcessing(sid, { timer: null, proc: null, canceled: false }).catch(async () => {
        const n = await processQaFallback(sid, 100);
        const rid = randomId("run");
        db.query("INSERT INTO qa_agent_runs (id, session_id, status, finished_at, summary) VALUES (?, ?, 'fallback', unixepoch(), ?)").run(rid, sid, `api fallback promoted/merged ${n} pending submissions`);
      });
      emitQaRefresh(sid);
      return json({ ok: true, presenter: presenterQaPayload(sid), public: attendeeQaPayload(sid) });
    }

    const qaRunMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/run$/);
    if (qaRunMatch && method === "POST") {
      const sid = qaRunMatch[1];
      if (!canManageRoom(auth, sid)) return html(lockedConsole("room"), 401);
      const rid = randomId("run");
      db.query("INSERT INTO qa_agent_runs (id, session_id, status, summary) VALUES (?, ?, 'fallback', 'manual deterministic promotion pass')").run(rid, sid);
      const n = await processQaFallback(sid, 100);
      db.query("UPDATE qa_agent_runs SET finished_at = unixepoch(), summary = ? WHERE id = ?").run(`fallback promoted/merged ${n} pending submissions`, rid);
      return redirect(`/admin/talks/${sid}`);
    }

    const qaQuestionActionApiMatch = path.match(/^\/api\/admin\/talks\/([a-z0-9]+)\/questions\/([a-z0-9]+)\/actions$/);
    if (qaQuestionActionApiMatch && method === "POST") {
      const [, sid, qid] = qaQuestionActionApiMatch;
      if (!canManageRoom(auth, sid)) return json({ error: "unauthorized" }, 401);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const action = String(body.action ?? "");
      if (!["pin", "unpin", "answer", "hide", "restore"].includes(action)) return json({ error: "bad_action" }, 400);
      const q = db.query<QaQuestionRow, [string, string]>("SELECT * FROM qa_questions WHERE id = ? AND session_id = ?").get(qid, sid);
      if (!q) return json({ error: "not_found" }, 404);
      if (action === "pin") db.query("UPDATE qa_questions SET status='pinned', pinned=1, human_override=1, updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "unpin") db.query("UPDATE qa_questions SET status='live', pinned=0, human_override=1, updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "answer") db.query("UPDATE qa_questions SET status='answered', pinned=0, human_override=1, answered_at=unixepoch(), updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "hide") db.query("UPDATE qa_questions SET status='hidden', pinned=0, human_override=1, hidden_at=unixepoch(), updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "restore") db.query("UPDATE qa_questions SET status='live', hidden_at=NULL, answered_at=NULL, human_override=1, updated_at=unixepoch() WHERE id=?").run(qid);
      recordModeratorAction(sid, qid, action);
      emitQaRefresh(sid);
      return json({ ok: true, action, question: db.query<QaQuestionRow, [string]>("SELECT * FROM qa_questions WHERE id=?").get(qid), presenter: presenterQaPayload(sid), public: attendeeQaPayload(sid) });
    }

    const qaQuestionActionMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/questions\/([a-z0-9]+)\/(pin|unpin|answer|hide|restore)$/);
    if (qaQuestionActionMatch && method === "POST") {
      const [, sid, qid, action] = qaQuestionActionMatch;
      if (!canManageRoom(auth, sid)) return html(lockedConsole("room"), 401);
      const q = db.query<QaQuestionRow, [string, string]>("SELECT * FROM qa_questions WHERE id = ? AND session_id = ?").get(qid, sid);
      if (!q) return html("<h1>Question not found</h1>", 404);
      if (action === "pin") db.query("UPDATE qa_questions SET status='pinned', pinned=1, human_override=1, updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "unpin") db.query("UPDATE qa_questions SET status='live', pinned=0, human_override=1, updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "answer") db.query("UPDATE qa_questions SET status='answered', pinned=0, human_override=1, answered_at=unixepoch(), updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "hide") db.query("UPDATE qa_questions SET status='hidden', pinned=0, human_override=1, hidden_at=unixepoch(), updated_at=unixepoch() WHERE id=?").run(qid);
      if (action === "restore") db.query("UPDATE qa_questions SET status='live', hidden_at=NULL, answered_at=NULL, human_override=1, updated_at=unixepoch() WHERE id=?").run(qid);
      recordModeratorAction(sid, qid, action);
      emitQaRefresh(sid);
      const updated = db.query<QaQuestionRow, [string]>("SELECT * FROM qa_questions WHERE id=?").get(qid);
      if (wantsJson(req)) return json({ ok: true, action, question: updated, presenter: presenterQaPayload(sid), public: attendeeQaPayload(sid) });
      return redirect(`/admin/talks/${sid}#questions`);
    }

    const aiRunApiMatch = path.match(/^\/api\/admin\/talks\/([a-z0-9]+)\/ai-run\.json$/);
    if (aiRunApiMatch && method === "GET") {
      const sid = aiRunApiMatch[1];
      if (!canManageRoom(auth, sid)) return json({ error: "unauthorized" }, 401);
      const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sid);
      if (!session) return json({ error: "not_found" }, 404);
      const run = db.query<{ id: string; status: string; started_at: number; finished_at: number | null; input_path: string | null; output_path: string | null; error: string | null; summary: string | null }, [string]>("SELECT id, status, started_at, finished_at, input_path, output_path, error, summary FROM qa_agent_runs WHERE session_id = ? ORDER BY started_at DESC LIMIT 1").get(sid);
      return json({ talk: { id: session.id, title: session.title }, run, input: run ? safeReadSmall(run.input_path) : null, output: run ? safeReadSmall(run.output_path) : null });
    }

    const aiRunMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/ai-run$/);
    if (aiRunMatch && method === "GET") return appShell();

    const qrMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/qr$/);
    if (qrMatch && method === "GET") return appShell();

    const toggleMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/toggle$/);
    if (toggleMatch && method === "POST") {
      const sid = toggleMatch[1];
      if (!canManageRoom(auth, sid)) return html(lockedConsole("room"), 401);
      db.query("UPDATE sessions SET active = 1 - active WHERE id = ?").run(sid);
      return redirect(`/admin/talks/${sid}`);
    }

    const exportMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/export$/);
    if (exportMatch && method === "GET") {
      const sid = exportMatch[1];
      if (!canManageRoom(auth, sid)) return html(lockedConsole("room"), 401);
      const session = db.query<{ title: string }, [string]>("SELECT title FROM sessions WHERE id = ?").get(sid);
      if (!session) return new Response("Not found", { status: 404 });
      const rows = db.query<
        { id: string; rating: number; sentiment: string; comment: string; tags: string; submitted_at: number },
        [string]
      >("SELECT * FROM feedback WHERE session_id = ? ORDER BY submitted_at ASC").all(sid);
      const header = "id,submitted_at,rating,sentiment,tags,comment\n";
      const csvBody = rows.map((r) => [
        csvEscape(r.id),
        csvEscape(new Date(r.submitted_at * 1000).toISOString()),
        csvEscape(r.rating),
        csvEscape(r.sentiment),
        csvEscape(r.tags),
        csvEscape(r.comment),
      ].join(",")).join("\n");
      return new Response(header + csvBody, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="feedback-${sid}.csv"`,
        },
      });
    }

    const capActionMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/capability\/(regenerate|revoke)$/);
    if (capActionMatch && method === "POST") {
      const [, sid, action] = capActionMatch;
      if (auth?.scope !== "global_admin") return html(lockedConsole("admin"), 401);
      if (action === "revoke") {
        db.query("UPDATE room_capabilities SET active = 0, revoked_at = unixepoch() WHERE session_id = ? AND active = 1").run(sid);
        return redirect(`/admin/talks/${sid}`);
      }
      const capToken = await createRoomCapability(sid);
      if (wantsJson(req)) return json({ ok: true, operator_link: operatorLink(capToken), presenter_message: presenterPacket(sid, capToken) });
      return redirect(`/admin/talks/${sid}/qr`);
    }

    const talkApiMatch = path.match(/^\/api\/talks\/([a-z0-9]+)$/);
    if (talkApiMatch && method === "GET") {
      const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(talkApiMatch[1]);
      return session ? json({ talk: { id: session.id, title: session.title, presenter: session.presenter, description: session.description, slides_url: session.slides_url, active: !!session.active, feedback_state: session.feedback_state, qa_state: session.qa_state }, urls: sessionPacket(session) }) : json({ error: "not_found" }, 404);
    }

    const interactionApiMatch = path.match(/^\/api\/talks\/([a-z0-9]+)\/interactions$/);
    if (interactionApiMatch && method === "POST") {
      const sid = interactionApiMatch[1];
      const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sid);
      const { key, isNew } = getSubmitterKey(req);
      if (!session) return json({ error: "not_found" }, 404, isNew ? { "Set-Cookie": cookieHeader(key) } : {});
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const kind = String(body.kind ?? "signal").slice(0, 80);
      const value = body.value == null ? null : String(body.value).slice(0, 240);
      const textBody = body.body == null ? null : String(body.body).slice(0, 2000);
      const targetId = body.target_id == null ? null : String(body.target_id).slice(0, 120);
      recordInteraction(sid, key, kind, value, textBody, targetId, body.metadata ?? {});
      if (kind === "pulse" || kind === "signal") emitQaUpdate(sid);
      return json({ ok: true }, 202, isNew ? { "Set-Cookie": cookieHeader(key) } : {});
    }

    const sessionFeedbackMatch = path.match(/^\/api\/talks\/([a-z0-9]+)\/session-feedback$/);
    if (sessionFeedbackMatch && method === "POST") {
      const sid = sessionFeedbackMatch[1];
      const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sid);
      const { key, isNew } = getSubmitterKey(req);
      const cookieHeaders: Record<string, string> = isNew ? { "Set-Cookie": cookieHeader(key) } : {};
      if (!session) return json({ error: "not_found" }, 404, cookieHeaders);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const rating = body.rating == null || body.rating === "" ? null : Math.max(1, Math.min(5, Number(body.rating) || 0));
      const sentiment = body.sentiment == null ? null : String(body.sentiment).slice(0, 40);
      const comment = body.comment == null ? null : String(body.comment).trim().slice(0, 2000) || null;
      const rawTags = Array.isArray(body.tags) ? body.tags : [];
      const tags = JSON.stringify(rawTags.slice(0, 10).map(String));
      const fid = randomId("f");
      db.query("INSERT INTO feedback (id, session_id, rating, sentiment, comment, tags) VALUES (?, ?, ?, ?, ?, ?)").run(fid, sid, rating, sentiment, comment, tags);
      recordInteraction(sid, key, "feedback", sentiment ?? rating, comment, fid, { rating, sentiment, tags: rawTags });
      emitQaUpdate(sid);
      return json({ ok: true, feedback_id: fid }, 202, cookieHeaders);
    }

    const feedbackSummaryMatch = path.match(/^\/api\/admin\/talks\/([a-z0-9]+)\/feedback-summary$/);
    if (feedbackSummaryMatch && method === "GET") {
      const sid = feedbackSummaryMatch[1];
      if (!canManageRoom(auth, sid)) return json({ error: "unauthorized" }, 401);
      return json(feedbackSummaryPayload(sid));
    }

    const qaEventsMatch = path.match(/^\/api\/sessions\/([a-z0-9]+)\/qa\/events$/);
    if (qaEventsMatch && method === "GET") {
      const sid = qaEventsMatch[1];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const includePresenter = canManageRoom(auth, sid);
          const client = { sessionId: sid, controller, includePresenter };
          sseClients.add(client);
          const publicPayload = attendeeQaPayload(sid);
          const presenterPayload = includePresenter ? presenterQaPayload(sid) : null;
          const feedbackPayload = includePresenter ? feedbackSummaryPayload(sid) : null;
          const payload = includePresenter ? { public: publicPayload, presenter: presenterPayload, feedback: feedbackPayload } : { public: publicPayload };
          if (publicPayload || presenterPayload) controller.enqueue(sseEncoder.encode(`event: qa\ndata: ${JSON.stringify(payload)}\n\n`));
          const keepAlive = setInterval(() => {
            try { controller.enqueue(sseEncoder.encode(`: keepalive\n\n`)); } catch { clearInterval(keepAlive); sseClients.delete(client); }
          }, 15000);
        },
        cancel() {
          for (const client of [...sseClients]) if (client.sessionId === sid) sseClients.delete(client);
        },
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
    }

    const qaApiPublicMatch = path.match(/^\/api\/sessions\/([a-z0-9]+)\/qa\/(public|presenter|slides)\.json$/);
    if (qaApiPublicMatch && method === "GET") {
      const view = qaApiPublicMatch[2] as "public" | "presenter" | "slides";
      if (view === "presenter" && !canManageRoom(auth, qaApiPublicMatch[1])) return json({ error: "unauthorized" }, 401);
      const payload = qaPayload(qaApiPublicMatch[1], view);
      return payload ? json(payload) : json({ error: "not_found" }, 404);
    }

    const qaApiSubmitMatch = path.match(/^\/api\/sessions\/([a-z0-9]+)\/qa\/questions$/);
    if (qaApiSubmitMatch && method === "POST") {
      const sid = qaApiSubmitMatch[1];
      const { key, isNew } = getSubmitterKey(req);
      const cookieHeaders: Record<string, string> = isNew ? { "Set-Cookie": cookieHeader(key) } : {};
      try {
        const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sid);
        if (!session) {
          console.warn(JSON.stringify({ event: "qa_question_rejected", reason: "not_found", session_id: sid }));
          return json({ error: "not_found", message: "Talk not found." }, 404, cookieHeaders);
        }
        if (!session.qa_enabled || session.qa_state !== "open") {
          console.warn(JSON.stringify({ event: "qa_question_rejected", reason: "qa_not_open", session_id: sid, qa_state: session.qa_state, qa_enabled: session.qa_enabled }));
          return json({ error: "qa_not_open", message: "Questions are closed right now.", qa_state: session.qa_state }, 409, cookieHeaders);
        }
        const body = await req.json().catch((err) => {
          console.warn(JSON.stringify({ event: "qa_question_bad_json", session_id: sid, error: String(err) }));
          return {};
        }) as Record<string, unknown>;
        const text = normalizeQuestionText(String(body.question ?? body.text ?? ""));
        if (text.length < 5) {
          console.warn(JSON.stringify({ event: "qa_question_rejected", reason: "question_too_short", session_id: sid, length: text.length }));
          return json({ error: "question_too_short", message: "Please enter a question with at least 5 characters." }, 400, cookieHeaders);
        }
        if (text.length > 1000) {
          console.warn(JSON.stringify({ event: "qa_question_rejected", reason: "question_too_long", session_id: sid, length: text.length }));
          return json({ error: "question_too_long", message: "Please keep questions under 1000 characters." }, 400, cookieHeaders);
        }
        const hash = await sha256Hex(text);
        const retry = db.query<{ id: string; question_id: string | null }, [string, string, string]>("SELECT id, question_id FROM qa_question_submissions WHERE session_id=? AND submitter_key=? AND normalized_hash=? LIMIT 1").get(sid, key, hash);
        if (retry) {
          console.info(JSON.stringify({ event: "qa_question_duplicate_retry", session_id: sid, submission_id: retry.id, question_id: retry.question_id }));
          return json({ ok: true, status: "duplicate_retry", submission_id: retry.id, question_id: retry.question_id }, 200, cookieHeaders);
        }
        const qsid = randomId("sub");
        db.query("INSERT INTO qa_question_submissions (id, session_id, submitter_key, raw_text, normalized_hash) VALUES (?, ?, ?, ?, ?)").run(qsid, sid, key, text, hash);
        recordInteraction(sid, key, "question", null, text, qsid);
        scheduleQaProcessing(sid);
        emitQaRefresh(sid);
        console.info(JSON.stringify({ event: "qa_question_queued", session_id: sid, submission_id: qsid, length: text.length }));
        return json({ ok: true, status: "queued", submission_id: qsid }, 202, cookieHeaders);
      } catch (err) {
        console.error(JSON.stringify({ event: "qa_question_error", session_id: sid, error: String(err), stack: err instanceof Error ? err.stack : undefined }));
        return json({ error: "server_error", message: "Question could not be saved. Please try again." }, 500, cookieHeaders);
      }
    }

    const qaApiVoteMatch = path.match(/^\/api\/sessions\/([a-z0-9]+)\/qa\/questions\/([a-z0-9]+)\/(?:upvote|vote)$/);
    if (qaApiVoteMatch && method === "POST") {
      const [, sid, qid] = qaApiVoteMatch;
      const { key, isNew } = getSubmitterKey(req);
      const raw = db.query<{ id: string; question_id: string | null }, [string, string]>("SELECT id, question_id FROM qa_question_submissions WHERE id=? AND session_id=?").get(qid, sid);
      const theme = raw ? null : db.query<QaQuestionRow, [string, string]>("SELECT * FROM qa_questions WHERE id=? AND session_id=?").get(qid, sid);
      if (!raw && (!theme || ["hidden", "rejected", "merged"].includes(theme.status))) return json({ error: "not_found" }, 404, isNew ? { "Set-Cookie": cookieHeader(key) } : {});
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const voteValue = Number(body.value) < 0 ? -1 : 1;
      const targetKind = raw ? "raw" : "theme";
      db.query("INSERT INTO qa_question_votes (id, session_id, question_id, submitter_key, value, target_kind) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(question_id, submitter_key) DO UPDATE SET value = excluded.value, target_kind = excluded.target_kind, created_at = unixepoch()").run(randomId("v"), sid, qid, key, voteValue, targetKind);
      recordInteraction(sid, key, "question_vote", voteValue, null, qid);
      if (raw?.question_id) recomputeSupport(raw.question_id);
      if (theme) recomputeSupport(qid);
      emitQaRefresh(sid);
      const support = raw ? rawQuestionSupport(qid) : db.query<QaQuestionRow, [string]>("SELECT * FROM qa_questions WHERE id=?").get(qid)?.support_count ?? 0;
      return json({ ok: true, question_id: qid, support_count: support }, 200, isNew ? { "Set-Cookie": cookieHeader(key) } : {});
    }

    const slidesMatch = path.match(/^\/(?:embed|slides)\/(?:s|t)\/([a-z0-9]+)\/qa$/);
    if (slidesMatch && method === "GET") {
      const exists = db.query<{ id: string }, [string]>("SELECT id FROM sessions WHERE id = ?").get(slidesMatch[1]);
      return exists ? appShell() : html("<h1>Session not found</h1>", 404);
    }

    const shortAttendeeMatch = path.match(/^\/s\/([a-z0-9]+)$/);
    if (shortAttendeeMatch && method === "GET") return redirect(`/t/${shortAttendeeMatch[1]}`);

    const attendeeMatch = path.match(/^\/t\/([a-z0-9]+)$/);
    if (attendeeMatch && method === "GET") {
      const exists = db.query<{ id: string }, [string]>("SELECT id FROM sessions WHERE id = ?").get(attendeeMatch[1]);
      return exists ? appShell() : html("<h1>Session not found</h1>", 404);
    }

    if (path === "/favicon.ico") return new Response(null, { status: 204 });

    return html("<h1>Not found</h1>", 404);
  },
});

console.log(`🎙️  DevDays Feedback running on http://localhost:${PORT}`);
