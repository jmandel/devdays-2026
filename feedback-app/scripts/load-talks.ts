import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "./feedback.db";
const TALKS_MD = process.env.TALKS_MD ?? "../prep/talks.md";
const SLIDES_BASE_URL = (process.env.SLIDES_BASE_URL ?? "https://jmandel.github.io/devdays-2026").replace(/\/$/, "");
const db = new Database(DB_PATH);

const slidePaths: Record<string, string> = {
  smart: "decks/smart-ecosystem/deck.html",
  ktc: "decks/kill-the-clipboard-panel/deck.html",
  checkin: "decks/digital-credentials-sd-jwt/deck.html",
  llms: "decks/llm-agents-health-data/deck.html",
  coin: "decks/conversational-interop/deck.html",
};

function slugId(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("smart across")) return "smart";
  if (lower.includes("kill the clipboard")) return "ktc";
  if (lower.includes("digital credentials")) return "checkin";
  if (lower.includes("llm agents")) return "llms";
  if (lower.includes("conversational interop")) return "coin";
  return "s" + lower.replace(/[^a-z0-9]+/g, "").slice(0, 14);
}

function addColumnIfMissing(table: string, column: string, ddl: string) {
  const cols = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    presenter TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    active INTEGER NOT NULL DEFAULT 1
  );
`);
addColumnIfMissing("sessions", "qa_state", "qa_state TEXT NOT NULL DEFAULT 'open'");
addColumnIfMissing("sessions", "qa_mode", "qa_mode TEXT NOT NULL DEFAULT 'moderated'");
addColumnIfMissing("sessions", "qa_display_mode", "qa_display_mode TEXT NOT NULL DEFAULT 'queue'");
addColumnIfMissing("sessions", "qa_enabled", "qa_enabled INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("sessions", "slides_url", "slides_url TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("sessions", "short_code", "short_code TEXT");
addColumnIfMissing("sessions", "feedback_state", "feedback_state TEXT NOT NULL DEFAULT 'open'");

const md = readFileSync(resolve(TALKS_MD), "utf8");
const re = /^##\s+(\d+)\.\s+(.+?)\n\*\*Date\/Time:\*\*\s*(.+?)\n\n\*\*Description:\*\*\n([\s\S]*?)(?=\n\*\*Proposed Run of Show|\n---\n\n##|\Z)/gm;
const talks: { id: string; title: string; dateTime: string; description: string; slidesUrl: string }[] = [];
for (const m of md.matchAll(re)) {
  const [, , title, dateTime, description] = m;
  const id = slugId(title);
  talks.push({ id, title: title.trim(), dateTime: dateTime.trim(), description: description.trim(), slidesUrl: `${SLIDES_BASE_URL}/${slidePaths[id] ?? ""}` });
}
if (talks.length === 0) throw new Error(`No talks parsed from ${TALKS_MD}`);

const tables = [
  "attendee_interactions",
  "feedback",
  "qa_question_votes",
  "qa_question_submissions",
  "qa_questions",
  "qa_agent_decisions",
  "qa_agent_runs",
  "qa_published_views",
  "qa_moderator_actions",
  "auth_sessions",
  "room_capabilities",
  "sessions",
];

db.transaction(() => {
  for (const table of tables) {
    try { db.query(`DELETE FROM ${table}`).run(); } catch {}
  }
  const insert = db.query(`
    INSERT INTO sessions (id, title, presenter, description, active, qa_state, qa_mode, qa_display_mode, qa_enabled, slides_url, short_code, feedback_state)
    VALUES (?, ?, 'Josh Mandel', ?, 1, 'open', 'moderated', 'queue', 1, ?, ?, 'open')
  `);
  for (const talk of talks) insert.run(talk.id, talk.title, talk.dateTime, talk.slidesUrl, talk.id);
})();

console.log(JSON.stringify({ ok: true, db: DB_PATH, slidesBaseUrl: SLIDES_BASE_URL, talks: talks.map((t) => ({ id: t.id, title: t.title, dateTime: t.dateTime, slidesUrl: t.slidesUrl })) }, null, 2));
