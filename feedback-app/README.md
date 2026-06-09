# DevDays Feedback App

A Bun + TypeScript + SQLite attendee feedback and live Q&A app for Josh Mandel's DevDays 2026 talks.

The UX is split clearly between public attendee pages and organizer/operator control rooms. Attendees do not log in; organizers use a global admin key and presenters/moderators can receive room-scoped capability links.

## Features

| Feature | Details |
|---|---|
| Attendee talk pages | `/t/:id` pages with talk info, an Open slides button, live Q&A, and quick feedback signals |
| QR codes | Absolute attendee URLs with quiet zones, now pointing to `/t/:id` |
| Live Q&A | Public question submit, question list, thumbs up/down voting, and projector view |
| Feedback signals | Attendees can send “makes sense”, “confused”, “too fast”, “great demo”, tags, ratings, and optional comments at any time |
| Unified interactions | `attendee_interactions` records question, vote, feedback, and generic public interaction events |
| Admin/operator | `/admin` dashboard and `/admin/talks/:id` control room for sharing, QR, questions, audience feedback, and export |
| Capability links | Organizer sends `/r/claim/roomcap_...`; presenter gets room-scoped operator access |
| SQLite | Runtime state stored locally in `feedback.db` |

## Repository context

```txt
devdays-2026/
  prep/talks.md
  decks/
  feedback-app/
```

Runtime files are intentionally gitignored and should not be committed:

```txt
feedback.db
.admin-key
.admin-key.env
node_modules/
.qa-agent/
```

## Quick start

```bash
bun install
bun run typecheck
PORT=8000 BASE_URL=http://localhost:8000 ADMIN_KEY='local-dev-key' bun run src/server.ts
```

Open `http://localhost:8000/admin`.

If `ADMIN_KEY` is unset, the app uses the warned local fallback key `devdays-admin`. Do not rely on that for public deployment.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | HTTP port |
| `DB_PATH` | `./feedback.db` | SQLite database path |
| `BASE_URL` | `https://devdays-feedback.exe.xyz` | Public base URL for QR codes and operator links |
| `SLIDES_BASE_URL` | `https://jmandel.github.io/devdays-2026` | Base URL used by the talk loader for slide links |
| `ADMIN_KEY` | dev fallback: `devdays-admin` | Global admin unlock key |

## Loading DevDays talks

```bash
cd feedback-app
DB_PATH=./feedback.db TALKS_MD=../prep/talks.md bun run load-talks
```

This clears existing runtime data and creates one session per listed DevDays talk with stable IDs and slide URLs.

| ID | Slides path |
|---|---|
| `smart` | `decks/smart-ecosystem/deck.html` |
| `ktc` | `decks/kill-the-clipboard-panel/deck.html` |
| `checkin` | `decks/digital-credentials-sd-jwt/deck.html` |
| `llms` | `decks/llm-agents-health-data/deck.html` |
| `coin` | `decks/conversational-interop/deck.html` |

## Routes

Public:

- `/t/:id` — canonical attendee talk page
- `/s/:id` — redirects to `/t/:id`
- `/slides/s/:id/qa` — projector Q&A view
- `/api/talks/:id` — public talk data
- `/api/talks/:id/interactions` — generic public interaction submission
- `/api/sessions/:id/qa/questions` — submit question
- `/api/sessions/:id/qa/questions/:questionId/vote` — thumbs up/down vote

Admin/operator:

- `/admin` or `/admin/dashboard` — login/dashboard
- `/admin/talks/:id` — control room
- `/admin/talks/:id/qr` — QR/share page
- `/admin/talks/:id/export` — feedback CSV
- `/r/claim/:token` — room capability claim

## Systemd deployment

The committed `srv.service` is configured for this exe.dev VM layout. Store the admin key outside git:

```bash
cd feedback-app
printf 'ADMIN_KEY=your-four-word-or-better-key\n' > .admin-key.env
chmod 600 .admin-key.env
sudo systemctl restart devdays-feedback.service
```

## Useful commands

```bash
bun run typecheck
DB_PATH=/tmp/devdays-feedback-smoke.sqlite TALKS_MD=../prep/talks.md bun run load-talks
PORT=8000 BASE_URL=http://localhost:8000 ADMIN_KEY='local-dev-key' bun run src/server.ts
systemctl status devdays-feedback.service --no-pager
```
