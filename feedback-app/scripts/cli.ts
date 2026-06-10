/**
 * Operator CLI.
 *   bun scripts/cli.ts list
 *   bun scripts/cli.ts create --title "..." [--presenter "..."] [--description "..."]
 *   bun scripts/cli.ts qa <session-id> open|paused|closed
 */
import { createDb } from "../src/db.ts";
import { now, randomId } from "../src/util.ts";

const db = createDb();
const [cmd, ...rest] = process.argv.slice(2);

function flag(name: string): string | null {
  const idx = rest.indexOf(`--${name}`);
  return idx !== -1 && rest[idx + 1] !== undefined ? rest[idx + 1]! : null;
}

switch (cmd) {
  case "list": {
    const rows = db
      .query<{ id: string; title: string; presenter: string | null; active: number; qa_state: string }, []>(
        "SELECT id, title, presenter, active, qa_state FROM sessions ORDER BY created_at",
      )
      .all();
    for (const r of rows) {
      console.log(
        `${r.id.padEnd(14)} ${r.qa_state.padEnd(8)} ${r.active ? "active  " : "inactive"} ${r.title}${r.presenter ? ` — ${r.presenter}` : ""}`,
      );
    }
    break;
  }
  case "create": {
    const title = flag("title");
    if (!title) {
      console.error("--title is required");
      process.exit(1);
    }
    const id =
      flag("id") ??
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) ??
      randomId("room", 4);
    const ts = now();
    db.run(
      `INSERT INTO sessions (id, title, presenter, description, active, qa_state, qa_mode, qa_display_mode, qa_enabled, feedback_state, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 'open', 'moderated', 'queue', 1, 'open', ?, ?)`,
      [id, title, flag("presenter"), flag("description"), ts, ts],
    );
    console.log(`created session ${id}`);
    break;
  }
  case "qa": {
    const [id, state] = rest;
    const valid = ["open", "paused", "closed", "disabled", "archived"];
    if (!id || !state || !valid.includes(state)) {
      console.error(`usage: cli qa <session-id> ${valid.join("|")}`);
      process.exit(1);
    }
    const res = db.run("UPDATE sessions SET qa_state = ?, updated_at = ? WHERE id = ?", [state, now(), id]);
    console.log(res.changes ? `qa_state for ${id} -> ${state}` : `session ${id} not found`);
    break;
  }
  default:
    console.log("commands: list | create --title ... | qa <id> open|paused|closed");
}
