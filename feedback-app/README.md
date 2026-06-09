# DevDays Feedback 📣

A fast, practical conference-feedback app built with **Bun + TypeScript + SQLite** (zero external dependencies). Perfect for collecting real-time audience feedback during live talks.

## Features

| Feature | Details |
|---|---|
| **QR codes** | Every session gets a dedicated QR code page to project/display |
| **Quick ratings** | 1–5 star rating with hover feedback |
| **Sentiment** | One-tap 😄 / 🤔 / 😵 emoji buttons |
| **Quick tags** | Predefined chips (Engaging, Too fast, More demos, …) |
| **Free text** | Optional comment textarea |
| **Dictation** | Browser speech-to-text mic button (progressive enhancement) |
| **Admin panel** | Live stats: total responses, average rating, sentiment breakdown |
| **CSV export** | Download all feedback as a CSV file |
| **Session control** | Open / close sessions to stop accepting responses |
| **SQLite** | All data stored locally in `feedback.db` via `bun:sqlite` |

## Quick start

```bash
# Run (no install needed — bun:sqlite is built-in)
bun run src/server.ts
# or with watch mode:
bun --watch run src/server.ts
```

Open http://localhost:8000 and unlock the admin console to create sessions. In local/dev only, if `ADMIN_KEY` is unset, use the clearly warned fallback key `devdays-admin`.

### Using make

```bash
make start     # production
make dev       # watch/auto-reload
make typecheck # TypeScript check
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | HTTP port to listen on |
| `DB_PATH` | `./feedback.db` | SQLite database file path |
| `BASE_URL` | `https://devdays-feedback.exe.xyz` | Public base URL for QR codes and room operator links |
| `ADMIN_KEY` | dev fallback: `devdays-admin` | Global admin unlock key. If unset, the UI/logs clearly warn and use the dev-only fallback. Set this in production. |

Set `BASE_URL` so the QR codes encode your actual public URL:

```bash
BASE_URL=https://myvm.exe.dev bun run src/server.ts
```

## Presenter workflow

1. Organizer unlocks `/admin` with `ADMIN_KEY`, provisions the session, and sends the presenter packet/operator capability link
2. The QR code page appears — project it on screen or share the link
3. Attendees scan → fill in the 1-page form → done in under 10 seconds
4. Presenter opens the `/r/claim/roomcap_...` link to receive room-scoped access, then manages `/admin/<id>`

## File structure

```
devdays-feedback/
  src/server.ts   # Single-file Bun server (routes + DB + HTML templates)
  feedback.db     # Auto-created SQLite database
  package.json
  tsconfig.json
  Makefile
  srv.service     # systemd unit for production
  README.md
```

## Systemd (production)

```bash
sudo cp srv.service /etc/systemd/system/devdays-feedback.service
# Edit WorkingDirectory / BASE_URL as needed
sudo systemctl daemon-reload
sudo systemctl enable --now devdays-feedback
```

## Database schema

```sql
sessions (id, title, description, presenter, created_at, active)
feedback (id, session_id, rating, sentiment, comment, tags, submitted_at)
```


## Loading DevDays talks

From this repository root, populate the local SQLite database from `prep/talks.md`:

```bash
cd feedback-app
DB_PATH=./feedback.db TALKS_MD=../prep/talks.md bun run load-talks
```

This clears existing sessions/feedback/Q&A runtime data and creates one session per listed DevDays talk. Runtime state (`feedback.db`) and admin secrets (`.admin-key*`) are intentionally gitignored.
