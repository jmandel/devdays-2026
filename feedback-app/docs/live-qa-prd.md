# Live Q&A Agent — PRD, Requirements, and Architecture Plan

**Product:** DevDays Feedback — Bun + TypeScript + SQLite conference feedback app  
**Feature:** LLM-agent-mediated live Q&A for QR-linked presentation sessions  
**Status:** Replacement PRD for `docs/live-qa-prd.md`  
**Date:** 2026-06-09  
**Core constraint:** Local-first app, SQLite source of truth, Codex CLI launched locally with **GPT-5.5** via the `exe-llm` provider.

---

## 1. Feature vision

Attendees should be able to ask a question at any time during a presentation without turning the session page into noisy public chat. The product should collect raw audience signal, preserve it, and publish a curated queue that is safe and useful for a presenter or moderator.

The feature is a **session-scoped Q&A copilot**:

1. Attendees submit questions from the existing QR-linked session endpoint.
2. The Bun backend stores every accepted raw submission immediately in SQLite.
3. A local agent loop periodically reviews unresolved submissions and the active queue.
4. The agent clusters duplicates, rewrites canonical questions, tracks support counts, flags risk, summarizes themes, and recommends priority.
5. The app validates the agent output, applies changes transactionally, and publishes versioned JSON feeds for widgets/slides/admin.
6. Human moderator actions always override agent recommendations.

Visual/product direction should match the existing serious FHIR/terminal/hacker style: structured packets, status codes, auditability, and operational confidence.

### North star

> Collect many audience questions, preserve the raw signal, surface only the clearest and most valuable ones, and keep a human firmly in control.

---

## 2. Goals and non-goals

### Goals

- Attendee can submit a session question in under 15 seconds on mobile.
- Raw submissions are never lost and are not dependent on LLM availability.
- Duplicate or near-duplicate questions are merged into canonical questions with counts.
- Presenter/moderator sees a ranked queue that is cleaner than raw chronological input.
- Public/widget/slides feeds contain only safe, concise canonical questions.
- Admin can pin, hide, answer, approve, and edit questions.
- Agent decisions are auditable and reversible by humans.
- Agent failure degrades gracefully: the app still accepts questions and serves last good feeds.
- Setup can be mediated by local agents through a supported API and simple Bun CLI, not direct SQLite writes or browser scraping.

### Non-goals for MVP

- No attendee accounts or named identity.
- No open-ended attendee chatbot.
- No automatic answers shown to attendees.
- No full enterprise moderation suite.
- No vector DB or embeddings requirement.
- No WebSocket requirement; polling is acceptable.
- No direct slide-deck editing; the app exposes JSON/HTML overlay endpoints.
- No claim of perfect abuse detection.

---

## 3. Users and roles

### Attendee

Anonymous or pseudonymous mobile user.

Needs to:
- see whether Q&A is open,
- submit a question quickly,
- optionally see current public top questions,
- optionally upvote/support existing questions,
- receive simple status: received, merged, queued, held, answered, or closed.

### Presenter

Speaker or session owner.

Needs to:
- open/pause/close Q&A,
- see a prioritized queue,
- understand why items are ranked,
- pin important questions,
- mark questions answered,
- hide or restore questions,
- approve held questions,
- project a safe queue beside slides.

### Moderator/admin

Trusted operator.

Needs to:
- do everything a presenter can do,
- inspect held/raw submissions,
- override agent decisions,
- trigger manual agent runs,
- inspect run health and failures,
- export Q&A data after the event.

### Agent loop

System actor invoked locally.

Needs to:
- read bounded session state,
- invoke Codex CLI with strict IO,
- classify, cluster, summarize, and prioritize,
- output JSON only,
- never mutate SQLite directly,
- defer to human overrides.

---

## 4. Live workflows

### 4.1 Session setup workflow

Session setup must support both humans and agents. Agents should be able to create/configure sessions by calling stable interfaces rather than browser automation or direct SQLite writes.

Supported setup paths:

1. Existing web UI at `/`.
2. HTTP API, e.g. `POST /api/admin/sessions`.
3. Simple Bun CLI, e.g. `bun run src/cli.ts sessions create ...`.

Setup response should return a structured packet:

- `session_id`
- attendee URL
- admin URL
- QR URL
- public Q&A JSON URL
- presenter Q&A JSON URL
- slides Q&A JSON URL
- overlay URL
- current `qa_state`, `qa_mode`, and `qa_display_mode`

The API and CLI must share validation and DB logic with the web UI.

### 4.2 Attendee flow

1. Attendee scans QR and opens `/s/:sessionId`.
2. Page shows session metadata and a Q&A panel/tab when Q&A is enabled.
3. If `qa_state = open`, attendee sees a question form and optional public top questions.
4. Server validates synchronously:
   - session exists,
   - Q&A is open,
   - text length is valid,
   - rate limit permits submission,
   - idempotency key/client hash is not a retry already counted.
5. Server inserts immutable `qa_question_submissions` row with `status = pending`.
6. Server returns immediate JSON or HTML confirmation; it does not wait for the LLM.
7. Later, agent processing moves the submission to `promoted`, `merged`, `held`, or `rejected`.

### 4.3 Presenter/moderator flow

1. Presenter opens `/admin/:sessionId/qa`.
2. UI shows:
   - pinned/on-deck,
   - live queue,
   - held for review,
   - answered,
   - hidden/rejected,
   - agent health/run history.
3. Presenter can:
   - open/pause/close Q&A,
   - pin/unpin,
   - mark answered/unanswered,
   - hide/restore,
   - approve held,
   - edit canonical display text,
   - trigger agent run.
4. Human edits create durable override metadata that later agent runs cannot silently undo.

### 4.4 Slide/widget flow

1. Slide overlay, attendee widget, or event screen polls a JSON endpoint:
   - `/api/sessions/:sessionId/qa/public.json`
   - `/api/sessions/:sessionId/qa/presenter.json`
   - `/api/sessions/:sessionId/qa/slides.json`
2. Endpoint serves cached payload from SQLite.
3. Payload includes only allowed fields for its audience.
4. Slides/public payloads never include raw unsafe text, submitter IDs, or agent debug rationale.
5. If the agent is down, the endpoint continues serving the last valid payload with stale metadata.

---

## 5. State model

### Session Q&A states

| State | Submissions | Public queue | Agent runs | Notes |
|---|---:|---:|---:|---|
| `disabled` | no | no | no | Feature off. |
| `open` | yes | yes, if configured | yes | Normal live mode. |
| `paused` | no new | yes | optional | Temporary pause. |
| `closed` | no | optional | manual/optional | Talk ended. |
| `archived` | no | read-only | no | Post-event record. |

### Moderation modes

| Mode | Meaning |
|---|---|
| `open` | Agent can auto-publish clearly safe/relevant questions. |
| `moderated` | Agent prepares queue; new public/slides visibility may require approval. Recommended default. |
| `strict` | All new content is held until human approval; agent still clusters/ranks. |

### Canonical question statuses

| Status | Meaning | Public eligible? |
|---|---|---:|
| `new` | Created, not approved/published | no by default |
| `live` | Active queue item | yes |
| `pinned` | Human-forced top item | yes |
| `answered` | Done/answered | optional |
| `held` | Needs review | no |
| `hidden` | Removed from display | no |
| `rejected` | Spam/abuse/irrelevant | no |
| `merged` | Deprecated canonical merged into another | no |

### Raw submission statuses

- `pending`
- `promoted`
- `merged`
- `held`
- `rejected`
- `duplicate_retry`

---

## 6. Functional requirements

### Attendee intake

- Q&A is session-scoped.
- Server rejects new submissions unless `qa_state = open`.
- Every accepted submission is stored before any LLM call.
- Recommended limits:
  - min 5 chars after trim,
  - max 1,000 chars raw,
  - canonical display target 80–180 chars.
- Store UTF-8 safely and escape all rendered text.
- Use anonymous `submitter_key` when possible.
- Accept optional `idempotency_key` for retry-safe mobile posts.
- Rate limit by session + submitter key and session + IP hash.
- Do not expose raw held/rejected text publicly.

### Public queue

- Shows only safe canonical questions.
- No raw submissions.
- No submitter identifiers.
- No agent rationale.
- May show `upvotes`, `merge_count`, and topic labels.

### Upvotes/support

MVP may omit upvotes. If included:

- One vote per `submitter_key` per question.
- Voting on answered/hidden/rejected questions is disallowed.
- Votes affect rank but do not bypass safety/moderation.

### Moderator controls

Required:

- Open/pause/close Q&A.
- Pin/unpin.
- Mark answered/unanswered.
- Hide/restore.
- Approve held question/submission.
- Edit canonical text.
- Trigger manual agent run.
- View last run status and last publish time.

### Publishing

- The app, not Codex, writes published JSON.
- JSON payloads are cached in SQLite for fast GET endpoints.
- Payloads are versioned and audience-specific.
- Public/slides feeds are generated from safe canonical state only.

---

## 7. Edge cases

| Edge case | Expected behavior |
|---|---|
| Submit while Q&A closes | Transaction checks state; return `qa_closed` if closed. |
| Mobile retry | Same idempotency key returns original submission/status. |
| Exact duplicate from same device | Mark duplicate/retry; do not inflate demand. |
| Same question from multiple attendees | Merge and increment support counts. |
| Related but distinct nuance | Keep separate; conservative merge. |
| “Can you explain?” | Hold as `too_vague` unless context makes intent clear. |
| Offensive but on-topic | Hold/reject; never public. |
| Private data included | Hold and redact if salvageable. |
| Presenter edits canonical text | Preserve as human-protected text. |
| Presenter pins item | Agent cannot demote/unpin. |
| Codex crashes/times out | Mark run failed; pending stays pending; last feed remains. |
| Invalid JSON | Discard run output; no partial apply. |
| SQLite contention | WAL, busy timeout, short transactions, one active run/session. |
| Archived session | Read-only; no automatic agent runs. |

---

## 8. SQLite schema proposal

JSON columns are `TEXT` containing validated JSON.

### `sessions` additions

```sql
ALTER TABLE sessions ADD COLUMN qa_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN qa_state TEXT NOT NULL DEFAULT 'disabled';
ALTER TABLE sessions ADD COLUMN qa_mode TEXT NOT NULL DEFAULT 'moderated';
ALTER TABLE sessions ADD COLUMN qa_display_mode TEXT NOT NULL DEFAULT 'hidden';
ALTER TABLE sessions ADD COLUMN qa_opened_at TEXT;
ALTER TABLE sessions ADD COLUMN qa_closed_at TEXT;
ALTER TABLE sessions ADD COLUMN qa_last_agent_run_at TEXT;
ALTER TABLE sessions ADD COLUMN qa_last_published_at TEXT;
```

Recommended values:

- `qa_state`: `disabled`, `open`, `paused`, `closed`, `archived`
- `qa_mode`: `open`, `moderated`, `strict`
- `qa_display_mode`: `hidden`, `top_questions`, `approved_only`, `answered_only`

### `qa_questions`

Canonical questions.

```sql
CREATE TABLE IF NOT EXISTS qa_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  canonical_text TEXT NOT NULL,
  canonical_short TEXT,
  human_edited_text TEXT,
  summary TEXT,
  answer_hint TEXT,

  status TEXT NOT NULL DEFAULT 'new',
  sort_bucket TEXT NOT NULL DEFAULT 'live-normal',
  priority_score REAL NOT NULL DEFAULT 0,
  rank INTEGER,

  topic_labels_json TEXT NOT NULL DEFAULT '[]',
  risk_labels_json TEXT NOT NULL DEFAULT '[]',
  quality_labels_json TEXT NOT NULL DEFAULT '[]',

  merge_count INTEGER NOT NULL DEFAULT 0,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  submitter_count INTEGER NOT NULL DEFAULT 1,

  first_submitted_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  agent_version TEXT,
  agent_explanation TEXT,
  confidence REAL,

  pinned_by TEXT,
  pinned_at TEXT,
  answered_by TEXT,
  answered_at TEXT,
  hidden_by TEXT,
  hidden_at TEXT,
  approved_by TEXT,
  approved_at TEXT,

  human_override_json TEXT NOT NULL DEFAULT '{}',
  merged_into_question_id TEXT REFERENCES qa_questions(id)
);

CREATE INDEX IF NOT EXISTS idx_qa_questions_session_status
  ON qa_questions(session_id, status, priority_score DESC, last_activity_at DESC);
```

### `qa_question_submissions`

Immutable raw submissions.

```sql
CREATE TABLE IF NOT EXISTS qa_question_submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES qa_questions(id),

  raw_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'mobile',

  submitter_key TEXT,
  submitter_hash TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  idempotency_key TEXT,
  client_hash TEXT,

  status TEXT NOT NULL DEFAULT 'pending',
  moderation_flags_json TEXT NOT NULL DEFAULT '[]',
  agent_run_id TEXT REFERENCES qa_agent_runs(id),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,

  UNIQUE(session_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_qa_submissions_pending
  ON qa_question_submissions(session_id, status, created_at);
```

### `qa_question_votes` optional

```sql
CREATE TABLE IF NOT EXISTS qa_question_votes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  submitter_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, question_id, submitter_key)
);
```

### `qa_agent_runs`

Run audit and locking.

```sql
CREATE TABLE IF NOT EXISTS qa_agent_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'starting',
  lock_token TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  heartbeat_at TEXT,
  finished_at TEXT,

  input_submission_count INTEGER NOT NULL DEFAULT 0,
  input_question_count INTEGER NOT NULL DEFAULT 0,
  questions_touched INTEGER NOT NULL DEFAULT 0,

  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  codex_command TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  input_json_path TEXT,
  output_json_path TEXT,

  result_summary TEXT,
  error_text TEXT,
  invalid_output_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_qa_agent_runs_session_status
  ON qa_agent_runs(session_id, status, started_at DESC);
```

Statuses: `starting`, `running`, `succeeded`, `failed`, `timed_out`, `invalid_output`, `superseded`.

### `qa_agent_decisions`

```sql
CREATE TABLE IF NOT EXISTS qa_agent_decisions (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL REFERENCES qa_agent_runs(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES qa_question_submissions(id),
  question_id TEXT REFERENCES qa_questions(id),

  decision_type TEXT NOT NULL,
  confidence REAL,
  reason TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Decision types: `create_question`, `merge_submission`, `hold_submission`, `reject_submission`, `update_question`, `reprioritize_question`, `publish_view`, `respect_human_override`.

### `qa_published_views`

```sql
CREATE TABLE IF NOT EXISTS qa_published_views (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  view_type TEXT NOT NULL,
  schema_name TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  source_agent_run_id TEXT REFERENCES qa_agent_runs(id),
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  UNIQUE(session_id, view_type)
);
```

View types: `public_queue`, `presenter_queue`, `slides_overlay`, `admin_debug`.

### `qa_moderator_actions`

Recommended to protect overrides.

```sql
CREATE TABLE IF NOT EXISTS qa_moderator_actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES qa_questions(id),
  submission_id TEXT REFERENCES qa_question_submissions(id),
  actor_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. Agent loop orchestration

### Responsibilities

The Bun app/worker owns:

- HTTP routes and UI.
- SQLite migrations, reads, writes, transactions.
- Rate limiting and validation.
- Selecting bounded agent input.
- Invoking Codex CLI.
- Timeout/process supervision.
- JSON validation.
- Applying DB changes transactionally.
- Publishing cached JSON feeds.

The Codex agent owns:

- Semantic clustering.
- Merge/create/hold/reject recommendations.
- Canonical wording.
- Topic/risk/quality labels.
- Priority scoring and rationale.
- JSON-only output.

Codex must not write to SQLite directly.

### Trigger policy

MVP loop:

- Runs for sessions where `qa_state = open`.
- Cadence: every 5–10 seconds when there is work.
- Trigger on:
  - pending submissions,
  - changed votes,
  - changed moderator overrides,
  - stale published views,
  - manual admin/CLI trigger.
- Max one active run per session.
- Suggested batch: 25–50 pending submissions, 50 active canonical questions.

### Locking

Use `qa_agent_runs` as a per-session lock:

1. Begin transaction.
2. Check for non-stale run with status `starting` or `running` for session.
3. If found, skip.
4. Insert new run with unique `lock_token`.
5. Commit.
6. Invoke Codex outside the transaction.
7. Reopen transaction.
8. Apply output only if run still owns `lock_token`.
9. Mark run finished.

A stale lock can be superseded after timeout/heartbeat expiry.

### Idempotence

- Raw submissions are immutable stable IDs.
- Each pending submission transitions once.
- Agent output references existing IDs; new questions use `client_ref` mapped to app-generated IDs.
- Human-protected fields are enforced by app code.
- Failed/invalid runs make no queue mutations.
- Rank updates replace current app rank for mutable questions only.

### Failure behavior

| Failure | Handling |
|---|---|
| Codex exits non-zero | Run `failed`; keep pending; serve last published views. |
| Timeout | Kill process; run `timed_out`; retry with backoff. |
| Non-JSON | Run `invalid_output`; store truncated output; no apply. |
| Schema invalid | Same as invalid output. |
| Unknown IDs | Fail whole MVP run. |
| DB apply error | Roll back; mark failed if possible. |
| Unsafe item recommended public | Validator blocks publication. |
| Agent tries to override pin/edit/answered | App ignores protected change and records decision. |

---

## 10. Codex invocation expectations

The backend worker must launch Codex locally using **GPT-5.5**.

### Required base invocation

```bash
codex --model gpt-5.5 \
  -c model_provider=exe-llm \
  -c 'model_providers.exe-llm.name="exe-llm"' \
  -c 'model_providers.exe-llm.base_url="https://llm.int.exe.xyz/v1"'
```

### Recommended non-interactive shape

Exact CLI subcommand may vary by installed Codex version, but preserve this shape:

```bash
codex --model gpt-5.5 \
  -c model_provider=exe-llm \
  -c 'model_providers.exe-llm.name="exe-llm"' \
  -c 'model_providers.exe-llm.base_url="https://llm.int.exe.xyz/v1"' \
  exec --json < /path/to/qa-agent-input.json > /path/to/qa-agent-output.json
```

If installed CLI differs, invariants remain:

- model exactly `gpt-5.5`,
- provider alias exactly `exe-llm`,
- base URL exactly `https://llm.int.exe.xyz/v1`,
- one bounded input prompt,
- output captured to stdout/file,
- output treated as untrusted until validated,
- no DB mutation access granted to the agent.

Run from repository root `/home/exedev/devdays-feedback`. Store run files under a controlled path such as `tmp/qa-agent-runs/<run_id>/`.

---

## 11. Agent IO contract

### Input: `live-qa-agent-input-v1`

```json
{
  "schema": "live-qa-agent-input-v1",
  "run": {
    "id": "run_20260609_150000_abcd",
    "prompt_version": "live-qa-agent-prompt-v1",
    "now": "2026-06-09T15:00:00.000Z",
    "max_new_questions": 20,
    "max_public_questions": 10
  },
  "instructions": {
    "output_schema": "live-qa-agent-output-v1",
    "json_only": true,
    "respect_human_overrides": true,
    "do_not_answer_questions": true,
    "do_not_expose_raw_unsafe_text_publicly": true
  },
  "session": {
    "id": "sess_123",
    "title": "Bun + SQLite in Production",
    "presenter": "Alex Doe",
    "description": "A practical talk about a local-first conference app.",
    "qa_state": "open",
    "qa_mode": "moderated",
    "qa_display_mode": "top_questions"
  },
  "active_questions": [
    {
      "id": "q_001",
      "canonical_text": "Can teams adopt Bun incrementally alongside existing Node.js apps?",
      "human_edited_text": null,
      "status": "live",
      "priority_score": 0.81,
      "rank": 1,
      "merge_count": 3,
      "upvote_count": 4,
      "submitter_count": 4,
      "topic_labels": ["migration"],
      "risk_labels": [],
      "human_override": { "pinned": false, "protected_text": false },
      "last_activity_at": "2026-06-09T14:59:00.000Z"
    }
  ],
  "pending_submissions": [
    {
      "id": "sub_101",
      "raw_text": "Can we move a Node service to Bun one endpoint at a time?",
      "normalized_text": "can we move a node service to bun one endpoint at a time",
      "source": "mobile",
      "submitter_key_present": true,
      "created_at": "2026-06-09T15:00:01.000Z"
    }
  ],
  "recent_context": {
    "recent_held": [],
    "recent_rejected_patterns": [],
    "moderator_notes": []
  }
}
```

Prompt wrapper must say:

- Curate live conference Q&A; do not answer questions.
- Return only valid JSON, no Markdown fences.
- Reference only provided IDs.
- If unsure, hold rather than publish.
- Human overrides are binding.
- Public text must be neutral, concise, and safe.

### Output: `live-qa-agent-output-v1`

```json
{
  "schema": "live-qa-agent-output-v1",
  "run_id": "run_20260609_150000_abcd",
  "status": "ok",
  "summary": "Merged one migration question and created one SQLite concurrency question.",
  "submission_decisions": [
    {
      "submission_id": "sub_101",
      "decision": "merge",
      "target_question_id": "q_001",
      "confidence": 0.91,
      "reason": "Same intent as the existing incremental migration question.",
      "moderation_flags": [],
      "topic_labels": ["migration", "node-compatibility"]
    }
  ],
  "new_questions": [
    {
      "client_ref": "new_q_1",
      "source_submission_ids": ["sub_102"],
      "canonical_text": "What SQLite write-concurrency limits should teams expect with this architecture?",
      "canonical_short": "What SQLite write-concurrency limits should teams expect?",
      "summary": "A technical question about expected SQLite concurrency constraints.",
      "status": "live",
      "sort_bucket": "live-normal",
      "priority_score": 0.72,
      "topic_labels": ["sqlite", "concurrency"],
      "risk_labels": [],
      "quality_labels": ["specific", "technical"],
      "confidence": 0.86,
      "agent_explanation": "On-topic, specific, and useful for the talk audience."
    }
  ],
  "question_updates": [
    {
      "question_id": "q_001",
      "canonical_text": "Can teams adopt Bun incrementally alongside existing Node.js apps?",
      "canonical_short": "Can Bun be adopted incrementally with Node apps?",
      "summary": "Several attendees are asking whether Bun migration can happen gradually.",
      "status": "live",
      "sort_bucket": "live-high",
      "priority_score": 0.92,
      "topic_labels": ["migration", "adoption", "node-compatibility"],
      "risk_labels": [],
      "quality_labels": ["repeated", "clear", "on_topic"],
      "agent_explanation": "High demand and direct relevance to session content."
    }
  ],
  "ranked_question_ids": ["q_001", "new_q_1"],
  "held": [
    {
      "submission_id": "sub_103",
      "reason": "Too vague without enough context.",
      "confidence": 0.64,
      "moderation_flags": ["too_vague"]
    }
  ],
  "rejected": [
    {
      "submission_id": "sub_104",
      "reason": "Spam/test content.",
      "confidence": 0.98,
      "moderation_flags": ["spam"]
    }
  ],
  "publish_recommendation": {
    "public_question_ids": ["q_001", "new_q_1"],
    "slides_question_ids": ["q_001"],
    "presenter_question_ids": ["q_001", "new_q_1"]
  }
}
```

### Validation rules

Reject the whole run if:

- schema or run ID mismatch,
- JSON parse fails,
- required arrays missing,
- unknown IDs referenced,
- submission has conflicting decisions,
- public/slides recommendation includes unsafe/held/rejected content,
- scores outside 0–1,
- text fields exceed limits,
- output attempts to override protected human fields.

MVP should fail the whole run rather than partially apply.

---

## 12. Merge, moderation, ranking, and summarization rules

### Normalization

Before LLM:

- trim,
- collapse whitespace,
- lowercase normalized comparison text,
- strip obvious filler like `question:` when safe,
- compute `client_hash` from normalized text + session + submitter/window.

### Merge rules

Merge when submissions have the same answer intent.

Merge examples:

- “Can you compare Bun vs Node startup time?”
- “How does Bun startup performance compare to Node.js?”

Do not merge when the likely answer differs:

- migration strategy vs roadmap,
- SQLite write locks vs Postgres choice,
- sharing slides vs explaining slide content,
- beginner concept vs advanced implementation detail.

When merging:

- attach submission to existing `qa_questions.id`,
- increment merge/support counts based on distinct submitters,
- update `last_activity_at`,
- improve canonical text only if not human-protected,
- preserve every raw submission.

Default posture: conservative merging.

### Canonical wording

Canonical text must be:

- phrased as a question,
- concise for projection,
- neutral,
- faithful to sources,
- free of attacks/profanity/filler,
- not more specific than attendee intent supports,
- not an answer.

Targets:

- `canonical_text`: 80–180 chars.
- `canonical_short`: 45–90 chars.
- `summary`: one sentence for presenter/admin.

### Moderation labels

Risk labels:

- `unsafe_harassment`
- `unsafe_hate`
- `sexual_content`
- `self_harm`
- `violence`
- `privacy_pii`
- `spam`
- `profanity`
- `off_topic`
- `too_vague`
- `low_confidence`

Quality labels:

- `clear`
- `specific`
- `repeated`
- `technical`
- `strategic`
- `logistical`
- `beginner`
- `advanced`
- `on_topic`
- `needs_context`

Severe risk labels force hold/reject. `privacy_pii` must be held and redacted before any public version.

### Priority scoring

`priority_score` is 0–1 and should be explainable.

Recommended weights:

| Signal | Weight |
|---|---:|
| Audience demand: merges/upvotes/distinct submitters | 0.25 |
| Talk relevance | 0.25 |
| Clarity/specificity | 0.20 |
| Diversity | 0.10 |
| Recency | 0.10 |
| Presenter usefulness | 0.10 |

Safety is a gate, not a positive weight.

### Sort buckets

Order:

1. `pinned`
2. `live-high`
3. `live-normal`
4. `live-low`
5. `held`
6. `answered`
7. `hidden`
8. `rejected`

Within bucket:

```text
priority_score DESC, upvote_count DESC, merge_count DESC, last_activity_at DESC
```

### Diversity rule

Avoid a top five entirely dominated by one topic when another high-quality topic is available. Diversity is a tiebreaker, not a reason to bury a genuinely dominant audience theme.

---

## 13. JSON contracts for feeds and admin

### Public feed

`GET /api/sessions/:sessionId/qa/public.json`

```json
{
  "schema": "live-qa-public-v1",
  "version": 1,
  "session": {
    "id": "sess_123",
    "title": "Bun + SQLite in Production",
    "presenter": "Alex Doe",
    "qa_state": "open",
    "qa_display_mode": "top_questions"
  },
  "queue": [
    {
      "id": "q_001",
      "text": "Can teams adopt Bun incrementally alongside existing Node.js apps?",
      "status": "live",
      "rank": 1,
      "upvotes": 12,
      "merge_count": 4,
      "topic_labels": ["migration", "adoption"],
      "pinned": false,
      "answered": false
    }
  ],
  "meta": {
    "total_live": 8,
    "total_answered": 2,
    "accepting_submissions": true,
    "last_agent_run_id": "run_55",
    "last_agent_run_at": "2026-06-09T15:00:00.000Z",
    "published_at": "2026-06-09T15:00:03.000Z",
    "stale": false
  }
}
```

### Submit response

`POST /api/sessions/:sessionId/qa/questions`

```json
{
  "schema": "live-qa-submit-response-v1",
  "ok": true,
  "submission": {
    "id": "sub_101",
    "status": "pending",
    "created_at": "2026-06-09T15:00:01.000Z"
  },
  "message": "Question received. The live queue will update shortly."
}
```

Closed/error form:

```json
{
  "schema": "live-qa-submit-response-v1",
  "ok": false,
  "error": {
    "code": "qa_closed",
    "message": "Q&A is not currently accepting questions for this session."
  }
}
```

### Presenter feed

`GET /api/sessions/:sessionId/qa/presenter.json`

```json
{
  "schema": "live-qa-presenter-v1",
  "version": 1,
  "session": {
    "id": "sess_123",
    "title": "Bun + SQLite in Production",
    "presenter": "Alex Doe",
    "qa_state": "open",
    "qa_mode": "moderated",
    "qa_display_mode": "top_questions"
  },
  "queue": [
    {
      "id": "q_001",
      "canonical_text": "Can teams adopt Bun incrementally alongside existing Node.js apps?",
      "canonical_short": "Can Bun be adopted incrementally with Node apps?",
      "summary": "Several attendees are asking whether migration can happen gradually.",
      "status": "live",
      "sort_bucket": "live-high",
      "rank": 1,
      "priority_score": 0.92,
      "upvotes": 12,
      "merge_count": 4,
      "submitter_count": 5,
      "topic_labels": ["migration", "adoption", "node-compatibility"],
      "risk_labels": [],
      "quality_labels": ["repeated", "clear", "on_topic"],
      "agent_explanation": "High demand and direct relevance to session content.",
      "human_override": { "pinned": false, "protected_text": false },
      "source_submission_ids": ["sub_10", "sub_11", "sub_18"]
    }
  ],
  "held": [
    {
      "submission_id": "sub_103",
      "raw_text": "Can you explain?",
      "reason": "Too vague without enough context.",
      "confidence": 0.64,
      "moderation_flags": ["too_vague"]
    }
  ],
  "agent_health": {
    "last_run_id": "run_55",
    "last_run_status": "succeeded",
    "last_success_at": "2026-06-09T15:00:03.000Z",
    "pending_submission_count": 0,
    "consecutive_failures": 0,
    "last_error": null
  }
}
```

### Slides/projector feed

`GET /api/sessions/:sessionId/qa/slides.json`

```json
{
  "schema": "live-qa-slides-v1",
  "version": 1,
  "session": {
    "id": "sess_123",
    "title": "Bun + SQLite in Production",
    "presenter": "Alex Doe"
  },
  "display": {
    "mode": "top_questions",
    "updated_at": "2026-06-09T15:00:03.000Z",
    "stale": false
  },
  "questions": [
    {
      "id": "q_001",
      "text": "Can teams adopt Bun incrementally alongside existing Node.js apps?",
      "rank": 1,
      "badge": "Popular"
    }
  ],
  "meta": {
    "max_questions": 3,
    "published_at": "2026-06-09T15:00:03.000Z"
  }
}
```

### Session setup response

Used by API and CLI.

```json
{
  "schema": "session-setup-response-v1",
  "ok": true,
  "session": {
    "id": "sess_123",
    "title": "Bun + SQLite in Production",
    "presenter": "Alex Doe",
    "description": "A practical talk about local-first conference tooling.",
    "active": true,
    "qa_enabled": true,
    "qa_state": "open",
    "qa_mode": "moderated",
    "qa_display_mode": "top_questions"
  },
  "links": {
    "attendee_url": "https://example.exe.dev/s/sess_123",
    "admin_url": "https://example.exe.dev/admin/sess_123",
    "qr_url": "https://example.exe.dev/qr/sess_123",
    "qa_public_json_url": "https://example.exe.dev/api/sessions/sess_123/qa/public.json",
    "qa_presenter_json_url": "https://example.exe.dev/api/sessions/sess_123/qa/presenter.json",
    "qa_slides_json_url": "https://example.exe.dev/api/sessions/sess_123/qa/slides.json",
    "qa_overlay_url": "https://example.exe.dev/sessions/sess_123/qa/overlay"
  }
}
```

---

## 14. API, CLI, and route plan

### Session setup API

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/sessions` | POST | Create presentation/session. |
| `/api/admin/sessions` | GET | List sessions. |
| `/api/admin/sessions/:sessionId` | GET | Return setup packet and Q&A state. |
| `/api/admin/sessions/:sessionId` | PATCH/POST | Update title, presenter, description, active state, Q&A defaults. |
| `/api/admin/sessions/:sessionId/links` | GET | Return attendee/admin/QR/widget/slides URLs. |
| `/api/admin/sessions/:sessionId/qa/state` | POST | Enable/open/pause/close Q&A and set mode/display mode. |

Create request:

```json
{
  "title": "Bun + SQLite in Production",
  "presenter": "Alex Doe",
  "description": "A practical talk about local-first conference tooling.",
  "active": true,
  "qa": {
    "enabled": true,
    "state": "open",
    "mode": "moderated",
    "display_mode": "top_questions"
  }
}
```

API requirements:

- Stable JSON errors with `ok: false` and `error.code`.
- Use `BASE_URL` for absolute links; otherwise safe request origin.
- Agents should not need internal table names.
- No destructive operations without explicit admin semantics.

### Bun setup CLI

Provide a repo-local CLI, e.g. `src/cli.ts`, using the same internal functions or HTTP API.

Candidate commands:

```bash
bun run src/cli.ts sessions create \
  --title "Bun + SQLite in Production" \
  --presenter "Alex Doe" \
  --description "A practical talk about local-first conference tooling." \
  --qa enabled \
  --qa-state open \
  --qa-mode moderated \
  --qa-display top_questions \
  --json

bun run src/cli.ts sessions list --json
bun run src/cli.ts sessions get sess_123 --json
bun run src/cli.ts sessions links sess_123 --json
bun run src/cli.ts qa open sess_123 --mode moderated --display top_questions --json
bun run src/cli.ts qa pause sess_123 --json
bun run src/cli.ts qa close sess_123 --json
bun run src/cli.ts qa run-agent sess_123 --json
```

CLI requirements:

- Human output prints title, presenter, attendee/admin/QR/Q&A URLs.
- `--json` prints machine-readable JSON only.
- Non-zero exit on failure.
- Stable error code and message.
- Honors `DB_PATH` and `BASE_URL`.
- Does not invoke Codex directly except through a `qa run-agent` command using the same runner/lock path as the server.

### Attendee/UI routes

| Route | Method | Purpose |
|---|---|---|
| `/s/:sessionId` | GET | Existing feedback page with Q&A panel/tab. |
| `/s/:sessionId/qa` | GET | Optional focused attendee Q&A page. |
| `/api/sessions/:sessionId/qa/questions` | POST | Submit question. |
| `/api/sessions/:sessionId/qa/public.json` | GET | Public widget feed. |
| `/api/sessions/:sessionId/qa/submissions/:submissionId/status` | GET | Optional status polling. |

### Presenter/admin routes

| Route | Method | Purpose |
|---|---|---|
| `/admin/:sessionId/qa` | GET | Presenter/moderator console. |
| `/api/admin/sessions/:sessionId/qa/questions/:questionId` | PATCH/POST | Pin, answer, hide, edit, approve. |
| `/api/admin/sessions/:sessionId/qa/submissions/:submissionId` | PATCH/POST | Approve/hold/reject raw submission. |
| `/api/admin/sessions/:sessionId/qa/run-agent` | POST | Manual agent trigger. |
| `/api/sessions/:sessionId/qa/presenter.json` | GET | Presenter queue feed. |
| `/api/sessions/:sessionId/qa/slides.json` | GET | Slides overlay feed. |
| `/sessions/:sessionId/qa/overlay` | GET | Optional HTML overlay. |

MVP can use form POSTs instead of PATCH if simpler for the current no-dependency Bun server.

---

## 15. MVP scope

### MVP includes

1. SQLite migrations for Q&A state and tables.
2. Session setup API and Bun CLI for humans/agents.
3. Admin controls to enable/open/pause/close Q&A.
4. Attendee question submission form.
5. Immutable raw submission storage.
6. Presenter/admin queue view.
7. Local agent loop invoking Codex CLI with `gpt-5.5` and `exe-llm` provider config.
8. Strict input/output JSON contracts and validation.
9. Agent create/merge/hold/reject/reprioritize decisions.
10. Cached public, presenter, and slides JSON payloads.
11. Human overrides: pin, answer, hide, approve held, edit canonical text.
12. Agent run audit and graceful failure behavior.

### MVP simplifications

- Polling instead of WebSockets/SSE.
- Upvotes optional.
- No manual split/merge UI at first.
- No generated answer hints.
- No cross-session dashboard.
- No multilingual support beyond UTF-8 storage.
- No embeddings/vector search.

---

## 16. Later phases

- Attendee upvotes and “similar question exists” suggestions.
- Manual merge/split controls.
- Topic clustering dashboard.
- One-click “show on screen” mode.
- Presenter-private answer draft hints.
- Post-session FAQ generation.
- Event-wide moderation dashboard.
- SSE/WebSocket live updates.
- Multilingual summarization/translation.
- Semantic cache or embeddings for large events.
- Retention/privacy controls and exports.

---

## 17. Acceptance criteria

### Attendee submission

- Given Q&A is open, valid question submission creates `qa_question_submissions` with `pending` status and returns success.
- Given Q&A is not open, submission returns `qa_closed` and creates no accepted submission row.
- Given retry with same idempotency key, server returns original submission/status and does not double-count.

### Session setup API/CLI

- Agent can create a session through API or Bun CLI and receive session ID plus attendee/admin/QR/Q&A URLs.
- CLI `--json` emits valid JSON only.
- Setup API and CLI use the same validation rules as the web UI.
- Q&A state can be opened/paused/closed through web, API, and CLI paths.

### Agent loop

- Pending submissions for an open session trigger at most one active run per session.
- Codex is invoked with `--model gpt-5.5` and required `exe-llm` config.
- Valid output is applied in one transaction and decisions are audited.
- Invalid/failed output causes no partial queue mutation.

### Merge/rank behavior

- Semantically identical submissions from distinct attendees merge and increment counts.
- Related but materially distinct questions remain separate by default.
- Pinned or human-edited questions are not overwritten by agent runs.
- Answered questions leave the active queue.

### Safety/publication

- Held/rejected/raw unsafe text never appears in public/slides JSON.
- Presenter/admin can see held raw text only in escaped admin context.
- Slides feed contains concise safe questions in stable order.

### Reliability

- Public JSON serves from cached SQLite state without invoking Codex.
- Agent outage does not block question intake.
- Last good published feed remains available and marks stale when appropriate.

---

## 18. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Over-merging loses nuance | Conservative merge threshold, source preservation, later split control. |
| Under-merging clutters queue | Prompt tuning, support counts, optional manual merge. |
| Unsafe projector content | Public/slides generated only from safe statuses; strict mode; human approval. |
| Good question held | Held queue visible; approve action; audit reasons. |
| Hallucinated canonical wording | Faithfulness rules; source preservation; moderator edit. |
| Codex unavailable/slow | Store-first design, cached feeds, backoff, manual moderation fallback. |
| SQLite contention | WAL, busy timeout, short transactions, one active run/session. |
| Invalid/drifting output | Versioned prompt, strict schema validation, reject invalid output. |
| Human override overwritten | App-enforced protected fields. |
| Privacy leakage | Anonymous default, hashed tokens/IPs, no public identifiers, retention policy. |
| Agents set up sessions incorrectly | First-class setup API/CLI with validation and structured responses. |

---

## 19. Implementation order

1. **Session setup foundation**
   - Extract shared session create/update/link logic.
   - Add setup API.
   - Add Bun CLI wrapper.

2. **Schema migration**
   - Add Q&A fields to `sessions`.
   - Create Q&A tables and indexes.
   - Enable WAL/busy timeout.

3. **Manual Q&A baseline**
   - Attendee submit form.
   - Admin Q&A queue.
   - Open/pause/close controls.
   - Manual approve/hide/answer actions.

4. **Published feeds**
   - Generate public/presenter/slides payloads.
   - Cache in `qa_published_views`.
   - Add JSON endpoints and optional overlay HTML.

5. **Agent runner**
   - Implement run lock.
   - Generate input JSON.
   - Invoke Codex with GPT-5.5 config.
   - Capture output/stderr/timeout.

6. **Validation and apply**
   - Validate output schema.
   - Apply decisions transactionally.
   - Record decisions and publish feeds.

7. **Tuning and polish**
   - Test with realistic question bursts.
   - Tune merge/ranking prompt.
   - Add admin health panel and stale lock recovery.

---

## 20. Open decisions

1. Should attendee public queue be visible by default or only after presenter enables display?
2. Should MVP default to `moderated` mode for all projection feeds?
3. Are upvotes part of MVP, or are duplicate submissions enough for demand?
4. What admin authentication model is acceptable for deployment?
5. How long are raw submissions and agent logs retained?
6. Should logistical questions be separated from content questions?
7. Should answered questions remain public or disappear from attendee view?

---

## 21. Definition of done

The first production-ready slice is done when:

- Sessions can be created/configured via web UI, API, and Bun CLI.
- Q&A can be enabled/opened for a QR-linked session.
- Attendees can submit questions without waiting for LLM processing.
- The local agent loop invokes Codex CLI using GPT-5.5 and returns validated JSON decisions.
- Duplicate questions merge in common cases.
- Unsafe/unclear content is held out of public/slides feeds.
- Presenter can pin, answer, hide, approve, and edit questions.
- Public/presenter/slides JSON feeds are versioned, stable, cached, and safe.
- Agent failures leave data intact and the app usable.
- Admin can inspect agent run status and decision rationale.
