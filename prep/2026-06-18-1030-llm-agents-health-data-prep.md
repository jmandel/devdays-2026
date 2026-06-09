# Prep: LLM Agents with Health Data

## Core Audience Promise

By the end of 45 minutes, attendees should believe and be able to try this claim: a useful health-data agent does not require a giant integration platform. It needs a narrow access path, a clear local workspace, good instructions, and enough tooling for the model to inspect raw data instead of pretending a summary is the record.

The practical promise: bring a laptop, clone or download one of the mapped repos, run a skill or inspect its `SKILL.md`, and leave with a working pattern for letting an agent fetch, request, or analyze health data.

The opinionated thesis:

- FHIR is the live wire for near-term patient-mediated access.
- EHI Export is the deeper prize, but it arrives as a data-engineering problem, not a neat interoperability artifact.
- Skills are a better workshop primitive than MCP servers because people can read, copy, edit, and run them without installing infrastructure.
- MCP is still important, but treat it as a tool boundary, not the whole architecture.
- The agent should write code against local files and verify intermediate results. Do not stuff a medical record into context and hope.

## Big-Picture Mental Models

1. **Access rail vs. reasoning loop.** SMART on FHIR handles authorization and data retrieval; the agent loop handles exploration, code-writing, and synthesis. Keep these separate.
2. **USCDI is the preview pane; EHI Export is the warehouse.** FHIR/US Core data is standardized and reachable, but it is intentionally partial. EHI exports can include billing, operational history, messages, specialty tables, and the data that makes downstream AI interesting.
3. **A skill is executable documentation.** The `SKILL.md` is not a whitepaper. It is a portable operating procedure with scripts and references attached.
4. **The model is a junior data engineer with good bedside manner.** Give it files, grep, SQLite, parsers, and permission checkpoints. Make it show its work.
5. **Security is choreography.** OAuth login happens outside the agent; health data lands encrypted or local; high-risk actions like faxing require explicit user confirmation; generated clinical advice needs a human-in-the-loop frame.
6. **Mess is the demo.** Do not over-polish the EHI example. The point is that real exports are confusing, vendor-specific, and still analyzable when the agent can iterate.

## Proposed Deck Arc

| Slide/section | Goal | Visual/content idea | Speaker beat | Demo tie-in |
| --- | --- | --- | --- | --- |
| 1. Title: "Let's Build" | Signal workshop energy, not keynote energy | Terminal + browser + sample FHIR bundle on screen | "This is not a talk about agent futures. This is a talk about files, OAuth, and messy records." | Start with repo tabs open |
| 2. Why now | Show market timing | Split screen: ChatGPT Health, Claude for Healthcare, ONC EHIgnite | First-party AI products now acknowledge health records as agent context, but builders still need transparent tools | Cite product context in notes |
| 3. The architecture in one picture | Orient beginners | User -> SMART portal/EHI request -> local encrypted/export files -> agent sandbox -> code/tools -> answer | The access path and reasoning path are separate systems | Sketch on slide, then show folders |
| 4. Skills vs. MCP | Pick the workshop primitive | Two columns: `SKILL.md` folder vs MCP server | Skills are easiest to inspect and fork; MCP is best when you need durable services/tools | Open `SKILL.md` from Health Skillz or Request My EHI |
| 5. Project 1: Health Skillz | Demonstrate "FHIR + notes into the agent" | Repo: https://github.com/jmandel/health-skillz; flow diagram | SMART works today for a patient-facing app, even when national-network access feels overbuilt | Run or walk through Epic sandbox path |
| 6. Live build moment: ask a clinical-history question | Show agentic analysis, not chatbot summary | Prompt: "Build a timeline from notes and structured resources; cite source files." | The model should search, parse, write code, and correct itself | Use synthetic/Epic sandbox data if available |
| 7. Project 2: Request My EHI | Move from API access to legal/workflow access | Repo: https://github.com/jmandel/request-my-ehi; ten-step workflow | If there is no button, the agent can help exercise the right of access through existing bureaucracy | Generate draft package, stop before external submission |
| 8. Guardrails from the blooper reel | Make failure useful | "Premature faxing" as static artifact | The lesson is not "agents are unsafe"; it is "side-effect tools need explicit gates." | Show confirmation checkpoint |
| 9. Project 3: EHI export analysis | Show scale and mess | Repo: https://github.com/jmandel/ehi-export-analysis; dashboard: https://joshuamandel.com/ehi-export-analysis/ | Documentation quality is the product surface for patient autonomy | Query vendor metadata or inspect a parsed entity inventory |
| 10. Living manual preview | Turn mess into learnable paths | Repo: https://github.com/jmandel/ehi-living-manual; browser SQL examples | The next layer is community-curated maps over TSV/JSON exports | Open one SQL example |
| 11. Audience build choices | Let the room choose a lane | Three options: connect, request, analyze | Different people have different risk tolerance; all three teach the same pattern | Branch to exercise |
| 12. Discussion | Surface hard questions | Prompt list, not Q&A slide | "What would make you trust or distrust this in your own record?" | Capture questions for follow-up |

## Live Build / Demo Plan

Prioritize live build over slide polish. The best session shape is 10 minutes of framing, 25 minutes building/operating, 10 minutes discussion and rescue.

**Setup checklist**

- Local folders or browser tabs ready for:
  - https://github.com/jmandel/health-skillz
  - https://github.com/jmandel/request-my-ehi
  - https://github.com/jmandel/ehi-export-analysis
  - https://github.com/jmandel/ehi-living-manual
  - https://github.com/jmandel/health-record-mcp as the "older MCP-shaped version"
- A clean agent harness available: Claude.ai with Skills enabled, Claude Code, Codex, Cursor, or equivalent.
- A known synthetic or sandbox patient path. The Health Skillz post names Epic sandbox credentials, but do not rely on external sandbox availability as the only live path.
- Local static sample data: one FHIR bundle, one or two extracted clinical notes, one small EHI export directory or reduced TSV fixture, and a vendor metadata JSON from the EHI analysis project.
- Browser open to the skill download pages:
  - https://health-skillz.joshuamandel.com/skill.zip
  - https://request-my-ehi.joshuamandel.com
- A "no side effects" environment for Request My EHI. Disable or mock real fax submission unless you are explicitly demonstrating the confirmation gate.
- Terminal commands pre-tested for cloning, listing, and running whatever minimal scripts you plan to show.
- Backup screenshots/video for SMART login, record sync, generated PDF package, and EHI table exploration.

**Exact flow**

1. Open with the smallest viable architecture: "user authorizes or requests data; agent gets local files; agent writes code; user approves side effects."
2. Show `health-skillz` first. Open the repo and the skill instructions. Point out the key design choices: SMART on FHIR, clinical notes as plaintext, full-resource fetch, encryption boundary, local analysis.
3. Run the Health Skillz path if network and sandbox cooperate. Ask: "Find evidence for this condition across structured problems and notes; build a timeline with source references."
4. If the live SMART path stalls, switch immediately to the static FHIR/notes folder and keep the same prompt. The lesson survives without the OAuth theater.
5. Open `request-my-ehi`. Show the skill as a workflow over bureaucracy: identify provider, infer vendor, fetch vendor metadata, find PDF, fill/generate request, collect signature, generate cover letter, ask before submission.
6. Demonstrate one contained step live: have the agent draft the vendor-specific appendix for an Epic or athenahealth provider using the public EHI analysis data. Do not send anything.
7. Show the blooper lesson: a side-effect tool must have an explicit "show final artifact, get approval, then submit" step.
8. Open `ehi-export-analysis` and the dashboard. Show how agents handled 217 product families, custom parsing scripts, and converged on entity inventories.
9. Preview `ehi-living-manual`: "Once a patient receives 7,000 TSVs, the first useful product is a map plus runnable queries."
10. End by having attendees pick one exercise lane and start.

**Audience laptop path**

- Lowest friction: download a skill zip, inspect `SKILL.md`, and run it in an agent that supports skills or file/tool use.
- Developer path: clone `request-my-ehi` or `ehi-export-analysis`, run the local setup, and modify one prompt/script.
- Data path: use a provided sample export folder and ask the agent to build a table inventory, identify patient identifiers, and answer a constrained question with citations to files.
- Standards path: use SMART App Launch docs and a FHIR bundle to reason about scopes, launch context, and data gaps.

**Risks and fallback**

- SMART sandbox or portal login fails: use a static FHIR bundle plus notes and say clearly, "This is the same post-auth artifact."
- Claude/Codex skill support differs by attendee tool: fall back to opening `SKILL.md` as ordinary instructions plus scripts in a local folder.
- Network blocks GitHub or docs: have repo zips and sample data on a USB/local folder.
- Agent tries a side-effect action: stop and use it as the safety lesson. The workflow must require explicit confirmation before faxing, emailing, or submitting.
- Health data privacy discomfort: use synthetic/sandbox data for the room. Personal data is optional and not needed for the exercise.
- Model over-summarizes without inspecting files: prompt it to list files, run grep/SQL/code, and cite filenames before conclusions.

## Hands-On Exercise Options

Ranked for a 45-minute session:

1. **Best: Analyze a prepared FHIR + notes folder.** Fastest path to the core concept. Attendees ask an agent to inventory resources, search notes, compute a simple metric, and generate a cited timeline. Minimal auth risk, high learning value.
2. **Strong: Modify a `SKILL.md` workflow.** Pick Health Skillz or Request My EHI and add one guardrail, one better tool instruction, or one better fallback branch. Good for developers and prompt/tool designers.
3. **Strong: Vendor-specific EHI request appendix.** Use `request-my-ehi` and the EHI analysis vendor database to generate a cover-letter appendix for a named provider/EHR. Shows legal + technical context, but avoid real submission.
4. **Medium: EHI export table inventory.** Give a small TSV fixture and ask the agent to infer tables, keys, and candidate joins. Excellent for data people, but too slow if setup is not already solved.
5. **Medium: Build an MCP wrapper around a local record folder.** Useful for MCP enthusiasts, but not the main workshop path. Save for advanced attendees.
6. **Risky live: Connect a real patient portal.** Memorable when it works, but variable login, MFA, endpoint choice, and privacy concerns make it a presenter-only demo or after-session activity.

## Backup/Static Artifacts

- A 90-second screen recording of Health Skillz completing SMART authorization and downloading data.
- A small `sample-record/` folder with:
  - `fhir/` resources,
  - `notes/` plaintext clinical notes,
  - `README.md` with three suggested prompts.
- A redacted Request My EHI generated PDF package with the fax/send step disabled.
- A screenshot of the "premature faxing" failure and the corrected confirmation gate.
- A reduced Epic-style EHI export folder with 5-10 TSVs and a minimal data dictionary.
- A static slide showing: USCDI/FHIR = standardized subset; EHI Export = computable but often undocumented full record.
- Links to repos and dashboards:
  - Health Skillz: https://github.com/jmandel/health-skillz
  - Request My EHI: https://github.com/jmandel/request-my-ehi
  - EHI Export Analysis: https://github.com/jmandel/ehi-export-analysis and https://joshuamandel.com/ehi-export-analysis/
  - EHI Living Manual: https://github.com/jmandel/ehi-living-manual and https://joshuamandel.com/ehi-living-manual
  - Health Record MCP: https://github.com/jmandel/health-record-mcp

## Current Web Context and Citations

- OpenAI launched ChatGPT Health in January 2026, including optional medical-record and Apple Health connections; use this as market validation, not as the architecture to copy: https://openai.com/index/introducing-chatgpt-health/ and https://help.openai.com/en/articles/20001036-what-is-chatgpt-health
- OpenAI also positions GPT-5.5 as its current flagship for complex reasoning/coding and agentic work, with a 1M-token context window in the API docs: https://developers.openai.com/api/docs/models and https://developers.openai.com/api/docs/models/gpt-5.5/
- Codex currently documents skills as reusable workflow packages with `SKILL.md`, progressive disclosure, optional scripts/references, and availability across CLI, IDE extension, and app: https://developers.openai.com/codex/skills
- Codex MCP docs frame MCP as a way to connect models to tools/context, supporting stdio and streamable HTTP servers with config in `config.toml`: https://developers.openai.com/codex/mcp
- Anthropic introduced Agent Skills as folders with `SKILL.md`, scripts, and resources, based on progressive disclosure and now published as an open standard: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills and https://claude.com/docs/skills/overview
- Anthropic's Claude for Healthcare announcement says U.S. Pro/Max users can connect lab results and health records, and notes HealthEx/Function plus mobile health integrations; this reinforces patient-facing demand: https://www.anthropic.com/news/healthcare-life-sciences
- Anthropic's current model lineup context: Claude Opus 4.8 was introduced May 28, 2026 for coding, agentic tasks, and long-running work: https://www.anthropic.com/news/claude-opus-4-8
- MCP's official repo says the latest stable specification release is `2025-11-25`; as of June 8, 2026, treat the July 2026 spec material as release-candidate/future, not final: https://github.com/modelcontextprotocol/modelcontextprotocol and https://github.com/modelcontextprotocol/modelcontextprotocol/releases
- SMART App Launch v2.2.0 is the current published HL7 IG and describes OAuth-based authorization, launch context, discovery, and FHIR API access: https://hl7.org/fhir/smart-app-launch/ and https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html
- HL7 FHIR R5 remains the current published core FHIR release, while U.S. production patient-access APIs are still heavily R4/US Core based: https://hl7.org/fhir/versions.html
- US Core v9.0.0/STU 9 is now current, based on FHIR R4 and aligned with USCDI v6; relevant because the workshop should not imply US Core is frozen at old USCDI versions: https://www.hl7.org/fhir/us/core/ and https://www.hl7.org/fhir/us/core/changes-between-versions.html
- ASTP/ONC says USCDI v6 was released July 24, 2025, and Draft USCDI v7 was released January 29, 2026 with final v7 targeted for July 2026: https://www.healthit.gov/topic/standardsbulletin_25-2 and https://healthit.gov/standards-and-technology/onc-standards-bulletin/onc-standards-bulletin-2026-1/
- ONC's EHI Export criterion `170.315(b)(10)` requires single-patient and population exports of all EHI the product can store, in electronic computable format, with public format documentation; it does not prescribe a transport or data standard: https://www.healthit.gov/test-method/electronic-health-information-export
- ONC's certification-process page confirms products that store EHI must certify to `170.315(b)(10)`: https://healthit.gov/certification-health-it/certification-process/
- HHS OCR HIPAA guidance is the legal audience hook: individuals generally have access rights to PHI in designated record sets, including medical, billing, payment, claims, lab, imaging, and clinical notes: https://www.hhs.gov/hipaa/for-professionals/faq/2042/what-personal-health-information-do-individuals/index.html
- ONC's EHIgnite Challenge is a 2026 prize effort focused exactly on making single-patient EHI exports usable, readable, and actionable; this validates the EHI export analysis/living manual arc: https://healthit.gov/investments/onc-challenges-and-winners/ and https://public-inspection.federalregister.gov/2026-10068.pdf

## Frank Questions / Audience Prompts

- If an agent can read your full record, what should it be forbidden to do without a second explicit confirmation?
- Would you trust a beautiful answer that cites no source files? What citation standard should health agents meet?
- Is SMART on FHIR enough if clinical notes are missing or partial? Where does "patient access" become performative?
- Should a patient-facing app be able to request a full EHI export through the same SMART authorization ceremony as US Core data?
- Who is accountable when a certified EHI export is technically computable but practically uninterpretable?
- Is a `SKILL.md` file safer because it is inspectable, or more dangerous because it is executable persuasion?
- What belongs in MCP tools, and what belongs in plain files/scripts inside a skill?
- Should EHR vendors publish synthetic sample EHI exports, not just schemas?
- What is the minimum audit trail an agent should leave when analyzing a health record?
- When the agent finds an apparent clinical discrepancy, should it tell the patient first, the clinician first, or only frame it as a question for care teams?

## What To Cut If Time Is Tight

- Cut the detailed MCP comparison. Say: "MCP is a durable tool protocol; skills are today's workshop packaging."
- Cut the full EHI export pipeline internals. Keep one number and one screenshot: 217 product families, wildly different docs, agent-written parsers.
- Cut live SMART login if it takes more than three minutes. Switch to the post-auth sample folder.
- Cut the OpenAI/Anthropic product-market slides down to one "why now" slide.
- Cut EHIgnite details unless the room includes policy/ONC people.
- Cut any real-data participant exercise. Use the synthetic folder and protect the room's attention.
- Do not cut the side-effect confirmation lesson. It is the most concrete safety takeaway.
