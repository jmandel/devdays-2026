# SMART Ecosystem Deck Spec

Session: SMART Across the Ecosystem: App Launch, Permission Tickets, and More  
Scheduled: Jun 16, 2026, 10:30 AM  
Reference style: the provided "A SMART Evolution" timeline image.
Local spec background: `/home/jmandel/hobby/devdays-2026/background/smart-ecosystem-specs`

## Deck-Level Style Direction

Use the reference image as a visual grounding point, not as something to copy literally.

- Canvas: 16:9 widescreen, clean white background, generous negative space.
- Typography: large light-gray/charcoal titles, thin sans-serif, sparse body text. Use exact text for headings and short labels only; dense prose belongs in speaker notes.
- Palette: multicolor health-tech accents with restrained use: sky blue, teal, orange, red, green, purple, and gold. Use a strong horizontal teal band as a recurring motif.
- Graphic language: thin connector lines, bracket callouts, timeline ticks, circular icon badges, small UI/browser mockups, JSON/token cards, and simple flow diagrams.
- Density: polished conference slides, not white papers. Avoid large paragraphs. Each slide should have one visual idea.
- Logo treatment: do not put a SMART logo, abstract star, or asterisk mark on recurring slides. The word `SMART` appears as ordinary text in titles and labels only.
- Image prompt rule: explicitly say `no logos, no asterisk mark, no decorative brand mark` for generated slide comps.
- Image model instruction: preserve slide composition and visual hierarchy; do not hallucinate dense readable body text. Use short labels only.

## Spec Alignment Anchors

Use these details to keep slide content aligned without making the slides busy:

- App Launch: keep the sequence anchored on discovery, authorize, token, and FHIR API access. The visual can show `.well-known/smart-configuration`, `authorize`, `token`, and FHIR, but leave full parameter tables in speaker notes. Local source: `background/smart-ecosystem-specs/smart-app-launch.html`.
- Scopes: use concrete examples from the scope spec: `patient/Observation.rs`, `patient/Patient.r`, `system/Observation.rs`, `system/*.rs`, `launch/patient`, `openid`, and `fhirUser`. Emphasize that granted scopes may differ from requested scopes, and that wildcard scopes cover future resources too. Local source: `background/smart-ecosystem-specs/smart-scopes-and-launch-context.html`.
- Backend Services: show that the client is pre-authorized before runtime, authenticates with a JWT client assertion, requests `system/` scopes, and receives short-lived access tokens with recommended `expires_in` no more than 300 seconds. This supports the "works when trust is already configured" frame. Local source: `background/smart-ecosystem-specs/smart-backend-services.html`.
- Brands: design the Brands slide around cards/tiles because the spec explicitly frames a model UX where apps display brands, support filtering/search, and let users select portals. Include fields like name, logo, website, aliases, locations, categories, portal name, portal URL, description, and API endpoints only as visual hints. Local source: `background/smart-ecosystem-specs/smart-user-access-brands.html`.
- Brand topology: avoid implying one brand equals one endpoint. The spec supports one brand with multiple portals, one portal with multiple endpoints, and multiple brands with the same portal. Use this as a small visual wrinkle, not a full slide unless demo time opens up.
- Permission Tickets: treat as WIP/draft. The key visual should show an issuer-signed JWT presented to a data holder token endpoint via OAuth Token Exchange, with `subject_token_type=https://smarthealthit.org/token-type/permission-ticket`. Local source: `background/smart-ecosystem-specs/smart-permission-tickets-wip.html`.
- Ticket redemption: keep the separation visually sharp: `client_assertion` authenticates the client; `subject_token` carries the Permission Ticket; the data holder validates signature, issuer trust, audience, presenter binding, and access constraints, then issues an access token scoped to the intersection of request, ticket, and local policy.
- Ticket structure: the common shell should show `iss`, `aud`, `exp`, `jti`, `ticket_type`, `presenter_binding`, `subject`, `requester`, `access`, and optional `context`, but the slide should only render the big blocks. Detailed JSON belongs in demo notes.
- Scheduling Links: the downloaded CI page currently contains only the CI build release header, so use the GitHub source markdown in `smart-scheduling-links-github-index.md` as the local background for the teaser. Keep it at "publish lightweight availability facts, finish booking in local workflow."

## Slide 1: Title / Ecosystem Thesis

Purpose: Open with the claim that SMART is now an ecosystem of launch, discovery, authorization, and delegation patterns.

Visual layout:
- White background.
- Top area: clean white space; no logo, asterisk, or decorative brand mark.
- Left lower third: large title.
- Across the bottom third: a teal horizontal band containing faint screenshots/cards: app picker, authorization redirect, FHIR JSON, brand card, permission ticket.
- Right side: three small colored badges connected by thin lines: Launch, Brands, Tickets.

Exact on-slide text:
- Title: `SMART Across the Ecosystem`
- Subtitle: `App Launch, Permission Tickets, and what comes next`
- Small footer: `DevDays 2026 | Josh Mandel`
- Bottom-band labels: `Launch`, `Discovery`, `Authorization`, `Delegation`

Speaker beat:
SMART is no longer just "the OAuth launch flow." The central theme is how the same surfaces can support patient app launch today and broader ecosystem-scale authorization tomorrow.

Demo/link-out:
- No demo. Set expectation that the deck will quickly move to live browser demos.

Image prompt:
```text
Use case: productivity-visual
Asset type: 16:9 conference slide visual comp
Primary request: Create a clean white health-tech title slide inspired by a modern timeline graphic. Large charcoal title on left lower third: "SMART Across the Ecosystem". Subtitle below: "App Launch, Permission Tickets, and what comes next". Small footer: "DevDays 2026 | Josh Mandel". No logo, no asterisk mark, no decorative brand mark. Bottom third has a wide teal horizontal band with faint miniature panels representing app picker, OAuth redirect, FHIR JSON, brand card, and permission ticket. On the right, three small circular badges connected by thin lines labeled "Launch", "Brands", "Tickets". Palette: sky blue, teal, orange, red, green, purple, gold. Spacious, polished, minimal, high contrast, no dense text.
```

## Slide 2: The Ecosystem In One Picture

Purpose: Establish the actor map that will recur through the talk.

Visual layout:
- Center: patient-facing app box.
- Left: patient/user.
- Upper right: EHR portal and authorization server.
- Far right: FHIR API/data holder.
- Lower right: Brand Bundle.
- Lower center: Permission Ticket issuer.
- Thin colored arrows show: discover, launch, authorize, token, API call, ticket.
- Use bracket callouts in the same timeline style as reference.

Exact on-slide text:
- Title: `The SMART ecosystem is a set of reusable surfaces`
- Actor labels: `Patient`, `App`, `Portal`, `Authorization Server`, `FHIR API`, `Brand Bundle`, `Ticket Issuer`
- Connector labels: `discover`, `launch`, `authorize`, `token`, `FHIR`, `ticket`
- Bottom takeaway: `Same surfaces. More ecosystem jobs.`

Speaker beat:
Introduce every actor before going deep. The app does not just call an API; it discovers endpoints, gets routed through a portal, earns scoped access, and may later present external authorization context.

Demo/link-out:
- This slide is the map for later demos.

Image prompt:
```text
Use case: infographic-diagram
Asset type: 16:9 conference slide visual comp
Primary request: Create a polished white-background ecosystem map slide in the style of a clean health-tech timeline. Title at top left: "The SMART ecosystem is a set of reusable surfaces". No logo, no asterisk mark, no decorative brand mark. Center has a rounded rectangle labeled "App". Left has a person icon labeled "Patient". Upper right has two stacked boxes labeled "Portal" and "Authorization Server". Far right has a database/API box labeled "FHIR API". Lower right has a card stack labeled "Brand Bundle". Lower center has a signed document badge labeled "Ticket Issuer". Thin colored arrows connect them with short labels: discover, launch, authorize, token, FHIR, ticket. Use teal horizontal accent band behind the central app. White space, crisp vector-like shapes, multicolor accent palette, minimal text.
```

## Slide 3: What App Launch Actually Standardizes

Purpose: Give a fast refresher without spending 20 minutes on fundamentals.

Visual layout:
- A left-to-right sequence with five stages in colored circles.
- Under the sequence, show one small browser address bar mock with `iss=...&launch=...`.
- Small "standardized" bracket above OAuth/FHIR steps.
- Small "not standardized" bracket below registration/business approval.

Exact on-slide text:
- Title: `App Launch makes the OAuth/FHIR handshake predictable`
- Sequence labels: `Discover`, `Authorize`, `Token`, `FHIR`, `Refresh`
- Callout 1: `Standardized: launch, scopes, token, FHIR access`
- Callout 2: `Still operational: registration, approval, support`
- Footer link: `HL7 SMART App Launch v2.2.0`

Speaker beat:
The standard gives interoperable mechanics, but it does not solve app approval, portal configuration, or support processes.

Demo/link-out:
- Link: `https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html`
- Live transition: Health Skillz provider picker and redirect URL.

Image prompt:
```text
Use case: infographic-diagram
Asset type: 16:9 conference slide visual comp
Primary request: Design a clean slide titled "App Launch makes the OAuth/FHIR handshake predictable". White background, thin sans-serif. No logo, no asterisk mark, no decorative brand mark. Center has five colored circular stages left-to-right: Discover, Authorize, Token, FHIR, Refresh. Above the middle sequence a thin blue bracket labeled "standardized". Below, a subtle gray bracket labeled "registration + approval + support". Include a small browser address-bar mockup with short visible text "iss=... & launch=..." and a tiny FHIR JSON card. Style inspired by the reference timeline: teal band, thin connector lines, multicolor accent circles. Minimal readable text only.
```

## Slide 4: Demo Interstitial - Health Skillz Launch

Purpose: Provide a visual and link-out slide for the first live demo.

Visual layout:
- Full slide as a "demo card" rather than content slide.
- Left: laptop/browser mock showing Health Skillz provider picker.
- Right: four-step live checklist.
- Bottom: demo URL and repo.

Exact on-slide text:
- Title: `Live demo: SMART launch with a real patient-facing app`
- Checklist:
  - `Pick a provider`
  - `Redirect to portal`
  - `Authorize scopes`
  - `Fetch FHIR + notes`
- Links:
  - `health-skillz.joshuamandel.com`
  - `github.com/jmandel/health-skillz`

Speaker beat:
This is the "still works today" anchor. The patient signs in where the data lives; the app gets scoped FHIR access; the result is FHIR JSON and clinical documents.

Demo/link-out:
- `https://health-skillz.joshuamandel.com`
- `https://github.com/jmandel/health-skillz`

Image prompt:
```text
Use case: ui-mockup
Asset type: 16:9 conference slide visual comp
Primary request: Create a polished demo interstitial slide. Title: "Live demo: SMART launch with a real patient-facing app". No logo, no asterisk mark, no decorative brand mark. Left side shows a clean laptop/browser mockup with a health app provider picker UI, search box, and provider cards, not branded to a specific vendor. Right side has a vertical checklist with four large items: "Pick a provider", "Redirect to portal", "Authorize scopes", "Fetch FHIR + notes". Bottom has two small link labels: "health-skillz.joshuamandel.com" and "github.com/jmandel/health-skillz". Use white background, teal accent band, multicolor palette circles, thin lines, very clean conference style.
```

## Slide 5: Scopes Are Verbs, Not Policy

Purpose: Explain the difference between requested FHIR capabilities and underlying real-world authority.

Visual layout:
- Left: scope grammar as large tokens.
- Right: "missing context" cloud with purpose, relationship, limits, sensitivity.
- Center: arrow from requested scopes to access token, with a red/orange warning bracket.

Exact on-slide text:
- Title: `Scopes are not the whole authorization story`
- Large scope examples:
  - `patient/Observation.rs`
  - `offline_access`
  - `openid + fhirUser`
  - `launch/patient`
- Missing-context labels: `whose data?`, `which role?`, `what purpose?`, `what limits?`, `sensitive data?`
- Takeaway: `SMART scopes ask for capabilities. Policy decides authority.`

Speaker beat:
Scopes are a compact vocabulary for FHIR actions and context. They are not a consent language and not a complete authority model.

Demo/link-out:
- During Health Skillz demo, show requested scopes and one resulting API call.
- Citation: `https://hl7.org/fhir/smart-app-launch/STU2.2/scopes-and-launch-context.html`

Image prompt:
```text
Use case: scientific-educational
Asset type: 16:9 conference slide visual comp
Primary request: Create a clean explanatory slide titled "Scopes are not the whole authorization story". No logo, no asterisk mark, no decorative brand mark. Left side shows four large code-like scope tokens in colored pill shapes: "patient/Observation.rs", "offline_access", "openid + fhirUser", "launch/patient". Center has an arrow toward a small access-token card. Right side has a soft outlined cloud labeled "Missing context" with short tags: "whose data?", "which role?", "what purpose?", "what limits?", "sensitive data?". Bottom takeaway in large text: "SMART scopes ask for capabilities. Policy decides authority." White background, teal band, small orange warning bracket, crisp modern health-tech style.
```

## Slide 6: Backend Services Is Powerful But Preconfigured

Purpose: Contrast user-mediated launch with backend services, setting up network scaling problem.

Visual layout:
- Split-screen.
- Left column: App Launch path with patient and portal.
- Right column: Backend Services path with server client, JWT assertion, token endpoint.
- Between columns: "known client" vs "portable authority?" question.

Exact on-slide text:
- Title: `Backend Services works best when trust is already configured`
- Left label: `User-mediated App Launch`
- Right label: `Pre-authorized Backend Services`
- Right details: `client assertion`, `system/*.rs`, `token endpoint`
- Question: `What happens when the authority lives somewhere else?`

Speaker beat:
Backend Services is excellent, but it assumes a client has already been approved and configured by the data holder. At network scale, that assumption becomes the bottleneck.

Demo/link-out:
- Citation: `https://hl7.org/fhir/smart-app-launch/STU2.2/backend-services.html`

Image prompt:
```text
Use case: infographic-diagram
Asset type: 16:9 conference slide visual comp
Primary request: Design a split-screen health-tech slide titled "Backend Services works best when trust is already configured". No logo, no asterisk mark, no decorative brand mark. Left column labeled "User-mediated App Launch" with patient icon -> portal -> token -> FHIR API. Right column labeled "Pre-authorized Backend Services" with server icon -> JWT assertion -> token endpoint -> FHIR API. In the center, a large question in a thin outlined callout: "What happens when the authority lives somewhere else?" Use white background, muted teal dividing band, blue/green for launch, purple/orange for backend, crisp thin connector lines.
```

## Slide 7: Production Friction Is The Hidden Substrate

Purpose: Earn credibility by showing implementation pain without making the talk vendor-specific.

Visual layout:
- Large numeric headline: `7,000+ clicks`.
- A grid of small modal-window icons repeated, fading into a script/automation card.
- Right side: three friction badges: `manual approval`, `opaque OAuth errors`, `key management`.
- Bottom: "standardized protocol, manual operations" contrast.

Exact on-slide text:
- Title: `The spec is not the whole system`
- Big number: `7,000+ clicks`
- Friction labels: `manual approval`, `invalid_client`, `JWKS/key handling`, `support loops`
- Takeaway: `Interoperability fails when operational state is invisible.`

Speaker beat:
The story is not "one vendor bad"; it is that hidden registration and support state becomes the de facto authorization substrate.

Demo/link-out:
- Local posts:
  - `/home/jmandel/hobby/blog/src/content/blog/linkedin/7000-clicks-to-register-a-fhir-app/index.md`
  - `/home/jmandel/hobby/blog/src/content/blog/linkedin/i-registered-health-skillz-at-500-epic-sites-then-couldn-t-connect/index.md`
- Repo paths in Health Skillz for Epic activation script and journal.

Image prompt:
```text
Use case: productivity-visual
Asset type: 16:9 conference slide visual comp
Primary request: Create a dramatic but clean operations-friction slide titled "The spec is not the whole system". White background. No logo, no asterisk mark, no decorative brand mark. Huge central number "7,000+ clicks" in orange. Behind it, a faint grid of tiny modal dialog windows and checkboxes, fading into a code/script card. Right side has three circular badges: "manual approval", "invalid_client", "key handling". Bottom has a charcoal takeaway: "Interoperability fails when operational state is invisible." Use multicolor health-tech palette, teal horizontal strip, thin lines, polished conference style, no clutter.
```

## Slide 8: Brands Turn Endpoint Lists Into Patient Choices

Purpose: Reframe User Access Brands as safety and infrastructure, not decoration.

Visual layout:
- Left: raw endpoint list with unreadable URLs.
- Right: clean brand cards with name, portal, category, logo placeholder, endpoint count.
- A curved arrow labeled "Brand Bundle".
- Use several similar names to show ambiguity.

Exact on-slide text:
- Title: `Patients do not choose FHIR base URLs`
- Left label: `Raw endpoints`
- Right label: `Recognizable choices`
- Card fields: `Name`, `Portal`, `Logo`, `Endpoints`
- Takeaway: `Brands are patient safety infrastructure.`

Speaker beat:
Patients need to recognize the organization and portal they are selecting. Endpoint directories without branding are not enough for real users.

Demo/link-out:
- `https://open.epic.com/Endpoints/Brands`
- `https://hl7.org/fhir/smart-app-launch/STU2.2/brands.html`

Image prompt:
```text
Use case: ui-mockup
Asset type: 16:9 conference slide visual comp
Primary request: Create a clean slide titled "Patients do not choose FHIR base URLs". No logo, no asterisk mark, no decorative brand mark. Left side shows a gray raw endpoint list with short unreadable URL-like rows, labeled "Raw endpoints". A curved teal arrow labeled "Brand Bundle" points to the right side, where there are four polished organization cards labeled "Recognizable choices"; each card has a generic organization logo placeholder circle, name line, portal line, category chip, and endpoint count. Bottom text: "Brands are patient safety infrastructure." White background, teal band, multicolor accent badges, professional health-tech style.
```

## Slide 9: Permission Tickets Are The Missing Artifact

Purpose: Introduce Permission Tickets through an understandable token anatomy.

Visual layout:
- Center: large JWT/ticket card with named claim blocks.
- Around it: issuer, presenter, data holder, subject, purpose.
- Use a lock/seal motif, but keep it policy-readable.

Exact on-slide text:
- Title: `Permission Ticket: portable authorization context`
- Ticket blocks:
  - `issuer`
  - `subject`
  - `requester`
  - `access`
  - `context`
  - `presenter binding`
  - `expiration`
- Takeaway: `Not the access token. Evidence for whether to issue one.`

Speaker beat:
Do not start with JWT syntax. Start with the policy question: what does a data holder need to evaluate before issuing an access token?

Demo/link-out:
- `https://build.fhir.org/ig/jmandel/smart-permission-tickets-wip/branches/app-issued-tickets/index.html`
- `https://github.com/jmandel/smart-permission-tickets-wip`

Image prompt:
```text
Use case: infographic-diagram
Asset type: 16:9 conference slide visual comp
Primary request: Design a polished token-anatomy slide titled "Permission Ticket: portable authorization context". No logo, no asterisk mark, no decorative brand mark. Center has a large white signed document/JWT card with colored rows labeled "issuer", "subject", "requester", "access", "context", "presenter binding", "expiration". Around it are simple icons connected by thin lines: Issuer, Patient/Subject, App/Presenter, Data Holder. Include a small seal/lock motif on the ticket only. Bottom takeaway: "Not the access token. Evidence for whether to issue one." White background, teal accent band, multicolor palette, sparse text.
```

## Slide 10: Redemption Fits Existing SMART/OAuth Surfaces

Purpose: Show the architectural fit: token exchange at the token endpoint.

Visual layout:
- Horizontal flow with five stages.
- Include a code-ish token request card in the middle.
- Show intersection logic as a Venn diagram: requested scopes, ticket limits, local policy.

Exact on-slide text:
- Title: `Redeem the ticket at the token endpoint`
- Flow labels:
  - `Trigger`
  - `Issuer mints ticket`
  - `Client presents subject_token`
  - `Data holder validates`
  - `Down-scoped access token`
- Code card labels:
  - `grant_type: token-exchange`
  - `subject_token_type: permission-ticket`
  - `client_assertion: ...`
- Takeaway: `Client authentication outside. Authorization context inside.`

Speaker beat:
The strongest design is additive: use existing OAuth token endpoint mechanics and keep local policy in the loop.

Demo/link-out:
- `https://www.rfc-editor.org/rfc/rfc8693`
- `https://www.rfc-editor.org/rfc/rfc7523`
- Static decoded ticket and token request.

Image prompt:
```text
Use case: scientific-educational
Asset type: 16:9 conference slide visual comp
Primary request: Create a clean OAuth flow slide titled "Redeem the ticket at the token endpoint". No logo, no asterisk mark, no decorative brand mark. Use five colored stages left-to-right: "Trigger", "Issuer mints ticket", "Client presents subject_token", "Data holder validates", "Down-scoped access token". In the center, include a small code-like card with only three readable lines: "grant_type: token-exchange", "subject_token_type: permission-ticket", "client_assertion: ...". Bottom right has a small three-circle Venn diagram labeled "requested scopes", "ticket limits", "local policy". Bottom takeaway: "Client authentication outside. Authorization context inside." White background, teal band, thin connectors.
```

## Slide 11: Which Use Cases Justify The Complexity?

Purpose: Move from token mechanics to real-world stakes.

Visual layout:
- Four large tiles, each with icon and short label.
- Under each tile: the real-world fact a ticket would need to carry.
- Use a small "issuer confidence" meter on each tile.

Exact on-slide text:
- Title: `Tickets are only worth it when authority must travel`
- Tile 1: `Patient self-access` -> `identity + intent`
- Tile 2: `Caregiver` -> `delegation + limits`
- Tile 3: `Referral` -> `case context + purpose`
- Tile 4: `Public health / CBO` -> `program authority`
- Prompt: `Which one would you pilot first?`

Speaker beat:
The hard part is not JWT syntax. It is deciding what real-world authority an issuer can responsibly attest.

Demo/link-out:
- Audience prompt. Optional live poll.

Image prompt:
```text
Use case: infographic-diagram
Asset type: 16:9 conference slide visual comp
Primary request: Create a clean four-tile decision slide titled "Tickets are only worth it when authority must travel". No logo, no asterisk mark, no decorative brand mark. Four large rounded tiles across the slide: "Patient self-access" with sublabel "identity + intent"; "Caregiver" with sublabel "delegation + limits"; "Referral" with sublabel "case context + purpose"; "Public health / CBO" with sublabel "program authority". Each tile has a simple icon and a small confidence meter. Bottom prompt in large text: "Which one would you pilot first?" White background, teal accents, multicolor palette, minimal conference style.
```

## Slide 12: Scheduling Links Teaser

Purpose: Briefly connect to "and more" without stealing time from the next session.

Visual layout:
- Airline/Kayak-like metaphor: availability publisher -> searchable index -> deep link to booking.
- Calendar slots as colored chips.
- One large "teaser" bracket.

Exact on-slide text:
- Title: `Scheduling Links: publish lightweight facts, finish in local workflow`
- Flow labels:
  - `Bulk publish slots`
  - `Search/discover`
  - `Deep link to book`
- Takeaway: `Discovery can be standardized without standardizing every booking workflow.`
- Footer: `SMART Scheduling Links CI build`

Speaker beat:
This is the same ecosystem pattern: standardize enough to unlock discovery, but keep complex completion inside the provider's workflow.

Demo/link-out:
- `https://build.fhir.org/ig/HL7/smart-scheduling-links/`

Image prompt:
```text
Use case: infographic-diagram
Asset type: 16:9 conference slide visual comp
Primary request: Create a clean teaser slide titled "Scheduling Links: publish lightweight facts, finish in local workflow". No logo, no asterisk mark, no decorative brand mark. Center shows three-step flow: "Bulk publish slots" with calendar slot chips, "Search/discover" with magnifying glass over appointment cards, "Deep link to book" with browser/link icon. Use an airline search/Kayak-like visual metaphor without brand names. Bottom takeaway: "Discovery can be standardized without standardizing every booking workflow." White background, teal horizontal band, yellow/orange slot chips, thin lines.
```

## Slide 13: The Ask / Discussion

Purpose: End with a concrete call to action and discussion prompts.

Visual layout:
- Three columns.
- Column 1: "Ship App Launch well".
- Column 2: "Publish Brands well".
- Column 3: "Pressure-test Tickets".
- At bottom: five audience questions in a faint card stack, not all meant to be read from the slide.

Exact on-slide text:
- Title: `Boring implementation quality + ambitious authorization experiments`
- Column headings:
  - `Ship App Launch well`
  - `Publish Brands well`
  - `Pressure-test Tickets`
- Column bullets:
  - `clear errors`
  - `current endpoints`
  - `usable portals`
  - `recognizable brands`
  - `auditable authority`
  - `local policy stays in loop`
- Bottom prompt: `What would make your token endpoint trust a ticket?`

Speaker beat:
End with a balanced frame: do not wait for futuristic tickets to fix basic launch/brand quality, and do not pretend basic launch solves ecosystem-scale authorization.

Demo/link-out:
- Discussion prompts:
  - What issuer would your organization trust?
  - What claim makes you nervous?
  - What is the smallest pilot?

Image prompt:
```text
Use case: productivity-visual
Asset type: 16:9 conference slide visual comp
Primary request: Create a final discussion slide titled "Boring implementation quality + ambitious authorization experiments". White background. No logo, no asterisk mark, no decorative brand mark. Three clean columns with colored header badges: "Ship App Launch well", "Publish Brands well", "Pressure-test Tickets". Under columns use short tags: "clear errors", "current endpoints", "usable portals", "recognizable brands", "auditable authority", "local policy stays in loop". Bottom has a large question card: "What would make your token endpoint trust a ticket?" Add subtle multicolor connector lines and teal band. Minimal, polished, conference-ready.
```

## Demo Links To Put In Presenter Notes

- SMART App Launch v2.2.0: `https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html`
- Scopes and launch context: `https://hl7.org/fhir/smart-app-launch/STU2.2/scopes-and-launch-context.html`
- Backend Services: `https://hl7.org/fhir/smart-app-launch/STU2.2/backend-services.html`
- User Access Brands: `https://hl7.org/fhir/smart-app-launch/STU2.2/brands.html`
- Epic Brands bundle: `https://open.epic.com/Endpoints/Brands`
- Health Skillz: `https://github.com/jmandel/health-skillz`
- Permission Tickets WIP IG: `https://build.fhir.org/ig/jmandel/smart-permission-tickets-wip/branches/app-issued-tickets/index.html`
- Permission Tickets repo: `https://github.com/jmandel/smart-permission-tickets-wip`
- OAuth Token Exchange RFC 8693: `https://www.rfc-editor.org/rfc/rfc8693`
- JWT client auth RFC 7523: `https://www.rfc-editor.org/rfc/rfc7523`
- SMART Scheduling Links CI build: `https://build.fhir.org/ig/HL7/smart-scheduling-links/`
