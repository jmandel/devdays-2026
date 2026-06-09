import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";

const DB_PATH = process.env.DB_PATH ?? "./feedback.db";
const WORK_DIR = process.env.QA_WORK_DIR ?? ".qa-agent";
const db = new Database(DB_PATH);
mkdirSync(WORK_DIR, { recursive: true });

function randomId(prefix = "") {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return prefix + hex;
}

function truncate(text: string, max = 180) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}

function recompute(qid: string) {
  const v = db.query<{ c: number }, [string]>("SELECT COUNT(*) c FROM qa_question_votes WHERE question_id=?").get(qid)?.c ?? 0;
  const s = db.query<{ c: number }, [string]>("SELECT COUNT(*) c FROM qa_question_submissions WHERE question_id=?").get(qid)?.c ?? 0;
  db.query("UPDATE qa_questions SET support_count=?, updated_at=unixepoch() WHERE id=?").run(Math.max(1, v + s), qid);
}

function fallback(sessionId: string) {
  const pending = db.query<{ id: string; raw_text: string }, [string]>("SELECT id, raw_text FROM qa_question_submissions WHERE session_id=? AND status='pending' ORDER BY submitted_at ASC LIMIT 50").all(sessionId);
  for (const p of pending) {
    const qid = randomId("q");
    db.query("INSERT INTO qa_questions (id, session_id, display_text, status, source_submission_id) VALUES (?, ?, ?, 'live', ?)").run(qid, sessionId, truncate(p.raw_text), p.id);
    db.query("UPDATE qa_question_submissions SET status='promoted', question_id=?, processed_at=unixepoch() WHERE id=?").run(qid, p.id);
    recompute(qid);
  }
  return pending.length;
}

async function run(sessionId: string) {
  const runId = randomId("run");
  const inputPath = `${WORK_DIR}/${runId}.input.json`;
  const outputPath = `${WORK_DIR}/${runId}.output.json`;
  const input = {
    instruction: "Return JSON only: {actions:[{type:'promote',submission_id,text,priority}|{type:'hold',submission_id,reason}|{type:'merge',submission_id,question_id}]}. Do not write SQLite.",
    session: db.query("SELECT id,title,presenter,description,qa_state,qa_mode FROM sessions WHERE id=?").get(sessionId),
    pending_submissions: db.query("SELECT id,raw_text,submitted_at FROM qa_question_submissions WHERE session_id=? AND status='pending' ORDER BY submitted_at ASC LIMIT 50").all(sessionId),
    questions: db.query("SELECT id,display_text,status,support_count,priority,pinned,human_override FROM qa_questions WHERE session_id=? AND status IN ('new','live','pinned','held')").all(sessionId),
  };
  writeFileSync(inputPath, JSON.stringify(input, null, 2));
  db.query("INSERT INTO qa_agent_runs (id, session_id, status, input_path, output_path) VALUES (?, ?, 'running', ?, ?)").run(runId, sessionId, inputPath, outputPath);

  try {
    const proc = Bun.spawn([
      "codex", "--model", "gpt-5.5",
      "-c", "model_provider=exe-llm",
      "-c", 'model_providers.exe-llm.name="exe-llm"',
      "-c", 'model_providers.exe-llm.base_url="https://llm.int.exe.xyz/v1"',
      "exec", `Read ${inputPath}. Write valid JSON only to ${outputPath}.`
    ], { stdout: "pipe", stderr: "pipe" });
    const code = await proc.exited;
    if (code !== 0 || !existsSync(outputPath)) throw new Error(`codex unavailable or failed with exit ${code}`);
    const out = JSON.parse(readFileSync(outputPath, "utf8"));
    let applied = 0;
    for (const a of Array.isArray(out.actions) ? out.actions : []) {
      if (a.type === "promote" && a.submission_id && a.text) {
        const qid = randomId("q");
        db.query("INSERT INTO qa_questions (id, session_id, display_text, status, priority, source_submission_id) VALUES (?, ?, ?, 'live', ?, ?)").run(qid, sessionId, truncate(String(a.text)), Number(a.priority ?? 0), a.submission_id);
        db.query("UPDATE qa_question_submissions SET status='promoted', question_id=?, processed_at=unixepoch() WHERE id=? AND session_id=?").run(qid, a.submission_id, sessionId);
        applied++;
      } else if (a.type === "hold" && a.submission_id) {
        db.query("UPDATE qa_question_submissions SET status='held', processed_at=unixepoch() WHERE id=? AND session_id=?").run(a.submission_id, sessionId); applied++;
      } else if (a.type === "merge" && a.submission_id && a.question_id) {
        db.query("UPDATE qa_question_submissions SET status='merged', question_id=?, processed_at=unixepoch() WHERE id=? AND session_id=?").run(a.question_id, a.submission_id, sessionId); recompute(a.question_id); applied++;
      }
    }
    db.query("UPDATE qa_agent_runs SET status='applied', finished_at=unixepoch(), summary=? WHERE id=?").run(`applied ${applied} codex actions`, runId);
  } catch (err) {
    const n = fallback(sessionId);
    db.query("UPDATE qa_agent_runs SET status='fallback', finished_at=unixepoch(), error=?, summary=? WHERE id=?").run(String(err), `codex unavailable; fallback promoted ${n}`, runId);
  }
}

const sessionId = Bun.argv[2];
if (!sessionId) throw new Error("usage: bun run src/qa-worker.ts <session_id>");
await run(sessionId);
