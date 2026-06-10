/**
 * Populate DevDays talk rooms from prep/talks.md.
 *
 * Env overrides:
 *   DB_PATH          SQLite file (default feedback.db)
 *   REPO_ROOT        repo root (default ..)
 *   TALKS_PATH       talks markdown (default $REPO_ROOT/prep/talks.md)
 *   SLIDES_BASE_URL  base URL for deck links (default /decks relative paths under repo pages)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createDb } from "../src/db.ts";
import { now } from "../src/util.ts";

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? join(import.meta.dir, "..", ".."));
const TALKS_PATH = process.env.TALKS_PATH ?? join(REPO_ROOT, "prep", "talks.md");
const SLIDES_BASE = (process.env.SLIDES_BASE_URL ?? "https://jmandel.github.io/devdays-2026-fable/decks").replace(/\/$/, "");

const KNOWN: { id: string; match: RegExp; deck: string }[] = [
  { id: "smart", match: /SMART Across the Ecosystem/i, deck: "smart-ecosystem" },
  { id: "ktc", match: /Kill the Clipboard/i, deck: "kill-the-clipboard-panel" },
  { id: "checkin", match: /All-or-Nothing|Digital Credentials|Check-?in/i, deck: "digital-credentials-sd-jwt" },
  { id: "llms", match: /LLM Agents/i, deck: "llm-agents-health-data" },
  { id: "coin", match: /Conversational Interop/i, deck: "conversational-interop" },
];

interface ParsedTalk {
  title: string;
  datetime: string | null;
  description: string | null;
}

function parseTalks(md: string): ParsedTalk[] {
  const talks: ParsedTalk[] = [];
  const sections = md.split(/^## /m).slice(1);
  for (const section of sections) {
    const lines = section.split("\n");
    const heading = lines[0]?.replace(/^\d+\.\s*/, "").trim() ?? "";
    if (!heading) continue;
    const dtMatch = section.match(/\*\*Date\/Time:\*\*\s*(.+)/);
    const descMatch = section.match(/\*\*Description:\*\*\s*\n([\s\S]*?)(?:\n\s*\n|$)/);
    const firstPara = descMatch?.[1]?.trim().replace(/\s+/g, " ") ?? null;
    talks.push({
      title: heading,
      datetime: dtMatch?.[1]?.trim() ?? null,
      description: firstPara,
    });
  }
  return talks;
}

if (!existsSync(TALKS_PATH)) {
  console.error(`talks file not found: ${TALKS_PATH}`);
  process.exit(1);
}

const db = createDb();
const md = readFileSync(TALKS_PATH, "utf-8");
const parsed = parseTalks(md);
const ts = now();

let loaded = 0;
for (const talk of parsed) {
  const known = KNOWN.find((k) => k.match.test(talk.title));
  if (!known) {
    console.warn(`skipping unrecognized talk: ${talk.title}`);
    continue;
  }
  const slidesUrl = `${SLIDES_BASE}/${known.deck}/deck.html`;
  const description = talk.datetime ?? talk.description ?? null;
  db.run(
    `INSERT INTO sessions (id, title, presenter, description, active, qa_state, qa_mode, qa_display_mode, qa_enabled, slides_url, short_code, feedback_state, created_at, updated_at)
     VALUES (?, ?, 'Josh Mandel', ?, 1, 'open', 'moderated', 'queue', 1, ?, ?, 'open', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       presenter = excluded.presenter,
       description = excluded.description,
       active = 1, qa_state = 'open', qa_enabled = 1, feedback_state = 'open',
       slides_url = excluded.slides_url,
       short_code = excluded.short_code,
       updated_at = excluded.updated_at`,
    [known.id, talk.title, description, slidesUrl, known.id, ts, ts],
  );
  // Clear runtime Q&A/feedback state for a fresh room.
  for (const table of [
    "qa_question_submissions",
    "qa_questions",
    "qa_agent_runs",
    "qa_agent_decisions",
    "qa_published_views",
    "qa_moderator_actions",
    "attendee_interactions",
    "feedback",
  ]) {
    db.run(`DELETE FROM ${table} WHERE session_id = ?`, [known.id]);
  }
  db.run(
    `DELETE FROM qa_question_votes WHERE question_id NOT IN
       (SELECT id FROM qa_question_submissions UNION SELECT id FROM qa_questions)`,
  );
  loaded++;
  console.log(`loaded ${known.id}: ${talk.title}`);
}

console.log(`done — ${loaded} talk(s) loaded into ${process.env.DB_PATH ?? "feedback.db"}`);
