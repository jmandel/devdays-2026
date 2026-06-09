# Slide Design Spec: Beyond All-or-Nothing QR Codes

## Deck-Level Style

The deck should be visually consistent but not generic. Use a white canvas, charcoal text, thin technical linework, and a recurring redaction-marker accent. The deck should feel like a practical standards/demo talk, not a VC ideology talk.

Visual grammar:

- Black marker strokes mean holder choice/redaction.
- Purple locked boxes mean selectively disclosable content.
- Green checkmarks mean cryptographic verification.
- Amber triangles mean caveats and clinical-safety limits.
- Blue browser/wallet panels mean presentation workflow.

Avoid:

- Vendor logos.
- Fake health system branding.
- Generic "digital wallet" clip art.
- Dense spec screenshots.
- AI-ish filler terms.
- Mixing SD-JWT and `org-iso-mdoc` into a single magic privacy layer.

## Slide 1: Beyond All-or-Nothing QR Codes

Purpose: establish the talk as evolution beyond SHC v1, not an attack on QR codes.

Layout: left title block; right three vertical artifacts: QR card, redaction marker over a FHIR tree, wallet chooser. Bottom small flow: signed card -> patient app -> purpose-bound presentation.

Visible text:

- Beyond All-or-Nothing QR Codes
- SD-JWT for FHIR, SMART Health Check-in, and browser-mediated presentation
- DevDays 2026 | Josh Mandel
- Verify
- Minimize
- Present

## Slide 2: SMART Health Cards got the first job done

Purpose: credit the deployed pattern.

Layout: three actor panels: Issuer signs, Holder carries, Verifier checks. Use a compact JWS/FHIR card between them.

Visible text:

- Issuer signs
- Holder carries
- Verifier checks
- FHIR payload + JWS signature
- The win: portable provenance at real scale

Speaker beat: SHC proved that verifiable FHIR-shaped health data could work globally.

## Slide 3: The old privacy model was issuer-time profiling

Purpose: explain "Minimal Disclosure via Profiling."

Layout: row of narrow profiles, each with only a few allowed fields. Contrast with a large comprehensive bundle dimmed behind them.

Visible text:

- Minimal Disclosure via Profiling
- COVID card
- School physical
- Insurance proof
- Intake summary
- Good when one narrow payload is enough
- Brittle when every workflow needs a different subset

## Slide 4: SD-JWT moves minimization to presentation time

Purpose: introduce RFC 9901 with a memorable but accurate mental model.

Layout: locked boxes on a pallet under a master seal. Holder opens only selected boxes for Verifier.

Visible text:

- RFC 9901: Selective Disclosure for JSON Web Tokens
- Issuer signs commitments
- Holder reveals selected disclosures
- Verifier checks digests + signature
- The holder is not editing the signed record

## Slide 5: What the verifier actually checks

Purpose: show exact terms without a wall of text.

Layout: left: issuer payload snippet with `_sd` and `{ "...": digest }`; middle: disclosure chip `[salt, claim name, value]`; right: verifier recomputes digest and checks issuer signature. Small optional KB-JWT strip at bottom.

Visible text:

- `_sd`
- `{ "...": digest }`
- `Disclosure`
- `[salt, claim name, value]`
- `KB-JWT`
- `sd_hash`
- Same issuer JWT + selected disclosures

Speaker beat: the digest is over the base64url Disclosure string; do not explain too deeply unless asked.

## Slide 6: FHIR is not just JSON

Purpose: healthcare-specific insight.

Layout: FHIR resource tree with datatype boxes and a highlighted modifier element. A black marker is blocked from crossing out a modifier.

Visible text:

- FHIR is not just JSON
- Redact at meaningful boundaries
- Keep `resourceType` and `id`
- Do not hide modifier semantics
- Cryptographic validity is not clinical sufficiency

## Slide 7: Live demo: FHIR Redaction Studio

Purpose: set up the primary demo.

Layout: browser mockup of three panels: signed FHIR bundle, marker redaction, sparse verifier JSON.

Visible text:

- Live demo: FHIR Redaction Studio
- 1 Start with signed FHIR
- 2 Mark fields to withhold
- 3 Verify sparse output
- joshuamandel.com/fhiredaction-studio
- github.com/jmandel/fhiredaction-studio

## Slide 8: Redaction does not prove clinical sufficiency

Purpose: caveat before moving on.

Layout: verified sparse bundle with green signature check, beside amber policy checklist.

Visible text:

- Signature verifies
- Hidden fields stay hidden
- But is this enough for the workflow?
- completeness within scope
- modifier safety
- verifier policy
- clinical acceptance

## Slide 9: The web handoff is still clumsy

Purpose: transition from cryptographic minimization to presentation workflow.

Layout: three bad UX cards: upload file, copy-paste link, self-scan QR. A frustrated mobile screen can be shown, but keep it clean.

Visible text:

- Upload a file
- Copy a long link
- Self-scan a QR
- Remote check-in needs an app-mediated handoff

## Slide 10: SMART Health Check-in asks for a package

Purpose: introduce the request model.

Layout: requester builds a request checklist: insurance, clinical bundle, questionnaire, patient note. Patient app reviews each item.

Visible text:

- SMART Health Check-in
- Requester asks for workflow-bounded content
- insurance
- FHIR bundle
- questionnaire
- patient note
- Holder review happens item by item

## Slide 11: The picker is a router

Purpose: pass-through privacy model.

Layout: Requester -> Picker -> Patient App, with response arrow bypassing picker directly back to Requester. The picker box should be visually transparent or hollow.

Visible text:

- Picker sees the request
- Picker should not see returned health data
- Patient app prepares the response
- Direct response to requester

## Slide 12: `org-iso-mdoc` is the rail, not the clinical model

Purpose: prevent mdoc/SD-JWT/clinical semantics confusion.

Layout: layer stack: Digital Credentials API, `org-iso-mdoc`, `smart_health_checkin_response`, SMART response JSON, FHIR/SHC artifacts.

Visible text:

- `org-iso-mdoc`
- `org.smarthealthit.checkin.1`
- `smart_health_checkin_response`
- one stable mdoc element
- FHIR-aware semantics stay in JSON

## Slide 13: Live demo: SMART Health Check-in mdoc

Purpose: set up the second demo.

Layout: browser verifier, wallet/phone review, response inspector. Use route chips: `/verifier/`, `/wallet/`, `/wire-protocol-inspector.html`.

Visible text:

- Live demo: SMART Health Check-in mdoc
- 1 Create request
- 2 Review in wallet
- 3 Return response
- 4 Inspect the wire
- jmandel.github.io/smart-health-checkin-mdoc

## Slide 14: Keep the layers separate

Purpose: architecture discipline.

Layout: vertical layers with explicit "not substitutes" callouts.

Visible text:

- Browser mediation
- Presentation protocol
- Credential / wrapper format
- FHIR payload
- Provenance
- Local clinical acceptance
- A valid wrapper is not consent, provenance, or write-back permission

## Slide 15: The hard questions are policy and UX

Purpose: close with discussion.

Layout: four cards with direct questions.

Visible text:

- What can the holder hide?
- Who decides "complete enough"?
- How should declined fields appear?
- What should an EHR ingest?
- Purpose-bound sharing needs both cryptography and judgment

