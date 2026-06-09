# Prep: SMART Across the Ecosystem

## Core Audience Promise

You will leave with a practical map of the SMART ecosystem as it exists on June 8, 2026: what works today, where production friction still lives, and which emerging pieces are trying to move SMART from point-to-point app launch into ecosystem-scale authorization and discovery.

The talk should feel less like "here are specs" and more like "watch the same app move through the ecosystem": pick a data holder, launch through SMART, request scoped access, survive real-world registration and branding complexity, then imagine a Permission Ticket carrying the missing authorization context to multiple data holders without replaying five OAuth ceremonies.

The thesis: SMART App Launch solved the app/API handshake. SMART User Access Brands, Permission Tickets, and Scheduling Links are about making the handshake work across a messy market of patients, portals, health systems, payers, labs, networks, and task-specific workflows.

## Big-Picture Mental Models

1. **SMART is two contracts, not one.** The technical contract is OAuth + FHIR: discovery, authorize, token, scopes, API calls. The operational contract is registration, endpoint discovery, key management, branding, organizational policy, and support. The first is standardized; the second is where developers still bleed time.

2. **Scopes are not the whole authorization story.** SMART scopes express requested FHIR capabilities, but the deeper question is "whose data, under what real-world authority, for what purpose, and with what limits?" Current SMART delegates that to underlying system policies. Permission Tickets are a way to make that missing context travel with the request.

3. **Brand discovery is patient safety and developer infrastructure.** A patient cannot safely choose "the right Stanford" or "the right Blue Cross" from a flat endpoint list. User Access Brands turn endpoint directories into recognizable choices with names, logos, portals, categories, and endpoint relationships.

4. **App Launch is live now; Permission Tickets are the provocative next layer.** Do not oversell tickets as finished. Present them as an Argonaut/SMART design experiment with a current WIP IG: signed, portable, constraint-carrying artifacts redeemed at token endpoints through OAuth Token Exchange.

5. **The ecosystem expands by reusing surfaces.** App Launch uses `.well-known/smart-configuration`, OAuth authorization, token, and FHIR. Backend Services uses the token endpoint with client assertions. Permission Tickets are strongest if they add a subject token to the same token endpoint, not a parallel trust stack.

## Proposed Deck Arc

| Slide/Section | Goal | Visual/Content Idea | Speaker Beat | Demo Tie-In |
| --- | --- | --- | --- | --- |
| 1. The ecosystem in one picture | Set scope fast | Map: App, EHR/portal, authorization server, FHIR API, brand bundle, issuer, data holder | "SMART is not one flow anymore. It is a family of launch, discovery, authorization, and delegation patterns." | Show the same actors appearing in all demos. |
| 2. What SMART App Launch actually standardizes | Refresh fundamentals without belaboring | Sequence: register -> discover -> authorize -> token -> FHIR | "The standard makes the OAuth/FHIR interaction predictable. It does not make registration or business approval disappear." | Open Health Skillz provider picker, then inspect `iss`, scopes, and callback. |
| 3. Standalone patient launch | Make SMART concrete | Screenshot or live browser: choose provider, redirect to portal, approve, get token | "This is the magic that still works: patient signs in where their data lives, app gets scoped FHIR access." | Live Epic sandbox launch with Health Skillz. |
| 4. Scopes and launch context | Explain the core vocabulary | Tiny scope grammar: `patient/Observation.rs`, `offline_access`, `openid`, `fhirUser`, `launch/patient` | "Scopes are verbs over resource types plus context, not a full consent language." | Show requested scopes and one resulting FHIR query. |
| 5. Backend Services | Contrast user-delegated and pre-authorized access | Split-screen: authorization code vs client credentials + JWT assertion | "Backend Services is excellent for known integrations. It assumes the authorization server already knows what this client may do." | Static token request example; connect to Permission Ticket motivation. |
| 6. Where production gets ugly | Earn credibility | 500 orgs x 7 clicks, same credential, `invalid_client`, JWKS URL blocked | "If you build for real patients, the technical spec is only half the job." | Show Health Skillz repo files: Epic activation journal/script. |
| 7. Brands: endpoint discovery becomes UX | Reframe Brands as ecosystem infrastructure | Cards with logo/name/category/portal, contrasted with raw endpoint URLs | "Users do not choose FHIR base URLs. They choose brands and portals they recognize." | Show Epic Brands URL or local cached/generated brand list in Health Skillz. |
| 8. Permission Tickets: the missing authorization artifact | Introduce the new concept | JWT envelope with issuer, audience, subject, requester, access, context, presenter binding | "The ticket is not the access token. It is portable evidence that helps a data holder decide whether to issue one." | Decode a sample ticket and point to token exchange fields. |
| 9. Ticket redemption | Show how it fits existing SMART | Flow: trigger -> issuer mints -> client presents `subject_token` -> data holder validates -> down-scoped access token | "The clean separation is client authentication outside, authorization context inside the ticket." | Live or canned `curl`/HTTPie token exchange payload. |
| 10. Use cases that make tickets worth discussing | Move from abstraction to stakes | Four tiles: patient self-access, caregiver, public health loopback, referral/CBO | "The hard part is not JWT syntax. The hard part is deciding which real-world facts an issuer can responsibly attest." | Ask audience to pick the use case they would implement first. |
| 11. Scheduling Links teaser | Briefly connect to "more" | Airline/Kayak analogy: bulk slot publish -> deep link to book | "Same ecosystem pattern: publish lightweight, searchable facts; keep complex completion inside the provider's workflow." | One-minute static view of SMART Scheduling Links CI build. |
| 12. What should happen next | End with discussion | Three columns: ship App Launch well, publish Brands well, pressure-test Tickets | "The ecosystem needs boring implementation quality and ambitious authorization experiments at the same time." | Transition into audience prompts. |

## Live Demo Plan

### Demo 1: SMART App Launch With Health Skillz

**Setup**

- Repo/demo reference: [jmandel/health-skillz](https://github.com/jmandel/health-skillz).
- Use either the live instance at `https://health-skillz.joshuamandel.com` or a local run from the repo if already prepared.
- Have Epic sandbox credentials ready from the repo/local post: `fhircamila` / `epicepic1`.
- Browser windows: Health Skillz app, browser devtools Network tab, optional JSON viewer.
- Pre-open the HL7 App Launch page for authority: `https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html`.

**Exact flow**

1. Start at the provider picker. Search for an Epic sandbox/provider entry.
2. Click connect and pause at the redirect URL. Point out `iss`, `client_id`, `redirect_uri`, `scope`, `aud`/FHIR base, `state`, and PKCE values if visible.
3. Sign in through the sandbox portal and approve.
4. Return to the app. Show a successful token-backed FHIR call: Patient, Observation, Condition, MedicationRequest, or DocumentReference.
5. Open one response page and show that the result is ordinary FHIR JSON, not a proprietary connector format.

**What to show**

- The app does not need a patient password; it redirects to the data holder.
- `patient/*.rs` and `offline_access` are understandable but not a full policy model.
- The same app can become an agent-facing connector because the protocol returns standard FHIR and documents.

**Risks**

- Sandbox login or redirect fails.
- Browser devtools noise buries the important request.
- Live app config changes or CORS issue.

**Fallback**

- Use screenshots or a short screen recording of the exact flow.
- Use a saved authorization request URL and a saved token response with secrets redacted.
- Use the Health Skillz README and design docs as static proof of the architecture.

### Demo 2: Brands Turn Endpoint Lists Into Patient Choices

**Setup**

- Preload `https://open.epic.com/Endpoints/Brands`.
- If Health Skillz has generated brand assets locally, use its provider picker/cache rather than live-fetching the large bundle.
- Prepare a search like "Stanford", "Kaiser", or "Blue" that produces multiple similar entities.
- Pre-open HL7 User Access Brands: `https://hl7.org/fhir/smart-app-launch/STU2.2/brands.html`.

**Exact flow**

1. Show the raw Brands bundle or a slice of it: `Organization` resources plus `Endpoint` resources.
2. Show the Health Skillz provider picker consuming that data.
3. Search for a brand with ambiguous names.
4. Point out missing or present fields: name, alias, category, location, portal URL, logo, endpoint.
5. Contrast "FHIR base URL" with "user-recognizable brand/portal".

**What to show**

- Brands are not decorative. They are the UX layer that lets patients choose correctly.
- The spec supports logos and portal descriptions; the ecosystem value depends on publishers actually populating them.
- Endpoint directories need merge/dedup logic because one brand can map to many portals and endpoints, and one portal can map to many endpoints.

**Risks**

- Live bundle is slow or changes.
- Logo data may be absent, weakening the visual.
- Audience gets pulled into Epic-specific details.

**Fallback**

- Use a static JSON excerpt from the local Health Skillz brand cache.
- Show a mock card UI built from actual FHIR fields.
- Keep the point vendor-neutral: "this is exactly why the HL7 profile exists."

### Demo 3: Production Registration Friction

**Setup**

- Open local post: `https://joshuamandel.com/blog/posts/7000-clicks-to-register-a-fhir-app/`.
- Open local post: `https://joshuamandel.com/blog/posts/i-registered-health-skillz-at-500-epic-sites-then-couldn-t-connect/`.
- Open Health Skillz repo paths if available online: `blog/epic/epic-activate-all.js` and `blog/epic/2026-02-11-epic-activation-journal.md`.

**Exact flow**

1. Show the headline math: 498 remaining orgs x 7 clicks + 24 page navigations = 3,510 clicks for one registration; over 7,000 clicks when covering multiple registrations.
2. Show the key lesson: the same credential had to be confirmed per organization for refresh-token/confidential client use.
3. Show the follow-up: "registered at 500 sites" is not enough if production token exchange fails with opaque `invalid_client`.
4. Show the mitigation: direct JWKS upload and RSA-key filtering, not because it is elegant but because it works in the field.

**What to show**

- Standards success can still become developer failure if operational tooling is manual or opaque.
- Error descriptions matter; production OAuth debugging without them is punishing.
- This segment sets up Permission Tickets as a serious response to network scaling, not a shiny token idea.

**Risks**

- Too much vendor-specific critique.
- Audience tries to debug Epic instead of learning the pattern.

**Fallback**

- Keep to one slide with the numbers and one lesson: "registration state is today's hidden authorization substrate."

### Demo 4: Permission Ticket Anatomy and Redemption

**Setup**

- Pre-open current WIP IG: `https://build.fhir.org/ig/jmandel/smart-permission-tickets-wip/branches/app-issued-tickets/index.html`.
- Prepare a decoded sample ticket JSON with `iss`, `aud`, `exp`, `jti`, `ticket_type`, `subject`, `requester`, `access.permissions`, `data_period`, `sensitive_data`, and `presenter_binding`.
- Prepare a token exchange request body using `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, `subject_token_type=https://smarthealthit.org/token-type/permission-ticket`, `subject_token`, `scope`, and `client_assertion`.

**Exact flow**

1. Show the ticket JSON first, not the JWT string.
2. Ask: "What does the data holder need in order to say yes, no, or yes-but-only-this?"
3. Highlight the portable kernel: subject, access, optional requester, optional context, presenter binding.
4. Show the token request body. Emphasize that the Permission Ticket is the `subject_token`; client authentication remains separate.
5. Show access calculation as intersection: requested scopes, ticket access, and client registration/local policy.
6. Show discovery fields: `grant_types_supported` includes token exchange, and `smart_permission_ticket_types_supported` advertises accepted ticket types.

**What to show**

- Tickets should be understandable to policy people and implementable by OAuth/FHIR people.
- This is a down-scoping mechanism, not a bypass around data-holder policy.
- Open questions are real: issuer trust, patient matching, sensitive-data granularity, governance, revocation, audit.

**Risks**

- The WIP IG changes before the talk.
- No live server accepts a ticket yet.
- Audience hears "JWT" and assumes solved.

**Fallback**

- Be explicit: "This is a design/prototype demo, not a production exchange."
- Use the CI build and a static decoded token as the artifact.
- Turn it into a structured audience critique: "Would your organization accept this ticket? Which claim makes you nervous?"

### Demo 5: SMART Scheduling Links Teaser

**Setup**

- Open current CI build: `https://build.fhir.org/ig/HL7/smart-scheduling-links/`.
- Prepare one visual: slot publisher -> slot aggregator -> user follows deep link -> provider-specific booking.

**Exact flow**

1. Spend 60-90 seconds only.
2. Show the "find slots via FHIR, complete booking via deep link" split.
3. Connect it to the ecosystem theme: publish lightweight availability facts broadly; avoid standardizing every booking workflow in this talk.

**Risks**

- Audience wants the scheduling deep dive now.

**Fallback**

- Say: "This is tomorrow's talk/deep dive. For now, notice the same pattern: publish enough standardized facts to unlock discovery."

## Backup/Static Artifacts

- One-page SMART App Launch sequence diagram with `iss`, `.well-known/smart-configuration`, authorize, token, FHIR API.
- Redacted authorization URL and token response from a successful Health Skillz sandbox run.
- Saved FHIR JSON examples: `Patient`, `Observation`, `Condition`, `DocumentReference`.
- Static brand card examples built from FHIR `Organization` and `Endpoint` fields.
- "7000 clicks" slide with the exact math and the follow-up `invalid_client` lesson.
- Decoded Permission Ticket JSON and token exchange HTTP request.
- Permission Tickets "access intersection" diagram.
- Scheduling Links teaser diagram.
- Repo links to keep handy: [jmandel/health-skillz](https://github.com/jmandel/health-skillz) and [jmandel/smart-permission-tickets-wip](https://github.com/jmandel/smart-permission-tickets-wip).
- Local source posts read for this prep:
  - `https://joshuamandel.com/blog/posts/smart-permission-tickets-argonaut-launch/`
  - `https://joshuamandel.com/blog/posts/authorization-as-a-network-scaling-problem/`
  - `https://joshuamandel.com/blog/posts/7000-clicks-to-register-a-fhir-app/`
  - `https://joshuamandel.com/blog/posts/i-registered-health-skillz-at-500-epic-sites-then-couldn-t-connect/`
  - `https://joshuamandel.com/blog/posts/health-skillz-why-i-built-my-own-health-record-connector-for-claude-ai-codex/`

## Current Web Context and Citations

- [SMART App Launch v2.2.0, App Launch](https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html) - Current published HL7 SMART App Launch page; useful for the canonical launch flow and the reminder that SMART does not standardize app registration.
- [SMART App Launch v2.2.0, Scopes and Launch Context](https://hl7.org/fhir/smart-app-launch/STU2.2/scopes-and-launch-context.html) - Key citation for the claim that scopes delegate access but do not model all underlying permissions.
- [SMART Backend Services v2.2.0](https://hl7.org/fhir/smart-app-launch/STU2.2/backend-services.html) - Current Backend Services profile; cite for pre-authorized client credentials, JWT assertions, `system/` scopes, and the operational assumption that client authority is already configured.
- [SMART User Access Brands v2.2.0](https://hl7.org/fhir/smart-app-launch/STU2.2/brands.html) - Current Brands spec; cite for Organization/Endpoint profiles, logos, portal details, CORS, ETags, and `.well-known/smart-configuration` brand pointers.
- [ONC Certification (g)(10) Standardized API Test Kit](https://fhir.healthit.gov/suites/g10_certification) - Current HealthIT.gov Inferno page, last updated March 9, 2026; cite for active certification testing around SMART App Launch, US Core, and Bulk Data.
- [Planned (g)(10) IG Version Deprecations](https://inferno-qa.healthit.gov/news/2026-02-g10-options-update/) - February 10, 2026 Inferno notice that SMART App Launch 1.0.0 and older US Core options expired for certification on January 1, 2026.
- [SMART Permission Tickets WIP IG](https://build.fhir.org/ig/jmandel/smart-permission-tickets-wip/branches/app-issued-tickets/index.html) - Current continuous build, draft as of May 13, 2026; cite carefully as WIP/unauthorized publication, not final HL7 standard.
- [SMART Permission Tickets GitHub repo](https://github.com/jmandel/smart-permission-tickets-wip) - Source repo for the WIP IG and useful demo artifact.
- [RFC 8693: OAuth 2.0 Token Exchange](https://www.rfc-editor.org/rfc/rfc8693) - Standards-track OAuth basis for exchanging a presented security token for an access token; useful for Permission Ticket transport framing.
- [RFC 7523: JWT Profile for OAuth 2.0 Client Authentication](https://www.rfc-editor.org/rfc/rfc7523) - Standards-track JWT client authentication basis used by SMART Backend Services style assertions.
- [SMART Scheduling Links CI Build](https://build.fhir.org/ig/HL7/smart-scheduling-links/) - Current HL7 Patient Administration continuous build, version `0.1.0-draft`, draft as of March 13, 2026; cite as teaser/WIP.
- [Epic Patient-Facing Apps Using FHIR documentation](https://fhir.epic.com/Documentation?docId=patientfacingfhirapps) - Current Epic documentation includes auto-synchronization, refresh-token/client-credential conditions, and credential provisioning details.
- [Epic User Access Brands bundle](https://open.epic.com/Endpoints/Brands) - Public vendor-consolidated Brands endpoint to use as live or static demo input.
- [Health Skillz GitHub repo](https://github.com/jmandel/health-skillz) - Live demo repo; README describes SMART on FHIR record collection, local review/export, encrypted sharing with AI, and Epic sandbox credentials.

## Frank Questions / Audience Prompts

- If a patient authorizes an app once through a trusted issuer, what would your organization need before accepting that authorization at your token endpoint?
- Is "patient matching from a ticket" a tolerable risk if the ticket contains demographics and identity evidence, or does every data holder still need local login?
- Which is more dangerous: broad backend-service preauthorization hidden in local config, or portable tickets whose claims are visible and auditable?
- Would you rather standardize the permission artifact first, the issuer trust framework first, or the patient-facing consent UX first?
- What should happen when a Permission Ticket says "exclude sensitive data" but the data holder cannot reliably classify sensitivity?
- Should a patient-facing app be allowed to request more than the regulatory floor of USCDI data if the patient explicitly approves?
- Are user access logos and portal descriptions "nice UX" or a necessary part of safe patient-mediated access?
- Who is the right issuer for caregiver authority: state wallet, HIE, payer, EHR, court, identity-proofing vendor, or the patient?
- Should Permission Tickets be revocable, short-lived, or both? What is the realistic revocation check in a distributed network?
- What is the smallest Permission Ticket use case we can pilot without needing the whole ecosystem to agree first?

## What To Cut If Time Is Tight

1. Cut the detailed Epic `invalid_client` debugging narrative. Keep only the lesson: registration and key management are still operational bottlenecks.
2. Cut SMART Scheduling Links to one teaser slide and one URL.
3. Cut backend services examples beyond the single point that backend clients are pre-authorized out of band.
4. Cut most scope grammar details. Keep `patient/Observation.rs`, `offline_access`, and `system/*.rs`.
5. Cut historical TEFCA comparison unless an audience question invites it.
6. Cut live brand-bundle JSON inspection if time is short; show brand cards instead.
7. Do not cut the Health Skillz App Launch demo or the Permission Ticket anatomy demo. Those are the talk.
