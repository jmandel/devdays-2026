import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "./feedback.db";
const TALKS_MD = process.env.TALKS_MD ?? "../prep/talks.md";
const db = new Database(DB_PATH);

function slugId(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("smart across")) return "ssmart";
  if (lower.includes("kill the clipboard")) return "skclipboard";
  if (lower.includes("digital credentials")) return "sdigcred";
  if (lower.includes("llm agents")) return "sllmagents";
  if (lower.includes("conversational interop")) return "scoin";
  return "s" + lower.replace(/[^a-z0-9]+/g, "").slice(0, 14);
}

const md = readFileSync(resolve(TALKS_MD), "utf8");
const re = /^##\s+(\d+)\.\s+(.+?)\n\*\*Date\/Time:\*\*\s*(.+?)\n\n\*\*Description:\*\*\n([\s\S]*?)(?=\n\*\*Proposed Run of Show|\n---\n\n##|\Z)/gm;
const talks: { id: string; title: string; dateTime: string; description: string }[] = [];
for (const m of md.matchAll(re)) {
  const [, , title, dateTime, description] = m;
  talks.push({ id: slugId(title), title: title.trim(), dateTime: dateTime.trim(), description: description.trim() });
}
if (talks.length === 0) throw new Error(`No talks parsed from ${TALKS_MD}`);

const tables = [
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
    INSERT INTO sessions (id, title, presenter, description, active, qa_state, qa_mode, qa_display_mode, qa_enabled)
    VALUES (?, ?, 'Josh Mandel', ?, 1, 'open', 'moderated', 'queue', 1)
  `);
  for (const talk of talks) insert.run(talk.id, talk.title, talk.dateTime);
})();

console.log(JSON.stringify({ ok: true, db: DB_PATH, talks: talks.map((t) => ({ id: t.id, title: t.title, dateTime: t.dateTime })) }, null, 2));
