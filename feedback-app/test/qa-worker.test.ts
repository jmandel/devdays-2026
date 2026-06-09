import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function initDb(path: string) {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE sessions (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', presenter TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL DEFAULT (unixepoch()), active INTEGER NOT NULL DEFAULT 1, qa_state TEXT NOT NULL DEFAULT 'open', qa_mode TEXT NOT NULL DEFAULT 'moderated', ai_context TEXT NOT NULL DEFAULT '');
    CREATE TABLE qa_questions (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, display_text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'live', priority INTEGER NOT NULL DEFAULT 0, support_count INTEGER NOT NULL DEFAULT 1, pinned INTEGER NOT NULL DEFAULT 0, human_override INTEGER NOT NULL DEFAULT 0, source_submission_id TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()), answered_at INTEGER, hidden_at INTEGER, merged_into_question_id TEXT);
    CREATE TABLE qa_question_submissions (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, submitter_key TEXT NOT NULL, raw_text TEXT NOT NULL, normalized_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', question_id TEXT, submitted_at INTEGER NOT NULL DEFAULT (unixepoch()), processed_at INTEGER);
    CREATE TABLE qa_question_votes (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, question_id TEXT NOT NULL, submitter_key TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(question_id, submitter_key));
    CREATE TABLE qa_agent_runs (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, status TEXT NOT NULL, started_at INTEGER NOT NULL DEFAULT (unixepoch()), finished_at INTEGER, input_path TEXT, output_path TEXT, error TEXT, summary TEXT);
  `);
  db.query("INSERT INTO sessions (id,title,ai_context) VALUES ('s1','Test','Background: SMART app launch and scopes are in scope.')").run();
  return db;
}

test("qa-worker applies renderable theme projection from contained fake codex", async () => {
  const dir = mkdtempSync(join(tmpdir(), "qa-worker-"));
  const dbPath = join(dir, "test.sqlite");
  const workDir = join(dir, "agent");
  const fakeCodex = join(dir, "codex");
  const db = initDb(dbPath);
  db.query("INSERT INTO qa_question_submissions (id, session_id, submitter_key, raw_text, normalized_hash) VALUES ('sub1','s1','u1','how do I do SMART launch?','h1')").run();
  db.query("INSERT INTO qa_question_submissions (id, session_id, submitter_key, raw_text, normalized_hash) VALUES ('sub2','s1','u2','how do I do smart launch','h2')").run();
  db.close();

  writeFileSync(fakeCodex, `#!/usr/bin/env bash
set -euo pipefail
test -f input.json
python3 - <<'PY'
import json
inp=json.load(open('input.json'))
assert 'Background: SMART app launch' in inp['background_context']
subs=[s['id'] for s in inp['raw_audience_submissions']]
json.dump({'themes':[{'question':'How should developers launch a SMART app?','summary':'Two attendees asked about SMART launch mechanics.','priority':80,'state':'active','raw_submission_ids':subs,'existing_theme_ids':[]}]}, open('output.json','w'))
PY
`, { mode: 0o755 });

  await Bun.$`env DB_PATH=${dbPath} QA_WORK_DIR=${workDir} PATH=${dir}:${process.env.PATH} ${process.execPath} src/qa-worker.ts s1`;

  const check = new Database(dbPath);
  const run = check.query<{status:string; input_path:string; output_path:string}, []>("SELECT status,input_path,output_path FROM qa_agent_runs LIMIT 1").get()!;
  expect(run.status).toBe("applied");
  expect(run.input_path.endsWith("/input.json")).toBe(true);
  expect(run.output_path.endsWith("/output.json")).toBe(true);
  expect(existsSync(run.output_path)).toBe(true);
  expect(JSON.parse(readFileSync(run.input_path, "utf8")).existing_themes).toBeArray();
  const q = check.query<{id:string; display_text:string; priority:number; support_count:number}, []>("SELECT id, display_text, priority, support_count FROM qa_questions LIMIT 1").get()!;
  expect(q.display_text).toBe("How should developers launch a SMART app?");
  expect(q.priority).toBe(80);
  expect(q.support_count).toBe(2);
  expect(check.query<{c:number}, [string]>("SELECT COUNT(*) c FROM qa_question_submissions WHERE question_id=?").get(q.id)!.c).toBe(2);
  check.close();
});

test("qa-worker input includes answered themes so codex can avoid resurrection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "qa-worker-answered-"));
  const dbPath = join(dir, "test.sqlite");
  const workDir = join(dir, "agent");
  const fakeCodex = join(dir, "codex");
  const db = initDb(dbPath);
  db.query("INSERT INTO qa_questions (id, session_id, display_text, status, answered_at) VALUES ('qold','s1','What are SMART scopes?','answered',unixepoch())").run();
  db.close();
  writeFileSync(fakeCodex, `#!/usr/bin/env bash
python3 - <<'PY'
import json
inp=json.load(open('input.json'))
assert any(t['theme_id']=='qold' and t['answered'] for t in inp['existing_themes'])
json.dump({'themes':[]}, open('output.json','w'))
PY
`, { mode: 0o755 });
  await Bun.$`env DB_PATH=${dbPath} QA_WORK_DIR=${workDir} PATH=${dir}:${process.env.PATH} ${process.execPath} src/qa-worker.ts s1`;
  const check = new Database(dbPath);
  expect(check.query<{status:string}, []>("SELECT status FROM qa_agent_runs LIMIT 1").get()!.status).toBe("applied");
  check.close();
});

test("qa-worker fallback merges duplicate pending submissions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "qa-worker-fallback-"));
  const dbPath = join(dir, "test.sqlite");
  const workDir = join(dir, "agent");
  const fakeCodex = join(dir, "codex");
  const db = initDb(dbPath);
  db.query("INSERT INTO qa_question_submissions (id, session_id, submitter_key, raw_text, normalized_hash) VALUES ('sub1','s1','u1','how do I do SMART?','h1')").run();
  db.query("INSERT INTO qa_question_submissions (id, session_id, submitter_key, raw_text, normalized_hash) VALUES ('sub2','s1','u2','how do I do smart','h2')").run();
  db.close();
  writeFileSync(fakeCodex, "#!/usr/bin/env bash\nexit 42\n", { mode: 0o755 });
  await Bun.$`env DB_PATH=${dbPath} QA_WORK_DIR=${workDir} PATH=${dir}:${process.env.PATH} ${process.execPath} src/qa-worker.ts s1`;
  const check = new Database(dbPath);
  expect(check.query<{c:number}, []>("SELECT COUNT(*) c FROM qa_questions").get()!.c).toBe(1);
  expect(check.query<{support_count:number}, []>("SELECT support_count FROM qa_questions LIMIT 1").get()!.support_count).toBe(2);
  expect(check.query<{status:string}, []>("SELECT status FROM qa_agent_runs LIMIT 1").get()!.status).toBe("fallback");
  check.close();
});
