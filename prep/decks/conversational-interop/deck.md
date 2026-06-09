# Toward Conversational Interop

Session: Toward Conversational Interop: Agents Structuring the Long Tail on the Fly  
Scheduled: Jun 18, 2026, 2:30 PM  
Speaker: Josh Mandel

This deck is a generated 16:9 image deck for a 45-minute talk with a live Banterop demo.

## Core Thesis

Conversational interoperability is not "LLMs instead of standards." It is late-bound structure on top of standards.

FHIR, SMART, CDS Hooks, Da Vinci, and X12 remain the durable rails. The new move is to stop pretending every long-tail workflow can justify a bespoke implementation guide, pre-negotiated data model, and synchronous request/response contract.

The phrase to repeat:

> The long tail needs a protocol for negotiating the shape of the work, not another 200-page specification for every corner case.

## Deck Arc

1. **Toward Conversational Interop**  
   Frame the thesis: agents use conversation to negotiate the shape of work, then produce structured artifacts with evidence.

2. **Not LLMs Instead Of Standards**  
   Show standards as rails: FHIR/SMART, CDS Hooks, Da Vinci, X12. COIN sits above them as a negotiation layer for the parts we cannot pre-specify.

3. **The Long Tail Breaks Pre-Negotiation**  
   Show why high-variation workflows struggle: niche registries, complex prior auth, specialist referrals, trial matching, messy EHI exports.

4. **Prior Auth Is The Stress Test**  
   Put Da Vinci CRD/DTR/PAS beside a messy policy/evidence dialogue. The message: Da Vinci is the right center of gravity for mainstream ePA; COIN is for negotiated evidence and edge cases.

5. **Layer 1 Questions Are Not Layer 2 Criteria**  
   Show the failure mode: a questionnaire asks for a pile of answers without conveying the actual rule logic, thresholds, dependencies, or how the answers are used. COIN should expose enough criteria logic to let an agent assemble truthful evidence and explain gaps.

6. **Late-Bound Structure**  
   Show a transcript turning into a JSON evidence package with FHIR references, note quotes, human answers, and provenance receipts.

7. **Three Layers, Three Jobs**  
   Clarify roles: FHIR/SMART retrieves authoritative facts; MCP exposes trusted tools over local/provider data; A2A carries cross-organizational task dialogue.

8. **Design For Delay**  
   Show the liaison UX: quiet task status, needs-input escalation, transcript/artifacts panel, and clean completion. Async is a feature when the agent can do real work.

9. **Banterop Is A Flight Simulator**  
   Show Banterop as an inspectable simulated counterparty for A2A or MCP clients/servers, with browser control, private knowledge, tools, transcripts, and room endpoints.

10. **Live Demo: Prior Auth Negotiation**  
   Show the concrete run: payer policy asks for evidence; provider agent searches record; one needs-input moment; final structured package and audit transcript.

11. **Registry Reporting Shows The Long Tail**  
    Show a rare disease registry agent returning dynamic reporting requirements, the clinical agent filling what it can, and a gaps list for human input.

12. **The Demo Is A Failure Lab**  
    Name risks: loops, prompt injection, adversarial agents, weak evidence, over-disclosure, endpoint drift, and bad automation incentives.

13. **Bring An Ugly Workflow**  
    Close with next steps: Banterop, health-record-mcp, EHI export analysis, and a frank question list.

## Demo Links And Repos

- Banterop hosted service: https://banterop.fhir.me/
- Banterop repo: https://github.com/jmandel/banterop
- Health Record MCP repo: https://github.com/jmandel/health-record-mcp
- EHI Export Analysis repo: https://github.com/jmandel/ehi-export-analysis
- EHI Export Analysis dashboard: https://joshuamandel.com/ehi-export-analysis/
- A2A docs: https://a2a-protocol.org/latest/
- FHIR Task: https://hl7.org/fhir/R5/task.html
- Da Vinci PAS IG: https://hl7.org/fhir/us/davinci-pas/STU2.1/index.html
- CMS-0057-F fact sheet: https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f

## Banterop Run Of Show

1. Open https://banterop.fhir.me/ or local `http://localhost:3000`.
2. Pick a prior-auth scenario with a payer agent holding private coverage criteria.
3. Show room setup and the simulated counterparty's private knowledge. Say that this is inspectable because it is a testbed, not because real counterparties should expose internals.
4. Show discovery/endpoints: A2A Agent Card and/or MCP room endpoint.
5. Start the prior-auth task: "Request prior authorization for lumbar MRI for chronic low back pain with new neurologic symptoms."
6. Let the payer ask for duration of symptoms, conservative therapy, red flags, prior imaging, exam findings, and relevant notes.
7. Show the provider/liaison agent assembling evidence from record tools and producing a structured package.
8. Force or narrate one `needs input` moment when the agent cannot derive a fact confidently.
9. End with approval or a precise missing-evidence response.
10. Show transcript and artifact as the audit object.

## Local Banterop Setup

```bash
git clone https://github.com/jmandel/banterop
cd banterop
bun install
export BANTEROP_DB=./banterop.sqlite
bun run dev
```

Open `http://localhost:3000`.

Optional model keys:

```bash
export GOOGLE_API_KEY=...
export OPENROUTER_API_KEY=...
```

## Claims To Keep Honest

- COIN complements standards. It does not replace FHIR, SMART, Da Vinci, CDS Hooks, or X12.
- Natural language is used to negotiate requirements; structured artifacts still matter.
- A2A and MCP are different roles: A2A is agent-to-agent task dialogue; MCP is agent-to-tool access.
- Banterop is a testbed and reference environment, not a healthcare trust framework.
- Prior-auth agents should help assemble truthful evidence and speed approvals; they should not become black-box denial machines.
- Layer 1 questions are not enough. Prior-auth agents need enough Layer 2 clinical criteria logic to explain thresholds, dependencies, and how answers are used.
- The minimum serious architecture needs identity, authority, purpose of use, evidence provenance, audit logs, and human escalation.

## Frank Questions

- Where should healthcare draw the line between "agent negotiates payload shape" and "this must be a fixed implementation guide"?
- If an agent invents a JSON evidence package during a prior-auth exchange, what makes that package auditable enough to trust?
- Do we need healthcare-specific A2A profiles, or only healthcare conventions for trust, identity, purpose, and provenance?
- What is the right denial guardrail?
- Who is accountable when two agents agree on a misinterpreted requirement?
