import { Database } from "bun:sqlite";

export type DB = Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  presenter TEXT,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  qa_state TEXT NOT NULL DEFAULT 'open',
  qa_mode TEXT NOT NULL DEFAULT 'moderated',
  qa_display_mode TEXT NOT NULL DEFAULT 'queue',
  qa_enabled INTEGER NOT NULL DEFAULT 1,
  slides_url TEXT,
  short_code TEXT,
  feedback_state TEXT NOT NULL DEFAULT 'open',
  ai_context TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  rating INTEGER,
  sentiment TEXT,
  comment TEXT,
  tags TEXT,
  submitted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id, submitted_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  session_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS room_capabilities (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  claimed_at INTEGER,
  last_used_at INTEGER,
  revoked_at INTEGER,
  expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_caps_session ON room_capabilities(session_id);

CREATE TABLE IF NOT EXISTS qa_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  display_text TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  priority REAL NOT NULL DEFAULT 0,
  support_count INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  human_override INTEGER NOT NULL DEFAULT 0,
  source_submission_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  answered_at INTEGER,
  hidden_at INTEGER,
  merged_into_question_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_themes_session ON qa_questions(session_id, status);

CREATE TABLE IF NOT EXISTS qa_question_submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  submitter_key TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  normalized_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  question_id TEXT,
  submitted_at INTEGER NOT NULL,
  processed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_subs_session ON qa_question_submissions(session_id, status);
CREATE INDEX IF NOT EXISTS idx_subs_dedupe ON qa_question_submissions(session_id, submitter_key, normalized_hash);

CREATE TABLE IF NOT EXISTS qa_question_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL,
  submitter_key TEXT NOT NULL,
  value INTEGER NOT NULL,
  target_kind TEXT NOT NULL DEFAULT 'raw',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(question_id, submitter_key)
);

CREATE TABLE IF NOT EXISTS qa_agent_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  input_path TEXT,
  output_path TEXT,
  error TEXT,
  summary TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_runs_session ON qa_agent_runs(session_id, started_at);

CREATE TABLE IF NOT EXISTS qa_agent_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_published_views (
  session_id TEXT NOT NULL,
  view TEXT NOT NULL,
  payload TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, view)
);

CREATE TABLE IF NOT EXISTS qa_moderator_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  question_id TEXT,
  action TEXT NOT NULL,
  actor_scope TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS attendee_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  submitter_key TEXT,
  kind TEXT NOT NULL,
  value TEXT,
  body TEXT,
  target_id TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON attendee_interactions(session_id, kind, created_at);
`;

export function createDb(path?: string): Database {
  const dbPath = path ?? process.env.DB_PATH ?? "feedback.db";
  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}
