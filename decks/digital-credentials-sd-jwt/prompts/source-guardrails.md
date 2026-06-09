# Source Guardrails For Slide Generation

Use this file to keep generated visuals aligned with actual source material.

## SD-JWT / FHIR Redaction

- RFC 9901 defines selective disclosure for JSON payloads of JWS/JWT.
- A `Disclosure` is base64url of a JSON array. Object form: `[salt, claim name, claim value]`. Array form: `[salt, claim value]`.
- Object digests appear in `_sd`; array digests appear as `{ "...": "<digest>" }`.
- The verifier checks selected cleartext disclosures against signed digest commitments.
- `KB-JWT` and `sd_hash` are optional key-binding mechanics when the verifier requires holder binding.
- The FHIR Redaction Studio repo adds FHIR-aware choices: keep `resourceType` and `id`, avoid hidden modifier semantics, reconstruct clean FHIR JSON.

## SMART Health Check-in mdoc

- SMART Health Check-in mdoc is not SD-JWT.
- It is a transport-neutral SMART clinical request/response model plus same-device `org-iso-mdoc` presentation over the W3C Digital Credentials API.
- The SMART request rides in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
- The response is one stable mdoc element: `smart_health_checkin_response`.
- The mdoc layer is an authenticated, encrypted, holder-mediated transport for SMART clinical JSON.
- Disclosure granularity lives in SMART JSON: request items, Holder review, Artifacts, `fulfills[]`, statuses, and policy.

## Things Not To Claim Visually

- Do not draw SD-JWT as encrypted hidden fields.
- Do not draw the issuer deleting claims at presentation time.
- Do not draw hidden FHIR modifier elements as safe.
- Do not draw `purpose` or `required: true` as consent or authority.
- Do not draw `readerAuth`, HPKE, or mdoc issuer/device evidence as clinical provenance by itself.
- Do not draw picker/server infrastructure as receiving sensitive returned health data.
