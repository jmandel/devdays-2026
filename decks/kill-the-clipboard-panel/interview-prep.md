# Kill the Clipboard Panel: Moderator Prep

Session: Jun 16, 2026, 2:30 PM  
Panelists: Anthony Polizzi, James Cummings, Dave deBronkart  
Moderator framing: Keep the discussion concrete. Start from the handoff artifact and ask what it takes for this to work in an ordinary clinic on Tuesday.

## Moderator Goal

The audience should leave with a sharper definition of "Kill the Clipboard":

- Not a nicer portal form.
- Not "upload your record."
- Not a QR-code demo that lands in a media tab.
- A bounded, patient-mediated request/response pattern where structured facts, coverage, and Patient Story arrive early enough to be used.

The most useful tension to surface:

> The patient-app side can move faster than the receiving workflow side. The panel should name what breaks, who owns it, and what should be measurable next.

## Opening Frame

Use this sequence:

1. "Kill the Clipboard means patients can share selected health information from apps they already use."
2. "Patient-mediated does not mean patient-burdened. The patient should review, curate, and add context; software should handle extraction, formatting, and routing."
3. "The hard part is not making a QR code. The hard part is what happens after the clinic receives it."
4. "When we say trust, we need to ask: trusted for what action? Prefill? Review? Reconcile? Persist? Billing? Return a visit record?"

## Points To Emphasize

- **Two lanes are needed.** Structured facts matter: meds, allergies, problems, immunizations, visits, labs, coverage. The Patient Story also matters because the chart often misses the timeline, severity, goals, context, and "what changed."
- **Bounded requests beat data dumping.** The clinic should ask for specific artifacts and optionality. "Upload your record" shifts triage burden to staff.
- **Receiving workflow is the bottleneck.** If patient-shared data lands in a media tab or inbox without routing, reconciliation, status, or return-loop behavior, the clipboard survives.
- **Patient-originated does not mean untrusted.** Label provenance and review status instead of treating patient-mediated data as automatically suspect.
- **Equity is core product design.** Caregiver delegation, assisted workflows, low bandwidth, interrupted flows, language access, and no-new-hardware paths are part of the standard, not edge cases.
- **CMS can convene and signal, but adoption needs accountability.** Ask what metrics, pledge criteria, conformance tests, public scorecards, or policy hooks would distinguish real workflows from demos.
- **Clipboard has good UX properties.** It is familiar, portable, permissive, works without login, and lets humans annotate. Digital replacements must preserve the useful parts while removing retyping and recall.

## Panelist-Specific Question Bank

### Dave deBronkart

Use Dave for patient voice, burden, dignity, and the Patient Story.

- You have been saying "Give me my damn data" for years. Does Kill the Clipboard finally answer that, or does it risk turning access into another chore?
- What should a patient never have to type again?
- What is the difference between a Patient Story and a complaint typed into a portal text box?
- What would make you trust that the clinic actually used what you shared?
- What would make you walk out of a digital clipboard experience?
- If a clinician says, "I cannot trust data that came from an app," what is your answer?
- Should patients be able to see whether shared data was ignored, reconciled, corrected, or persisted?

Strong follow-up:

> What context is routinely lost when the system only asks for coded facts?

### James Cummings

Use James for the longitudinal/caregiver record, complex disease, and patient/caregiver as the aggregator of last resort.

- Where is the patient or caregiver the only realistic actor with incentive to maintain a complete longitudinal record?
- In rare or complex disease, what does the patient/caregiver know that the formal record usually misses?
- If a patient app aggregates EHR data, claims, labs, wearables, genomics, and notes, what should be shared at intake without overwhelming the clinic?
- What is the minimum useful record for a first visit?
- What should stay in the patient-controlled longitudinal record and not enter the EHR?
- Where can AI help prefill or summarize, and where is the failure mode too risky?
- Should AI-generated intake text be labeled differently from patient-authored story?

Strong follow-up:

> If the patient app produces a beautiful summary but the EHR cannot reconcile it, did we kill the clipboard or create a new inbox?

### Anthony Polizzi

Use Anthony for CMS role, pledge criteria, metrics, identity, and realistic implementation levers.

- What is the minimum real-world outcome CMS wants from Kill the Clipboard this year: fewer forms, accepted FHIR bundles, returned visit records, provider participation, or something else?
- What would count as failure even if many organizations sign the pledge?
- How should CMS distinguish a real workflow from a demo-only import queue?
- Are EHRs expected to persist reconciled PAMI data, or is view-at-check-in enough for the first wave?
- How will CMS avoid identity proofing becoming the new clipboard?
- What is the caregiver/delegation path?
- If adoption stalls, what levers are plausible: regulation, procurement criteria, public scorecards, star ratings, complaint channels, certification, or none of the above?
- How should CMS measure whether patient-shared data actually reduced burden?

Strong follow-up:

> When CMS says "voluntary ecosystem," what should the public still be able to expect from a pledged participant?

## Cross-Panel Categories

### What Counts As Real Adoption?

- Is accepting a QR code enough?
- Is accepting a SMART Health Link enough?
- Does it need to route to the right staff?
- Does it need to prefill intake?
- Does it need clinician review and reconciliation?
- Does it need to return a FHIR visit record?
- What is the minimum measurable behavior for 2026?

### Trust For What Action?

Ask panelists to separate:

- Prefill only
- Staff review
- Clinician review
- Chart persistence
- Order support
- Billing or quality reporting
- Return-loop artifact back to the patient

Follow-up:

> What label should data carry at each stage: patient-authored, patient-aggregated, source-verified, clinician-reviewed, reconciled?

### Patient Story

- How do we preserve patient wording without forcing clinicians to read a wall of text?
- Should story be attached to the encounter, triage note, referral packet, or patient-entered history?
- What parts should be structured after review, and what parts should remain narrative?
- Can a patient edit the story after sharing?
- Should caregiver-authored story be labeled separately?

### Receiver Workflow

- Where does the payload land today?
- Who gets alerted?
- Who reviews conflicts?
- What should auto-prefill but not persist?
- What should never auto-persist?
- What status should be visible to the patient?
- What is the fallback if reconciliation fails?

### Equity And Delegation

- What is the non-smartphone path?
- What is the assisted front-desk path?
- What happens when a patient has no portal login?
- How does caregiver authority work?
- How do we avoid requiring IAL2/AAL2 ceremony for every low-risk interaction?
- What should be available in multiple languages or plain language?

### Business And Accountability

- Who benefits financially if clipboard burden falls?
- Who pays for receiving-side workflow?
- What incentives make EHRs prioritize this?
- What incentives make clinics trust and use data before the visit?
- What public metric would be hard to game?

## Difficult Or Adversarial Questions To Anticipate

- "Isn't this just replacing a paper clipboard with a digital clipboard?"
  - Answer direction: Only if we recreate portals and uploads. The meaningful change is bounded request, patient-controlled response, prefill/reconciliation, and visit-record return.

- "Why should clinicians trust patient-shared data?"
  - Answer direction: Do not ask for blanket trust. Ask trusted for what action. Use provenance, source labels, review states, and conflict handling.

- "Who is liable if the patient shares stale or wrong data?"
  - Answer direction: Same question exists for outside records and patient history today. The improvement is explicit provenance, source, timestamp, and review status.

- "Won't this flood clinicians with junk?"
  - Answer direction: That is the receiving-side design problem. Bounded requests, routing metadata, summaries, reconciliation queues, and status labels are required.

- "Aren't QR codes and SMART Health Links too technical for patients?"
  - Answer direction: Patients should not have to understand them. The UX should be app-like: request, review, share. QR/SHL are transport artifacts.

- "Is CMS going to mandate this?"
  - Answer direction: Do not overstate. Current framing is ecosystem, pledges, criteria, app library, and convening; ask Anthony what accountability could follow.

- "What about people without smartphones, portals, or broadband?"
  - Answer direction: Equity cannot be deferred. Assisted flows, caregiver delegation, printable backup, phone-based support, and no-new-hardware receiving paths need to be designed in.

- "What stops payers or clinics from asking for too much?"
  - Answer direction: Bounded requests, purpose of use, patient review, minimization, and refusal/optional fields. The design should make over-collection visible.

- "Can a provider refuse patient-shared data and still claim to kill the clipboard?"
  - Answer direction: Press the panel. If refusal means "we cannot use it," the pledge is hollow. If refusal means "we need status labels and reconciliation," that is an implementation requirement.

- "Why not just fix the portals?"
  - Answer direction: Portals are organization-bound. KTC needs patient-mediated exchange across systems and visits, including first visits and new care teams.

- "Is AI required?"
  - Answer direction: No. AI can help summarize and prefill from longitudinal records, but the protocol should work with deterministic FHIR and patient-authored narrative.

## Audience Prompts

- "Raise your hand if your organization can accept a patient-shared SMART Health Link today. Keep it up if it lands somewhere better than a media tab."
- "What is the first thing you would trust enough to prefill but not persist: coverage, meds, allergies, problems, immunizations, or reason for visit?"
- "Clinicians: what label would make patient-shared data usable instead of scary?"
- "Patients and caregivers: what is the one thing you are tired of retyping?"
- "EHR/product folks: what one 2026 metric would be fair and hard to game?"

## Moderator Tactics

- Ask for concrete failure modes, not generic optimism.
- When someone says "workflow," ask who clicks, who reviews, and where it lands.
- When someone says "trust," ask trusted for what action.
- When someone says "patient-generated," separate patient-authored story, patient-aggregated clinical data, and patient-measured/device data.
- When someone says "CMS should require," ask what the lever is and what the minimum measurable criterion would be.
- Keep returning to the frozen demo payload: "What would it take for this to be useful tomorrow morning?"

## Best Closing Question

> What is the next thing each of you wants implemented so no patient has to type this again?

## Source Notes

- CMS Kill the Clipboard page: https://www.cms.gov/health-tech-ecosystem/early-adopters/kill-the-clipboard
- Medicare.gov app explainer: https://www.medicare.gov/health-apps/kill-clipboard
- CMS Health Technology Ecosystem categories: https://www.cms.gov/health-technology-ecosystem/categories
- SMART Health Check-in demo: https://joshuamandel.com/smart-health-checkin-demo
- SMART Health Check-in repo: https://github.com/jmandel/smart-health-checkin-demo
- Health Skillz repo: https://github.com/jmandel/health-skillz
- Relevant local prep: `../../prep/2026-06-16-1430-kill-the-clipboard-prep.md`
