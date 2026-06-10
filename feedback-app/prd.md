# PRD: DevDays Feedback and Live Q&A App

## 1. Introduction / Overview

DevDays Feedback is a conference-room web app for collecting attendee signals, public Q&A, and private presenter feedback during DevDays 2026 talks. The app is designed for low-friction use in a live room: attendees scan a QR code or open a short public URL, submit quick pulse signals, ask and vote on public questions, and optionally provide private session feedback. Presenters and organizers use a protected control room to monitor live audience pulse, view AI-synthesized Q&A themes, mark themes answered, display a QR code, inspect AI processing runs, and export feedback.

The product intentionally favors automatic workflows over operator-heavy moderation. Attendee submissions are stored as raw questions, processed into presenter-ready themes by a Codex-backed worker when available, and fall back to deterministic merging when AI processing fails. Public attendee and presenter views stay live through Server-Sent Events (SSE).

This PRD documents the current app functionality and expected equivalent behavior. It is intended to be detailed enough for a developer or AI agent to recreate an equivalent app, without prescribing exact pixel-level layout.

## 2. Product Goals

- Provide a no-login public attendee page for each talk with slides, live pulse, public Q&A, and private feedback.
- Let attendees submit public questions and vote on raw questions with minimal friction.
- Automatically synthesize raw audience submissions into concise presenter-ready Q&A themes.
- Preserve raw attendee questions in public streams while making synthesized themes the primary presenter experience.
- Give presenters/operators a calm control room with live pulse, synthesized themes, raw-question fallback visibility, QR/share utilities, AI run audit, and export.
- Support room-scoped operator access via capability links, plus global admin access via an admin key.
- Use local SQLite runtime storage and simple Bun/TypeScript deployment suitable for an exe.dev VM.
- Maintain live updates using SSE so attendees and admins do not depend on manual refreshes.
- Keep privacy boundaries clear: public Q&A is visible to the room; session feedback is private to presenter/organizer.

## 3. Personas and User Roles

### 3.1 Attendee

An unauthenticated conference participant using a phone or laptop during a talk.

Primary needs:
- Open the correct room quickly from a QR code or room chooser.
- Open slides.
- Tap a live pulse signal without typing.
- Ask a public question.
- See and vote on public questions from the room.
- Optionally submit private feedback after or during the session.

Permissions:
- No login required.
- Can interact only through public room endpoints.
- Identified by a long-lived browser cookie (`qa_submitter_key`) for duplicate detection and voting.

### 3.2 Presenter / Room Operator

A presenter or helper with room-scoped capability access.

Primary needs:
- Open a talk-specific control room.
- See live pulse counts and Q&A themes.
- Show a large QR code to attendees.
- Mark synthesized themes pinned, answered, hidden, restored.
- See private feedback only when appropriate.
- Export session feedback.

Permissions:
- Authenticated through a room capability claim link.
- Can manage only the associated room.

### 3.3 Global Admin / Organizer

An organizer with global admin key access.

Primary needs:
- Log in to the admin dashboard.
- List all rooms and feedback totals.
- Create new rooms.
- Access any room control room.
- Generate/revoke/regenerate room capability links.
- Export feedback and inspect AI run logs.

Permissions:
- Authenticated with global admin cookie after submitting `ADMIN_KEY`.
- Can manage all rooms.

## 4. Scope Summary

### In Scope

- Public room chooser.
- Public attendee talk page.
- Live pulse signals.
- Public Q&A submission, duplicate retry handling, raw stream display, and voting.
- Session feedback rating/comment submission.
- Admin login and dashboard.
- Room capability links and room-scoped auth.
- Control room for live pulse, Q&A themes, raw questions, QR, AI log, export, private feedback.
- AI/fallback Q&A theme synthesis pipeline.
- SSE live updates.
- SQLite schema and inline migrations.
- Talk loading and AI context loading scripts.
- CSV export.

### Out of Scope / Non-Goals

- User accounts for attendees.
- Anonymous guarantees; the app should only say feedback is private to presenter/organizer.
- Multi-tenant SaaS billing, organizations, or hosted account management.
- Full moderation queue requiring manual accept/reject before public display.
- Real-time chat.
- Email notifications.
- Push notifications.
- Persistent cloud database synchronization.
- Rich analytics dashboards beyond current summaries/export.
- Exact visual layout reproduction from this PRD.

## 5. Core Concepts and Domain Model

### 5.1 Session / Room

A talk room is represented by a `sessions` row.

Important fields:
- `id`: stable room ID, e.g. `smart`, `ktc`, `checkin`, `llms`, `coin`, or generated IDs for new rooms.
- `title`: talk title.
- `presenter`: presenter name.
- `description`: talk date/time or contextual description.
- `active`: whether the room appears in public room lists.
- `qa_state`: `open`, `paused`, `closed`, `disabled`, or `archived`.
- `qa_mode`: currently expected to be `moderated` for automated synthesis.
- `qa_display_mode`: display preference such as `queue`.
- `qa_enabled`: boolean-like flag for accepting Q&A.
- `slides_url`: external URL for slides.
- `short_code`: optional short code.
- `feedback_state`: feedback availability, default `open`.
- `ai_context`: session-specific background material for Q&A synthesis.

### 5.2 Raw Question Submission

A public attendee question is first stored as a raw submission in `qa_question_submissions`.

Important fields:
- `id`: raw submission ID.
- `session_id`: room.
- `submitter_key`: attendee cookie key.
- `raw_text`: original normalized question text.
- `normalized_hash`: lowercased SHA-256 hash for duplicate retry detection.
- `status`: `pending`, `promoted`, `merged`, `held`, or `rejected`.
- `question_id`: synthesized theme ID, if mapped.
- `submitted_at`, `processed_at`: timestamps.

Expected behavior:
- Raw submissions remain visible to public attendees unless rejected/hidden through mapped theme state.
- Held submissions should appear publicly as `needs detail` rather than disappearing.
- A duplicate retry from the same submitter with the same normalized hash should return the existing submission instead of inserting a duplicate.

### 5.3 Synthesized Theme

A presenter-ready Q&A theme is stored in `qa_questions`.

Important fields:
- `id`: theme ID.
- `session_id`: room.
- `display_text`: concise presenter-ready question.
- `status`: `new`, `live`, `pinned`, `answered`, `held`, `hidden`, `rejected`, or `merged`.
- `priority`: AI/fallback priority score.
- `support_count`: aggregate support from mapped raw submissions and votes.
- `pinned`: boolean-like flag.
- `human_override`: whether operator action modified the theme.
- `source_submission_id`: first raw source.
- `answered_at`, `hidden_at`, `merged_into_question_id`: lifecycle fields.

Expected behavior:
- Presenter/admin views emphasize themes over raw submissions by default.
- Answering a theme marks it answered and prevents further public voting for mapped raw submissions.
- Hidden themes are excluded from public raw display when mapped raw submissions would expose hidden content.
- Merged themes redirect support/source mappings to the retained theme.

### 5.4 Vote

Votes are stored in `qa_question_votes`.

Important fields:
- `question_id`: can reference a raw submission ID or theme ID depending on `target_kind`.
- `submitter_key`: attendee cookie key.
- `value`: `1` or `-1`.
- `target_kind`: `raw` or `theme`.
- Unique constraint: one vote per `(question_id, submitter_key)`.

Expected behavior:
- Re-voting updates the prior vote value.
- Votes on raw submissions contribute to raw support and, if mapped, recompute mapped theme support.
- Votes on answered raw questions should not be available from the public UI.

### 5.5 Pulse Interaction

Pulse is a lightweight attendee signal recorded in `attendee_interactions` with `kind = 'pulse'`.

Current pulse options:
- `I’m with you`
- `I’m confused`
- `Too fast`
- `Too slow`

Expected behavior:
- Tap-only; no free text.
- Can be sent repeatedly over time.
- Pulse summaries count values within the last 5 minutes.
- Pulse updates emit SSE immediately.

### 5.6 Session Feedback

Private session feedback is stored in `feedback` and also recorded in `attendee_interactions` with `kind = 'feedback'`.

Fields:
- `rating`: integer 1-5 or null.
- `sentiment`: optional short sentiment string.
- `comment`: optional text up to 2000 characters.
- `tags`: JSON array of up to 10 strings.
- `submitted_at`: timestamp.

Current public UI exposes:
- Usefulness rating 1-5.
- Optional comment: “What is one thing {speakerName} should keep, change, or clarify?”

Expected behavior:
- Feedback is private to presenter/organizer.
- Feedback summary includes rating distribution and recent comments for authorized presenters/admins.
- Feedback updates emit SSE to presenter-authorized clients.

### 5.7 Auth Session

Authentication is cookie-based through `auth_sessions`.

Scopes:
- `global_admin`: created by admin-key login; can manage all rooms.
- `room_admin`: created by claiming a room capability link; can manage one room.

Expected behavior:
- Auth cookies are HttpOnly and SameSite=Lax.
- Secure flag is set when public base URL is HTTPS.
- Expired/revoked tokens are invalid.
- Admin-changing POSTs require same-origin/referer validation.

### 5.8 Room Capability

A room capability is a one-room operator token stored hashed in `room_capabilities`.

Expected behavior:
- Raw capability tokens are not stored in SQLite.
- Claim URL format: `/r/claim/roomcap_...`.
- Claiming creates a room-admin auth session and redirects to `/admin/talks/:id`.
- Regenerating a capability revokes existing active capabilities for that room.

### 5.9 AI Agent Run

Each AI/fallback Q&A processing pass is tracked in `qa_agent_runs`.

Important fields:
- `id`, `session_id`.
- `status`: `running`, `applied`, `fallback`, etc.
- `input_path`, `output_path`.
- `error`, `summary`.

Expected behavior:
- Admins can inspect latest run input/output through an AI audit screen.
- If Codex/AI fails or does not produce output, fallback processing should still promote/merge questions.

## 6. Screens and User-Facing Surfaces

### 6.1 Public Room Chooser (`/`)

Audience: attendee or anyone who reaches the app root.

Purpose:
- List active public rooms.
- Provide public room links.
- Provide a quiet operator login link.

Required content:
- App label: DevDays Feedback.
- Heading: Choose a room.
- Description: public page includes slides, live Q&A, and private feedback.
- One card per active session, ordered by current DevDays room order when those IDs exist: `smart`, `ktc`, `checkin`, `llms`, `coin`, then title.
- Each room card shows title, presenter, optional description, room ID, and `Open room` action.
- Empty state if no active rooms.

Required behavior:
- Room links navigate to `/t/:id`.
- Operator login navigates to `/admin`.
- Long titles must not collide with action buttons; action should remain aligned or stack responsively.

### 6.2 Attendee Talk Page (`/t/:id`)

Audience: attendee.

Purpose:
- The primary public per-talk interaction surface.

Required sections:
1. Talk hero
   - Talk title.
   - Presenter name when available.
   - Description/date-time when available.
   - External slides link when `slides_url` exists.
   - Connection status badge (`live`, `connecting`, `idle`, or `error`).
2. Live pulse check
   - Prompt: “How is this landing right now?”
   - Pulse choices: `I’m with you`, `I’m confused`, `Too fast`, `Too slow`.
   - Tap submits immediately.
   - Status message after send/failure.
3. Public Q&A
   - Status badge: `open` or `closed`.
   - Question textarea with max 1000 characters.
   - Label should address speaker dynamically, e.g. “Your question for Josh Mandel”.
   - Submit action.
   - Questions from the room.
   - Each raw question row shows text, status, score, created time, optional mapped theme ID, and vote controls when not answered.
4. Private feedback
   - Private feedback heading using presenter name or fallback “the speaker”.
   - Usefulness rating scale 1-5.
   - Optional comment prompt.
   - Submit action.

Required behavior:
- Page loads talk metadata from `/api/talks/:id`.
- Page loads public Q&A payload from `/api/sessions/:id/qa/public.json`.
- Page opens SSE `/api/sessions/:id/qa/events`.
- On pulse submit, POST to `/api/talks/:id/interactions` and update status.
- On question submit, POST to `/api/sessions/:id/qa/questions`; clear textarea on success and show queued status.
- On vote, POST to `/api/sessions/:id/qa/questions/:questionId/vote` with value `1` or `-1`.
- On feedback submit, POST to `/api/talks/:id/session-feedback`; clear feedback fields on success.
- If talk is not found, server returns 404.
- If Q&A is not open, question form is replaced with “Questions are closed right now.”

### 6.4 Admin Login (`/admin`, `/admin/login-page` when unauthenticated)

Audience: global admin.

Purpose:
- Unlock the global admin dashboard.

Required behavior:
- If unauthenticated and trying admin dashboard, show operator key required / open login UI.
- Login form posts to `/admin/login` with field `key`.
- Valid key creates a global admin auth session and redirects to `/admin/dashboard`.
- Invalid key redirects back to login page with an error query parameter.
- Logout posts to `/logout`, revokes auth session, clears cookie, and redirects to `/admin`.

### 6.5 Admin Dashboard (`/admin`, `/admin/dashboard` authenticated)

Audience: global admin.

Purpose:
- Manage rooms at a high level.

Required content:
- Header with logout.
- Overview card: number of talks, active talks, feedback response total.
- Create room form with title, presenter, description/context.
- Room list with title, presenter, feedback count, Q&A state, and actions.

Required behavior:
- Dashboard data loads from `/api/admin/sessions`.
- Creating a room POSTs to `/api/admin/sessions`, then navigates to that room control room.
- Created rooms default to Q&A open, moderated mode, feedback open, and active.
- Room list actions include control room, attendee page, and QR page.
- Only global admins can list/create sessions.

### 6.6 Room Control Room (`/admin/talks/:id`)

Audience: presenter, room operator, global admin.

Purpose:
- Main presenter/operator live Q&A and feedback surface.

Required content:
1. Header
   - App/control room label.
   - Talk title.
   - Presenter when available.
   - Connection/status messaging.
2. Live room operations card
   - Primary action should be QR-oriented.
   - Quiet utility actions: open public page, AI processing log, export CSV.
   - Workflow copy should indicate automation: questions accepted automatically and themes update as attendees ask/vote.
3. Room pulse panel
   - Same four pulse options and last-5-minute counts used by attendee pulse.
4. Audience themes panel
   - Default mode: synthesized presenter themes.
   - Toggle to raw questions.
   - Theme cards show theme text, source count, score.
   - Operator actions per theme: pin/unpin, answered, hide; restore may be available for hidden/answered in underlying API.
   - Empty state may include raw preview if submissions exist but no answerable themes are ready.
5. Private feedback disclosure
   - Collapsed or visually secondary by default for shared-screen safety.
   - When expanded, shows session usefulness distribution and comments.
   - Must state private feedback is private to presenter/organizer.

Required behavior:
- Requires `global_admin` or matching `room_admin` auth; otherwise show operator access required.
- Loads talk, presenter themes, public raw questions, feedback summary.
- Subscribes to SSE with presenter payload and feedback payload when authorized.
- Polls periodically as a fallback.
- Theme actions POST to `/api/admin/talks/:id/questions/:questionId/actions`.
- Private feedback summary GETs `/api/admin/talks/:id/feedback-summary`.
- Export link downloads CSV from `/admin/talks/:id/export`.
- AI log link opens `/admin/talks/:id/ai-run`.

### 6.7 QR Page (`/admin/talks/:id/qr`)

Audience: presenter/operator.

Purpose:
- Show a large scannable QR code and public attendee URL.

Required content:
- Talk title and presenter.
- QR code for attendee URL `/t/:id` using current origin/base.
- Plain attendee URL text.
- Actions: open public page, copy link, return to control room.

Required behavior:
- QR page is implemented in React route.
- QR code may be generated by an external QR image URL if acceptable for deployment.
- Copy action uses clipboard API and gives short confirmation.
- Must not encode admin/operator capability tokens in attendee QR codes.

### 6.8 AI Run Audit (`/admin/talks/:id/ai-run`)

Audience: presenter/operator/global admin.

Purpose:
- Inspect latest Q&A processing run for debugging/trust.

Required content:
- Talk title.
- Latest run ID, status, started/finished timestamps.
- Summary and error if present.
- Raw input content if available.
- Raw Codex output content if available.
- Back to control room.

Required behavior:
- Loads JSON from `/api/admin/talks/:id/ai-run.json`.
- Requires room management auth.
- Handles no-run state.
- Reads input/output files with size cap/truncation to avoid overly large responses.

### 6.9 Capability Claim (`/r/claim/:token`)

Audience: presenter/operator receiving a room capability link.

Purpose:
- Convert a room capability token into a room-admin session.

Required behavior:
- Validate token format and hash.
- Ensure capability active, not revoked, not expired.
- Ensure target room exists.
- Update claimed/last-used timestamps.
- Create room-admin auth session scoped to room.
- Redirect to `/admin/talks/:id`.
- Invalid token returns locked/unauthorized experience.

### 6.10 CSV Export (`/admin/talks/:id/export`)

Audience: presenter/operator/global admin.

Purpose:
- Download session feedback as CSV.

Required behavior:
- Requires room management auth.
- Exports `feedback` rows ordered by submission time.
- Columns: `id`, `submitted_at`, `rating`, `sentiment`, `tags`, `comment`.
- Filename format: `feedback-:id.csv`.
- Values are CSV-escaped.

## 7. User Stories

### US-001: Choose a public room
**Description:** As an attendee, I want to choose a talk room from the public landing page so that I can join the correct feedback and Q&A page.

**Acceptance Criteria:**
- [ ] Root page lists only active rooms.
- [ ] Each room shows title, presenter if available, room ID, and an `Open room` action.
- [ ] Long room titles do not overlap the action button on desktop.
- [ ] Room cards stack cleanly on mobile.
- [ ] Verify in browser using dev-browser skill.

### US-002: Open talk page and slides
**Description:** As an attendee, I want to see talk details and open slides so that I can follow along during the session.

**Acceptance Criteria:**
- [ ] `/t/:id` loads title, presenter, description, and slides URL from the talk API.
- [ ] Missing room IDs return a 404.
- [ ] Slides action opens the configured `slides_url` in a new tab.
- [ ] Verify in browser using dev-browser skill.

### US-003: Submit live pulse
**Description:** As an attendee, I want to tap a quick pulse signal so that the presenter can sense how the room is doing without requiring typed feedback.

**Acceptance Criteria:**
- [ ] Pulse choices are exactly `I’m with you`, `I’m confused`, `Too fast`, and `Too slow`.
- [ ] Tapping a choice POSTs a `pulse` interaction.
- [ ] New attendee browsers receive a `qa_submitter_key` cookie.
- [ ] Presenter pulse summaries update via SSE after submission.
- [ ] Verify in browser using dev-browser skill.

### US-004: Submit a public question
**Description:** As an attendee, I want to submit a public question so that the presenter can address it during Q&A.

**Acceptance Criteria:**
- [ ] Question submissions shorter than 5 characters are rejected with a clear error.
- [ ] Question submissions over 1000 characters are rejected.
- [ ] Valid questions are stored as raw submissions with status `pending`.
- [ ] Submitting the same normalized question twice from the same browser returns duplicate retry instead of inserting a duplicate.
- [ ] Q&A worker processing is scheduled after a valid submission.
- [ ] Public question list updates after submission.
- [ ] Verify in browser using dev-browser skill.

### US-005: See raw public questions
**Description:** As an attendee, I want to see the room’s raw public questions so that I can know what others are asking and vote on them.

**Acceptance Criteria:**
- [ ] Public Q&A payload includes raw submissions except rejected/hidden content.
- [ ] Raw statuses map to user-facing statuses: `queued`, `grouped`, `answered`, and `needs detail`.
- [ ] Held submissions appear as `needs detail`.
- [ ] Answered questions remain visible.
- [ ] Hidden mapped submissions do not appear publicly.
- [ ] Verify in browser using dev-browser skill.

### US-006: Vote on a public question
**Description:** As an attendee, I want to upvote or downvote questions so that the presenter can prioritize audience interest.

**Acceptance Criteria:**
- [ ] Vote POST accepts values where negative becomes `-1` and non-negative becomes `1`.
- [ ] One browser can have only one current vote per target question.
- [ ] Re-voting updates the stored value.
- [ ] Raw support count reflects raw votes.
- [ ] Mapped theme support is recomputed when mapped raw questions receive votes.
- [ ] Answered raw questions do not show vote controls.
- [ ] Verify in browser using dev-browser skill.

### US-007: Submit private session feedback
**Description:** As an attendee, I want to privately rate/comment on a session so that the presenter can improve without making my feedback public.

**Acceptance Criteria:**
- [ ] Feedback form accepts rating 1-5 or no rating.
- [ ] Comment is optional and capped at 2000 characters.
- [ ] Feedback is stored in `feedback` and mirrored as an `attendee_interactions` record.
- [ ] Feedback summary updates for authorized presenter/admin views.
- [ ] UI copy says feedback is private to presenter/organizer, not anonymous.
- [ ] Verify in browser using dev-browser skill.

### US-008: Log in as global admin
**Description:** As an organizer, I want to unlock the admin dashboard with an operator key so that I can manage rooms.

**Acceptance Criteria:**
- [ ] Login form posts `key` to `/admin/login`.
- [ ] Correct key creates `global_admin` auth session and sets HttpOnly auth cookie.
- [ ] Incorrect key does not authenticate.
- [ ] Logout revokes the auth session and clears cookie.
- [ ] Admin-changing POSTs reject cross-origin requests.
- [ ] Verify in browser using dev-browser skill.

### US-009: Create and list rooms
**Description:** As a global admin, I want to create and list rooms so that new talks can collect feedback.

**Acceptance Criteria:**
- [ ] Admin sessions API returns room list and totals only to global admins.
- [ ] Create-room API requires title and trims title/presenter/description to configured limits.
- [ ] New room defaults to active, Q&A open, feedback open, and moderated queue mode.
- [ ] New room response includes attendee/admin URLs and an operator capability link.
- [ ] Verify in browser using dev-browser skill.

### US-010: Claim room operator access
**Description:** As a presenter, I want to open a room capability link so that I can manage only my room without knowing the global admin key.

**Acceptance Criteria:**
- [ ] Claim route accepts valid `roomcap_...` token format.
- [ ] Token is compared by hash, not plaintext storage.
- [ ] Valid claim creates a `room_admin` auth session scoped to the target room.
- [ ] Invalid/revoked/expired claims fail without creating auth.
- [ ] Room admin cannot manage other rooms.
- [ ] Verify in browser using dev-browser skill.

### US-011: View live control room
**Description:** As a presenter/operator, I want a control room with live pulse and synthesized themes so that I can run Q&A without manual sorting.

**Acceptance Criteria:**
- [ ] Unauthorized users see an operator-access-required state.
- [ ] Authorized room/global admins see talk title, pulse, audience themes, and utility links.
- [ ] Control room subscribes to SSE with presenter and feedback payloads.
- [ ] Control room periodically refreshes as a fallback.
- [ ] Private feedback is visually separated/collapsed for shared-screen safety.
- [ ] Verify in browser using dev-browser skill.

### US-012: Moderate synthesized themes
**Description:** As a presenter/operator, I want to pin, answer, hide, and restore themes so that Q&A state reflects what is useful and already addressed.

**Acceptance Criteria:**
- [ ] Theme action API requires room management auth.
- [ ] Pin sets status `pinned`, `pinned=1`, and `human_override=1`.
- [ ] Unpin returns status to `live` and clears pinned flag.
- [ ] Answer sets status `answered`, clears pinned flag, and sets `answered_at`.
- [ ] Hide sets status `hidden`, clears pinned flag, and sets `hidden_at`.
- [ ] Restore sets status `live` and clears hidden/answered timestamps.
- [ ] Each action emits SSE refresh.
- [ ] Verify in browser using dev-browser skill.

### US-014: Generate and show QR code
**Description:** As an operator, I want a large QR page so that attendees can quickly join the correct public room.

**Acceptance Criteria:**
- [ ] QR page encodes only the public attendee URL.
- [ ] QR page shows the attendee URL text.
- [ ] Copy link action copies attendee URL and confirms success.
- [ ] QR page links back to the control room.
- [ ] Verify in browser using dev-browser skill.

### US-015: Process Q&A automatically with AI/fallback
**Description:** As a presenter, I want attendee questions automatically synthesized into themes so that I do not need to manually triage raw questions.

**Acceptance Criteria:**
- [ ] New raw questions schedule background processing after debounce.
- [ ] Existing worker jobs are canceled when newer submissions arrive for the same session.
- [ ] Worker writes `input.json` and expects JSON-only `output.json` in a contained run directory.
- [ ] Codex projection can create/update/hide/hold/answer themes according to schema.
- [ ] If Codex fails, deterministic fallback promotes/merges pending submissions.
- [ ] Processing run status, paths, errors, and summary are recorded.
- [ ] Typecheck passes.

### US-016: Inspect AI run
**Description:** As an operator, I want to inspect the latest AI run so that I can debug or trust how themes were generated.

**Acceptance Criteria:**
- [ ] AI run API requires room management auth.
- [ ] AI run screen shows latest run metadata.
- [ ] Input/output file content is shown when available and safely truncated.
- [ ] No-run state is handled gracefully.
- [ ] Verify in browser using dev-browser skill.

### US-017: Export feedback CSV
**Description:** As a presenter/operator, I want to export private session feedback so that I can analyze responses after the session.

**Acceptance Criteria:**
- [ ] Export route requires room management auth.
- [ ] CSV includes header `id,submitted_at,rating,sentiment,tags,comment`.
- [ ] Rows are ordered by submission time ascending.
- [ ] Filename includes room ID.
- [ ] Values are properly CSV escaped.

### US-018: Load DevDays talks and AI context
**Description:** As an operator/developer, I want scripts to populate rooms and AI context from repo materials so that the live app has correct DevDays content.

**Acceptance Criteria:**
- [ ] `load-talks` parses `prep/talks.md` and creates stable room IDs for known talks.
- [ ] Loaded talks include presenter, date/time description, active/open states, short code, and slides URL.
- [ ] `load-ai-context` reads configured deck/context files and stores clipped context in `sessions.ai_context`.
- [ ] Scripts accept environment overrides for DB path, talks path, repo root, slides base URL, and context max chars.

## 8. Functional Requirements

### 8.1 Public Rooms and Talks

- FR-1: The system must expose `GET /api/talks` returning active rooms with `id`, `title`, `presenter`, and `description`.
- FR-2: The system must expose `GET /api/talks/:id` returning talk metadata and session URLs.
- FR-3: Public room chooser must render from `/api/talks`.
- FR-4: `/t/:id` must return the React app shell only if the session exists; otherwise it must return 404.
- FR-5: `/s/:id` must redirect to `/t/:id`.

### 8.2 Attendee Identity

- FR-6: Public interaction endpoints must use a `qa_submitter_key` cookie to identify repeat submissions/votes from one browser.
- FR-7: If no valid attendee cookie exists, the server must generate one and set it with `Path=/`, `Max-Age=31536000`, and `SameSite=Lax`.
- FR-8: Attendee identity must not require login, email, or name.

### 8.3 Pulse and Interactions

- FR-9: `POST /api/talks/:id/interactions` must accept JSON with `kind`, `value`, optional `body`, optional `target_id`, and optional `metadata`.
- FR-10: Interaction field lengths must be bounded server-side.
- FR-11: Pulse interactions must be recorded with `kind='pulse'` and emit SSE updates.
- FR-12: Feedback summary must count pulse interactions from the last 300 seconds.

### 8.4 Public Q&A Submission

- FR-13: `POST /api/sessions/:id/qa/questions` must accept `question` or `text`.
- FR-14: The system must normalize question whitespace and cap text at 1000 characters.
- FR-15: The system must reject questions shorter than 5 characters.
- FR-16: The system must reject submissions when Q&A is not enabled or state is not `open`.
- FR-17: The system must detect same-browser duplicate retries by `session_id`, `submitter_key`, and normalized hash.
- FR-18: Valid question submissions must record an `attendee_interactions` record with `kind='question'`.
- FR-19: Valid submissions must schedule Q&A processing and emit live refresh.

### 8.5 Public Q&A Display

- FR-20: Public Q&A payload must include raw submissions ordered with active/newer submissions before answered items.
- FR-21: Public raw statuses must be mapped for attendees to `queued`, `grouped`, `answered`, or `needs detail`.
- FR-22: Rejected raw submissions must not be included in public payload.
- FR-23: Raw submissions mapped to hidden themes must not be included in public payload.
- FR-24: Public payload must include support count for each raw question.

### 8.6 Voting

- FR-25: `POST /api/sessions/:id/qa/questions/:questionId/vote` and `/upvote` must support voting.
- FR-26: Vote targets may be raw submissions or synthesized themes.
- FR-27: Votes must be upserted by `(question_id, submitter_key)`.
- FR-28: Vote value must be stored as `-1` for negative values and `1` otherwise.
- FR-29: Voting must emit Q&A refresh.

### 8.7 Presenter Themes

- FR-30: Presenter payload must include active synthesized themes ordered by pinned, status, priority, support, and age.
- FR-31: Presenter payload must include answered theme count.
- FR-32: Theme source count must be computed from mapped raw submissions.
- FR-33: Slides payload must include active, non-answered themes.
- FR-34: Published Q&A views must be persisted in `qa_published_views` with version increment on update.

### 8.8 Theme Actions

- FR-35: Theme action API must require room management auth.
- FR-36: Supported actions must be `pin`, `unpin`, `answer`, `hide`, and `restore`.
- FR-37: Invalid actions must return 400.
- FR-38: Missing question/theme IDs must return 404.
- FR-39: Theme actions must record a moderator action and emit live refresh.

### 8.9 AI/Fallback Processing

- FR-40: New submissions must debounce Q&A processing by approximately 900ms.
- FR-41: A newer submission for the same session must cancel any in-flight worker process.
- FR-42: Worker input must include session metadata, background AI context, pending/held raw submissions, and existing themes including answered themes.
- FR-43: Worker must run Codex in a contained run directory with workspace-write access.
- FR-44: Worker output schema must be a renderable projection: `{ "themes": [...] }`.
- FR-45: Worker must support theme states `active`, `hold`, `answered`, and `hidden`.
- FR-46: Held output must mark raw submissions `held`.
- FR-47: Active output must create or update synthesized themes and map raw submissions.
- FR-48: Answered/hidden output must set corresponding theme states and timestamps.
- FR-49: Fallback processing must promote or merge pending submissions when AI fails or leaves submissions unprojected.
- FR-50: Duplicate theme consolidation must merge similar active themes and remap submissions/votes.

### 8.10 Feedback

- FR-51: `POST /api/talks/:id/session-feedback` must accept `rating`, `sentiment`, `comment`, and `tags`.
- FR-52: Rating must be clamped to 1-5 when present.
- FR-53: Comment must be trimmed and capped at 2000 characters.
- FR-54: Tags must be stored as JSON and capped to 10 values.
- FR-55: Feedback submission must emit presenter SSE update.
- FR-56: Feedback summary API must require room management auth.

### 8.11 SSE Live Updates

- FR-57: SSE endpoint must be `GET /api/sessions/:id/qa/events`.
- FR-58: Public clients must receive public Q&A payload.
- FR-59: Authorized room/global admins must receive public, presenter, and feedback payloads.
- FR-60: SSE frames must use event name `qa`.
- FR-61: SSE stream must send keepalive comments periodically.
- FR-62: Pulse, feedback, Q&A submission, vote, worker processing, and theme actions must trigger relevant SSE updates.

### 8.12 Authentication and Authorization

- FR-63: Global admin login must compare submitted key to `ADMIN_KEY` environment value or development fallback.
- FR-64: Auth session tokens and room capability tokens must be stored only as SHA-256 hashes.
- FR-65: Auth cookies must be HttpOnly and SameSite=Lax.
- FR-66: Global admin sessions must expire after approximately 10 hours.
- FR-67: Room admin sessions must expire after approximately 24 hours.
- FR-68: Room admin must only manage its scoped session.
- FR-69: Admin-changing POST routes must validate same-origin origin/referer.

### 8.13 Admin Sessions

- FR-70: Global admins must be able to list sessions and totals.
- FR-71: Global admins must be able to create sessions.
- FR-72: Session creation must generate a room capability and return an operator link/presenter message.
- FR-73: Session active state toggle route may exist for server-side compatibility.
- FR-74: Capability regenerate/revoke routes must require global admin scope.

### 8.14 QR, Export, AI Audit

- FR-75: QR page must produce QR for public attendee URL only.
- FR-76: Export route must return CSV with appropriate content disposition.
- FR-77: AI run API must require room management auth.
- FR-78: AI run API must safely read and truncate input/output files.

### 8.15 Data Loading and CLI

- FR-79: `load-talks` must populate known DevDays talks from markdown and clear runtime tables.
- FR-80: Known clean room IDs must be `smart`, `ktc`, `checkin`, `llms`, and `coin`.
- FR-81: `load-ai-context` must populate `sessions.ai_context` from talk/deck materials.
- FR-82: CLI must support creating sessions, listing sessions, and opening/pausing/closing Q&A.

## 9. API Contract Summary

### Public APIs

- `GET /api/talks`
  - Returns `{ rooms: [{ id, title, presenter, description }] }`.
- `GET /api/talks/:id`
  - Returns `{ talk, urls }` or 404.
- `POST /api/talks/:id/interactions`
  - Records pulse/signal/generic interaction.
  - Returns `202 { ok: true }`.
- `POST /api/talks/:id/session-feedback`
  - Records private feedback.
  - Returns `202 { ok: true, feedback_id }`.
- `GET /api/sessions/:id/qa/public.json`
  - Returns public raw Q&A payload.
- `GET /api/sessions/:id/qa/events`
  - SSE stream.
- `POST /api/sessions/:id/qa/questions`
  - Creates raw question submission.
- `POST /api/sessions/:id/qa/questions/:questionId/vote`
  - Upserts vote.
- `POST /api/sessions/:id/qa/questions/:questionId/upvote`
  - Compatibility alias for vote.

### Admin APIs and Routes

- `POST /admin/login`
  - Form login by admin key.
- `POST /logout`
  - Revoke session and clear cookie.
- `GET /r/claim/:token`
  - Claim room capability.
- `GET /api/admin/me`
  - Current auth status.
- `GET /api/admin/sessions`
  - Global admin session list/totals.
- `POST /api/admin/sessions`
  - Global admin room creation.
- `POST /api/admin/talks/:id/state`
  - Set Q&A state.
- `POST /api/admin/talks/:id/qa/run`
  - Manually run processing.
- `POST /api/admin/talks/:id/questions/:questionId/actions`
  - Theme actions.
- `GET /api/admin/talks/:id/feedback-summary`
  - Presenter feedback/pulse summary.
- `GET /api/admin/talks/:id/ai-run.json`
  - Latest run audit data.
- `GET /admin/talks/:id/export`
  - CSV export.
- `POST /admin/talks/:id/capability/regenerate`
  - Regenerate operator link.
- `POST /admin/talks/:id/capability/revoke`
  - Revoke operator link.

### Web Routes

- `/`
- `/t/:id`
- `/s/:id` redirects to `/t/:id`
- `/admin`
- `/admin/dashboard`
- `/admin/login-page`
- `/admin/talks/:id`
- `/admin/talks/:id/qr`
- `/admin/talks/:id/ai-run`

## 10. UI / UX Requirements

- UX-1: Attendee pages must be phone-friendly and usable without instructions.
- UX-2: Public Q&A and private feedback must be visually and textually distinct.
- UX-3: The app must not claim anonymity; it may state feedback is private to presenter/organizer.
- UX-4: Live pulse must be tap-only and not require text entry.
- UX-5: The presenter/admin workflow must emphasize automation and avoid manual button-heavy operation.
- UX-6: Raw public questions must be available but should not be the default presenter mode.
- UX-7: Shared-screen control room use must avoid exposing private feedback by default.
- UX-8: Long talk titles must wrap gracefully without overlapping buttons or status badges.
- UX-9: Focus-visible states must be obvious for keyboard navigation.
- UX-10: Any animated live signal motif must respect `prefers-reduced-motion`.
- UX-11: The visual theme should be calm, soft, and conference-friendly, not dark/neon/cyber.

## 11. Technical Requirements and Constraints

- TR-1: Runtime is Bun + TypeScript.
- TR-2: Data store is SQLite using `bun:sqlite`.
- TR-3: Frontend is React with Zustand store.
- TR-4: Main app HTML is imported by Bun from `src/ui/index.html`.
- TR-5: No attendee auth provider is required.
- TR-6: Deployment target is an exe.dev VM on port 8000 with systemd service.
- TR-7: Runtime DB file `feedback.db` is local and ignored by git.
- TR-8: Admin key is supplied by environment/local ignored files, not committed.
- TR-9: Q&A synthesis worker must function if Codex is available and degrade gracefully if not.
- TR-10: AI worker run directories live under `.qa-agent/<run>/` and should not be committed.
- TR-11: Type checking command is `bun run --cwd feedback-app typecheck` from repo root.
- TR-12: Key test command is `bun test --cwd feedback-app test/qa-worker.test.ts`.

## 12. Data Model Requirements

The equivalent app must include tables or equivalent persistent records for:

1. `sessions`
   - Talk metadata, active state, Q&A state, feedback state, slides URL, AI context.
2. `feedback`
   - Private session feedback.
3. `auth_sessions`
   - Hashed auth session tokens and scope.
4. `room_capabilities`
   - Hashed room capability tokens and lifecycle.
5. `qa_questions`
   - Synthesized themes.
6. `qa_question_submissions`
   - Raw attendee questions.
7. `qa_question_votes`
   - Votes on raw submissions/themes.
8. `qa_agent_runs`
   - AI/fallback processing run audit.
9. `qa_agent_decisions`
   - Optional low-level decision audit records.
10. `qa_published_views`
   - Cached/published Q&A payloads and versions.
11. `qa_moderator_actions`
   - Operator action audit.
12. `attendee_interactions`
   - Pulse, question, vote, feedback, and generic interaction stream.

## 13. Q&A Processing Requirements

### 13.1 Worker Input

Worker input must include:
- Instruction block with output schema and rules.
- Session metadata.
- Background context from `sessions.ai_context`.
- Raw pending/held submissions.
- Existing themes, including answered/hidden state, support count, priority, pinned state, human override, and raw IDs.

### 13.2 Worker Output

Worker output must be JSON only:

```json
{
  "themes": [
    {
      "theme_id": "optional existing theme id",
      "question": "concise presenter-ready question",
      "summary": "optional note",
      "priority": 0,
      "state": "active",
      "raw_submission_ids": ["sub..."],
      "existing_theme_ids": ["q..."]
    }
  ]
}
```

Allowed states:
- `active`: show as live presenter theme.
- `hold`: mark raw submissions as held/needs detail.
- `answered`: mark theme answered.
- `hidden`: mark theme hidden.

### 13.3 Worker Rules

- Cluster repeated raw submissions.
- Rephrase typos/vague wording into clear questions.
- Do not invent audience intent.
- Preserve answered themes as context and do not resurrect them unless new raw demand exists.
- Each active theme must map to raw submission IDs and/or existing theme IDs.
- Hidden/held themes should not appear unless new submissions justify a safe active theme.

### 13.4 Fallback Rules

- Promote pending raw submissions if AI fails.
- Merge submissions with similar normalized text.
- Consolidate duplicate active themes.
- Recompute support counts after mappings/vote changes.

## 14. Security, Privacy, and Abuse Considerations

- SEC-1: Public attendee pages must not expose admin keys, room capability tokens, auth session tokens, or private feedback.
- SEC-2: QR codes must point only to attendee URLs.
- SEC-3: Capability/auth tokens must be stored hashed.
- SEC-4: Admin-mutating requests must check same-origin origin/referer.
- SEC-5: Input text fields must be length-limited server-side.
- SEC-6: Rendered user text must be escaped or rendered safely through React.
- SEC-7: CSV export must require authorization.
- SEC-8: AI run audit must require authorization because it may include raw audience input and talk context.
- SEC-9: Feedback copy should avoid promising anonymity.
- SEC-10: The app should tolerate AI unavailability without losing submissions.

## 15. Success Metrics

- Attendee can submit pulse in one tap after opening room page.
- Attendee can submit a question with no login and no more than one text field.
- New raw questions appear in attendee stream within 1 second after successful POST under normal conditions.
- Pulse updates appear in presenter views immediately via SSE under normal conditions.
- AI/fallback processing produces at least one presenter-ready theme for valid pending questions within a few seconds.
- Operator can open QR page and share attendee URL within one click from control room.
- Export CSV downloads without manual database access.
- Typecheck and Q&A worker tests pass before release.

## 16. Open Questions / Future Decisions

- OQ-1: Should the attendee page allow optional feedback topic chips, or keep feedback to rating/comment only?
- OQ-2: Should Q&A state controls (open/paused/closed) return to the normal control room UI or remain hidden to preserve automation?
- OQ-3: Should room capability links be shown/regenerated from the React control room UI, or only from server/API flows?
- OQ-4: Should public raw questions support downvotes visibly, or should the UI present simpler “+1” support only?
- OQ-5: Should AI-generated theme summaries be displayed, or only the concise question text?
- OQ-6: Should the app support multiple presenters per talk?
- OQ-7: Should feedback exports include pulse and Q&A interactions, or only private session feedback?
- OQ-8: Should the control room add a safer shared-display mode, or keep QR as the only room-facing operator view?
- OQ-9: Should sessions have explicit scheduled start/end times rather than storing date/time in description?
- OQ-10: Should the app add rate limiting for public submissions beyond duplicate detection?

## 17. Rebuild Checklist

A recreated equivalent app is complete when:

- [ ] Public room chooser lists active rooms and links to attendee pages.
- [ ] Attendee page supports slides, pulse, public Q&A, voting, and private feedback.
- [ ] Public raw Q&A stream updates via SSE and includes queued/grouped/answered/needs-detail states.
- [ ] Admin login, global dashboard, and room capability auth work.
- [ ] Control room shows pulse, synthesized themes, raw fallback, utilities, and private feedback summary.
- [ ] Q&A worker produces AI themes when available and deterministic fallback when not.
- [ ] Theme actions update state and propagate to public/presenter payloads.
- [ ] QR page encodes public attendee URL only.
- [ ] CSV export works for authorized operators.
- [ ] Talk loading and AI context scripts can populate the DevDays rooms.
- [ ] Runtime secrets and DB files are ignored/untracked.
- [ ] Typecheck and Q&A worker tests pass.
