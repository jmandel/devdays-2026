# Beyond All-or-Nothing QR Codes

Session: Beyond "All-or-Nothing" QR Codes: Digital Credentials API, SMART Health Check-in, and Selective Disclosure JWTs  
Scheduled: Jun 17, 2026, 11:30 AM  
Speaker: Josh Mandel

## Core Thesis

SMART Health Cards proved that verifiable health data can work at real scale. The next problem is not just "make a better QR code." It is purpose-bound presentation: the verifier asks for a specific package, the patient app helps assemble, curate, or redact it, and the browser/OS mediates a safer handoff.

The healthcare-specific claim: selective disclosure is useful, but FHIR semantics are the hard part. Cryptography can prove what was disclosed and committed; it cannot decide whether a redacted clinical object is safe or sufficient.

## Deck Arc

1. **Beyond All-or-Nothing QR Codes**  
   Open with the tension: SHC succeeded, but presentation and minimization are now the bottleneck.

2. **SMART Health Cards got the first job done**  
   Give credit: issuer signs, holder carries, verifier checks. This created a globally deployable trust pattern.

3. **The old privacy model was Minimal Disclosure via Profiling**  
   Explain why SHC v1 privacy came from issuer-time narrow profiles. Good for COVID cards; brittle for every future workflow.

4. **SD-JWT moves minimization to presentation time**  
   Introduce RFC 9901 with the locked-box mental model. Issuer signs digests; holder reveals selected disclosures.

5. **What the verifier actually checks**  
   Show `_sd`, `{ "...": digest }`, `Disclosure`, salt, digest, issuer signature, and optional `KB-JWT` / `sd_hash`.

6. **FHIR is not just JSON**  
   Healthcare pivot. Redaction must happen at meaningful FHIR datatype/container boundaries; modifier elements cannot be silently hidden.

7. **Live demo: FHIR Redaction Studio**  
   Show signed bundle, marker redaction, sparse verifier output, signature still verifies.

8. **Redaction does not prove clinical sufficiency**  
   Caveat slide. Cryptography proves integrity of disclosed claims and commitments to hidden ones; local policy decides whether the remaining clinical content is usable.

9. **QR, upload, copy-paste, self-scan: presentation is still broken**  
   Move from redaction to workflow. Remote check-in needs an app-mediated handoff, not just another artifact format.

10. **SMART Health Check-in asks for a package, not a file**  
   Requester asks for insurance, FHIR resources, questionnaire, and patient note. Patient app reviews and returns artifacts.

11. **The picker is a router, not a health-data processor**  
   Requester -> picker -> wallet/patient app -> direct response to requester. Picker sees request; it should not see returned health data.

12. **`org-iso-mdoc` is the rail, not the clinical model**  
   SMART response JSON rides in `smart_health_checkin_response`; disclosure granularity lives in the JSON/item/artifact layer, not per-FHIR-field mdoc elements.

13. **Live demo: SMART Health Check-in mdoc**  
   Show verifier request, wallet review, response return, and byte/proof inspector if useful.

14. **Layer boundaries keep the design honest**  
   Browser mediation, presentation protocol, credential/wrapper format, FHIR payload, provenance, and clinical acceptance are separate layers.

15. **The hard questions are policy and UX**  
   Close with frank questions: What can be hidden? Who decides sufficiency? How do wallets express declined fields? What should an EHR ingest?

## Demo Links

- FHIR Redaction Studio repo: https://github.com/jmandel/fhiredaction-studio
- FHIR Redaction Studio demo: https://joshuamandel.com/fhiredaction-studio/
- RFC 9901: https://www.rfc-editor.org/rfc/rfc9901.txt
- SMART Health Check-in mdoc repo: https://github.com/jmandel/smart-health-checkin-mdoc
- SMART Health Check-in mdoc demo: https://jmandel.github.io/smart-health-checkin-mdoc/
- SMART Health Check-in draft spec: `background/digital-credentials-sd-jwt/repos/smart-health-checkin-mdoc/spec.md`
- W3C Digital Credentials latest TR: https://www.w3.org/TR/digital-credentials/

## Demo Run Of Show

### Demo 1: FHIR Redaction Studio

1. Start with the signed FHIR Bundle and name the roles: Issuer, Holder, Verifier.
2. Redact a straightforward privacy field such as an address or identifier.
3. Show sparse verifier output: disclosed values plus digest commitments.
4. Redact a clinical field and ask whether that should be allowed.
5. Show the FHIR safety point: if a disclosed resource depends on modifier semantics, hidden modifiers are unsafe.
6. Close the demo with the distinction: the holder is not editing the signed record; the holder is choosing which pre-signed disclosures to reveal.

### Demo 2: SMART Health Check-in mdoc

1. Start at the verifier page and create a request for administrative plus clinical content.
2. Invoke the wallet/patient app flow.
3. Show holder review at item granularity.
4. Return to the verifier and show `requestId`, artifacts, statuses, and returned payload mapping.
5. If time allows, show the wire/protocol inspector to reinforce that `org-iso-mdoc` is transport, not FHIR semantics.

## Claims To Keep Honest

- SD-JWT signs hashes and selected cleartext disclosures; it does not encrypt claims.
- Undisclosed claims are not deleted by the issuer; the holder omits `Disclosure` values at presentation.
- SD-JWT does not guarantee unlinkability.
- Key Binding is optional unless the verifier requires and validates `SD-JWT+KB`.
- SMART Health Check-in mdoc is separate from SD-JWT. It carries SMART response JSON over `org-iso-mdoc`; it is not per-FHIR-field mdoc selective disclosure.
- `purpose`, item text, `required: true`, HPKE success, `readerAuth`, and mdoc issuer/device evidence are not substitutes for requester identity, patient identity, clinical provenance, consent, or downstream authorization.
