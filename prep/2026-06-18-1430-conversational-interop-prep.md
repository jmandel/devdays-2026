# Prep: Conversational Interop

## Core Audience Promise

By the end of the session, the audience should believe one concrete thing: conversational interoperability is not "LLMs instead of standards"; it is late-bound structure on top of standards.

FHIR, SMART, CDS Hooks, Da Vinci, and X12 are still the durable rails. The new move is to stop pretending every long-tail workflow can justify a bespoke implementation guide, pre-negotiated data model, and synchronous request/response contract. For prior auth edge cases, rare disease registries, specialist referrals, trial matching, and messy EHI exports, the exchange often fails because the parties do not know exactly what the other party needs until they start working the case.

The promise:

- Standards people leave with a complementary architecture, not a replacement story.
- Builders leave with a runnable testbed: Banterop (`https://github.com/jmandel/banterop`, hosted at `https://banterop.fhir.me/`).
- Clinicians and workflow people leave with a UX pattern: a liaison agent manages an async task, asks for human input only when needed, and keeps a transparent transcript.
- Skeptics leave with the right objections: identity, authorization, auditability, prompt reliability, adversarial counterparties, and when conversational behavior should be forbidden.

The phrase to repeat: "The long tail needs a protocol for negotiating the shape of the work, not another 200-page specification for every corner case."

## Big-Picture Mental Models

1. **Late-bound structure**
   The agents are not "just chatting." They converse to discover requirements, then produce structured artifacts when the task needs them: JSON evidence packages, FHIR Bundles, QuestionnaireResponses, registry payloads, referral summaries, or provenance receipts. Structure still matters; it is generated at the point of need.

2. **Three-layer stack**
   - FHIR/SMART: access to authoritative clinical facts, notes, provenance, and authorization context.
   - MCP: agent-to-tool access, especially local or provider-trusted tools like `grep_record`, SQL query, and code execution over a patient record (`https://github.com/jmandel/health-record-mcp`).
   - A2A: agent-to-agent task dialogue across organizational boundaries. A2A's official docs frame it as agent-to-agent communication, complementary to MCP's agent-to-tool role (`https://a2a-protocol.org/latest/`).

3. **Banterop as the flight simulator**
   Banterop should be explained as a neutral, inspectable counterparty for agent conversations, not as the standard itself. It lets a developer bring an A2A or MCP client/server and test against simulated payer, registry, trial, referral, or guideline agents (`https://github.com/jmandel/banterop`).

4. **Async is a feature, not a defect**
   A two-second API call is the wrong design target for many clinical admin tasks. A liaison agent can take minutes or hours to search notes, run code, inspect an EHI export, ask a clinician one targeted question, and return a better answer. FHIR Task already has the vocabulary for long-running workflow state, queues, inputs, outputs, failure, and resumption (`https://hl7.org/fhir/R5/task.html`).

5. **Information asymmetry is the real enemy**
   Many workflows involve one side with patient context and another side with private rules: payer policy, trial protocol, registry criteria, facility intake rules. Conversational interop makes the asymmetry explicit and negotiable.

6. **Trust is the thin waist**
   The protocol payload can be flexible, but trust cannot be vague. The minimum serious architecture needs agent identity, organization identity, delegated authority, purpose of use, auditable turns, evidence provenance, and revocation/appeal paths. Without this, COIN becomes a faster fax machine with hallucinations.

## Proposed Deck Arc

| Slide/Section | Goal | Visual/Content Idea | Speaker Beat | Demo Tie-In |
| --- | --- | --- | --- | --- |
| 1. Title: Toward Conversational Interop | Frame the thesis fast. | One diagram: clinician agent, payer/registry agent, FHIR record, conversation transcript, structured output. | "This is not FHIR vs. AI. This is FHIR plus agents for the workflows FHIR alone cannot economically pre-specify." | Point to Banterop as today's live testbed. |
| 2. The standards success story | Establish credibility with traditional interop. | SMART, FHIR, CDS Hooks, Da Vinci timeline. | "The core APIs worked. We should not throw them away." | Mention `health-record-mcp` uses SMART on FHIR before MCP. |
| 3. Where rigid schemas run out | Name the long-tail problem. | Scatter plot: high-volume/core workflows vs. low-volume/high-variation workflows. | "Some workflows deserve IGs. Some deserve a conversation." | Preview scenario menu. |
| 4. Prior auth as the stress test | Use a problem everyone recognizes. | CRD -> DTR -> PAS flow beside a messy notes-and-questions transcript. | "Da Vinci is the right center of gravity for mainstream ePA. COIN is for the places where requirements and evidence are still negotiated." | Primary demo is prior auth. |
| 5. Late-bound structure | Kill the "unstructured chat" misunderstanding. | Transcript turning into JSON evidence with source citations and optional FHIR references. | "The output can be more structured than today's fax. The difference is when the structure is chosen." | Show Banterop artifact generation. |
| 6. Protocol roles | Clarify A2A vs MCP vs FHIR. | Three-layer stack: FHIR/SMART data, MCP tools, A2A conversation. | "MCP is how my agent uses my tools. A2A is how my agent talks to your agent." | Open Banterop endpoint docs / Agent Card. |
| 7. Designing for delay | Make async respectable. | EHR order row with quiet status, needs-input state, transcript panel, completion. | "Clinical UX should not spam the clinician every time an agent takes a turn." | Show task state in Banterop; relate to FHIR Task. |
| 8. Live Banterop demo | Prove this is buildable. | Browser UI, room, reference client, transcript, agent card. | "Watch what is fixed by protocol, and what is negotiated in language." | Run prior auth or registry. |
| 9. What can go wrong | Earn trust by naming risks. | Failure taxonomy: loops, prompt injection, adversarial agents, bad evidence, over-disclosure, brittle protocol versions. | "The demo is not the finish line. It is a way to find failure modes cheaply." | Show fallback transcript if live run misbehaves. |
| 10. Call to action | Give builders next steps. | Repo links and audience prompts. | "Bring a client, bring a server, bring an ugly workflow." | Banterop, health-record-mcp, ehi-export-analysis. |

## Live Demo Plan

### Primary Demo: Banterop Prior Auth, A2A First

Use prior auth as the main live demo because the audience will immediately understand why simple fixed fields are insufficient, and the regulatory context is current. CMS-0057-F requires operational process changes beginning in 2026 and Prior Authorization API implementation beginning in 2027 (`https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f`). ONC's 2026 proposed standards update points to newer Da Vinci CRD/DTR/PAS versions (`https://healthit.gov/resources/onc-proposals-in-cms-interoperability-and-prior-authorization-for-drugs-proposed-rule/`).

Setup:

- Preferred: hosted Banterop at `https://banterop.fhir.me/`.
- Local backup:
  - `git clone https://github.com/jmandel/banterop`
  - `cd banterop`
  - `bun install`
  - set `BANTEROP_DB=./banterop.sqlite`
  - set one LLM provider key if needed, e.g. `GOOGLE_API_KEY` or `OPENROUTER_API_KEY`
  - `bun run dev`
  - open `http://localhost:3000`
- Have the Banterop repo README open to the A2A/MCP connector section (`https://github.com/jmandel/banterop`).
- Have a prerecorded run and a static transcript ready before the talk.

Exact flow:

1. Open Banterop and choose a prior-auth scenario with a payer agent holding private coverage criteria.
2. Show the room setup and the simulated counterparty's private knowledge. Emphasize that in real life the provider agent should not see the payer's private policy internals, but the testbed is inspectable for debugging.
3. Show the Agent Card URL or A2A endpoint. The key discovery concept is `.well-known/agent-card.json`, which the A2A spec uses for discovering an agent's capabilities and interfaces (`https://github.com/a2aproject/A2A/blob/main/docs/specification.md`).
4. Start the provider-side/client-side exchange: "Request prior authorization for lumbar MRI for a patient with chronic low back pain and new neurologic symptoms."
5. Let the payer agent ask for requirements: duration of symptoms, conservative therapy, red flags, prior imaging, exam findings, and relevant notes.
6. The provider/liaison agent replies with what it can find, then produces a structured evidence package. The important move is not the exact JSON shape; it is that the shape emerges from the policy conversation.
7. Force one "needs input" moment if possible: the payer asks for documentation the provider agent cannot derive with confidence. Show the liaison pausing and asking the clinician a narrow question.
8. Resume and end with either approval or a specific missing-evidence reason. If it approves, say explicitly: "In healthcare, AI should help assemble the strongest truthful case for approval; it should not be a black-box denial machine."
9. Show the transcript and artifact as the audit object: every claim should trace to a turn, FHIR resource, note quote, or human answer.

Speaker beats during the demo:

- "The protocol fixes the envelope: discovery, task identity, message turns, status, artifacts."
- "The agents negotiate the payload: what evidence is necessary, what format is acceptable, what ambiguity remains."
- "FHIR still matters because the answer needs provenance. If the agent cannot point back to the record, it is just prose."
- "The UI pattern is a work queue, not a chat window glued onto the EHR."

Risks:

- LLM loops or gets verbose.
- Payer agent becomes too adversarial and eats the clock.
- A2A version drift or endpoint mismatch.
- Hosted Banterop or model provider latency.
- Audience focuses on whether this should decide coverage rather than the interop pattern.
- Live JSON/artifact is not clean enough to read on screen.

Fallback:

- Switch to a preselected static transcript showing the same turns.
- Use Banterop manual-control mode and narrate the agent's intended next turn.
- Use the Banterop README/architecture and a captured transcript if live endpoint access fails.
- If prior auth becomes too contentious, pivot to the rare disease registry demo, which makes the same technical point with less adversarial energy.

### Secondary Demo: Rare Disease Registry

This is the cleanest "long tail" demo. A registry agent returns dynamic reporting requirements for a niche condition; the clinical agent extracts what it can from FHIR and notes; missing items are highlighted for human input. It directly echoes the HL7 Connectathon story: registry requirements are too numerous and specialized to pre-build in every EHR, but they can be discovered conversationally.

Exact flow:

1. Registry agent: "For Duchenne muscular dystrophy reporting, provide diagnosis codes, genetic testing, functional status, medications, vitals, family history, and recent encounters."
2. Clinical agent: "I can provide FHIR-derived conditions, observations, meds, and notes-derived narrative. I need clinician confirmation for family history."
3. Structured output: registry JSON or FHIR Bundle plus gaps list.
4. Human input: one missing field.
5. Final registry submission package.

Why it works:

- Better than prior auth for showing "agents structuring the long tail."
- Less likely to provoke payer-policy debate.
- Lets you make the "discovery tool" point: a clinical system could ask many registry agents what is reportable for this patient.

### Tertiary Demo: EHI Export Async Query

Do not make this the main live demo unless the local data is ready and deterministic. Use it as a static artifact or thought experiment. The key lesson from `https://github.com/jmandel/ehi-export-analysis` is that agents can navigate wildly divergent documentation, write parsers, and converge on comparable structured outputs. For talk 5, the punchline is: "When the answer can take an hour, the agent can do work no synchronous API would even attempt."

Possible ask:

"Given a full EHI export, identify the last three HbA1c values, summarize diabetic retinopathy evidence in notes, and package the answer for a referral or registry."

Risks:

- Too much setup.
- Too far from A2A.
- Audience may see it as data science rather than interop.

Fallback use:

- One screenshot of the EHI dashboard and one transcript of an agent writing a parser.
- Use it to justify async work and late-bound structure, not to carry the talk.

## Scenario Menu

1. **Prior authorization**
   Best primary scenario. Everyone understands the pain; CMS timelines make it current; Da Vinci CRD/DTR/PAS gives a standards anchor; adversarial behavior exposes real governance questions. Risk: can become a policy debate. Keep the framing: "get to yes faster, never automate denials."

2. **Rare disease registry**
   Best pure COIN scenario. The long-tail economics are obvious: thousands of registries and edge criteria cannot each get deep EHR integration. Strong visual: requirements discovered on the fly, FHIR pulls what it can, gaps go to a clinician.

3. **Specialist referral**
   Best clinical workflow scenario. Good for self-healing exchanges: referrer sends imperfect JSON, specialist asks for text or missing attachments, agents negotiate enough to book or triage. Strong if the audience includes EHR builders.

4. **Trial matching**
   Best bidirectional agent-to-agent scenario. A trial agent has inclusion/exclusion criteria; a clinical agent has patient facts; either side can act as client or server. Good for showing A2A symmetry and private knowledge. Risk: trial eligibility can get medically nuanced fast.

5. **EHI export async query**
   Best async mental model. It makes "time as a resource" vivid: an agent can spend substantial time reading undocumented tables, notes, and files, then return a structured answer. Use as a static artifact unless you have a deterministic local slice.

6. **Discharge to facility / bed availability**
   Good operational scenario with many counterparties: payer, facility, transportation, family preference, clinical constraints. Risk: too many moving parts for 45 minutes.

7. **FMLA / disability / psychotherapy admin forms**
   Strong clinician-burden story. Good for small practices. Risk: less obvious inter-organizational standards hook unless paired with an external form-review agent.

8. **Scheduling**
   Useful as a light demo, especially with third-party APIs, but less distinctive for this talk. Keep as backup, not the headline.

## Backup/Static Artifacts

- A one-page architecture diagram:
  - provider EHR and FHIR/SMART data access
  - provider liaison agent
  - MCP tools over local record
  - A2A conversation to payer/registry/trial/referral agent
  - structured artifact and audit transcript
- Banterop screenshots:
  - scenario list
  - room view
  - Agent Card / A2A endpoint
  - transcript with task states
  - generated JSON artifact
- Static prior-auth transcript:
  - initial request
  - payer asks for criteria
  - provider sends evidence package
  - payer asks for one missing detail
  - liaison asks clinician
  - final approval or precise missing-evidence response
- Static rare-disease registry transcript:
  - registry requirements
  - extracted FHIR data
  - gaps in family history/genetics
  - final package
- One EHI export slide:
  - "Agents wrote parsers because the export was not designed for humans or APIs."
  - Link: `https://github.com/jmandel/ehi-export-analysis`
  - Dashboard link: `https://joshuamandel.com/ehi-export-analysis/`
- Repo links slide:
  - Banterop: `https://github.com/jmandel/banterop`
  - Health Record MCP: `https://github.com/jmandel/health-record-mcp`
  - EHI Export Analysis: `https://github.com/jmandel/ehi-export-analysis`
  - MCP specification: `https://modelcontextprotocol.io/specification/2025-11-25`
  - A2A docs: `https://a2a-protocol.org/latest/`
- Pre-recorded clips:
  - 60-second Banterop prior-auth happy path.
  - 60-second Banterop registry path.
  - 30-second "agent loops / failure mode" clip if you want to normalize imperfection.

## Current Web Context and Citations

- A2A official docs: `https://a2a-protocol.org/latest/` - As of June 8, 2026, A2A is described as an open standard for communication and collaboration between AI agents, originally developed by Google and donated to the Linux Foundation.
- A2A specification repo: `https://github.com/a2aproject/A2A/blob/main/docs/specification.md` - Useful details for the deck: opaque agents, multimodal parts, multi-turn context/task continuity, `.well-known/agent-card.json` discovery, optional signed Agent Cards, and security guidance.
- MCP latest stable spec: `https://modelcontextprotocol.io/specification/2025-11-25` - Treat `2025-11-25` as the current stable MCP specification unless you intentionally target the release candidate.
- MCP 2026 roadmap: `https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/` - Current priorities are transport scalability, agent communication, governance maturation, and enterprise readiness; good support for "this is moving from local tools into production infrastructure."
- MCP 2026-07-28 release candidate: `https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/` - Published May 21, 2026; final publication is scheduled for July 28, 2026, so describe it as an RC, not the stable spec. Important themes: stateless core, Tasks extension, MCP Apps, OAuth/OIDC-aligned authorization, and deprecation policy.
- MCP joins Agentic AI Foundation: `https://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/` - Official governance context: Anthropic donated MCP to the Linux Foundation's Agentic AI Foundation, with broad industry support.
- Banterop repo: `https://github.com/jmandel/banterop` - The README positions Banterop as a testbed for conversational interoperability, with both MCP and A2A modes and built-in scenarios.
- Banterop hosted service: `https://banterop.fhir.me/` - Live demo target; have local fallback.
- Health Record MCP repo: `https://github.com/jmandel/health-record-mcp` - Shows the concrete SMART on FHIR plus MCP pattern: fetch structured data and notes, expose `grep_record`, `query_record`, and `eval_record` tools.
- EHI Export Analysis repo: `https://github.com/jmandel/ehi-export-analysis` - Supports the async-agent claim: agents can navigate heterogeneous documentation, write custom parsers, and converge on structured outputs.
- EHI Export Analysis dashboard: `https://joshuamandel.com/ehi-export-analysis/` - Static artifact for the "agent spends an hour" async story.
- HL7 Da Vinci PAS IG: `https://hl7.org/fhir/us/davinci-pas/STU2.1/index.html` - PAS enables direct prior-auth request submission using FHIR, especially in combination with CRD and DTR; use this to say COIN complements, not replaces, Da Vinci.
- ONC 2026 proposed standards update: `https://healthit.gov/resources/onc-proposals-in-cms-interoperability-and-prior-authorization-for-drugs-proposed-rule/` - ONC proposed CRD 2.2.1, DTR 2.2.0, PAS 2.2.1, and related payer API standards, with older versions expiring by January 1, 2028 where applicable.
- CMS-0057-F fact sheet: `https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f` - Operational prior-auth provisions generally begin in 2026; Prior Authorization API implementation begins in 2027; decisions must be returned within 72 hours for expedited requests and seven calendar days for standard requests.
- HL7 FHIR Task: `https://hl7.org/fhir/R5/task.html` - Useful standards anchor for async workflows: Task tracks state, queues work, supports inputs/outputs, and can be polled or subscribed to by agents.
- HL7 News on FHIR and agentic AI: `https://hl7news.hl7.org/2026/01/07/relevance-of-hl7-fhir-standards-in-the-age-of-agentic-ai/` - Good recent HL7-facing framing: FHIR APIs provide plumbing and consistent data, while agentic AI provides adaptive workflow reasoning.
- 21st Century Cures Act text: `https://www.govinfo.gov/content/pkg/PLAW-114publ255/html/PLAW-114publ255.htm` - The statutory language explicitly references access, exchange, and use of health information "without special effort" through APIs or successor technology or standards.

## Frank Questions / Audience Prompts

- Where should healthcare draw the line between "agent negotiates payload shape" and "this must be a fixed implementation guide"?
- If an agent invents a JSON evidence package during a prior-auth exchange, what makes that package auditable enough to trust?
- Do we need healthcare-specific A2A profiles, or should healthcare stay out of the base protocol and define only trust, identity, purpose-of-use, and provenance conventions?
- What is the right denial guardrail? Is "AI can accelerate approvals but not issue denials" enough, or is that too simplistic?
- Who is accountable when two agents agree on a misinterpreted requirement: the requester, the responder, the model vendor, the implementer, or the organization operating the agent?
- How should a patient see, approve, or revoke agent-mediated disclosures that happen over many turns?
- What should an Agent Card disclose publicly, and what should only appear after authentication?
- Is a transcript a medical/legal record? If yes, where does it live: EHR, payer system, HIE, patient app, or a separate audit service?
- Are we comfortable with agents using unstructured notes as evidence, or do we need a provenance and quotation discipline before this is acceptable?
- What failure mode scares you more: agents that over-share, agents that fabricate structure, or agents that silently fail to ask a human?
- How much interoperability work should be spent on standardizing payloads versus standardizing testbeds and adversarial evaluation?
- What is the first long-tail workflow your organization would be willing to test with a simulated counterparty?

## What To Cut If Time Is Tight

Cut in this order:

1. EHI export details. Keep one sentence: "Async agents can do long-running data archaeology that no synchronous API should attempt."
2. Scheduling and facility-placement scenarios. They are useful but distract from the core A2A/MCP/COIN thesis.
3. Detailed MCP roadmap. Mention only stable spec, RC, and "MCP is agent-to-tool."
4. Full Cures Act successor-technology framing. Keep the phrase "without special effort" only if you need policy oxygen.
5. Secondary demo. If the prior-auth demo works, do not also run registry live; show one static registry screenshot instead.
6. Deep Da Vinci mechanics. The audience likely knows CRD/DTR/PAS; use them as an anchor, not a tutorial.
7. Long failure taxonomy. Keep the top three: identity/authorization, evidence provenance, adversarial or looping agents.

Do not cut:

- The "late-bound structure" definition.
- The FHIR/MCP/A2A separation of concerns.
- Banterop as a live or static artifact.
- At least one concrete transcript showing agents negotiating requirements and producing structured output.
