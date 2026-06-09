# Demo Runbook: Conversational Interop

## Primary Demo: Banterop Prior Auth

Hosted target: `https://banterop.fhir.me/`

Local fallback:

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

## Beats

1. Open Banterop and choose a prior-auth scenario.
2. Show the room and private counterparty knowledge. Explain: visible for debugging in the testbed, not exposed in production.
3. Show endpoints:
   - A2A JSON-RPC: `/api/rooms/:roomId/a2a`
   - Agent Card: `/rooms/:roomId/.well-known/agent-card.json`
   - MCP endpoint: `/api/rooms/:roomId/mcp`
4. Start the request: `Request prior authorization for lumbar MRI for chronic low back pain with new neurologic symptoms.`
5. Let the payer ask for evidence.
6. Show the provider-side agent finding what it can through record tools.
7. Force one `needs input` moment.
8. Resume and show the structured evidence package.
9. End by showing the transcript as the audit object.

## Safety Framing

- AI helps assemble the strongest truthful case for approval.
- AI should not be a black-box denial machine.
- Every important claim needs provenance: record evidence, transcript turn, or human answer.

## Fallback

- Use a static transcript if the live model loops or latency is bad.
- Pivot to rare-disease registry if prior auth becomes a policy debate.
- Use the Banterop README and architecture if endpoint access fails.
