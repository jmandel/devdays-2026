# DevDays Feedback

Conference-room web app for live pulse signals, public Q&A with AI-synthesized
themes, and private presenter feedback. Bun + TypeScript + SQLite on the
server, React + Zustand on the client, SSE for live updates. See `prd.md` for
the full product spec.

## Quick start

```bash
cd feedback-app
bun install
bun run load-talks        # populate DevDays rooms from ../prep/talks.md
bun run load-ai-context   # load prep/deck material into sessions.ai_context
ADMIN_KEY=change-me bun run dev   # http://localhost:8000
```

Without `ADMIN_KEY`, development falls back to `devdays-dev-key`. In
production (`NODE_ENV=production`) the key is required.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Dev server with hot reload on port 8000 |
| `bun run start` | Production server |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test test/qa-worker.test.ts` | Q&A worker/domain tests |
| `bun run load-talks` | Parse `prep/talks.md` into rooms (`smart`, `ktc`, `checkin`, `llms`, `coin`); clears runtime Q&A/feedback state |
| `bun run load-ai-context` | Clip prep/deck markdown into `sessions.ai_context` |
| `bun run reset-devdays` | Clear live runtime state, reload DevDays talks, and reload AI context |
| `bun run reset-devdays -- --all` | Same reset, also clearing sessions/auth/capability links before reload |
| `bun run cli list\|create\|qa` | Session admin from the terminal |

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8000` | Listen port |
| `DB_PATH` | `feedback.db` | SQLite file (WAL mode) |
| `ADMIN_KEY` | dev fallback | Global admin login key |
| `PUBLIC_BASE_URL` | request origin | Used for share links + Secure cookies |
| `QA_AGENT_BIN` | `codex` | AI worker binary |
| `QA_AGENT_DISABLE` | unset | `1` forces deterministic fallback |
| `QA_AGENT_TIMEOUT_MS` | `90000` | AI worker kill timeout |
| `QA_AGENT_MODEL` | unset | `--model` passed to codex (e.g. `gpt-5.5`) |
| `QA_AGENT_EXTRA_ARGS` | unset | Newline-separated extra CLI flags; lines starting `"-c "` are split into `-c <value>` pairs |
| `QA_AGENT_DIR` | `./.qa-agent` | Run directories (`input.json` / `output.json`) |
| `REPO_ROOT`, `TALKS_PATH`, `SLIDES_BASE_URL`, `CONTEXT_MAX_CHARS` | — | Loader script overrides |

## How Q&A processing works

1. Attendee POSTs a question → stored raw in `qa_question_submissions`
   (`pending`), duplicate retries from the same browser return the existing
   row.
2. Processing is debounced ~900 ms; a newer submission cancels an in-flight
   worker run for that session.
3. The worker writes `input.json` (session metadata, `ai_context`,
   pending/held raw submissions, existing themes) into `.qa-agent/<run>/` and
   runs Codex with workspace-write sandbox, expecting JSON-only
   `output.json`: `{ "themes": [{ question, state: active|hold|answered|hidden,
   raw_submission_ids, existing_theme_ids, ... }] }`.
4. The projection is applied to `qa_questions`; anything left unprojected —
   or the whole batch when Codex is unavailable/fails — goes through
   deterministic fallback (promote, similarity-merge, consolidate duplicates,
   recompute support).
5. Every run is recorded in `qa_agent_runs` and inspectable at
   `/admin/talks/:id/ai-run`.

## Surfaces

- `/` room chooser · `/t/:id` attendee page (pulse, public Q&A + voting,
  private feedback) · `/s/:id` redirect
- `/admin` global dashboard (key login) · `/admin/talks/:id` control room ·
  `…/qr` join QR · `…/ai-run` AI audit · `…/export` feedback CSV
- `/r/claim/roomcap_…` one-room operator capability claim

Auth/capability tokens are stored as SHA-256 hashes only; auth cookies are
HttpOnly/SameSite=Lax (Secure when the base URL is HTTPS); admin-mutating
POSTs require same-origin Origin/Referer.

## Deploy (exe.dev VM)

```ini
# /etc/systemd/system/devdays-feedback.service
[Unit]
Description=DevDays Feedback
After=network.target

[Service]
WorkingDirectory=/opt/devdays-2026/feedback-app
Environment=NODE_ENV=production PORT=8000 PUBLIC_BASE_URL=https://feedback.example.com
EnvironmentFile=/etc/devdays-feedback.env   # ADMIN_KEY=...
ExecStart=/usr/local/bin/bun run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

`feedback.db`, `.qa-agent/`, and key files are gitignored.
