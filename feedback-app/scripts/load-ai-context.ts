import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "./feedback.db";
const ROOT = resolve(process.env.REPO_ROOT ?? "..");
const MAX_CHARS = Number(process.env.AI_CONTEXT_MAX_CHARS ?? 24000);
const db = new Database(DB_PATH);

function addColumnIfMissing(table: string, column: string, ddl: string) {
  const cols = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
addColumnIfMissing("sessions", "ai_context", "ai_context TEXT NOT NULL DEFAULT ''");

const deckDirs: Record<string, string> = {
  ssmart: "decks/smart-ecosystem",
  skclipboard: "decks/kill-the-clipboard-panel",
  sdigcred: "decks/digital-credentials-sd-jwt",
  sllmagents: "decks/llm-agents-health-data",
  scoin: "decks/conversational-interop",
};
const extraFiles = ["deck.md", "visual-brief.md", "tutorial.md", "demo-runbook.md", "interview-prep.md", "smart-ecosystem-deck-spec.md", "slide-design-spec.md"];

function readMaybe(path: string) {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) return "";
  return readFileSync(full, "utf8");
}
function clip(text: string, max: number) {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 80).trimEnd() + "\n\n[truncated]";
}

const sessions = db.query<{ id: string; title: string; presenter: string; description: string }, []>("SELECT id,title,presenter,description FROM sessions ORDER BY id").all();
for (const s of sessions) {
  const parts = [
    `Session: ${s.title}`,
    s.presenter ? `Presenter: ${s.presenter}` : "",
    s.description ? `Schedule/description: ${s.description}` : "",
  ].filter(Boolean);
  const deckDir = deckDirs[s.id];
  if (deckDir) {
    for (const f of extraFiles) {
      const rel = `${deckDir}/${f}`;
      const content = readMaybe(rel);
      if (content) parts.push(`\n--- ${rel} ---\n${content}`);
    }
  }
  const context = clip(parts.join("\n\n"), MAX_CHARS);
  db.query("UPDATE sessions SET ai_context = ? WHERE id = ?").run(context, s.id);
  console.log(JSON.stringify({ id: s.id, chars: context.length, deckDir }));
}
