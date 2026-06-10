/**
 * Populate sessions.ai_context from prep/deck materials.
 *
 * Env overrides:
 *   DB_PATH            SQLite file (default feedback.db)
 *   REPO_ROOT          repo root (default ..)
 *   CONTEXT_MAX_CHARS  clip length per session (default 8000)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createDb } from "../src/db.ts";
import { now } from "../src/util.ts";

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? join(import.meta.dir, "..", ".."));
const MAX_CHARS = Number(process.env.CONTEXT_MAX_CHARS ?? 8000);

const SOURCES: Record<string, string[]> = {
  smart: ["prep/2026-06-16-1030-smart-ecosystem-prep.md", "decks/smart-ecosystem/deck.md"],
  ktc: ["prep/2026-06-16-1430-kill-the-clipboard-prep.md", "decks/kill-the-clipboard-panel/deck.md"],
  checkin: [
    "prep/2026-06-17-1130-digital-credentials-sd-jwt-prep.md",
    "decks/digital-credentials-sd-jwt/deck.md",
  ],
  llms: ["prep/2026-06-18-1030-llm-agents-health-data-prep.md", "decks/llm-agents-health-data/deck.md"],
  coin: ["prep/2026-06-18-1430-conversational-interop-prep.md", "decks/conversational-interop/deck.md"],
};

const db = createDb();
let updated = 0;

for (const [sessionId, paths] of Object.entries(SOURCES)) {
  const exists = db.query("SELECT id FROM sessions WHERE id = ?").get(sessionId);
  if (!exists) {
    console.warn(`session ${sessionId} not in DB — run load-talks first; skipping`);
    continue;
  }
  const parts: string[] = [];
  for (const rel of paths) {
    const full = join(REPO_ROOT, rel);
    if (!existsSync(full)) {
      console.warn(`  missing source: ${rel}`);
      continue;
    }
    parts.push(`# Source: ${rel}\n\n${readFileSync(full, "utf-8")}`);
  }
  if (parts.length === 0) continue;
  const context = parts.join("\n\n---\n\n").slice(0, MAX_CHARS);
  db.run("UPDATE sessions SET ai_context = ?, updated_at = ? WHERE id = ?", [context, now(), sessionId]);
  updated++;
  console.log(`context loaded for ${sessionId} (${context.length} chars)`);
}

console.log(`done — ai_context set for ${updated} session(s)`);
