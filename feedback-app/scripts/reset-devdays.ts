#!/usr/bin/env bun
/**
 * Reset the local DevDays feedback app to a clean conference state.
 *
 * This keeps reusable organizer/session auth, but clears live attendee/runtime
 * state (Q&A, votes, feedback, pulse events, AI audit runs), reloads sessions
 * from prep/talks.md, and reloads AI context from prep/deck markdown.
 *
 * Env overrides are passed through to the loaders:
 *   DB_PATH, REPO_ROOT, TALKS_PATH, SLIDES_BASE_URL, CONTEXT_MAX_CHARS
 */
import { $ } from "bun";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { createDb } from "../src/db.ts";

const dbPath = process.env.DB_PATH ?? "feedback.db";
const qaAgentDir = process.env.QA_AGENT_DIR ?? join(import.meta.dir, "..", ".qa-agent");
const all = process.argv.includes("--all");

const runtimeTables = [
  "qa_question_votes",
  "qa_question_submissions",
  "qa_questions",
  "qa_agent_decisions",
  "qa_agent_runs",
  "qa_published_views",
  "qa_moderator_actions",
  "attendee_interactions",
  "feedback",
];

if (all) runtimeTables.push("auth_sessions", "room_capabilities", "sessions");

console.log(`resetting ${dbPath}${all ? " (including sessions/auth/capabilities)" : ""}`);
const db = createDb(dbPath);
db.transaction(() => {
  db.exec("PRAGMA foreign_keys = OFF;");
  for (const table of runtimeTables) db.run(`DELETE FROM ${table}`);
  db.exec("PRAGMA foreign_keys = ON;");
})();
db.exec("PRAGMA optimize;");
db.close();

rmSync(qaAgentDir, { recursive: true, force: true });
console.log(`removed ${qaAgentDir}`);

await $`bun scripts/load-talks.ts`;
await $`bun scripts/load-ai-context.ts`;

console.log("DevDays state reset complete.");
