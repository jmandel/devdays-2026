# PRD: Room Operator Capability Links

## Summary

Add lightweight security for the conference feedback app by letting a global admin provision rooms and send each presenter a revocable **room operator capability link**. Opening the link grants browser-session access to manage exactly one room, without accounts, passwords, or presenter setup friction.

This keeps attendee submission friction at zero while preventing random users from creating rooms, closing rooms, exporting feedback, or moderating Q&A.

## Goals

- Global admin can create/list/manage all rooms.
- Global admin can copy a presenter/operator link for each room.
- Presenter opens that link and can manage only their room.
- Capability links are scoped, revocable, and regeneratable.
- Capability tokens and session tokens are never stored raw.
- Public attendee URLs and QRs remain unauthenticated.
- Implementation stays simple and demo/conference appropriate.

## Non-goals

- User accounts.
- OAuth/SSO/SAML.
- Enterprise RBAC.
- Presenter password reset flows.
- Strong attendee identity.
- Perfect protection against malicious users with stolen operator links.

## Threat Model

Protect against:

- Attendees discovering admin URLs and closing rooms.
- Public users creating junk rooms.
- Unauthorized export of feedback or Q&A data.
- Unauthorized Q&A moderation.
- Accidental sharing of global admin power.
- Casual abuse on the public internet.

Do not over-optimize for:

- Nation-state attackers.
- Full multi-tenant SaaS isolation.
- Compromised presenter devices.
- Sophisticated phishing/social engineering.

## Core Concept

There are two kinds of authority:

1. **Global admin session**
   - Unlocks app-wide admin console.
   - Can create rooms.
   - Can list all rooms.
   - Can manage any room.
   - Can copy/regenerate/revoke room operator links.

2. **Room operator session**
   - Created by opening a room capability link.
   - Scoped to exactly one room/session.
   - Can manage that room.
   - Cannot create rooms or see/manage other rooms.

The capability link itself is a secret. Admin links are not secrets.

## Recommended UX

### Global admin unlock

When an unauthenticated user visits `/` or `/admin`, show a serious terminal/FHIR-styled locked console:

```text
ADMIN CONSOLE LOCKED
enter operator key
```

After successful login, set an HttpOnly cookie and redirect to the admin dashboard.

### Room creation

Global admin creates a room using the existing form. After creation, show a provisioning packet:

```text
Room created

Attendee URL:
https://devdays-feedback.exe.xyz/s/abc123

Room operator link:
https://devdays-feedback.exe.xyz/r/claim/roomcap_...

[Copy presenter packet]
[Copy operator link]
[Open room admin]
```

Presenter packet copy should include:

```text
Your session is ready.

Attendees submit feedback here:
https://devdays-feedback.exe.xyz/s/abc123

Manage your room here:
https://devdays-feedback.exe.xyz/r/claim/roomcap_...

Use the management link to open/close feedback, export responses, and moderate live Q&A.
Do not share the management link with attendees.
```

### Claiming room access

Presenter opens:

```text
/r/claim/:token
```

Server behavior:

1. Hash incoming token.
2. Find active capability.
3. Create scoped `room_admin` auth session for that room.
4. Set HttpOnly session cookie.
5. Redirect to `/admin/:roomCode`.

The token should disappear from the address bar after redirect.

### Managing room access

On each room admin page, global admin should see an access panel:

```text
ROOM OPERATOR ACCESS
[Copy operator link]
[Regenerate link]
[Revoke link]
```

Room operators may see that access is delegated, but should not be able to rotate/revoke capability links in MVP unless implementation is trivial.

### Unauthorized room admin access

If a user visits `/admin/:id` without global or room-scoped auth, show:

```text
ROOM CONSOLE LOCKED
Ask the organizer for this room's operator link.
```

Do not expose private room details beyond a minimal locked state.

## Capability Link Semantics

MVP behavior:

- Capability links are reusable until revoked/regenerated.
- Capability links are scoped to one room.
- Capability links expire after a configurable interval if easy; otherwise no expiry for MVP, but include fields for future expiry.
- Regenerating a link revokes prior active capabilities for that room and creates a new one.
- Revoking a link prevents future claims but does not necessarily kill already-issued room sessions unless implementation can do so simply.

Preferred token format:

```text
roomcap_<base64url random 32+ bytes>
```

Only store a SHA-256 hash of the token.

## Auth Sessions

Use opaque random session tokens stored in HttpOnly cookies.

Cookie:

- Name: `df_auth`
- HttpOnly
- SameSite=Lax
- Path=/
- Secure when HTTPS/base URL is HTTPS
- Max-Age:
  - global admin: 8-12 hours
  - room operator: 24 hours or conference duration

DB stores only hash of session token.

## Hashing

- Capability tokens are random high-entropy values: hash with SHA-256 for lookup.
- Auth session tokens are random high-entropy values: hash with SHA-256 for lookup.
- Global admin passphrase/key should not be stored raw. Preferred configuration:
  - `ADMIN_KEY_HASH`, or
  - for MVP/dev convenience only, `ADMIN_KEY` env var with clear warning.

If implementing passphrase hashing now, use PBKDF2/WebCrypto or Bun-compatible Argon2/bcrypt. Do not store raw user-chosen passphrases in SQLite.

## SQLite Schema

Add:

```sql
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK(scope IN ('global_admin', 'room_admin')),
  session_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  revoked_at INTEGER,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_scope_session ON auth_sessions(scope, session_id);

CREATE TABLE IF NOT EXISTS room_capabilities (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'operator',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER,
  claimed_at INTEGER,
  last_used_at INTEGER,
  revoked_at INTEGER,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_room_capabilities_token_hash ON room_capabilities(token_hash);
CREATE INDEX IF NOT EXISTS idx_room_capabilities_session_active ON room_capabilities(session_id, active);
```

## Route Protection Matrix

Public:

- `GET /s/:code`
- attendee feedback submit route
- attendee Q&A submit route
- attendee Q&A upvote route
- public/slides Q&A JSON, if it includes only approved display-safe content

Global admin required:

- room creation
- all-room dashboard/list
- global settings
- copy/regenerate/revoke operator links

Global admin OR matching room operator required:

- `GET /admin/:id`
- close/reopen room
- CSV/export
- QR/operator packet page if it exposes operator links
- Q&A moderation
- private/presenter Q&A feeds if they expose raw/private data

Room operator forbidden:

- create rooms
- list all rooms
- manage other rooms
- rotate global admin key

## CSRF / Same-Origin Protection

For MVP, add same-origin checks on authenticated admin POST routes:

- Check `Origin` or `Referer` host matches configured base URL/request host.
- Reject cross-origin admin POSTs.

If easy, add CSRF hidden fields later.

## Migration Plan

1. Add schema tables.
2. Add global admin login and cookie sessions.
3. Protect room creation and admin routes.
4. Generate room capability on new room creation.
5. Add claim route.
6. Add operator link copy panel.
7. Add regenerate/revoke actions.
8. Existing rooms:
   - remain manageable by global admin.
   - global admin can generate operator capability on demand.

## Configuration

Use env vars:

```bash
AUTH_REQUIRED=1
ADMIN_KEY=...
BASE_URL=https://devdays-feedback.exe.xyz
```

For local/dev only, allow a default admin key if no `ADMIN_KEY` is configured, but make it visible in logs/UI. For this VM, set a reasonable key in the service environment or document how to set it.

## Acceptance Criteria

- Unauthenticated user cannot create a room.
- Unauthenticated user cannot access `/admin/:id` room management.
- Global admin can log in and create a room.
- After room creation, global admin can copy a presenter/operator capability link.
- Opening capability link creates room-scoped session and redirects to clean `/admin/:id` URL.
- Room operator can close/reopen/export/manage only that room.
- Room operator cannot create rooms or access other rooms.
- Global admin can regenerate/revoke room operator link.
- Public attendee feedback still works without auth.
- QR codes for attendees do not include operator capability tokens.
- Raw capability tokens and auth session tokens are not stored in SQLite.
- Changes are committed and app is running.
