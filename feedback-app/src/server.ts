import { Database } from "bun:sqlite";

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

function qrImageUrl(targetUrl: string, size = 160) {
  // margin creates the required white quiet zone for reliable scanning.
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&data=${encodeURIComponent(targetUrl)}`;
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

function starRating(n: number) {
  return [1, 2, 3, 4, 5].map((i) => `<span style="color:${i <= n ? "#39ff88" : "#315447"}">■</span>`).join("");
}

function sentimentEmoji(s: string | null) {
  if (s === "great") return "OK";
  if (s === "ok") return "MID";
  if (s === "lost") return "ERR";
  return "";
}

type AuthScope = "global_admin" | "room_admin";
type AuthContext = { id: string; scope: AuthScope; session_id: string | null; expires_at: number } | null;

type QaState = "disabled" | "open" | "paused" | "closed" | "archived";
type QaQuestionStatus = "new" | "live" | "pinned" | "answered" | "held" | "hidden" | "rejected" | "merged";

type SessionRow = {
  id: string; title: string; description: string; presenter: string; created_at: number; active: number;
  qa_state: QaState; qa_mode: string; qa_display_mode: string; qa_enabled: number; slides_url: string; short_code: string | null; feedback_state: string;
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

function lockedConsole(kind: "admin" | "room" = "admin") {
  const devNote = ADMIN_KEY_IS_DEV_DEFAULT ? `<p class="muted mt-16" style="color:var(--warn)">DEV DEFAULT ACTIVE: ADMIN_KEY is not set. Use operator key <strong>devdays-admin</strong> locally only.</p>` : "";
  if (kind === "room") return layout("Room locked", `<main class="container"><div class="card text-center" style="margin-top:54px"><p class="eyebrow">ROOM CONSOLE LOCKED</p><h1 style="color:var(--ink);text-transform:uppercase">Ask the organizer for this room's operator link.</h1><p class="muted mt-16">Management access is room-scoped and capability based.</p></div></main>`, false);
  return layout("Admin locked", `<main class="container"><div class="card" style="max-width:520px;margin:64px auto"><p class="eyebrow">ADMIN CONSOLE LOCKED</p><h1 style="color:var(--ink);margin-bottom:16px">enter operator key</h1><form method="POST" action="/admin/login"><div class="field"><label>operator key</label><input type="password" name="key" autocomplete="current-password" autofocus required /></div><button class="btn btn-primary" style="width:100%">unlock console</button></form>${devNote}</div></main>`, false);
}

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

function qaPayload(sessionId: string, view: "public" | "presenter" | "slides") {
  const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
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
  qaPayload(sessionId, "public"); qaPayload(sessionId, "presenter"); qaPayload(sessionId, "slides");
  return pending.length;
}

function recordModeratorAction(sessionId: string, questionId: string | null, action: string, Comment: unknown = {}) {
  db.query("INSERT INTO qa_moderator_actions (id, session_id, question_id, action, payload_json) VALUES (?, ?, ?, ?, ?)")
    .run(randomId("m"), sessionId, questionId, action, JSON.stringify(Comment));
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const BASE_CSS = `
:root {
  --bg: #05070a;
  --panel: #0b1117;
  --panel-2: #0f1720;
  --panel-3: #121c26;
  --ink: #e6fff4;
  --text: #c7d7d2;
  --muted: #71857f;
  --line: #1f332d;
  --line-hot: #32ff9a;
  --accent: #00e5ff;
  --warn: #ffcc00;
  --danger: #ff3864;
  --success: #39ff88;
  --shadow: 0 0 0 1px rgba(50,255,154,.16), 0 24px 70px rgba(0,0,0,.55);
  --shadow-sm: 0 0 0 1px rgba(50,255,154,.12), 0 14px 36px rgba(0,0,0,.38);
  --radius: 6px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: radial-gradient(circle at 10% 0%, rgba(26,115,232,.12), transparent 32rem), radial-gradient(circle at 90% 0%, rgba(45,164,78,.10), transparent 32rem), var(--bg);
  color: var(--text);
  min-height: 100vh;
}
a { color: inherit; }
.container { max-width: 1180px; margin: 0 auto; padding: 28px 22px 72px; }
.topbar { position: sticky; top: 0; z-index: 10; background: rgba(5,7,10,.92); color: var(--ink); border-bottom: 1px solid var(--line); box-shadow:0 0 24px rgba(50,255,154,.08); backdrop-filter: blur(12px); }
.nav-inner { max-width: 1180px; margin: 0 auto; padding: 14px 22px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
.brand { display:flex; align-items:center; gap:12px; text-decoration:none; }
.logo { width:44px; height:44px; position:relative; display:block; border-radius:var(--radius); background:#07100d; border:1px solid var(--line-hot); box-shadow:0 0 18px rgba(50,255,154,.22); overflow:hidden; }
.logo:before, .logo:after { content:""; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:var(--line-hot); box-shadow:0 0 14px rgba(50,255,154,.55); }
.logo:before { width:24px; height:5px; }
.logo:after { width:5px; height:24px; }
.logo i { position:absolute; inset:5px; border:1px solid rgba(0,229,255,.22); border-radius:3px; }
.brand strong { display:block; font-size:1rem; letter-spacing:.02em;  color:var(--ink); }
.brand-copy { display:block; }
.brand-copy span { display:block; font-size:.72rem; color:var(--muted); margin-top:2px; }
.nav-actions { display:flex; align-items:center; gap:10px; }
.hero-grid { display:grid; grid-template-columns: minmax(0, .95fr) minmax(380px, 1.05fr); gap:32px; align-items:start; padding-top:42px; }
.hero-copy { padding:22px 0; }
.eyebrow { color: var(--line-hot);  letter-spacing:.08em; font-weight:900; font-size:.75rem; margin-bottom:12px; text-shadow:0 0 14px rgba(50,255,154,.35); }
.hero-title { color:var(--ink); font-size: clamp(3rem, 6.4vw, 6rem); line-height:.92; letter-spacing:-.065em; max-width:720px;  }
.hero-title:before { content:''; display:block; width:64px; height:4px; margin-bottom:18px; background:var(--line-hot); box-shadow:0 0 18px rgba(50,255,154,.5); }
.lede { color:var(--text); font-size:clamp(1rem, 1.35vw, 1.14rem); line-height:1.55; max-width:650px; margin-top:22px; }
.lede:after { content:'_'; color:var(--line-hot); animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity:0; } }
.feature-row { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; margin-top:26px; max-width:650px; }
.feature, .stat { background:linear-gradient(180deg,var(--panel-2),var(--panel)); border:1px solid var(--line); border-radius:var(--radius); padding:14px; box-shadow:var(--shadow-sm); }
.feature b { display:block; color:var(--ink); font-size:.9rem;  }
.feature b:before { content:'◆ '; color:var(--accent); }
.feature span { display:block; color:var(--muted); font-size:.8rem; margin-top:6px; line-height:1.35; }
.stat-strip { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-top:20px; max-width:650px; }
.stat .num { font-size:2rem; font-weight:900; color:var(--line-hot); letter-spacing:-.04em; text-shadow:0 0 18px rgba(50,255,154,.28); }
.stat .label { color:var(--muted); font-size:.76rem; font-weight:800;  }
.card { background:linear-gradient(180deg, rgba(15,23,32,.96), rgba(8,13,18,.96)); border:1px solid var(--line); border-radius:var(--radius); box-shadow:var(--shadow); padding:28px; }
.create-card { position:relative; overflow:hidden; }
.create-card:before { content:""; position:absolute; inset:0 0 auto 0; height:2px; background:linear-gradient(90deg,var(--line-hot),var(--accent),transparent); box-shadow:0 0 20px rgba(50,255,154,.5); }
.card h2 { font-size:1.25rem; letter-spacing:-.02em; margin-bottom:8px; color:var(--ink);  }
.card h2:before { content:'[ '; color:var(--line-hot); } .card h2:after { content:' ]'; color:var(--line-hot); }
.card-subtitle { color:var(--muted); margin-bottom:20px; line-height:1.45; }
.btn, button { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px 20px; border-radius:var(--radius); font-size:.92rem; font-weight:900; cursor:pointer; border:none; transition: transform .12s, box-shadow .12s, background .12s, border-color .12s; text-decoration:none; line-height:1; white-space:nowrap;  letter-spacing:.01em; font-family:inherit; }
.btn:hover, button:hover { transform: translateY(-1px); }
.btn-primary { background:var(--line-hot); color:#031008; box-shadow:0 0 24px rgba(50,255,154,.22); border:1px solid var(--line-hot); }
.btn-primary:hover { background:#9affc7; box-shadow:0 0 34px rgba(50,255,154,.36); }
.btn-sm { padding:10px 14px; font-size:.78rem; }
.btn-outline { background:transparent; border:1px solid var(--line-hot); color:var(--line-hot); box-shadow:none; }
.btn-outline:hover { background:rgba(50,255,154,.08); }
.btn-ghost { background:transparent; color:var(--ink); border:1px solid #315447; box-shadow:none; }
.btn-success { background:var(--success); color:#031008; }
.btn-danger { background:var(--danger); color:#fff; }
input[type=text], input[type=url], input[type=password], textarea, select { width:100%; padding:14px 16px; border:1px solid #29453b; border-radius:var(--radius); font-size:.95rem; background:#05090c; color:var(--ink); transition:border .15s, box-shadow .15s; font-family:inherit; }
input::placeholder, textarea::placeholder { color:#51655f; }
input:focus, textarea:focus { outline:none; border-color:var(--line-hot); box-shadow:0 0 0 3px rgba(50,255,154,.12); }
textarea { resize:vertical; min-height:88px; }
.field { margin-bottom:16px; }
.field label { display:block; font-weight:900; margin-bottom:7px; font-size:.78rem; color:var(--muted);  letter-spacing:.07em; }
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.muted { color:var(--muted); }
.mt-8 { margin-top:8px; } .mt-16 { margin-top:16px; } .mt-24 { margin-top:24px; }
.text-center { text-align:center; }
.pill { display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border-radius:var(--radius); font-size:.68rem; font-weight:900;  letter-spacing:.08em; border:1px solid currentColor; }
.pill-active { background:rgba(57,255,136,.08); color:var(--success); }
.pill-closed { background:rgba(255,56,100,.08); color:var(--danger); }
.pill-warn { background:rgba(255,204,0,.08); color:var(--warn); }
.qa-grid { display:grid; grid-template-columns: minmax(0,1fr) minmax(280px,.45fr); gap:16px; align-items:start; }
.qa-item { border:1px solid var(--line); background:#05090c; border-radius:var(--radius); padding:14px; margin-top:10px; }
.qa-item strong { color:var(--ink); }
.qa-meta { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px; color:var(--muted); font-size:.78rem; }
.qa-vote { padding:8px 10px; font-size:.72rem; }
.qa-tabs { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.sessions-head { display:flex; justify-content:space-between; align-items:end; gap:16px; margin:34px 0 14px; }
.sessions-head h2 { color:var(--ink); font-size:1.55rem; letter-spacing:-.03em;  }
.sessions-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(330px,1fr)); gap:16px; }
.session-card { padding:0; overflow:hidden; }
.session-top { padding:22px 22px 16px; display:flex; justify-content:space-between; gap:14px; align-items:flex-start; }
.session-title { font-size:1.08rem; line-height:1.25; letter-spacing:-.015em; color:var(--ink);  }
.session-meta { color:var(--muted); margin-top:8px; font-size:.84rem; }
.session-actions { border-top:1px solid var(--line); padding:16px 22px 20px; display:flex; gap:10px; flex-wrap:wrap; }
.qr-mini { width:82px; min-width:82px; height:82px; border-radius:var(--radius); background:#fff; display:grid; place-items:center; border:1px solid var(--line-hot); overflow:hidden; padding:10px; filter: grayscale(1) contrast(1.2); }
.qr-mini img { width:62px; height:62px; display:block; }
.empty-state { text-align:center; padding:36px; color:var(--muted); }
.admin-shell { max-width:1180px; margin:0 auto; padding:28px 22px 72px; }
.admin-hero { display:grid; grid-template-columns:1fr auto; gap:20px; align-items:start; }
.kpi-grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:16px; margin:20px 0; }
.kpi { text-align:center; }
.kpi-value { font-size:2.4rem; font-weight:950; color:var(--line-hot); letter-spacing:-.06em; text-shadow:0 0 18px rgba(50,255,154,.25); }
.table-card { overflow:hidden; padding:0; }
table { width:100%; border-collapse:collapse; font-size:.86rem; }
th { background:#0b1512; color:var(--line-hot); text-align:left; padding:12px 16px; font-size:.72rem;  letter-spacing:.09em; }
td { padding:14px 16px; border-top:1px solid var(--line); vertical-align:top; }
.chip { display:inline-flex; align-items:center; border:1px solid #315447; border-radius:var(--radius); padding:8px 12px; font-size:.8rem; font-weight:900; cursor:pointer; transition:all .15s; user-select:none; margin:4px; background:#05090c; color:var(--text);  }
.chip:hover, .chip.selected { background:var(--line-hot); color:#031008; border-color:var(--line-hot); box-shadow:0 0 20px rgba(50,255,154,.18); }
.phone-bg { min-height:100vh; display:grid; place-items:start center; padding:22px 16px; background:linear-gradient(rgba(50,255,154,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(50,255,154,.035) 1px, transparent 1px), radial-gradient(circle at top, rgba(0,229,255,.10), transparent 28rem), var(--bg); background-size:28px 28px,28px 28px,auto,auto; }
.phone-card { width:min(100%,620px); }
.feedback-title { text-align:left; margin:8px 0 22px; border-left:2px solid var(--line-hot); padding-left:16px; }
.feedback-title h1 { font-size:clamp(2rem,7vw,3rem); line-height:1; letter-spacing:-.06em; color:var(--ink);  }
.star { font-size:1.25rem !important; user-select:none; transition:all .1s; display:block; border:1px solid #315447; padding:14px 16px; min-width:70px; text-align:center; color:var(--muted); background:#05090c; }
.star:hover { border-color:var(--line-hot); color:var(--line-hot); }
.sentiment-btn { text-align:center; padding:16px 22px; border-radius:var(--radius); border:1px solid #315447; transition:all .15s; min-width:118px; background:#05090c;  }
@media (max-width: 860px) { .hero-grid, .admin-hero, .qa-grid { grid-template-columns:1fr; } .feature-row, .stat-strip, .kpi-grid, .qa-tabs { grid-template-columns:1fr; } .hero-copy { padding-top:6px; } .hero-title { font-size:3.2rem; } .nav-inner { padding:12px 16px; } .container, .admin-shell { padding-left:16px; padding-right:16px; } }
@media (max-width: 560px) { .grid-2, .sessions-grid { grid-template-columns:1fr; } .card { padding:22px; } .session-top { flex-direction:column; } .qr-mini { width:100%; height:170px; } .qr-mini img { width:128px; height:128px; } .nav-actions .btn-ghost { display:none; } .star { min-width:50px; padding:12px 8px; } }
`;

function layout(title: string, body: string, showNav = true, auth: AuthContext = null) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — DevDays Feedback</title>
  <style>${BASE_CSS}</style>
</head>
<body>
${showNav ? `<header class="topbar">
  <div class="nav-inner">
    <a class="brand" href="/">
      <span class="logo" aria-hidden="true"><i></i></span>
      <span class="brand-copy"><strong>DevDays Feedback</strong><span>Talk Q&A and audience signals</span></span>
    </a>
    <nav class="nav-actions">
      <a href="/#sessions" class="btn btn-ghost btn-sm">Sessions</a>
      ${auth?.scope === "global_admin" ? `<a href="/#create" class="btn btn-ghost btn-sm">Create room</a>` : ""}
      ${auth ? `<form method="POST" action="/logout" style="display:inline"><button class="btn btn-ghost btn-sm">logout</button></form>` : ""}
    </nav>
  </div>
</header>` : ""}
${body}
</body>
</html>`;
}


function accessPanel(sessionId: string, auth: AuthContext, freshToken: string | null = null) {
  if (auth?.scope !== "global_admin") {
    return `<div class="card mt-16"><h2>Room operator access</h2><p class="muted">Access delegated for this room only. Capability rotation is organizer-only.</p></div>`;
  }
  const active = db.query<{ id: string; created_at: number; claimed_at: number | null }, [string]>("SELECT id, created_at, claimed_at FROM room_capabilities WHERE session_id = ? AND active = 1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1").get(sessionId);
  const opUrl = freshToken ? operatorLink(freshToken) : "";
  const presenterMessage = freshToken ? presenterPacket(sessionId, freshToken) : "";
  return `<div class="card mt-16">
    <h2>Room operator access</h2>
    <p class="muted">Operator links are shown only immediately after generation. ${active ? `Active link created ${new Date(active.created_at * 1000).toLocaleString()}${active.claimed_at ? `; last claimed ${new Date(active.claimed_at * 1000).toLocaleString()}` : ""}` : "No active operator link"}</p>
    ${freshToken ? `<div class="mt-16"><label class="muted" style="display:block;margin-bottom:6px;font-weight:900">operator link</label><input type="text" readonly value="${escHtml(opUrl)}" onclick="this.select()" /></div>
    <div class="mt-16"><label class="muted" style="display:block;margin-bottom:6px;font-weight:900">presenter message</label><textarea readonly rows="7" onclick="this.select()">${escHtml(presenterMessage)}</textarea></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap" class="mt-16"><button type="button" class="btn btn-primary btn-sm" data-copy="${escHtml(presenterMessage)}">copy presenter message</button><button type="button" class="btn btn-outline btn-sm" data-copy="${escHtml(opUrl)}">copy operator link</button></div>` : `<p class="muted mt-16">Regenerate to reveal a new copyable operator link.</p>`}
    <div style="display:flex;gap:8px;flex-wrap:wrap" class="mt-16">
      <form method="POST" action="/admin/talks/${sessionId}/capability/regenerate"><button class="btn btn-primary btn-sm">${active ? "regenerate link" : "generate link"}</button></form>
      ${active ? `<form method="POST" action="/admin/talks/${sessionId}/capability/revoke"><button class="btn btn-danger btn-sm">revoke link</button></form>` : ""}
    </div>
    <script>document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-copy]');if(!b)return;navigator.clipboard&&navigator.clipboard.writeText(b.dataset.copy);b.textContent='copied';setTimeout(()=>b.textContent=b.dataset.copy.startsWith('Your session')?'copy presenter message':'copy operator link',1200);});</script>
  </div>`;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function homePage(auth: AuthContext) {
  const sessions = db.query<
    { id: string; title: string; presenter: string; created_at: number; active: number; qa_state: QaState; count: number },
    []
  >(`
    SELECT s.*, COUNT(f.id) as count
    FROM sessions s
    LEFT JOIN feedback f ON f.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 20
  `).all();

  const totalResponses = sessions.reduce((sum, s) => sum + s.count, 0);
  const liveSessions = sessions.filter((s) => s.active).length;

  const sessionList = sessions.length === 0
    ? `<div class="card empty-state"><div style="font-size:2rem;color:var(--line-hot)">∅</div><h3 style="margin:10px 0;color:var(--ink)">No talks yet</h3><p>Create or load talks to begin collecting feedback.</p></div>`
    : sessions.map((s) => {
      const sessionUrl = sessionPublicUrl(s.id);
      return `<article class="card session-card">
        <div class="session-top">
          <div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
              <span class="pill ${s.active ? "pill-active" : "pill-closed"}">${s.active ? "● live" : "closed"}</span>
              <span class="pill" style="background:#ede9fe;color:#5b21b6">${s.count} signal${s.count !== 1 ? "s" : ""}</span>
            </div>
            <h3 class="session-title">${escHtml(s.title)}</h3>
            ${s.presenter ? `<p class="session-meta">presenter=${escHtml(s.presenter)}</p>` : ""}
            <p class="session-meta"><strong>attendee:</strong> <a href="/t/${s.id}" target="_blank">${escHtml(new URL(sessionUrl).pathname)}</a></p>
          </div>
        </div>
        <div class="session-actions">
          <a href="/admin/talks/${s.id}" class="btn btn-primary btn-sm">open control room</a>
        </div>
      </article>`;
    }).join("");

  const body = `<main class="container">
  <section class="hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Organizer dashboard</p>
      <h1 class="hero-title">Talk feedback, in one place.</h1>
      <p class="lede">Share one short talk link for slides, live Q&A, and audience feedback during the session.</p>
      <div class="feature-row">
        <div class="feature"><b>Talk pages</b><span>QR codes open the attendee page for each talk.</span></div>
        <div class="feature"><b>Live signals</b><span>Audience questions, votes, reactions, and comments arrive in real time.</span></div>
        <div class="feature"><b>Exportable</b><span>SQLite storage with CSV export for organizers.</span></div>
      </div>
      <div class="stat-strip" aria-label="Conference stats">
        <div class="stat"><div class="num">${sessions.length}</div><div class="label">talks</div></div>
        <div class="stat"><div class="num">${liveSessions}</div><div class="label">open</div></div>
        <div class="stat"><div class="num">${totalResponses}</div><div class="label">signals</div></div>
      </div>
    </div>

    ${auth?.scope === "global_admin" ? `<div class="card create-card" id="create">
      <p class="eyebrow" style="margin-bottom:8px">Add talk</p>
      <h2>Create talk page</h2>
      <p class="card-subtitle">Create a public attendee page with slides, Q&A, feedback, and QR sharing.</p>
      <form method="POST" action="/sessions">
        <div class="field">
          <label>talk title *</label>
          <input type="text" name="title" required placeholder="e.g. Building APIs People Love" />
        </div>
        <div class="grid-2">
          <div class="field">
            <label>presenter / operator</label>
            <input type="text" name="presenter" placeholder="e.g. Jane Smith" />
          </div>
          <div class="field">
            <label>time / room</label>
            <input type="text" name="description" placeholder="e.g. Main stage, 2:30 PM" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;padding:16px;font-size:1.05rem">create talk</button>
      </form>
    </div>` : `<div class="card create-card"><p class="eyebrow">admin access required</p><h2>Console locked</h2><p class="card-subtitle">Talk management is restricted. Unlock with the organizer key.</p><a href="/admin" class="btn btn-primary" style="width:100%">unlock admin console</a></div>`}
  </section>

  <section id="sessions">
    <div class="sessions-head">
      <div>
        <p class="eyebrow" style="margin-bottom:6px">Conference</p>
        <h2>Talks</h2>
      </div>
      <a class="btn btn-outline btn-sm" href="/admin/dashboard">Refresh</a>
    </div>
    <div class="sessions-grid">${sessionList}</div>
  </section>
</main>`;
  return layout("Home", body, true, auth);
}

function adminSessionPage(sessionId: string, auth: AuthContext, freshToken: string | null = null) {
  const session = db.query<
    SessionRow,
    [string]
  >("SELECT * FROM sessions WHERE id = ?").get(sessionId);

  if (!session) return null;

  const feedbacks = db.query<
    { id: string; rating: number; sentiment: string; comment: string; tags: string; submitted_at: number },
    [string]
  >("SELECT * FROM feedback WHERE session_id = ? ORDER BY submitted_at DESC").all(sessionId);

  const total = feedbacks.length;
  const withRating = feedbacks.filter((f) => f.rating != null);
  const avgRating = withRating.length
    ? (withRating.reduce((a, f) => a + f.rating, 0) / withRating.length).toFixed(1)
    : null;

  const sentimentCounts: Record<string, number> = {};
  feedbacks.forEach((f) => {
    if (f.sentiment) sentimentCounts[f.sentiment] = (sentimentCounts[f.sentiment] ?? 0) + 1;
  });

  const sessionUrl = sessionPublicUrl(session.id);

  const feedbackRows = feedbacks.slice(0, 100).map((f) => {
    const tags = f.tags ? JSON.parse(f.tags) as string[] : [];
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 14px;white-space:nowrap">${new Date(f.submitted_at * 1000).toLocaleTimeString()}</td>
      <td style="padding:10px 14px">${f.rating ? starRating(f.rating) : "—"}</td>
      <td style="padding:10px 14px">${sentimentEmoji(f.sentiment)}</td>
      <td style="padding:10px 14px">${tags.length ? tags.map((t) => `<span class="chip" style="font-size:0.75rem;padding:3px 9px;margin:2px">${escHtml(t)}</span>`).join("") : ""}</td>
      <td style="padding:10px 14px;max-width:240px;word-break:break-word">${escHtml(f.comment ?? "")}</td>
    </tr>`;
  }).join("");

  const body = `<div class="admin-shell">
  <div class="card admin-hero">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <p class="muted" style="font-size:0.8rem;letter-spacing:.05em">Session</p>
        <h1 style="font-size:1.6rem;font-weight:800;line-height:1.2;margin-bottom:4px">${escHtml(session.title)}</h1>
        ${session.presenter ? `<p class="muted">presenter / operator: ${escHtml(session.presenter)}</p>` : ""}
        ${session.description ? `<p class="muted">${escHtml(session.description)}</p>` : ""}
        <span class="pill ${session.active ? "pill-active" : "pill-closed"}" style="margin-top:6px">${session.active ? "open" : "closed"}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="/t/${session.id}" class="btn btn-primary btn-sm" target="_blank">view attendee page</a>
        ${session.slides_url ? `<a href="${escHtml(session.slides_url)}" class="btn btn-outline btn-sm" target="_blank" rel="noopener">open slides</a>` : ""}
        <a href="/admin/talks/${session.id}/export" class="btn btn-sm btn-outline">export CSV</a>
        <form method="POST" action="/admin/talks/${session.id}/toggle" style="display:inline">
          <button type="submit" class="btn btn-sm ${session.active ? "btn-danger" : "btn-success"}">
            ${session.active ? "close attendee page" : "reopen attendee page"}
          </button>
        </form>
      </div>
    </div>
  </div>

  <div class="card" id="share">
    <p class="eyebrow" style="margin-bottom:8px">Share</p>
    <h2>Audience link and QR</h2>
    <p class="muted mt-8">Use this one public link for slides, questions, and feedback. This is safe to show on screen.</p>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin-top:16px">
      <div>
        <label class="muted" style="display:block;margin-bottom:6px;font-weight:900">Attendee page</label>
        <input type="text" readonly value="${escHtml(sessionUrl)}" onclick="this.select()" />
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <a href="/t/${session.id}" class="btn btn-primary btn-sm" target="_blank">open attendee page</a>
          <button type="button" class="btn btn-outline btn-sm" data-copy="${escHtml(sessionUrl)}">copy link</button>
        </div>
      </div>
      <a class="qr-mini" href="/admin/talks/${session.id}/qr" title="Open large QR page" style="width:132px;height:132px;text-decoration:none"><img src="${qrImageUrl(sessionUrl, 220)}" alt="QR code" style="width:110px;height:110px"><span class="muted" style="position:absolute;left:-9999px">Open large QR page</span></a>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="card kpi" style="padding:20px">
      <div class="kpi-value">${total}</div>
      <div class="muted">signals</div>
    </div>
    <div class="card kpi" style="padding:20px">
      <div class="kpi-value">${avgRating ?? "—"}</div>
      <div class="muted">avg rating${withRating.length > 0 ? ` (${withRating.length} rated)` : ""}</div>
    </div>
  </div>

  ${Object.keys(sentimentCounts).length > 0 ? `
  <div class="card" style="padding:16px 20px">
    <h2 style="margin-bottom:12px">clarity breakdown</h2>
    <div style="display:flex;gap:20px;flex-wrap:wrap">
      ${Object.entries(sentimentCounts).map(([k, v]) => `
        <div style="text-align:center">
          <div style="font-size:2rem">${sentimentEmoji(k)}</div>
          <div style="font-weight:700">${v}</div>
          <div class="muted" style="font-size:0.8rem">${k}</div>
        </div>
      `).join("")}
    </div>
  </div>` : ""}

  <div class="card" id="questions">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
      <div><p class="eyebrow" style="margin-bottom:8px">Questions</p><h2>Audience Q&A</h2><p class="muted">Public questions from attendees. Open/pause question intake and moderate what appears on screen.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${["open", "paused", "closed"].map((st) => `<form method="POST" action="/admin/talks/${session.id}/state/${st}"><button class="btn btn-outline btn-sm">${st}</button></form>`).join("")}
        <a class="btn btn-outline btn-sm" href="/slides/s/${session.id}/qa" target="_blank">Projector view</a>
      </div>
    </div>
    ${publicQuestions(session.id, true).length ? publicQuestions(session.id, true).map((q) => `<div class="qa-item"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><strong>${escHtml(q.display_text)}</strong><span class="pill ${q.status === "live" || q.status === "pinned" ? "pill-active" : q.status === "answered" ? "pill-warn" : "pill-closed"}">${q.status}</span></div><div class="qa-meta"><span>score=${q.support_count}</span><span>${new Date(q.created_at * 1000).toLocaleTimeString()}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${q.status !== "pinned" ? `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/pin"><button class="btn btn-outline btn-sm">pin</button></form>` : `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/unpin"><button class="btn btn-outline btn-sm">unpin</button></form>`}<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/answer"><button class="btn btn-success btn-sm">answered</button></form><form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/hide"><button class="btn btn-danger btn-sm">hide</button></form></div></div>`).join("") : `<p class="muted mt-16">No questions yet.</p>`}
  </div>

  ${total > 0 ? `
  <div class="card table-card" id="feedback" style="overflow-x:auto">
    <div style="padding:16px 20px 0"><p class="eyebrow" style="margin-bottom:8px">Feedback</p><h2>Live signals and comments</h2><p class="muted mt-8">Private audience feedback for the presenter/organizer. Questions are managed separately above.</p></div>
    <table style="width:100%;border-collapse:collapse;font-size:0.875rem">
      <thead>
        <tr style="background:var(--bg);border-bottom:2px solid var(--border)">
          <th style="padding:10px 14px;text-align:left">Time</th>
          <th style="padding:10px 14px;text-align:left">Rating</th>
          <th style="padding:10px 14px;text-align:left">Feel</th>
          <th style="padding:10px 14px;text-align:left">Tags</th>
          <th style="padding:10px 14px;text-align:left">Comment</th>
        </tr>
      </thead>
      <tbody>${feedbackRows}</tbody>
    </table>
  </div>` : `<div class="card text-center" id="feedback"><p class="eyebrow" style="margin-bottom:8px">Feedback</p><h2>Live signals and comments</h2><p class="muted mt-8">No feedback yet. Share the attendee page and invite people to send signals any time.</p></div>`}

  <div id="access">${accessPanel(session.id, auth, freshToken)}</div>
</div>`;

  return layout(`Admin: ${session.title}`, body, true, auth);
}

function qaAdminPage(sessionId: string, auth: AuthContext) {
  const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  processQaFallback(sessionId, 50);
  const counts = db.query<{ status: string; c: number }, [string]>("SELECT status, COUNT(*) AS c FROM qa_questions WHERE session_id = ? GROUP BY status").all(sessionId);
  const count = (status: string) => counts.find((c) => c.status === status)?.c ?? 0;
  const rows = db.query<QaQuestionRow, [string]>("SELECT * FROM qa_questions WHERE session_id = ? ORDER BY pinned DESC, status='pinned' DESC, status='live' DESC, priority DESC, support_count DESC, created_at ASC").all(sessionId);
  const pending = db.query<{ id: string; raw_text: string; status: string; submitted_at: number }, [string]>("SELECT id, raw_text, status, submitted_at FROM qa_question_submissions WHERE session_id = ? AND status IN ('pending','held','rejected') ORDER BY submitted_at DESC LIMIT 50").all(sessionId);
  const runs = db.query<{ id: string; status: string; started_at: number; finished_at: number | null; summary: string | null; error: string | null }, [string]>("SELECT id, status, started_at, finished_at, summary, error FROM qa_agent_runs WHERE session_id = ? ORDER BY started_at DESC LIMIT 8").all(sessionId);
  const statePill = session.qa_state === "open" ? "pill-active" : session.qa_state === "paused" ? "pill-warn" : "pill-closed";
  const questionCard = (q: QaQuestionRow) => `<div class="qa-item">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><strong>${escHtml(q.display_text)}</strong><span class="pill ${q.status === "live" || q.status === "pinned" ? "pill-active" : q.status === "held" ? "pill-warn" : "pill-closed"}">${q.status}</span></div>
    <div class="qa-meta"><span>support=${q.support_count}</span><span>priority=${q.priority}</span><span>created=${new Date(q.created_at * 1000).toLocaleTimeString()}</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      ${q.status !== "pinned" ? `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/pin"><button class="btn btn-outline btn-sm">pin</button></form>` : `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/unpin"><button class="btn btn-outline btn-sm">unpin</button></form>`}
      ${q.status !== "answered" ? `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/answer"><button class="btn btn-success btn-sm">answered</button></form>` : `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/restore"><button class="btn btn-outline btn-sm">restore</button></form>`}
      ${q.status === "hidden" ? `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/restore"><button class="btn btn-outline btn-sm">restore</button></form>` : `<form method="POST" action="/admin/talks/${session.id}/questions/${q.id}/hide"><button class="btn btn-danger btn-sm">hide</button></form>`}
    </div>
  </div>`;
  const body = `<div class="admin-shell">
    <div class="card admin-hero">
      <div>
        <p class="eyebrow">Q&A control room</p>
        <h1 style="color:var(--ink);text-transform:uppercase">${escHtml(session.title)}</h1>
        <p class="muted">Review questions, mark answered, and control whether new questions are accepted.</p>
        <span class="pill ${statePill}" style="margin-top:10px">qa=${session.qa_state}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${["open", "paused", "closed"].map((st) => `<form method="POST" action="/admin/talks/${session.id}/state/${st}"><button class="btn btn-outline btn-sm">${st}</button></form>`).join("")}
        <form method="POST" action="/admin/talks/${session.id}/run"><button class="btn btn-primary btn-sm">process questions</button></form>
        <a class="btn btn-outline btn-sm" href="/slides/t/${session.id}/qa" target="_blank">slides</a>
        <a class="btn btn-ghost btn-sm" href="/admin/talks/${session.id}">feedback</a>
      </div>
    </div>
    <div class="qa-tabs mt-16">
      <div class="card kpi"><div class="kpi-value">${count("live") + count("pinned")}</div><div class="muted">live queue</div></div>
      <div class="card kpi"><div class="kpi-value">${pending.length}</div><div class="muted">pending/held raw</div></div>
      <div class="card kpi"><div class="kpi-value">${count("answered")}</div><div class="muted">answered</div></div>
      <div class="card kpi"><div class="kpi-value">${count("hidden") + count("rejected")}</div><div class="muted">hidden/rejected</div></div>
    </div>
    <div class="qa-grid mt-16">
      <section class="card"><h2>Questions</h2>${rows.length ? rows.map(questionCard).join("") : `<p class="muted">No questions yet.</p>`}</section>
      <aside class="card"><h2>Recent submitted questions</h2>${pending.length ? pending.map((p) => `<div class="qa-item"><strong>${escHtml(p.raw_text)}</strong><div class="qa-meta"><span>${p.status}</span><span>${new Date(p.submitted_at * 1000).toLocaleTimeString()}</span></div></div>`).join("") : `<p class="muted">No pending submitted questions.</p>`}
      <h2 class="mt-24">Processing history</h2>${runs.length ? runs.map((r) => `<div class="qa-item"><strong>${escHtml(r.status)}</strong><div class="qa-meta"><span>${new Date(r.started_at * 1000).toLocaleTimeString()}</span>${r.finished_at ? `<span>done=${new Date(r.finished_at * 1000).toLocaleTimeString()}</span>` : ""}</div>${r.summary ? `<p class="muted mt-8">${escHtml(r.summary)}</p>` : ""}${r.error ? `<p style="color:var(--danger)" class="mt-8">${escHtml(r.error)}</p>` : ""}</div>`).join("") : `<p class="muted">No processing runs recorded.</p>`}</aside>
    </div>
  </div>`;
  return layout(`Q&A: ${session.title}`, body, true, auth);
}

function qrPage(sessionId: string, auth: AuthContext, freshToken: string | null = null) {
  const session = db.query<{ id: string; title: string; presenter: string }, [string]>(
    "SELECT id, title, presenter FROM sessions WHERE id = ?"
  ).get(sessionId);
  if (!session) return null;

  const sessionUrl = sessionPublicUrl(session.id);

  const body = `<div class="admin-shell text-center">
  <div class="card" style="padding:34px;margin-top:24px">
    <h1 style="font-size:1.6rem;margin-bottom:4px">${escHtml(session.title)}</h1>
    ${session.presenter ? `<p class="muted" style="margin-bottom:20px">${escHtml(session.presenter)}</p>` : `<div style="margin-bottom:20px"></div>`}
    <div style="display:inline-block;background:#fff;padding:24px;margin:0 auto 20px;border:1px solid var(--line-hot);box-shadow:0 0 30px rgba(50,255,154,.16)"><div id="qrcode" style="display:flex;justify-content:center"></div></div>
    <p style="font-size:0.95rem;background:var(--bg);padding:10px 16px;border-radius:8px;word-break:break-all;margin-bottom:20px">
      ${escHtml(sessionUrl)}
    </p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="/t/${session.id}" class="btn btn-primary" target="_blank">open attendee page form</a>
      <a href="/admin/talks/${session.id}" class="btn btn-outline">back to control room</a>
    </div>
  </div>
  ${accessPanel(session.id, auth, freshToken)}
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
  new QRCode(document.getElementById("qrcode"), {
    text: ${JSON.stringify(sessionUrl)},
    width: 260,
    height: 260,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
</script>`;

  return layout(`QR Code: ${session.title}`, body, true, auth);
}

function attendeePage(sessionId: string) {
  const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sessionId);

  if (!session) return null;

  if (!session.active) {
    return layout(
      session.title,
      `<div class="container text-center" style="padding-top:60px">
        <div class="card">
          <div style="font-size:2rem;color:var(--danger)">[closed]</div>
          <h2 style="margin:12px 0 8px">Talk page closed</h2>
          <p class="muted">Talk <strong>${escHtml(session.title)}</strong> is no longer being collected.</p>
        </div>
      </div>`,
      false
    );
  }

  processQaFallback(sessionId, 20);
  const qaOpen = session.qa_enabled && session.qa_state === "open";
  const qaQuestions = publicQuestions(sessionId, true).slice(0, 12);
  const qaPanel = session.qa_enabled ? `<section class="card" id="qaPanel">
    <p class="eyebrow" style="margin-bottom:8px">Questions</p>
    <h2>Ask a question</h2>
    <p class="muted mt-8">Questions are public to the room.</p>
    ${qaOpen ? `<form id="qaForm" class="mt-16">
      <textarea name="question" id="qaQuestion" maxlength="1000" required placeholder="Ask a concise question for the presenter…"></textarea>
      <button type="submit" class="btn btn-primary mt-8" style="width:100%">submit question</button>
      <p class="muted mt-8" id="qaStatus"></p>
    </form>` : `<p class="muted mt-16">Questions are closed right now.</p>`}
    <div class="mt-24" style="border-top:1px solid var(--line);padding-top:16px">
      <h2 style="font-size:1.05rem">Questions from the room</h2>
      <p class="muted mt-8">Vote on questions you want the presenter to answer.</p>
      <div id="qaPublic" class="mt-16">
        ${qaQuestions.length ? qaQuestions.map((q) => `<div class="qa-item" data-qid="${q.id}"><strong>${escHtml(q.display_text)}</strong><div class="qa-meta"><button type="button" class="btn btn-outline qa-vote" data-vote="${q.id}" data-dir="up">👍 up</button><button type="button" class="btn btn-outline qa-vote" data-vote="${q.id}" data-dir="down">👎 down</button><span>score=${q.support_count}</span></div></div>`).join("") : `<p class="muted">No questions yet.</p>`}
      </div>
    </div>
  </section>` : "";

  const QUICK_TAGS = ["Makes sense", "Confused", "Too fast", "Too slow", "Great demo", "More demos", "More depth", "Useful example"];

  const body = `<div class="phone-bg"><div class="phone-card" style="padding-top:10px;padding-bottom:34px">
  <div class="feedback-title">
    <div style="font-size:0.85rem;letter-spacing:.06em;color:var(--muted);margin-bottom:4px">Talk</div>
    <h1 >${escHtml(session.title)}</h1>
    ${session.presenter ? `<p class="muted" style="margin-top:4px">${escHtml(session.presenter)}</p>` : ""}
    ${session.description ? `<p class="muted" style="margin-top:4px;font-size:0.9rem">${escHtml(session.description)}</p>` : ""}
  </div>

  <div class="card" style="margin-bottom:16px">
    <p class="eyebrow" style="margin-bottom:8px">Slides</p>
    <h2>Open the deck</h2>
    <p class="muted mt-8">Leave this page open and launch the slides in a new tab.</p>
    ${session.slides_url ? `<a class="btn btn-primary mt-16" href="${escHtml(session.slides_url)}" target="_blank" rel="noopener" style="width:100%">Open slides</a>` : `<p class="muted mt-16">Slides link coming soon.</p>`}
  </div>

  ${qaPanel}

  <form method="POST" action="/t/${session.id}/submit" id="feedbackForm">
    <div class="card">
      <p class="eyebrow" style="margin-bottom:8px">Feedback</p>
      <h2>Send a private signal</h2>
      <p class="muted mt-8">This goes to the presenter/organizer, not the public question list. Send updates any time.</p>
      <div style="margin-top:12px">
        ${QUICK_TAGS.map((t) => `<span class="chip" data-tag="${escHtml(t)}" tabindex="0" role="checkbox" aria-checked="false">${escHtml(t)}</span>`).join("")}
      </div>
      <input type="hidden" name="tags" id="tagsInput" value="[]" />
    </div>

    <div class="card">
      <h2>Add a note <span class="muted" style="font-size:0.85rem;font-weight:400">(optional)</span></h2>
      <div style="margin-top:12px;position:relative">
        <textarea name="comment" id="commentArea" rows="3" placeholder="Optional: what should the presenter know?"></textarea>
        <button type="button" id="micBtn" title="Dictate" aria-label="Start dictation" style="position:absolute;bottom:10px;right:10px;width:54px;height:34px;padding:0;font-size:.72rem">MIC</button>
      </div>
      <p class="muted mt-8" style="font-size:0.8rem" id="micStatus"></p>
    </div>

    <button type="submit" class="btn btn-primary" style="width:100%;font-size:1.1rem;padding:16px">
      send feedback
    </button>
  </form>
</div></div>

<script>
// Q&A attendee page/support
const qaForm = document.getElementById('qaForm');
const qaStatus = document.getElementById('qaStatus');
const qaPublic = document.getElementById('qaPublic');
async function refreshQa() {
  if (!qaPublic) return;
  const res = await fetch('/api/sessions/${session.id}/qa/public.json');
  if (!res.ok) return;
  const data = await res.json();
  qaPublic.innerHTML = data.questions.length ? data.questions.map((q) => '<div class="qa-item"><strong>' + escapeHtml(q.text) + '</strong><div class="qa-meta"><button type="button" class="btn btn-outline qa-vote" data-vote="' + q.id + '" data-dir="up">👍 up</button><button type="button" class="btn btn-outline qa-vote" data-vote="' + q.id + '" data-dir="down">👎 down</button><span>score=' + q.support_count + '</span></div></div>').join('') : '<p class="muted">No questions yet.</p>';
}
function escapeHtml(s) { return String(s).replace(/[&<>\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
qaForm && qaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = document.getElementById('qaQuestion').value.trim();
  if (!question) return;
  qaStatus.textContent = 'Submitting question…';
  const res = await fetch('/api/sessions/${session.id}/qa/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ question }) });
  const data = await res.json().catch(() => ({}));
  qaStatus.textContent = res.ok ? 'Question submitted.' : ('Error: ' + (data.message || data.error || 'Question could not be saved.')); console[res.ok ? 'info' : 'warn']('qa submit response', res.status, data);
  if (res.ok) { document.getElementById('qaQuestion').value = ''; setTimeout(refreshQa, 250); }
});
document.addEventListener('click', async (e) => {
  const btn = e.target.closest && e.target.closest('[data-vote]');
  if (!btn) return;
  btn.disabled = true;
  const res = await fetch('/api/sessions/${session.id}/qa/questions/' + btn.dataset.vote + '/vote', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ value: btn.dataset.dir === 'down' ? -1 : 1 }) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.message || data.error || 'Vote could not be saved.');
  }
  await refreshQa();
});
setInterval(refreshQa, 8000);

// Feedback signals
const chips = document.querySelectorAll('.chip[data-tag]');
const tagsInput = document.getElementById('tagsInput');
let selectedTags = new Set();
function updateTags() {
  tagsInput.value = JSON.stringify([...selectedTags]);
  chips.forEach((c) => {
    c.classList.toggle('selected', selectedTags.has(c.dataset.tag));
    c.setAttribute('aria-checked', selectedTags.has(c.dataset.tag) ? 'true' : 'false');
  });
}
chips.forEach((c) => {
  c.addEventListener('click', () => {
    selectedTags.has(c.dataset.tag) ? selectedTags.delete(c.dataset.tag) : selectedTags.add(c.dataset.tag);
    updateTags();
  });
  c.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); c.click(); }});
});

// Dictation
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const commentArea = document.getElementById('commentArea');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  micBtn.style.display = 'none';
} else {
  let recog = null;
  let listening = false;
  micBtn.addEventListener('click', () => {
    if (listening) { recog && recog.stop(); return; }
    recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    let baseText = commentArea.value;
    if (baseText && !baseText.endsWith(' ')) baseText += ' ';
    recog.onstart = () => { listening = true; micBtn.textContent = 'REC'; micBtn.style.background = 'var(--danger)'; micStatus.textContent = 'mic open // listening'; };
    recog.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) baseText += final;
      commentArea.value = baseText + interim;
    };
    recog.onerror = () => { micStatus.textContent = 'mic_error // check browser permissions'; };
    recog.onend = () => { listening = false; micBtn.textContent = 'MIC'; micBtn.style.background = 'var(--line-hot)'; micStatus.textContent = ''; commentArea.value = baseText.trimEnd(); };
    recog.start();
  });
}
</script>`;

  return layout(session.title, body, false);
}

function slidesQaPage(sessionId: string) {
  const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  const body = `<div class="container" style="max-width:1100px">
    <div class="feedback-title"><div style="font-size:.85rem;color:var(--muted);text-transform:uppercase">Projector Q&A</div><h1>${escHtml(session.title)}</h1></div>
    <div id="slideQa" class="card"><p class="muted">loading queue…</p></div>
  </div>
  <script>
    const box = document.getElementById('slideQa');
    function esc(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
    async function tick(){
      const res = await fetch('/api/sessions/${session.id}/qa/slides.json');
      const data = await res.json();
      box.innerHTML = '<h2>Audience questions</h2>' + (data.questions.length ? data.questions.slice(0,8).map((q,i)=>'<div class="qa-item" style="font-size:1.25rem"><div class="muted">#'+(i+1)+' support='+q.support_count+'</div><strong>'+esc(q.text)+'</strong></div>').join('') : '<p class="muted">No questions yet.</p>');
    }
    tick(); setInterval(tick, 5000);
  </script>`;
  return layout(`Slides Q&A: ${session.title}`, body, false);
}

function thankYouPage(sessionId: string, sessionTitle: string) {
  return layout(
    "Thanks",
    `<div class="container text-center" style="padding-top:60px">
      <div class="card">
        <div style="font-size:4rem;color:var(--line-hot)">Thanks</div>
        <h1 style="font-size:1.8rem;margin:16px 0 8px">Thanks</h1>
        <p class="muted">Feedback for <strong>${escHtml(sessionTitle)}</strong> was received.</p>
        <p class="muted mt-16" style="font-size:0.85rem">You can send more feedback anytime.</p>
        <a href="/t/${sessionId}" class="btn btn-outline" style="margin-top:24px;display:inline-block">back to talk page</a>
      </div>
    </div>`,
    false
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "8000", 10);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const auth = await getAuth(req);
    const isAdminPost = method === "POST" && (path === "/sessions" || path === "/api/admin/sessions" || path.startsWith("/admin/") || path === "/logout");
    if (isAdminPost && !sameOriginOk(req)) return html("<h1>Forbidden</h1>", 403);

    if (path === "/" && method === "GET") return redirect("/admin");

    if ((path === "/admin" || path === "/admin/dashboard") && method === "GET") return auth?.scope === "global_admin" ? html(homePage(auth)) : html(lockedConsole("admin"));

    if (path === "/admin/login" && method === "POST") {
      const form = await req.formData();
      const key = String(form.get("key") ?? "");
      if (key !== ADMIN_KEY) return html(lockedConsole("admin"), 401);
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

    if (path === "/sessions" && method === "POST") {
      const form = await req.formData();
      const title = String(form.get("title") ?? "").trim().slice(0, 160);
      const presenter = String(form.get("presenter") ?? "").trim().slice(0, 120);
      const description = String(form.get("description") ?? "").trim().slice(0, 240);
      if (!title) return redirect("/admin/dashboard");
      const id = randomId("s");
      if (auth?.scope !== "global_admin") return html(lockedConsole("admin"), 401);
      db.query("INSERT INTO sessions (id, title, presenter, description, qa_state, qa_mode, qa_display_mode, qa_enabled, short_code, feedback_state) VALUES (?, ?, ?, ?, 'open', 'moderated', 'queue', 1, ?, 'open')").run(id, title, presenter, description, id);
      const capToken = await createRoomCapability(id);
      const page = qrPage(id, auth, capToken);
      return page ? html(page) : redirect(`/admin/talks/${id}/qr`);
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
      db.query("INSERT INTO sessions (id, title, presenter, description, qa_state, qa_mode, qa_display_mode, qa_enabled, short_code, feedback_state) VALUES (?, ?, ?, ?, ?, 'moderated', 'queue', 1, ?, 'open')").run(id, title, presenter, description, qaState, id);
      const capToken = await createRoomCapability(id);
      const session = db.query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?").get(id)!;
      return json({ ...sessionPacket(session), operator_link: operatorLink(capToken), presenter_message: presenterPacket(id, capToken) }, 201);
    }


    const oldAdminMatch = path.match(/^\/admin\/([a-z0-9]+)$/);
    if (oldAdminMatch && method === "GET") return redirect(`/admin/talks/${oldAdminMatch[1]}`);

    const adminMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)$/);
    if (adminMatch && method === "GET") {
      if (!canManageRoom(auth, adminMatch[1])) return html(lockedConsole("room"), 401);
      const page = adminSessionPage(adminMatch[1], auth);
      return page ? html(page) : html("<h1>Session not found</h1>", 404);
    }

    const qaStateMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/state\/(open|paused|closed)$/);
    if (qaStateMatch && method === "POST") {
      const [_, sid, state] = qaStateMatch;
      if (!canManageRoom(auth, sid)) return html(lockedConsole("room"), 401);
      db.query("UPDATE sessions SET qa_state = ? WHERE id = ?").run(state, sid);
      recordModeratorAction(sid, null, `state:${state}`);
      return redirect(`/admin/talks/${sid}`);
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
      qaPayload(sid, "public"); qaPayload(sid, "presenter"); qaPayload(sid, "slides");
      return redirect(`/admin/talks/${sid}`);
    }

    const qrMatch = path.match(/^\/admin\/talks\/([a-z0-9]+)\/qr$/);
    if (qrMatch && method === "GET") {
      if (!canManageRoom(auth, qrMatch[1])) return html(lockedConsole("room"), 401);
      const page = qrPage(qrMatch[1], auth);
      return page ? html(page) : html("<h1>Session not found</h1>", 404);
    }

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
      const page = adminSessionPage(sid, auth, capToken);
      return page ? html(page) : html("<h1>Session not found</h1>", 404);
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
      return json({ ok: true }, 202, isNew ? { "Set-Cookie": cookieHeader(key) } : {});
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
        const qid = await promoteSubmissionFallback(sid, qsid, text);
        qaPayload(sid, "public"); qaPayload(sid, "presenter"); qaPayload(sid, "slides");
        console.info(JSON.stringify({ event: "qa_question_received", session_id: sid, submission_id: qsid, question_id: qid, length: text.length }));
        return json({ ok: true, status: "received", submission_id: qsid, question_id: qid }, 202, cookieHeaders);
      } catch (err) {
        console.error(JSON.stringify({ event: "qa_question_error", session_id: sid, error: String(err), stack: err instanceof Error ? err.stack : undefined }));
        return json({ error: "server_error", message: "Question could not be saved. Please try again." }, 500, cookieHeaders);
      }
    }

    const qaApiVoteMatch = path.match(/^\/api\/sessions\/([a-z0-9]+)\/qa\/questions\/([a-z0-9]+)\/(?:upvote|vote)$/);
    if (qaApiVoteMatch && method === "POST") {
      const [, sid, qid] = qaApiVoteMatch;
      const { key, isNew } = getSubmitterKey(req);
      const q = db.query<QaQuestionRow, [string, string]>("SELECT * FROM qa_questions WHERE id=? AND session_id=?").get(qid, sid);
      if (!q || ["hidden", "rejected", "merged"].includes(q.status)) return json({ error: "not_found" }, 404, isNew ? { "Set-Cookie": cookieHeader(key) } : {});
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const voteValue = Number(body.value) < 0 ? -1 : 1;
      db.query("INSERT INTO qa_question_votes (id, session_id, question_id, submitter_key, value) VALUES (?, ?, ?, ?, ?) ON CONFLICT(question_id, submitter_key) DO UPDATE SET value = excluded.value, created_at = unixepoch()").run(randomId("v"), sid, qid, key, voteValue);
      recordInteraction(sid, key, "question_vote", voteValue, null, qid);
      recomputeSupport(qid);
      const updated = db.query<QaQuestionRow, [string]>("SELECT * FROM qa_questions WHERE id=?").get(qid)!;
      qaPayload(sid, "public"); qaPayload(sid, "presenter"); qaPayload(sid, "slides");
      return json({ ok: true, question_id: qid, support_count: updated.support_count }, 200, isNew ? { "Set-Cookie": cookieHeader(key) } : {});
    }

    const slidesMatch = path.match(/^\/(?:embed|slides)\/(?:s|t)\/([a-z0-9]+)\/qa$/);
    if (slidesMatch && method === "GET") {
      const page = slidesQaPage(slidesMatch[1]);
      return page ? html(page) : html("<h1>Session not found</h1>", 404);
    }

    const shortAttendeeMatch = path.match(/^\/s\/([a-z0-9]+)$/);
    if (shortAttendeeMatch && method === "GET") return redirect(`/t/${shortAttendeeMatch[1]}`);

    const attendeeMatch = path.match(/^\/t\/([a-z0-9]+)$/);
    if (attendeeMatch && method === "GET") {
      const page = attendeePage(attendeeMatch[1]);
      return page ? html(page) : html("<h1>Session not found</h1>", 404);
    }

    const submitMatch = path.match(/^\/t\/([a-z0-9]+)\/submit$/);
    if (submitMatch && method === "POST") {
      const sid = submitMatch[1];
      const session = db.query<{ title: string; active: number }, [string]>(
        "SELECT title, active FROM sessions WHERE id = ?"
      ).get(sid);
      if (!session) return html("<h1>Session not found</h1>", 404);
      if (!session.active) return redirect(`/t/${sid}`);

      const form = await req.formData();
      const ratingRaw = form.get("rating");
      const rating = ratingRaw ? parseInt(String(ratingRaw), 10) : null;
      const sentiment = form.get("sentiment") ? String(form.get("sentiment")) : null;
      const comment = String(form.get("comment") ?? "").trim() || null;
      const tagsRaw = String(form.get("tags") ?? "[]");
      let tags = "[]";
      try {
        const parsed = JSON.parse(tagsRaw);
        if (Array.isArray(parsed)) tags = JSON.stringify(parsed.slice(0, 10).map(String));
      } catch {}

      const { key, isNew } = getSubmitterKey(req);
      const fid = randomId("f");
      db.query("INSERT INTO feedback (id, session_id, rating, sentiment, comment, tags) VALUES (?, ?, ?, ?, ?, ?)").run(
        fid, sid, rating, sentiment, comment, tags
      );
      recordInteraction(sid, key, "feedback", sentiment ?? rating, comment, fid, { rating, sentiment, tags: JSON.parse(tags) });
      const response = html(thankYouPage(sid, session.title));
      if (isNew) response.headers.append("Set-Cookie", cookieHeader(key));
      return response;
    }

    if (path === "/favicon.ico") return new Response(null, { status: 204 });

    return html("<h1>Not found</h1>", 404);
  },
});

console.log(`🎙️  DevDays Feedback running on http://localhost:${PORT}`);
