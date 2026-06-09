# Visual Brief: LLM Agents With Health Data

## Overall Direction

This should feel like a serious hands-on workshop: practical, inspectable, and local-first. The viewer should understand that the agent is doing data work in a workspace, not magically absorbing a medical record.

Primary motif: a laptop workbench with file folders, `SKILL.md`, terminal commands, SQLite tables, and browser cards.

Secondary motifs:

- Patient portal authorization and SMART/FHIR data handoff.
- Request packet assembly: cover letter, form, appendix, approval gate.
- EHI export warehouse: TSV files, schema docs, Rich Text, Media.
- Agent reasoning loop: inspect, script, verify, cite.

## Palette

- Background: `#FFFFFF`
- Primary text: `#1F2328`
- Muted text: `#6B7280`
- Linework: `#D6DEE8`
- SMART/FHIR blue: `#2B78C5`
- Trust green: `#48A868`
- Workflow amber: `#F2A23A`
- Agent purple: `#7A3E91`
- Caution red: `#D84747`
- Terminal charcoal: `#24292F`

## Typography And Layout

- Slide titles: heavy, clean sans serif, top-left, same margin and size on every slide.
- Body labels: simple sans serif, medium weight.
- Commands and repo paths: monospace chips with high contrast.
- Use the same bottom progress rail on every slide after the title slide: `connect`, `request`, `analyze`, `build`.
- Keep density suitable for projected workshop slides. More concrete than a keynote, less crowded than a README.

## Reference Roles For Image Generation

When generating images:

- Use the first approved title/workbench slide as the typography and layout reference for slides 2-12. Copy title placement, margin system, chip style, line weight, white canvas, and bottom progress rail. Do not copy its content.
- Use repository screenshots or source text only as content grounding. Do not copy incidental UI chrome, logos, or low-level clutter unless the slide is explicitly about that UI.
- Use demo screenshots as layout references only when a slide is about that demo. Specify which visual elements to copy and which to ignore.

## Generation Guardrails

- Do not show the SMART logo on every slide.
- Do not use generic robot/brain/AI clip art.
- Do not draw a fake EHR UI with fictional clinical facts.
- Do not use pseudo-technical labels like "agent magic" or generic AI slogans.
- Do not imply that Health Skillz itself makes clinical decisions.
- Do not imply that Request My EHI submits or faxes anything before user approval.
- Do not imply EHI Export is already normalized FHIR.
- Avoid tiny unreadable tables. Use small real snippets only when the text matters.

## Exact Terms Worth Showing

- `SKILL.md`
- `scripts/`
- `health-data/*.json`
- `DocumentReference`
- `attachments[]`
- `bestEffortPlaintext`
- `github.com/jmandel/health-skillz`
- `github.com/jmandel/request-my-ehi`
- `bun scripts/load-ehi-sqlite.ts`
- `bun scripts/load-schema-docs.ts`
- `bun scripts/q.ts`
- `_tables`
- `_schema_table`
- `_schema_column`
- `STORYBOARD.md`
- `viewmodel.json`
- `EXTRACT -> ENRICH -> SYNTHESIZE`
