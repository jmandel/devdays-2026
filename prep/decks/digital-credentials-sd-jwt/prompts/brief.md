# Image Generation Brief: Beyond All-or-Nothing QR Codes

Create a 16:9 technical conference deck as generated slide images. The deck is for a live DevDays 2026 talk by Josh Mandel about SD-JWT for FHIR redaction and SMART Health Check-in over browser/wallet presentation rails.

## Core Thesis

SMART Health Cards proved that verifiable health data can work at real scale. The next problem is purpose-bound presentation: a verifier asks for a specific package, a patient app helps assemble, curate, or redact it, and the browser/OS mediates the handoff.

Healthcare-specific focus: selective disclosure is useful, but FHIR semantics are the hard part. Cryptography can prove what was disclosed and committed; it cannot decide whether a redacted clinical object is safe or sufficient.

## Visual System

White canvas, charcoal titles, thin technical linework, and a recurring redaction-marker motif. Use consistent blue/purple/green/amber accents:

- Blue: browser/wallet/presentation workflow.
- Purple: selectively disclosable locked boxes.
- Green: verification checks.
- Amber/red: caveats, safety, and policy limits.
- Black marker strokes: holder redaction choice.

Do not use vendor logos, SMART logos, W3C logos, fake hospital branding, watermarks, or generic stock healthcare imagery.

## Critical Semantics

- SD-JWT and SMART Health Check-in are separate topics in this talk.
- SD-JWT is Issuer-signed JWT plus selected `Disclosure` strings; it does not encrypt claims.
- The Holder omits disclosures at presentation; the Holder is not editing a signed JWT.
- FHIR redaction must respect meaningful datatype/container boundaries and modifier safety.
- SMART Health Check-in mdoc carries one stable element, `smart_health_checkin_response`; it does not perform per-FHIR-field mdoc selective disclosure.
- `org-iso-mdoc` is the transport rail, not the clinical model.
- The picker is a router and should not be drawn as receiving returned health data.

## Exact Tokens To Preserve

`RFC 9901`, `Selective Disclosure for JSON Web Tokens`, `Issuer`, `Holder`, `Verifier`, `Disclosure`, `_sd`, `_sd_alg`, `{ "...": digest }`, `KB-JWT`, `sd_hash`, `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `smart_health_checkin_response`, `FHIR`, `resourceType`, `id`.

## Source Grounding

- Deck arc: `deck.md`
- Slide visual requirements: `slide-design-spec.md`
- Style and guardrails: `visual-brief.md`
- RFC source: `background/digital-credentials-sd-jwt/specs/rfc9901-sd-jwt.txt`
- FHIR Redaction Studio repo: `background/digital-credentials-sd-jwt/repos/fhiredaction-studio/`
- SMART Health Check-in mdoc repo/spec: `background/digital-credentials-sd-jwt/repos/smart-health-checkin-mdoc/`
