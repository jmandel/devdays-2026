import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH ?? "./feedback.db";
const db = new Database(DB_PATH);

function randomId(prefix = "") {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return prefix + hex;
}

function arg(name: string, fallback = "") {
  const i = Bun.argv.indexOf(`--${name}`);
  return i >= 0 ? String(Bun.argv[i + 1] ?? fallback) : fallback;
}

function packet(id: string) {
  const row = db.query<any, [string]>("SELECT id, qa_state, qa_mode, qa_display_mode FROM sessions WHERE id = ?").get(id);
  if (!row) throw new Error(`session not found: ${id}`);
  return {
    session_id: row.id,
    attendee_url: `/s/${row.id}`,
    admin_url: `/admin/${row.id}`,
    qr_url: `/admin/${row.id}/qr`,
    public_qa_json_url: `/api/sessions/${row.id}/qa/public.json`,
    presenter_qa_json_url: `/api/sessions/${row.id}/qa/presenter.json`,
    slides_qa_json_url: `/api/sessions/${row.id}/qa/slides.json`,
    overlay_url: `/slides/s/${row.id}/qa`,
    qa_state: row.qa_state,
    qa_mode: row.qa_mode,
    qa_display_mode: row.qa_display_mode,
  };
}

const [scope, cmd, idOrRest] = Bun.argv.slice(2);

if (scope === "sessions" && cmd === "create") {
  const title = arg("title").trim();
  if (!title) throw new Error("--title is required");
  const id = randomId("s");
  db.query("INSERT INTO sessions (id, title, presenter, description, qa_state, qa_mode, qa_display_mode, qa_enabled) VALUES (?, ?, ?, ?, 'open', 'moderated', 'queue', 1)")
    .run(id, title.slice(0, 160), arg("presenter").slice(0, 120), arg("description").slice(0, 240));
  console.log(JSON.stringify(packet(id), null, 2));
} else if (scope === "sessions" && cmd === "list") {
  console.log(JSON.stringify(db.query("SELECT id, title, presenter, active, qa_state, created_at FROM sessions ORDER BY created_at DESC").all(), null, 2));
} else if (scope === "qa" && ["open", "pause", "close"].includes(cmd ?? "")) {
  const id = idOrRest;
  if (!id) throw new Error("session id required");
  const state = cmd === "pause" ? "paused" : cmd === "close" ? "closed" : "open";
  db.query("UPDATE sessions SET qa_state = ? WHERE id = ?").run(state, id);
  console.log(JSON.stringify(packet(id), null, 2));
} else {
  console.log(`Usage:
  bun run src/cli.ts sessions create --title "Talk" [--presenter Name] [--description Room]
  bun run src/cli.ts sessions list
  bun run src/cli.ts qa open|pause|close <session_id>`);
}
