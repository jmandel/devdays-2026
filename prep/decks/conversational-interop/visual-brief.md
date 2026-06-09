# Visual Brief: Conversational Interop Deck

## Overall Direction

This deck should feel like a protocol lab for messy healthcare workflows: whiteboard clarity, transcript panels, task state, and structured artifacts. It should look related to the other DevDays decks but not identical: same disciplined title typography and white canvas, with more conversation bubbles, audit trails, and state machines.

Primary motif: two organizational agents negotiating a task across a boundary, while each side keeps its own data, tools, and private rules.

Secondary motifs:

- Standards rails under the conversation.
- Transcript turns becoming structured evidence.
- Liaison task queue and `needs input` escalation.
- Banterop browser room as a flight simulator.
- Failure lab: loops, adversarial requests, over-disclosure, weak provenance.

## Palette

- Background: `#FFFFFF`
- Primary text: `#1F2328`
- Muted text: `#6B7280`
- Linework: `#D6DEE8`
- Standards blue: `#2B78C5`
- Conversation teal: `#0EA5A3`
- Evidence green: `#48A868`
- Policy amber: `#F2A23A`
- Agent purple: `#7A3E91`
- Risk red: `#D84747`
- Terminal charcoal: `#24292F`

## Typography And Layout

- Slide titles: broad heavy clean sans serif, top-left, never condensed or horizontally squeezed.
- If a title is long, split into a short title plus subtitle.
- Use transcript bubbles, task cards, and artifact cards instead of dense paragraphs.
- Monospace chips for protocol tokens, endpoints, method names, and repo URLs.
- Bottom progress rail after the title slide: `standards`, `negotiate`, `structure`, `audit`.

## Reference Guidance For Image Generation

- Use the LLM agents health-data title slide only for typography, title margin, white grid canvas, line-weight discipline, and readable card style.
- Do not copy that deck's laptop layout unless the slide is specifically about local tools.
- Use Banterop README content as factual grounding for endpoints and setup. Do not invent product UI details that are not in the repo.
- Use blog posts as conceptual grounding: late-bound structure, liaison UX, Banterop as testbed, Connectathon demos, and prior-auth evidence negotiation.

## Generation Guardrails

- Do not show robots, magic sparkles, generic AI brains, or fake vendor logos.
- Do not imply natural language replaces structured artifacts.
- Do not imply payer policies are public in production; private knowledge is inspectable only in the testbed.
- Do not draw AI as making denials.
- Do not conflate A2A and MCP.
- Do not make every slide a chat bubble slide; vary with stacks, diagrams, state machines, artifacts, and risk taxonomy.
- Avoid tiny unreadable transcripts. Use short representative turns only.

## Exact Terms Worth Showing

- `late-bound structure`
- `FHIR / SMART`
- `MCP tools`
- `A2A task dialogue`
- `Agent Card`
- `.well-known/agent-card.json`
- `message/send`
- `tasks/get`
- `needs input`
- `FHIR Task`
- `evidence package`
- `audit transcript`
- `Layer 1 questions`
- `Layer 2 criteria`
- `decision logic`
- `banterop.fhir.me`
- `github.com/jmandel/banterop`
- `grep_record`
- `query_record`
- `eval_record`
