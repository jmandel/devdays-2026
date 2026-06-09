# Prep: Digital Credentials, SMART Health Check-in, and SD-JWT

## Core Audience Promise

By the end, the audience should be able to explain why SMART Health Cards worked, why QR/file/copy-paste presentation is now the bottleneck, and what is becoming possible when three threads converge: SD-JWT for selective disclosure, SMART Health Check-in for health-specific request/response workflows, and the W3C Digital Credentials API for browser/OS-mediated wallet presentation.

The opinionated claim: the next generation of patient-controlled sharing should not be "show me a QR code" or "upload your entire record." It should be: the verifier asks for a specific purpose-bound package, the patient's app helps assemble and redact it, the browser/OS mediates the handoff, and the verifier receives only what it can justify.

## Big-Picture Mental Models

- **SHC v1 was minimal disclosure by issuer policy.** A conventional signed JWT cannot be edited after issuance, so privacy came from tight profiles: issue a small card with only the fields needed for a use case. This was the right pandemic compromise, but it does not scale to every school, employer, insurer, front desk, registry, and prior-auth scenario.
- **SD-JWT is "sign the sealed boxes, reveal selected boxes."** The issuer signs digests; the holder later sends only selected disclosures. The verifier recomputes digests and checks the issuer signature. The thing to stress: the holder is not editing the signed record; the holder is choosing which pre-signed disclosures to reveal. See IETF RFC 9901: https://www.ietf.org/ietf-ftp/rfc/rfc9901.pdf.
- **FHIR needs semantic disclosure rules, not arbitrary JSON redaction.** Redacting individual characters or hiding FHIR modifier elements can produce clinically unsafe data. The FHIR Redaction Studio stance is strong: disclose/redact at meaningful FHIR datatype/container boundaries, and never allow hidden modifiers to silently change meaning. Demo/source: https://joshuamandel.com/fhiredaction-studio/ and https://github.com/jmandel/fhiredaction-studio.
- **Digital Credentials API is a transport and mediation layer, not "the credential standard."** The current W3C draft is format/protocol agnostic and defines browser mediation for presentation/issuance, with protocols like `openid4vp-v1-*` and `org-iso-mdoc` listed in the spec. W3C Working Draft, 2026-06-01: https://www.w3.org/TR/digital-credentials/.
- **SMART Health Check-in is the health workflow bridge.** The clinic does not merely need a driver's license style attribute proof; it may need insurance, meds/allergies/problems/immunizations, a narrative, and a FHIR QuestionnaireResponse. The local proposal mirrors Digital Credentials API request/response shapes while using reliable web redirects and messaging today. Demo/source: https://joshuamandel.com/smart-health-checkin-demo and https://github.com/jmandel/smart-health-checkin-demo.
- **Wallet reality is uneven but no longer hypothetical.** Chrome says Digital Credentials API is enabled by default from Chrome 141 and supports Android same-device plus desktop cross-device presentation: https://developer.chrome.com/blog/digital-credentials-api-shipped. Apple says Safari 26 supports the W3C API for mobile IDs from Apple Wallet and third-party wallets, currently centered on ISO mdoc/`org-iso-mdoc`: https://webkit.org/blog/17431/online-identity-verification-with-the-digital-credentials-api/.

## Proposed Deck Arc

| Slide/section | Goal | Visual/content idea | Speaker beat | Demo tie-in |
| --- | --- | --- | --- | --- |
| 1. Title: beyond all-or-nothing QR codes | Frame the talk as evolution, not replacement | Split screen: QR code, upload button, wallet chooser, black-marker redaction | "QR codes got us to global verifiable health data. Now the hard problem is presentation." | None |
| 2. What SMART Health Cards got right | Give SHC credit and set credibility | SHC lifecycle: issuer signs, holder stores, verifier checks | "SHC proved decentralized trust and FHIR payloads could work at scale." | Show a static SHC/SHL artifact if needed |
| 3. The all-or-nothing problem | Make the pain concrete | FHIR Bundle with address, MRN, vaccine, unrelated condition; red X over "standard JWT redaction" | "With a normal JWT, every post-issuance redaction breaks the signature." | Prepare audience for FHIR Redaction Studio |
| 4. Minimal disclosure via profiling | Explain the old compromise | Table: COVID vaccine profile vs school physical vs insurance proof vs intake | "Profiles work when the world agrees on one narrow payload. Healthcare is mostly not that." | None |
| 5. SD-JWT mechanics | Give a correct intuitive model | Locked boxes/pallet/master seal diagram; digest + disclosure + salt | "The issuer signs commitments. The holder presents selected openings." | Transition to live redaction |
| 6. FHIR is not just JSON | Prevent naive implementation | FHIR tree with modifier elements highlighted | "A hidden `entered-in-error` or `not-given` is not privacy; it is semantic corruption." | FHIR Redaction Studio safety rules |
| 7. Demo: FHIR Redaction Studio | Show the core idea working | Live redaction marker UI plus sparse verifier JSON | "The signature still verifies after the holder withholds selected fields." | Primary demo |
| 8. QR codes are not the web UX | Move from crypto to workflow | Three bad flows: upload file, copy link, self-scan QR | "The best credential format in the world fails if the handoff is clumsy." | Transition to Check-in |
| 9. SMART Health Check-in | Introduce request/response workflow | Requester -> picker -> patient app -> direct response; show picker never sees data | "A clinic asks for exactly what it needs: insurance, clinical bundle, questionnaire." | SMART Health Check-in demo |
| 10. Demo: intake/check-in flow | Show health-specific value | Verifier page requests bundle and questionnaire; patient app chooses, pre-fills, returns | "The patient app is not a file picker; it is an active assistant." | Secondary demo |
| 11. Digital Credentials API reality check | Ground in current standards | W3C `navigator.credentials.get({ digital: { requests: [...] }})`; protocols list | "The API is becoming real, but it is still a moving platform surface." | Wallet/browser flow or screenshots |
| 12. mdoc/OpenID4VP/SMART payloads | Clarify stack boundaries | Layer cake: browser API, presentation protocol, credential format, health payload | "Do not confuse the envelope with the clinical content." | SHL Wallet testbed |
| 13. Strategic takeaway | Give audience a decision frame | Matrix: verifiable? selective? browser-mediated? health workflow? | "Use SHC/SHL where they fit. Add SD-JWT when post-issuance minimization matters. Use Check-in when workflow matters." | None |
| 14. Discussion | Surface hard questions | Three prompts on trust, clinical safety, and platform governance | "This is where standards work should get uncomfortable." | Audience prompts |

## Live Demo Plan

**Demo 1: FHIR Redaction Studio, primary demo.**

Setup: open https://joshuamandel.com/fhiredaction-studio/ in a clean browser tab, plus source repo https://github.com/jmandel/fhiredaction-studio ready in a backup tab. Confirm the sample signed FHIR Bundle loads, redaction controls work, and raw SD-JWT/verifier output panel is readable on projector.

Exact flow:

1. Start with the unredacted signed FHIR artifact and point out issuer, holder, verifier roles.
2. Redact a low-risk privacy field first, such as address or identifier.
3. Show that the verifier receives a sparse tree with digests/disclosures rather than the concealed plaintext.
4. Redact something clinical and pause: "Should this be allowed?"
5. Show the modifier safety rule: if a disclosed resource depends on modifier elements, the implementation must force those semantics to remain visible.
6. End by comparing this with "minimal disclosure via profiling": SD-JWT shifts some minimization from issuer-time to presentation-time.

Risks: live browser rendering, audience cannot read raw token, someone asks whether SD-JWT proves the redacted value was harmless. Answer: it proves integrity of what is disclosed and commitments to what is hidden; it does not make a sparse clinical object clinically sufficient. That is why FHIR-specific disclosure rules and verifier policies matter.

Fallback: use screenshots of (a) unredacted bundle, (b) marker redaction, (c) sparse verifier view, (d) modifier warning. If the demo fails, draw the digest/disclosure flow and keep the FHIR safety discussion.

**Demo 2: SMART Health Check-in, secondary demo.**

Setup: open https://joshuamandel.com/smart-health-checkin-demo and source repo https://github.com/jmandel/smart-health-checkin-demo. Verify the Requester, Picker, Patient App, and return response flow works in the target browser. Have a browser profile with pop-ups allowed.

Exact flow:

1. On the requester page, construct a request for a digital insurance card, a US Core-like clinical bundle, and a FHIR Questionnaire/QuestionnaireResponse.
2. Launch the picker and narrate it as a directory/router, not a health data processor.
3. Select the patient app.
4. In the patient app, show review/curation: uncheck at least one category, prefill a questionnaire field, and add a short patient note.
5. Return to the requester and show request IDs mapping returned payloads to the original asks.
6. Emphasize the pass-through privacy model: the picker routes the request but does not receive the sensitive response.

Risks: browser messaging/pop-up behavior, projector audience may miss role transitions, questions about whether this is a standard. Be blunt: this is a proposal/prototype, not a published SMART standard; its value is that it aligns health workflow needs with where the W3C/browser platform is going.

Fallback: static sequence diagram plus three screenshots: requester request JSON, patient app review screen, requester response panel.

**Demo 3: wallet/browser API flow, optional and risky.**

Setup: use the SHL Wallet testbed/source https://github.com/jmandell/shl-wallet and any available Android/Chrome or Safari 26 environment. Verify whether `DigitalCredential` exists and whether the relevant protocol is allowed using `DigitalCredential.userAgentAllowsProtocol(...)`. For Chrome, note that the current API entry point moved from `navigator.identity.get()` to `navigator.credentials.get()` per Chrome's October 2025 update: https://developer.chrome.com/blog/digital-credentials-api-shipped. For Apple/Safari, expect mdoc-centered `org-iso-mdoc` behavior: https://developer.apple.com/documentation/identitydocumentservices/requesting-a-mobile-document-on-the-web.

Exact flow:

1. Show feature detection in the console: `typeof DigitalCredential`.
2. Show protocol detection for `org-iso-mdoc` and, if relevant, OpenID4VP protocol strings.
3. Trigger a relying-party request.
4. If the OS wallet chooser appears, stop and explain that this is the important part: the browser/OS is mediating selection and permission before data leaves the device.
5. If a credential returns, show only high-level structure, not sensitive content.

Risks: platform version mismatch, no eligible wallet, cross-device QR/BLE/proximity failure, mdoc-only support not matching health payloads, Safari WKWebView limitations. Treat this as "show the direction of travel," not the foundation of the talk.

Fallback: show the W3C request shape, Chrome support note, Apple/Safari support note, and SHL Wallet repo. The story still works without a native wallet live success.

## Backup/Static Artifacts

- One-slide SD-JWT explainer: issuer-signed JWT contains digests; holder sends selected disclosures; verifier checks digests and signature. Cite RFC 9901: https://www.ietf.org/ietf-ftp/rfc/rfc9901.pdf.
- Screenshot set from FHIR Redaction Studio: unredacted FHIR Bundle, redaction marker, sparse JSON, modifier safety warning. Source/demo: https://github.com/jmandel/fhiredaction-studio and https://joshuamandel.com/fhiredaction-studio/.
- SMART Health Check-in sequence diagram: Requester -> Picker -> Patient App -> direct response to Requester. Emphasize "picker sees request, not returned health data." Demo/source: https://github.com/jmandel/smart-health-checkin-demo and https://joshuamandel.com/smart-health-checkin-demo.
- Digital Credentials API code snippet with current shape: `navigator.credentials.get({ digital: { requests: [{ protocol, data }] } })`. W3C draft: https://www.w3.org/TR/digital-credentials/.
- Platform support slide: Chrome 141 default support and Android/desktop cross-device presentation from Chrome docs; Safari 26 support from WebKit/Apple docs; Android app verifier API supported through Credential Manager on Android 9+ per Android docs: https://developer.android.com/identity/digital-credentials/credential-verifier.
- Stack diagram: Digital Credentials API is browser mediation; OpenID4VP or `org-iso-mdoc` is presentation protocol; SD-JWT VC/mdoc/SHC/SHL is credential format or payload strategy; FHIR is the healthcare data model.
- "What is not solved" slide: issuer trust lists, verifier authorization, wallet discoverability, clinical sufficiency of redacted bundles, consent vs browser permission, unlinkability/correlation, and EHR ingestion workflow.

## Current Web Context and Citations

- IETF RFC 9901, "Selective Disclosure for JSON Web Tokens," was published as a Standards Track RFC in November 2025; the core presentation model is that the holder sends only selected disclosures to the verifier: https://www.ietf.org/ietf-ftp/rfc/rfc9901.pdf.
- SD-JWT VC is not yet an RFC as of 2026-06-08; the latest IETF datatracker entry is `draft-ietf-oauth-sd-jwt-vc-16`, an active OAuth WG Internet-Draft, last updated 2026-05-17 with latest revision 2026-04-24 and publication requested: https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/.
- W3C Digital Credentials is a Working Draft dated 2026-06-01; it is not a Recommendation, and W3C explicitly says Working Draft publication is not endorsement: https://www.w3.org/TR/digital-credentials/.
- The W3C API is format/protocol agnostic, user-mediated, requires active user participation, and supports platform UX for credential/credential-manager selection: https://www.w3.org/TR/digital-credentials/.
- The current W3C draft lists presentation protocols including `openid4vp-v1-unsigned`, `openid4vp-v1-signed`, `openid4vp-v1-multisigned`, and `org-iso-mdoc`; this is useful for explaining why SMART payloads may need to ride in or alongside broader identity protocols: https://www.w3.org/TR/digital-credentials/.
- Chrome's October 2025 developer update says Digital Credentials API is enabled by default from Chrome 141, supports same-device Android and desktop cross-device presentation, and moved from `navigator.identity.get()` to `navigator.credentials.get()`: https://developer.chrome.com/blog/digital-credentials-api-shipped.
- Android's Credential Manager Verifier API docs describe `DigitalCredential` for verifying digital credentials and state Android version compatibility at Android 9/API 28 and higher: https://developer.android.com/identity/digital-credentials/credential-verifier.
- WebKit says Safari 26 on macOS 26, iOS 26, and iPadOS 26 supports the W3C Digital Credentials API for mobile IDs from Apple Wallet and third-party wallets: https://webkit.org/blog/17431/online-identity-verification-with-the-digital-credentials-api/.
- WebKit's Safari 26 feature notes identify ISO/IEC 18013-7 Annex C via protocol string `org-iso-mdoc`, and mention `DigitalCredential.userAgentAllowsProtocol()` plus current caveats such as no WKWebView support: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/.
- Apple's developer documentation for requesting a mobile document on the web says the request uses `navigator.credentials.get`, `protocol: "org-iso-mdoc"`, and ISO/IEC 18013-7 Annex C request/response structures: https://developer.apple.com/documentation/identitydocumentservices/requesting-a-mobile-document-on-the-web.
- OpenID for Verifiable Presentations 1.0 final defines DCQL, `dcql_query`, `vp_token`, `direct_post`, and a mechanism for use with the Digital Credentials API: https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html.
- W3C Verifiable Credentials Data Model v2.0 is a W3C Recommendation dated 2025-05-15; it is relevant context but do not let it hijack the talk, because the live health demos are not about generic VC ideology: https://www.w3.org/TR/vc-data-model/.
- HL7 SMART Health Cards and Links IG v1.0.0 STU1 is the current formal HL7 home for SHC/SHL; it frames SHC as secure QR/paper/digital cards and SHL as sharing larger or evolving content through cloud-hosted encrypted payloads: https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/.
- The HL7 SHL spec is strict about the `shlink:` URI scheme and SMART Health Link branding being reserved for Plain SHLs; extensions should use distinct schemes and be registered for discoverability: https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/links-specification.html.
- Local health prototypes/repos to name explicitly: FHIR Redaction Studio https://github.com/jmandel/fhiredaction-studio, SMART Health Check-in demo https://github.com/jmandel/smart-health-checkin-demo, and SHL Wallet/Digital Credentials testbed https://github.com/jmandell/shl-wallet.

## Frank Questions / Audience Prompts

- If a verifier receives a redacted FHIR Bundle that verifies cryptographically, what policy determines whether the remaining clinical content is sufficient for the workflow?
- Should patients be allowed to hide any non-modifier clinical fact, or do some use cases require "complete within scope" attestations from the issuer?
- Is selective disclosure a privacy win if the same issuer signature or holder binding lets verifiers correlate the patient across presentations?
- Who should decide wallet eligibility for health payloads: browser vendors, OS vendors, health networks, app stores, HL7/SMART registries, or patients?
- Can a front-desk workflow tolerate "the patient declined to share this field," or will sites quietly fall back to demanding everything?
- What is the right verifier authorization model? If a clinic requests mental health notes during check-in, should the wallet simply show consent UI, or should it know whether the clinic is authorized for that purpose?
- Should SMART Health Check-in optimize for native Digital Credentials API compatibility now, or stay pragmatic with redirects until browser support is uniform enough?
- What exactly should an EHR import from these flows: a verified credential, a patient-attested packet, a QuestionnaireResponse, a provenance-rich FHIR Bundle, or just a work queue task for a human?

## What To Cut If Time Is Tight

- Cut W3C VC 2.0 history. Mention it only as broad context; the talk is about healthcare payloads and presentation flows.
- Cut deep SD-JWT VC type metadata and `vct` details unless the audience is unusually identity-standards heavy.
- Cut native wallet live demo first. It is the riskiest and least essential; replace with the platform support slide and SHL Wallet repo.
- Cut OpenID4VP details down to one sentence: it is a presentation protocol that can ride through Digital Credentials API and request specific credential claims.
- Cut SMART Health Links extension/branding nuance unless someone asks about `shlink:` and non-Plain SHLs.
- Never cut the FHIR modifier safety point. That is the healthcare-specific insight that separates this talk from a generic identity-wallet presentation.
- If only 20 minutes remain: 3 minutes SHC problem, 8 minutes FHIR Redaction Studio, 6 minutes SMART Health Check-in, 3 minutes current Digital Credentials API reality check.
