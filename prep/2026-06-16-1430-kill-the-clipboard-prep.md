# Prep: Kill the Clipboard

## Core Audience Promise

In 45 minutes, the audience should leave believing that "Kill the Clipboard" is not a slogan about nicer intake forms. It is a concrete patient-mediated exchange pattern: a patient app gathers clinical facts, insurance, identity, and a patient-authored story; a clinic asks for what it needs; the patient reviews and shares; the care team receives something usable before or at the visit.

The practical promise: we can replace repeat memory tests at every visit with patient-shared FHIR artifacts and narratives, but only if the receiving side treats the data as clinical workflow input, not an upload attachment.

The hard edge: the patient-facing app side is moving faster than the EHR persistence/workflow side. The panel should make that gap explicit and useful.

## Big-Picture Mental Models

- **The clipboard is a failed distributed database.** Every visit asks the patient to reconstruct medications, allergies, problems, immunizations, coverage, and context from memory. KTC replaces recall with sharing.
- **Patient-mediated does not mean patient-burdened.** The patient should consent, curate, and add context; the software should do the repetitive extraction, formatting, and transmission.
- **The "Patient Story" is not optional garnish.** Structured facts are necessary, but patients and caregivers often know the timeline, severity, goals, missing data, and "what changed" better than the chart.
- **Two data lanes are needed.** Lane 1 is structured FHIR for PAMI, coverage, demographics, labs, visits. Lane 2 is narrative and annotation, anchored with provenance and fit for clinical review.
- **The receiver is the bottleneck.** A perfect QR code or SMART Health Link still fails if the clinic can only dump it into media, cannot reconcile it, or refuses patient-originated data.
- **Voluntary ecosystem vs. clinical accountability.** CMS can convene and signal. The audience needs to hear what makes providers, EHRs, and networks actually behave differently.
- **Digital equity is a product requirement.** Any KTC workflow that requires every patient to be smartphone-native, portal-savvy, and interruption-free recreates the clipboard in a new form.

## Proposed Opening Deck Arc

| Slide/section | Goal | Visual/content idea | Speaker beat | Demo tie-in |
| --- | --- | --- | --- | --- |
| 1. Cold open: the same clipboard | Make the pain visceral in 30 seconds | One real intake form with meds/allergies/problems circled | "This is a memory test masquerading as care coordination." | Hold up the paper, then put it aside. |
| 2. The new ask | Define KTC in one sentence | Simple diagram: Clinic request -> Patient app -> FHIR + Patient Story -> Care team | "The patient should share what they already have, not retype what the system lost." | Show requester screen asking for coverage, PAMI, and story. |
| 3. What CMS has made real | Establish current relevance | CMS Kill the Clipboard pledge page and Medicare.gov app flow screenshot | "As of June 2026, this is a public CMS ecosystem category, not just a whiteboard idea." | Click the live CMS/Medicare pages only if network is stable. |
| 4. What the demo proves | Set expectations before showing JSON | Four artifacts: Coverage, health history bundle/SHL, QuestionnaireResponse, Patient Story | "The important thing is not the QR. It is request specificity plus patient-controlled response." | Launch SMART Health Check-in demo. |
| 5. Demo: request | Show a clinic asking precisely | Clinic check-in page with requested items and optionality | "The clinic should ask for bounded data, not 'upload your record.'" | Use `smart-health-checkin-demo` requester. |
| 6. Demo: patient choice | Show patient agency | Picker/app consent screen, options to share/decline/annotate | "Consent is a moment of comprehension, not a checkbox buried in portal intake." | Select patient app and add short story. |
| 7. Demo: received payload | Make it tangible for implementers | Side-by-side: human summary and raw FHIR/SHL payload | "Now the panel question: what would it take for this to land in tomorrow's clinic workflow?" | Freeze on artifact inspector before panel. |

## Live Demo / Artifact Plan

Primary demo: **SMART Health Check-in Protocol demo** at https://joshuamandel.com/smart-health-checkin-demo with repo https://github.com/jmandel/smart-health-checkin-demo.

Setup:

- Preload three browser tabs: requester/check-in page, patient app/picker flow, payload inspector.
- Prepare a short sample patient story: "I am here because fatigue and dizziness worsened after a medication change. My top concern is whether metoprolol is contributing. My caregiver noticed two near-falls this week."
- Request at least three artifacts: digital insurance card/Coverage, PAMI-ish clinical summary via SHL or FHIR bundle, and a FHIR Questionnaire/QuestionnaireResponse for reason-for-visit plus patient story.
- Keep the JSON visible but not dominant. The audience should see that this is real FHIR, then immediately see the human-readable intake summary.

Flow:

1. Show the clinic request: "We need coverage, meds/allergies/problems/immunizations, and your visit story."
2. Switch to patient app: select what to share, decline one optional item if possible, add patient-authored context.
3. Return to requester: show artifacts mapped back to request IDs.
4. Show the receiving-side problem: "This is where products either kill the clipboard or create a new inbox."
5. Invite the panel into the frozen demo screen rather than returning to slides.

Tangible backup artifacts:

- A one-page printed "before/after" clipboard replacement artifact: left side repeated paper fields, right side received FHIR resources plus patient story.
- Static screenshots of the request, consent, and returned payload.
- A local sample JSON payload from the demo repo if live networking or browser popup behavior fails.
- A short 30-60 second screen recording of the successful flow.

Risks and fallbacks:

- Browser popup/BroadcastChannel failure: use screenshots and narrate the flow; do not debug live.
- Network failure: use local static build if available; otherwise use printed artifact and payload screenshots.
- Audience gets lost in OID4VP/DCQL terminology: say "that is the transport; the clinical point is request, patient choice, and usable response."
- Panel consumes demo time: stop after showing the returned payload. The panel is more valuable than a second technical branch.

Adjacent artifact to mention, not demo unless asked: **Health Skillz** at https://github.com/jmandel/health-skillz, because James Cummings and Dave deBronkart have pushed it with large real-world records. Use it to support the point that patients/caregivers can aggregate longitudinal records, but keep the talk centered on intake.

## Panel Strategy

Prioritized themes:

1. **From access to action.** Patient access APIs are not enough. The data must arrive where care teams can use it before the visit.
2. **Patient story plus structured facts.** Ask Dave to defend the story; ask James to connect it to longitudinal records and AI; ask Anthony what CMS can do to keep this from becoming unstructured noise.
3. **Receiver accountability.** The frank issue is EHR/provider willingness to accept, reconcile, persist, and return visit records.
4. **Trust without paternalism.** Patient-originated does not mean untrusted. It means provenance, review status, and workflow labeling matter.
5. **Equity and caregiver delegation.** The KTC pattern must support caregivers, complex patients, low digital literacy, and interrupted workflows.
6. **CMS role: convene, measure, or mandate?** Keep Anthony in the real zone: voluntary pledge, aligned networks, app library, identity, metrics, and what CMS will not do.

Desired tension:

- Dave should press: "Why did the system ever think patients should re-enter data they already fought to obtain?"
- James should press: "The patient/caregiver may be the only actor with incentive to aggregate a complete longitudinal record."
- Anthony should press back or clarify: "CMS can create infrastructure and incentives, but implementation has to survive HIPAA, identity, security, workflow, and vendor variation."
- Josh should keep the conversation away from "apps are magic" and toward "what exact handoff works in a clinic on Tuesday?"

How to keep it candid and useful:

- Start with the frozen demo payload and ask: "What breaks first in the real world?"
- Cut off generic interoperability optimism. Ask for the failure mode, owner, and next milestone.
- When someone says "trust," ask "trusted for what action: prefill, clinician review, chart persistence, orders, or billing?"
- When someone says "patient-generated data," distinguish patient-authored narrative, patient-aggregated external clinical data, and patient-measured/device data.
- Give Anthony room to explain CMS constraints, then ask what would be measurable by the end of 2026.

## Prioritized Panel Questions

### Anthony Polizzi (CMS)

1. CMS now has a public Kill the Clipboard category and Medicare.gov user-facing guidance. What is the minimum real-world outcome CMS wants to see this year: fewer forms, accepted FHIR bundles, returned visit records, or measurable provider participation?
   - Follow-up: What would count as failure even if many companies sign the pledge?
   - Follow-up: Are EHRs expected to persist patient-shared PAMI data, or is "view at check-in" enough for the first wave?

2. The CMS criteria say EHRs must accept patient health data via QR code, SMART Health Card, or SMART Health Links using FHIR, and provide a visit record back in FHIR. How will CMS distinguish a real workflow from a demo-only import queue?
   - Follow-up: Will CMS publish usage metrics, conformance results, or complaint channels?
   - Follow-up: Who owns reconciliation when the patient-shared med list conflicts with the EHR med list?

3. The framework leans on IAL2/equivalent identity and AAL2. How do you prevent identity from becoming the new clipboard for patients who cannot smoothly use ID.me, CLEAR, mDLs, passkeys, or portal credentials?
   - Follow-up: What is the caregiver/delegation path?
   - Follow-up: What offline or assisted workflow is acceptable?

4. CMS calls this a movement, not a mandate. What leverage does CMS actually have over EHRs, providers, payers, and networks if adoption stalls?
   - Follow-up: Is the roadmap more likely to become regulation, procurement criteria, star ratings, public scorecards, or something else?

### James Cummings (Participatory Health)

1. You argue that patients and caregivers may be the natural custodians of complete longitudinal health records. Where is that most true, and where does it become unfair burden?
   - Follow-up: In rare or complex disease, what does the patient/caregiver know that the formal record usually misses?
   - Follow-up: What should the receiving clinician see first: timeline, deltas, concerns, or raw data?

2. If a patient app aggregates Epic, claims, labs, wearables, genomics, and patient notes, what should it share at intake without overwhelming the clinic?
   - Follow-up: What is the right "minimum useful record" for a first visit?
   - Follow-up: What should stay in the patient's longitudinal record but not enter the EHR?

3. AI can summarize and prefill intake from a longitudinal record. What is the strongest use case today, and what is the failure mode you worry about most?
   - Follow-up: Should AI-generated intake text be labeled differently from patient-authored story?
   - Follow-up: How should a patient correct or contest the AI summary?

### Dave deBronkart (e-Patient Dave)

1. You have been saying "Give me my damn data" for years. Does Kill the Clipboard finally answer that, or does it risk turning patient access into another chore?
   - Follow-up: What would make you walk out of a "digital clipboard" experience?
   - Follow-up: What should a patient never have to type again?

2. What is the difference between a patient story and a complaint typed into a portal text box?
   - Follow-up: What context do clinicians routinely miss when they only see coded data?
   - Follow-up: How should systems preserve the patient's wording without forcing clinicians to read a wall of text?

3. Patient-shared data can make clinicians nervous. What would you say to a doctor who says, "I cannot trust data that came from an app"?
   - Follow-up: What trust does the patient deserve in return from the clinic?
   - Follow-up: Should the patient be able to see whether their shared data was used, ignored, or corrected?

### Cross-Panel Questions

1. What breaks first: patient identity, app data quality, EHR ingestion, clinician workflow, privacy/legal review, or business incentives?
   - Follow-up: Who has to fix that first break?

2. If we only get one hard requirement into the next milestone, should it be accepting patient-shared FHIR, persisting reconciled PAMI, returning visit records, caregiver delegation, or public metrics?
   - Follow-up: What would you cut?

3. Should patient-shared data be treated like outside records, patient-generated health data, or a new category?
   - Follow-up: What status labels are needed: patient-authored, patient-aggregated, source-verified, clinician-reviewed, reconciled?

4. What should the clinic be allowed to say no to?
   - Follow-up: Can a provider refuse a patient-shared SMART Health Link and still claim to be killing the clipboard?

5. What would make this useful for the least resourced clinic, not only the flagship innovation site?
   - Follow-up: What is the no-new-hardware version?

## Audience Participation Prompts

- "Raise your hand if your organization could accept a patient-shared SMART Health Link today. Keep it up if it lands somewhere better than a media tab."
- "What is the first data element you would trust enough to prefill but not persist: coverage, meds, allergies, problems, immunizations, or reason for visit?"
- "For implementers: what would you need in the payload to route this correctly without manual staff triage?"
- "For clinicians: what label would make patient-shared data usable instead of scary?"
- "For patients/caregivers: what is the one thing you are tired of retyping?"
- "For EHR folks: if CMS asked for one 2026 metric, what would be fair and hard to game?"

## Current Web Context and Citations

- CMS Kill the Clipboard pledge page: https://www.cms.gov/health-tech-ecosystem/early-adopters/kill-the-clipboard. Current as checked 2026-06-08; page last modified 2026-05-21. Pledge centers on patients retrieving health records from CMS Aligned Networks or PHR apps and sharing via QR codes or SMART Health Cards/Links using FHIR bundles.
- Medicare.gov Kill the Clipboard app explainer: https://www.medicare.gov/health-apps/kill-clipboard. User-facing framing says apps store records, help avoid paperwork, and share medications, allergies, tests, conditions, visits, vaccines, and insurance via secure code/QR at participating offices.
- CMS April 9, 2026 First Wave Launch press release: https://www.cms.gov/newsroom/press-releases/cms-launches-first-wave-healthtech-ecosystem-tools-fast-tracking-fully-digital-patient-centered. CMS says more than 700 organizations pledged support and highlights digital data access/check-in as a first-wave tool.
- CMS Health Technology Ecosystem overview: https://www.cms.gov/priorities/health-technology-ecosystem/overview. CMS explicitly frames this as collaboration rather than compliance, with Medicare App Library, categories, early adopters, and interoperability framework.
- CMS Health Tech Ecosystem categories: https://www.cms.gov/health-technology-ecosystem/categories. KTC criteria say apps should transmit FHIR health history and digital insurance cards, EHRs must accept patient health data via QR/SMART Health Card/SMART Health Links, and EHRs must provide a visit record back in FHIR.
- CMS Interoperability Framework: https://www.cms.gov/health-technology-ecosystem/interoperability-framework. Important current note: by July 4, 2026, networks are expected to provide/facilitate FHIR API access using US Core and USCDI v3 or later; as of 2026-06-08, that date is future, so do not describe it as completed.
- Federal Register Health Technology Ecosystem RFI: https://www.federalregister.gov/documents/2025/05/16/2025-08701/request-for-information-health-technology-ecosystem. Published 2025-05-16, comments closed 2025-06-16, 1,366 comments listed; the RFI names clipboards and multiple portals as current patient experience pain.
- ONC Cures Act Final Rule page: https://healthit.gov/regulations/cures-act-final-rule/. Official ONC framing: standardized APIs, patient access to EHI, and information-blocking rules are the regulatory foundation KTC builds on.
- SMART Health Cards Framework: https://spec.smarthealth.cards/. Current framework version shown as 1.4.0; useful for explaining signed, portable FHIR-based artifacts.
- HL7 SMART Health Cards and Links IG v1.0.0: https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/. SMART Health Links support larger/evolving data, cloud retrieval, limited-time or long-term sharing, and PIN protection.
- SMART Health Check-in demo/repo: https://joshuamandel.com/smart-health-checkin-demo and https://github.com/jmandel/smart-health-checkin-demo. Local mapped post frames this as a pragmatic bridge inspired by W3C Digital Credentials API, using browser redirects/messaging now and DC-style request/response structures.
- W3C Digital Credentials API draft: https://wicg.github.io/digital-credentials/. Current active draft for browser-mediated credential presentation using `navigator.credentials.get()`.
- Chrome Digital Credentials API shipping note: https://developer.chrome.com/blog/digital-credentials-api-shipped. Chrome says the API is enabled by default from Chrome 141, supports same-device Android and cross-device desktop flows, and moved from `navigator.identity.get()` to `navigator.credentials.get()`.
- WebKit Safari 26 feature note: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/. WebKit says Safari 26.0 adds support for W3C Digital Credentials API; useful caveat that platform support is real but still identity/mdoc-shaped.
- Apple request mdocs on the web docs: https://developer.apple.com/documentation/identitydocumentservices/requesting-a-mobile-document-on-the-web. Apple documents `org-iso-mdoc` requests through the Digital Credentials API; relevant for "browser direction of travel," not for claiming FHIR support.
- James Cummings / Participatory Health paper: https://jopm.jmir.org/2025/1/e68261/PDF. Argues for consumer-managed longitudinal health records spanning clinical, genomic, nonclinical, wearable, and patient-generated data, with rare disease communities as a model.
- e-Patient Dave official site: https://www.epatientdave.com/. Current public profile for Dave's patient empowerment and health IT work; useful anchor for "Gimme My Damn Data" and patient voice framing.
- Relevant mapped GitHub repos: https://github.com/jmandel/smart-health-checkin-demo, https://github.com/jmandel/health-skillz, https://github.com/jmandel/cms-rfi-collab, https://github.com/jmandel/regulations.gov-comment-browser, and https://github.com/jmandell/shl-wallet. Use the first two in the talk; keep the RFI/comment-browser repos as backup context.

## What To Cut If Time Is Tight

- Cut browser standards detail. Say "the demo is DC-inspired; the implementation today uses pragmatic web redirects and messaging."
- Cut CMS history before 2025. Keep only: RFI -> pledges -> public Medicare/CMS KTC pages -> current implementation gap.
- Cut JSON field-level walkthrough. Show enough to prove FHIR is real, then return to workflow.
- Cut Health Skillz mention unless James or Dave brings up longitudinal aggregation or AI.
- Cut broad AI discussion. Keep AI only as a way to prefill, summarize, and expose patient corrections.
- Cut second audience prompt block. Use only "who can accept SHL today?" and "where does it land?"
- If the panel is strong, cut closing slides entirely and end with one commitment question: "What is the next thing each of you wants implemented so no patient has to type this again?"
