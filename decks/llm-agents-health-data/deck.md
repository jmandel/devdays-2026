# Let's Build: LLM Agents With Health Data

Session: LLM Agents for Health Data: Let's Build  
Scheduled: Jun 18, 2026, 10:30 AM  
Speaker: Josh Mandel

This deck is a workshop-first, image-based deck. Slides set up the mental models, then point directly into live builds using Health Skillz, Request My EHI, and the EHI export skills.

## Core Thesis

A useful health-data agent does not need to start as a giant integration platform. It needs a narrow access path, a local workspace, clear instructions, and tools that let it inspect raw data and verify intermediate claims.

The practical promise for the room: bring an agent, a laptop, a repo or skill, and a willingness to inspect messy source files. We will build from the data outward.

## Deck-Level Visual Direction

Use a clean workshop workbench style:

- White canvas with subtle notebook/grid texture.
- Large direct title at top-left, consistent across slides.
- Sparse cards representing browser pages, local folders, terminal panes, SQLite tables, and `SKILL.md`.
- Thin connectors in blue, green, amber, and purple.
- Monospace chips for commands, paths, resource names, and repo URLs.
- Bottom progress rail with four phases: `connect`, `request`, `analyze`, `build`.
- No logos as recurring decoration.
- No generic AI robot imagery, fake hospital brands, fake EHR dashboards, or unreadable pseudo-code.

## Slides

1. **Let's Build: LLM Agents With Health Data**  
   Open as a workshop, not a keynote. The visual should show a laptop workbench with three real build lanes: `health-skillz`, `request-my-ehi`, and `EHI export skills`.

2. **The Smallest Useful Architecture**  
   Separate the access rail from the reasoning loop: patient authorization or request produces local files; the agent reads `SKILL.md`, runs scripts, inspects evidence, and writes cited output.

3. **A Skill Is Executable Documentation**  
   Show the skill bundle as inspectable source: `SKILL.md`, `scripts/`, `references/`, `examples/`, and guardrails. Show CLI tools, scripts, and `curl` as the practical execution surface.

4. **Project 1: Health Skillz Connects To Patient Portals**  
   Show SMART on FHIR authorization through patient portal login, encrypted handoff, local decrypted provider JSON files, and the agent analyzing FHIR resources plus note attachments. Link: `https://health-skillz.joshuamandel.com`.

5. **Live Build: Make The Agent Show Its Work**  
   Demo beat: ask for a clinical timeline or medication story; force the agent to list files, search structured resources, inspect notes, write a small script, verify, and cite source paths.

6. **Project 2: Request My EHI**  
   Show provider/EHR lookup, ROI form, patient details, vendor appendix, cover letter, and a ready-to-submit PDF package. Link: `github.com/jmandel/request-my-ehi`.

7. **Guardrail: Side Effects Need An Explicit Gate**  
   Show the distinction between drafting and acting: generate, preview, user approves, then optionally submit/fax. The slide should make approval look like a real workflow step, not a footnote.

8. **USCDI Is The Preview Pane; EHI Export Is The Warehouse**  
   Compare FHIR/US Core patient-mediated data with full EHI export: thousands of TSV tables, schema docs, Rich Text, Media, clinical, scheduling, billing, and operational data.

9. **Preview Skill: Read An Epic EHI Export**  
   Show the first productive loop: load TSVs and schema into SQLite; query `_tables`, `_schema_table`, `_schema_column`; inspect real columns with `PRAGMA`; cast TEXT before sorting.

10. **Preview Skill: Build An EHI Deep Dive**  
    Show `STORYBOARD.md`, `viewmodel.json`, `BUILD.md`, `parts/`, and a static app. The core loop is `EXTRACT -> ENRICH -> SYNTHESIZE`, with traceability back to source files.

11. **Pick A Build Lane**  
    Four lanes for the audience: connect live portal data, request complete EHI, analyze an export, or edit a skill. Each lane should have one command or prompt starter.

12. **Rules For Useful Health-Data Agents**  
    Close with practical rules: keep data local when possible, cite files, write code, verify intermediates, respect uncertainty, gate side effects, and turn findings into better questions.

## Demo Links And Repos

- Health Skillz app: https://health-skillz.joshuamandel.com
- Health Skillz repo: https://github.com/jmandel/health-skillz
- Health Skillz skill download: https://health-skillz.joshuamandel.com/skill.zip
- SMART Launcher: https://launch.smarthealthit.org/
- Request My EHI repo: https://github.com/jmandel/request-my-ehi
- EHI export analysis repo: https://github.com/jmandel/ehi-export-analysis
- EHI living manual repo: https://github.com/jmandel/ehi-living-manual
- EHI export skill preview: local workshop skills, not yet published as a standalone repo.

## Demo Run Of Show

1. Frame the architecture: access rail vs reasoning loop.
2. Install or show a skill and read `SKILL.md` in the agent workspace.
3. Use Health Skillz with the Epic sandbox patient if live portal data is needed.
4. Ask the agent to analyze health data using local files and source citations.
5. Use Request My EHI to create a request package from provider and patient details.
6. Show the explicit approval gate before any send/fax action.
7. Preview EHI export loading and deep-dive workflow if time allows.

## Claims To Keep Honest

- SMART on FHIR and Health Skillz are access rails; the agent still needs local reasoning discipline.
- EHI Export is not a patient portal summary, CCDA, or ordinary release packet.
- EHI export structure varies by vendor; Epic examples use TSV plus schema HTML and Rich Text/Media.
- Skills are inspectable and forkable; the workshop execution surface is CLI tools, scripts, and HTTP calls.
- Agents should not diagnose, submit requests, fax, email, or upload PHI without explicit user approval.
- A good answer should cite evidence and uncertainty, not merely summarize the record.
