# DevDays 2026 Talk Prep

This repository contains Josh Mandel's DevDays 2026 session materials plus a companion live feedback/Q&A app.

## Contents

- [`prep/talks.md`](prep/talks.md): canonical schedule/order and descriptions for the five sessions.
- [`prep/talks-to-relevant-posts.md`](prep/talks-to-relevant-posts.md): mapping from each talk to relevant blog posts and repositories.
- [`prep/README.md`](prep/README.md): prep index by scheduled session.
- [`prep/deck-ethos.md`](prep/deck-ethos.md): working principles for making these decks.
- [`decks/`](decks/): generated deck materials and exports.
- [`feedback-app/`](feedback-app/): Bun + TypeScript + SQLite feedback/Q&A app for the sessions.

## Sessions

The feedback app is populated from `prep/talks.md` with stable session IDs:

| ID | Talk |
|---|---|
| `ssmart` | SMART Across the Ecosystem: App Launch, Permission Tickets, and More |
| `skclipboard` | Kill the Clipboard: Frictionless Intake with Patient-Shared Data |
| `sdigcred` | Beyond "All-or-Nothing" QR Codes: Digital Credentials API, SMART Health Check-in, and Selective Disclosure JWTs |
| `sllmagents` | Let's Build: Making LLM Agents Work with Health Data (FHIR & EHI) |
| `scoin` | Toward Conversational Interop: Agents Structuring the Long Tail on the Fly |

## Decks

- `decks/smart-ecosystem/`
- `decks/kill-the-clipboard-panel/`
- `decks/digital-credentials-sd-jwt/`
- `decks/llm-agents-health-data/`
- `decks/conversational-interop/`

Open a `deck.html` file in a browser for a self-contained web deck, or use `deck.pptx` for PowerPoint.

## Feedback app

The live feedback app lives in [`feedback-app/`](feedback-app/). It provides:

- public attendee feedback forms at `/s/:sessionId`
- QR pages with absolute public URLs
- live Q&A submit/upvote
- room-scoped operator capability links
- global admin provisioning
- CSV export
- local SQLite persistence

Runtime state and secrets are intentionally not committed:

- `feedback-app/feedback.db`
- `feedback-app/.admin-key`
- `feedback-app/.admin-key.env`
- `feedback-app/node_modules/`

See [`feedback-app/README.md`](feedback-app/README.md) for app setup, systemd, and talk-loading commands.

## Publication Scope

The repository intentionally excludes `background/`, which contains downloaded specs, cloned repositories, EHI export analysis outputs, caches, logs, and other local research material used to prepare the decks. Those files are bulky and not necessary for using the prep materials.

Generated decks are kept in the repo because the slide images are the primary presentation artifacts. Earlier generated variants, archives, style-lock experiments, and duplicate slide sequences have been removed or ignored.
