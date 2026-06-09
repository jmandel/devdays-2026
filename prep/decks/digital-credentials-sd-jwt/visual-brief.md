# Visual Brief: Digital Credentials / SD-JWT Deck

## Overall Direction

Use a cleaner, sharper variant of the SMART deck style, but make this deck feel more like privacy engineering and clinical semantics than ecosystem overview.

Primary motif: a black redaction marker crossing out selected FHIR tree nodes while cryptographic digest commitments remain visible.

Secondary motifs:

- Locked boxes on a pallet with a master seal.
- Sparse JSON/FHIR trees with digest placeholders.
- Browser/wallet chooser cards.
- Request checklist cards for insurance, clinical bundle, questionnaire, and patient note.
- Layer diagrams that separate FHIR, SD-JWT, mdoc, Digital Credentials API, trust, and clinical acceptance.

## Palette

- Background: `#FFFFFF`
- Primary text: `#24262B`
- Muted text: `#6B7280`
- Linework: `#D8DEE8`
- Clinical blue: `#2F80ED`
- Privacy purple: `#7E3F98`
- Verification green: `#2EAD5F`
- Warning amber: `#F2A03A`
- Redaction black: `#111111`
- Caveat red: `#D84242`

## Typography And Layout

- Large, direct titles with one argument per slide.
- Use exact protocol tokens in monospace pills.
- Keep code snippets short and real.
- Favor diagrams over tables.
- Avoid generic wallet/identity clip art and fake VC branding.
- No recurring logos or watermarks.

## Generation Guardrails

- Do not draw actual SMART logos, W3C logos, browser vendor logos, Apple/Google marks, hospital brands, or fake certification seals.
- Do not imply SD-JWT encrypts hidden data.
- Do not show SD-JWT redaction as editing plaintext inside a signed JWT.
- Do not imply mdoc performs the FHIR redaction in this talk.
- Do not draw the picker as a central health-data database.
- Use exact terms where visible: `Disclosure`, `_sd`, `_sd_alg`, `{ "...": digest }`, `KB-JWT`, `sd_hash`, `org-iso-mdoc`, `smart_health_checkin_response`.

## Suggested Slide Image Style

Slides should feel like a projected technical product diagram:

- White background.
- Thin colored connectors.
- Minimal browser/wallet UI panels.
- High-contrast redaction marks used sparingly.
- Code tokens in small rounded monospace chips.
- Bottom caption bands only when they carry the takeaway.
