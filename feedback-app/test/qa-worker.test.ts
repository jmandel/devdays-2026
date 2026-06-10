import { beforeEach, describe, expect, test } from "bun:test";
import { createDb, type DB } from "../src/db.ts";
import {
  applyThemeAction,
  ensureSubmission,
  publicQaPayload,
  recordVote,
  recomputeThemeSupport,
  type SessionRow,
  type SubmissionRow,
  type ThemeRow,
} from "../src/qa.ts";
import { applyProjection, consolidateThemes, fallbackProcess } from "../src/worker.ts";
import { now } from "../src/util.ts";

let db: DB;
let session: SessionRow;

function seedSession(): SessionRow {
  const ts = now();
  db.run(
    `INSERT INTO sessions (id, title, presenter, active, qa_state, qa_mode, qa_display_mode, qa_enabled, feedback_state, created_at, updated_at)
     VALUES ('smart', 'SMART Across the Ecosystem', 'Josh Mandel', 1, 'open', 'moderated', 'queue', 1, 'open', ?, ?)`,
    [ts, ts],
  );
  return db.query<SessionRow, []>("SELECT * FROM sessions WHERE id = 'smart'").get()!;
}

function submit(text: string, key = "att-1"): SubmissionRow {
  const result = ensureSubmission(db, session, key, text);
  expect(result.ok).toBe(true);
  return result.submission!;
}

function themes(status?: string): ThemeRow[] {
  return db
    .query<ThemeRow, []>("SELECT * FROM qa_questions ORDER BY created_at")
    .all()
    .filter((t) => (status ? t.status === status : true));
}

beforeEach(() => {
  db = createDb(":memory:");
  session = seedSession();
});

describe("submissions", () => {
  test("valid submission is stored pending", () => {
    const sub = submit("How do permission tickets interact with backend services?");
    expect(sub.status).toBe("pending");
    expect(sub.session_id).toBe("smart");
  });

  test("short and over-long submissions are rejected", () => {
    expect(ensureSubmission(db, session, "att-1", "hi").ok).toBe(false);
    expect(ensureSubmission(db, session, "att-1", "x".repeat(1001)).ok).toBe(false);
  });

  test("duplicate retry from same browser returns existing submission", () => {
    const first = submit("What about scheduling links?");
    const retry = ensureSubmission(db, session, "att-1", "What  about scheduling links?");
    expect(retry.duplicate).toBe(true);
    expect(retry.submission!.id).toBe(first.id);
    const count = db.query<{ c: number }, []>("SELECT COUNT(*) c FROM qa_question_submissions").get()!;
    expect(count.c).toBe(1);
  });

  test("closed Q&A rejects submissions", () => {
    db.run("UPDATE sessions SET qa_state = 'closed' WHERE id = 'smart'");
    const closed = db.query<SessionRow, []>("SELECT * FROM sessions WHERE id = 'smart'").get()!;
    const result = ensureSubmission(db, closed, "att-1", "Is this thing on?");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });
});

describe("fallback processing", () => {
  test("promotes pending submissions into themes", () => {
    submit("How do SMART scopes map to FHIR resources?", "a");
    submit("What is the roadmap for permission tickets?", "b");
    const stats = fallbackProcess(db, "smart");
    expect(stats.promoted).toBe(2);
    const live = themes("live");
    expect(live.length).toBe(2);
    const subs = db.query<SubmissionRow, []>("SELECT * FROM qa_question_submissions").all();
    expect(subs.every((s) => s.status === "promoted" && s.question_id)).toBe(true);
  });

  test("merges similar submissions into one theme", () => {
    submit("How do permission tickets scale across health systems?", "a");
    submit("how do permission tickets scale across health systems??", "b");
    const stats = fallbackProcess(db, "smart");
    expect(stats.promoted).toBe(1);
    expect(stats.merged).toBe(1);
    expect(themes("live").length).toBe(1);
    expect(themes("live")[0]!.support_count).toBe(2);
  });

  test("merges new submission into existing active theme", () => {
    submit("Do user access brands solve endpoint discovery?", "a");
    fallbackProcess(db, "smart");
    submit("do User Access Brands solve the endpoint discovery problem", "b");
    const stats = fallbackProcess(db, "smart");
    expect(stats.merged).toBe(1);
    expect(themes("live").length).toBe(1);
  });

  test("consolidates duplicate active themes and remaps votes", () => {
    const subA = submit("What about bulk publish for scheduling?", "a");
    fallbackProcess(db, "smart");
    // Force a duplicate theme directly.
    const ts = now();
    db.run(
      `INSERT INTO qa_questions (id, session_id, display_text, status, created_at, updated_at)
       VALUES ('q_dup', 'smart', 'What about bulk publish for scheduling?', 'live', ?, ?)`,
      [ts + 1, ts + 1],
    );
    recordVote(db, "smart", "q_dup", "voter-1", 1);
    const merged = consolidateThemes(db, "smart");
    expect(merged).toBe(1);
    const dup = db.query<ThemeRow, []>("SELECT * FROM qa_questions WHERE id = 'q_dup'").get()!;
    expect(dup.status).toBe("merged");
    expect(dup.merged_into_question_id).toBeTruthy();
    const winner = db
      .query<ThemeRow, [string]>("SELECT * FROM qa_questions WHERE id = ?")
      .get(dup.merged_into_question_id!)!;
    // 1 mapped submission + 1 remapped theme vote
    expect(winner.support_count).toBe(2);
    expect(subA.id).toBeTruthy();
  });
});

describe("AI projection", () => {
  test("active output creates a theme and maps raw submissions", () => {
    const s1 = submit("whats the deal with permision tickets??", "a");
    const s2 = submit("permission tickets — how do they work", "b");
    const stats = applyProjection(db, "smart", {
      themes: [
        {
          question: "How do SMART Permission Tickets work?",
          state: "active",
          priority: 5,
          raw_submission_ids: [s1.id, s2.id],
        },
      ],
    });
    expect(stats.applied).toBe(1);
    const live = themes("live");
    expect(live.length).toBe(1);
    expect(live[0]!.display_text).toBe("How do SMART Permission Tickets work?");
    expect(live[0]!.support_count).toBe(2);
    const pub = publicQaPayload(db, "smart")!;
    expect(pub.questions.every((q: any) => q.status === "grouped")).toBe(true);
  });

  test("hold output marks submissions as held / needs detail", () => {
    const s1 = submit("but why though", "a");
    applyProjection(db, "smart", {
      themes: [{ question: "", state: "hold", raw_submission_ids: [s1.id] }],
    });
    const sub = db
      .query<SubmissionRow, [string]>("SELECT * FROM qa_question_submissions WHERE id = ?")
      .get(s1.id)!;
    expect(sub.status).toBe("held");
    const pub = publicQaPayload(db, "smart")!;
    expect(pub.questions[0]!.status).toBe("needs detail");
  });

  test("answered output sets theme answered; hidden output hides mapped raw from public", () => {
    const s1 = submit("Will brands ship in 2026?", "a");
    applyProjection(db, "smart", {
      themes: [{ question: "Will User Access Brands ship in 2026?", state: "active", raw_submission_ids: [s1.id] }],
    });
    const themeId = themes("live")[0]!.id;
    applyProjection(db, "smart", { themes: [{ theme_id: themeId, state: "answered" }] });
    expect(themes("answered").length).toBe(1);

    const s2 = submit("something rude and off topic here", "b");
    applyProjection(db, "smart", {
      themes: [{ question: "Hidden theme", state: "active", raw_submission_ids: [s2.id] }],
    });
    const hiddenThemeId = themes("live")[0]!.id;
    applyProjection(db, "smart", { themes: [{ theme_id: hiddenThemeId, state: "hidden" }] });
    const pub = publicQaPayload(db, "smart")!;
    expect(pub.questions.find((q: any) => q.id === s2.id)).toBeUndefined();
    // answered raw submission remains visible
    expect(pub.questions.find((q: any) => q.id === s1.id)?.status).toBe("answered");
  });

  test("leftover pending submissions still get promoted by fallback", () => {
    submit("Unprojected question about backend services?", "a");
    applyProjection(db, "smart", { themes: [] });
    const stats = fallbackProcess(db, "smart");
    expect(stats.promoted).toBe(1);
  });
});

describe("votes", () => {
  test("vote upsert: re-voting updates the stored value", () => {
    const sub = submit("Can I vote on this?", "a");
    recordVote(db, "smart", sub.id, "voter-1", 1);
    recordVote(db, "smart", sub.id, "voter-1", -3);
    const votes = db
      .query<{ value: number }, [string]>("SELECT value FROM qa_question_votes WHERE question_id = ?")
      .all(sub.id);
    expect(votes.length).toBe(1);
    expect(votes[0]!.value).toBe(-1);
  });

  test("raw votes recompute mapped theme support", () => {
    const sub = submit("Support recompute check?", "a");
    fallbackProcess(db, "smart");
    const theme = themes("live")[0]!;
    recordVote(db, "smart", sub.id, "voter-1", 1);
    recordVote(db, "smart", sub.id, "voter-2", 1);
    const updated = db
      .query<ThemeRow, [string]>("SELECT * FROM qa_questions WHERE id = ?")
      .get(theme.id)!;
    // 1 mapped sub + 2 raw votes
    expect(updated.support_count).toBe(3);
  });
});

describe("theme actions", () => {
  function makeTheme(): string {
    submit("Theme action target?", "a");
    fallbackProcess(db, "smart");
    return themes()[0]!.id;
  }

  test("pin/unpin/answer/hide/restore lifecycle", () => {
    const id = makeTheme();
    let r = applyThemeAction(db, "smart", id, "pin", "global_admin");
    expect(r.theme!.status).toBe("pinned");
    expect(r.theme!.pinned).toBe(1);
    expect(r.theme!.human_override).toBe(1);

    r = applyThemeAction(db, "smart", id, "unpin", "global_admin");
    expect(r.theme!.status).toBe("live");
    expect(r.theme!.pinned).toBe(0);

    r = applyThemeAction(db, "smart", id, "answer", "global_admin");
    expect(r.theme!.status).toBe("answered");
    expect(r.theme!.answered_at).toBeTruthy();

    r = applyThemeAction(db, "smart", id, "restore", "global_admin");
    expect(r.theme!.status).toBe("live");
    expect(r.theme!.answered_at).toBeNull();

    r = applyThemeAction(db, "smart", id, "hide", "global_admin");
    expect(r.theme!.status).toBe("hidden");
    expect(r.theme!.hidden_at).toBeTruthy();

    r = applyThemeAction(db, "smart", id, "restore", "global_admin");
    expect(r.theme!.status).toBe("live");
    expect(r.theme!.hidden_at).toBeNull();
  });

  test("invalid action and missing theme return errors", () => {
    const id = makeTheme();
    expect(applyThemeAction(db, "smart", id, "explode", "global_admin").status).toBe(400);
    expect(applyThemeAction(db, "smart", "q_missing", "pin", "global_admin").status).toBe(404);
  });

  test("support recompute counts theme votes too", () => {
    const id = makeTheme();
    recordVote(db, "smart", id, "voter-9", 1);
    const support = recomputeThemeSupport(db, id);
    // 1 mapped sub + 1 theme vote
    expect(support).toBe(2);
  });
});
