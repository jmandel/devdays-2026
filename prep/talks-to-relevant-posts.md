# Talks to Relevant Posts Mapping

Source talk list: [talks.md](talks.md)

Blog links point to the public site at https://joshuamandel.com/blog/

Sections follow the order and scheduled times listed in `talks.md`.

## Jun 16, 2026 10:30 AM - SMART Across the Ecosystem: App Launch, Permission Tickets, and More

### Relevant Posts

| Confidence | Post | Why it is relevant |
| --- | --- | --- |
| High | [SMART Permission Tickets: Argonaut Launch!](https://joshuamandel.com/blog/posts/smart-permission-tickets-argonaut-launch/) | Direct match for the Argonaut SMART Permission Tickets segment; introduces portable, machine-readable authorization artifacts. |
| High | [Authorization as a Network Scaling Problem](https://joshuamandel.com/blog/posts/authorization-as-a-network-scaling-problem/) | Explains the network-scaling problem motivating permission tickets and portable authorization context. |
| High | [7,000+ Clicks to Register a FHIR App](https://joshuamandel.com/blog/posts/7000-clicks-to-register-a-fhir-app/) | Strong support for SMART app launch, patient-facing app registration, Epic endpoint directories, and SMART User Access Brands. |
| Medium | [I registered Health Skillz at 500 Epic sites... then couldn't connect](https://joshuamandel.com/blog/posts/i-registered-health-skillz-at-500-epic-sites-then-couldn-t-connect/) | Implementation follow-up on confidential SMART clients, OAuth/token failures, and production-scale registration issues. |
| Medium | [Health Skillz: Why I Built My Own Health Record Connector for Claude.ai & Codex](https://joshuamandel.com/blog/posts/health-skillz-why-i-built-my-own-health-record-connector-for-claude-ai-codex/) | Concrete patient-facing SMART on FHIR app example for App Launch fundamentals. |

### GitHub Repositories

| Confidence | Repository | Source |
| --- | --- | --- |
| High | [jmandel/health-skillz](https://github.com/jmandel/health-skillz) | Explicitly linked from the SMART app registration and Health Skillz posts. |

## Jun 16, 2026 2:30 PM - Kill the Clipboard: Frictionless Intake with Patient-Shared Data

### Relevant Posts

| Confidence | Post | Why it is relevant |
| --- | --- | --- |
| High | [Proposal: SMART Health Check-in Protocol](https://joshuamandel.com/blog/posts/proposal-smart-health-check-in-protocol/) | Directly addresses Kill the Clipboard, patient-shared records, intake questionnaires, and app-driven check-in. |
| Medium | [Better Browser APIs for Sharing SMART Health Cards, FHIR Bundles, and other Digital Credentials](https://joshuamandel.com/blog/posts/better-browser-apis-for-sharing-smart-health-cards-fhir-bundles-and-other-digital-credentials/) | Relevant to patient-controlled sharing UX, browser-mediated presentation, wallet flows, and intake questionnaire prefill. |
| Medium | [You should respond to CMS's Health Tech Ecosystem RFI. Borrow ideas or share a PR!](https://joshuamandel.com/blog/posts/you-should-respond-to-cms-s-health-tech-ecosystem-rfi-borrow-ideas-or-share-a-pr/) | Supports the federal-role/CMS Health Tech Ecosystem framing in the panel. |
| Medium | [Healthcare's High-Tech Future Forgets One Thing: The Humans?](https://joshuamandel.com/blog/posts/healthcare-s-high-tech-future-forgets-one-thing-the-humans/) | Useful for panel discussion on patient, caregiver, clinician, usability, and human burden themes. |
| Low | [POWER USER FEEDBACK DROVE MAJOR HEALTH SKILLZ IMPROVEMENTS THIS WEEK](https://joshuamandel.com/blog/shares/share-7427017898310856704/) | Panel-adjacent share naming James Cummings and Dave deBronkart as power users testing large patient records. |

### GitHub Repositories

| Confidence | Repository | Source |
| --- | --- | --- |
| High | [jmandel/smart-health-checkin-demo](https://github.com/jmandel/smart-health-checkin-demo) | Explicitly linked from the SMART Health Check-in protocol post. |
| Medium | [jmandell/shl-wallet](https://github.com/jmandell/shl-wallet) | Explicitly linked from the Digital Credentials API / SHL Wallet post. |
| Medium | [jmandel/cms-rfi-collab](https://github.com/jmandel/cms-rfi-collab) | Explicitly linked from the CMS Health Tech Ecosystem RFI collaboration post. |
| Medium | [jmandel/regulations.gov-comment-browser](https://github.com/jmandel/regulations.gov-comment-browser) | Explicitly linked from CMS Health Tech Ecosystem RFI analysis posts. |
| Medium | [jmandel/health-skillz](https://github.com/jmandel/health-skillz) | Explicitly linked from Health Skillz posts; relevant to consumer-aggregated patient records. |

## Jun 17, 2026 11:30 AM - Beyond "All-or-Nothing" QR Codes: Digital Credentials API, SMART Health Check-in, and Selective Disclosure JWTs

### Relevant Posts

| Confidence | Post | Why it is relevant |
| --- | --- | --- |
| High | [Fixing the "All or Nothing" Problem in Health Data Sharing: Experiments with Selective Disclosure for FHIR (SD-JWT)](https://joshuamandel.com/blog/posts/fixing-the-all-or-nothing-problem-in-health-data-sharing-experiments-with-selective-disclosure-for-fhir-sd-jwt/) | Direct match for SD-JWT for FHIR, all-or-nothing disclosure, FHIR Redaction Studio, and modifier-safety discussion. |
| High | [Proposal: SMART Health Check-in Protocol](https://joshuamandel.com/blog/posts/proposal-smart-health-check-in-protocol/) | Directly covers SMART Health Check-in and its W3C Digital Credentials API-inspired request/response model. |
| High | [Better Browser APIs for Sharing SMART Health Cards, FHIR Bundles, and other Digital Credentials](https://joshuamandel.com/blog/posts/better-browser-apis-for-sharing-smart-health-cards-fhir-bundles-and-other-digital-credentials/) | Direct support for moving beyond QR-code presentation with browser APIs, mobile wallets, mdoc, and selective disclosure. |
| Medium | [This is awesome -- gives us new, powerful options for patients to share...](https://joshuamandel.com/blog/shares/share-7397271184918118400/) | Short share focused on SD-JWT eliminating all-or-nothing clinical data sharing. |
| Medium | [So excited that the selective disclosure JWT spec is finalized! Also, nano...](https://joshuamandel.com/blog/shares/share-7397302179772088320/) | Short share about the finalized selective disclosure JWT spec. |
| Medium | [Big news: SMART Health Cards and Links is now a formal HL7 standard](https://joshuamandel.com/blog/shares/share-7353442693068296193/) | Useful background for the talk's SMART Health Cards and QR-code starting point. |

### GitHub Repositories

| Confidence | Repository | Source |
| --- | --- | --- |
| High | [jmandel/fhiredaction-studio](https://github.com/jmandel/fhiredaction-studio) | Explicit source URL for FHIR Redaction Studio, the SD-JWT demo named in the talk. |
| High | [jmandel/smart-health-checkin-demo](https://github.com/jmandel/smart-health-checkin-demo) | Explicit source URL for the SMART Health Check-in protocol definition and demo. |
| High | [jmandell/shl-wallet](https://github.com/jmandell/shl-wallet) | Explicit source URL for SHL Wallet and the Digital Credentials API testbed. |

## Jun 18, 2026 10:30 AM - Let's Build: Making LLM Agents Work with Health Data (FHIR & EHI)

### Relevant Posts

| Confidence | Post | Why it is relevant |
| --- | --- | --- |
| High | [Health Skillz: Why I Built My Own Health Record Connector for Claude.ai & Codex](https://joshuamandel.com/blog/posts/health-skillz-why-i-built-my-own-health-record-connector-for-claude-ai-codex/) | Direct match for Health Skillz and the talk's FHIR-plus-notes agent workflow. |
| High | [I Built an AI Skill to Help Patients Request Their EHI Export](https://joshuamandel.com/blog/posts/i-built-an-ai-skill-to-help-patients-request-their-ehi-export/) | Direct match for the Request My EHI segment. |
| High | [How I Used AI Agents to Assess the State of EHI Export](https://joshuamandel.com/blog/posts/how-i-used-ai-agents-to-assess-the-state-of-ehi-export/) | Strong support for the EHI Export analysis preview and agentic workflows over messy documentation. |
| High | [Creating a "Living Manual" for EHI Export](https://joshuamandel.com/blog/posts/creating-a-living-manual-for-ehi-export/) | Directly relevant to helping agents and users analyze real EHI export files. |
| High | [Connecting AI to Health Records (Live Workshop with Dave deBronkart, Hugo Campos, and Gilles Frydman)](https://joshuamandel.com/blog/shares/share-7424976918795485184/) | Direct Health Skillz workshop share demonstrating the patient-record-to-agent workflow. |
| Medium | [Theory to Practice: LLM Agents Using MCP Tools on Real EHR Data (with demo)](https://joshuamandel.com/blog/posts/theory-to-practice-llm-agents-using-mcp-tools-on-real-ehr-data-with-demo/) | Covers the earlier MCP-based version of agent access to real FHIR/EHR data. |
| Medium | [I Graded 265 EHRs on the "Export Everything" Requirement. (Median grade was D.)](https://joshuamandel.com/blog/posts/i-graded-265-ehrs-on-the-export-everything-requirement-median-grade-was-d/) | Background for why EHI exports are important and hard to use. |
| Medium | [Blooper reel time! I foolishly decided to record a live, totally untested demo...](https://joshuamandel.com/blog/shares/share-7430005888654000128/) | Share showing Request My EHI in live-agent operation. |

### GitHub Repositories

| Confidence | Repository | Source |
| --- | --- | --- |
| High | [jmandel/health-skillz](https://github.com/jmandel/health-skillz) | Explicit source URL for the Health Skillz project named in the talk. |
| High | [jmandel/request-my-ehi](https://github.com/jmandel/request-my-ehi) | Explicit source URL for the Request My EHI skill named in the talk. |
| High | [jmandel/ehi-export-analysis](https://github.com/jmandel/ehi-export-analysis) | Explicit source URL for the agentic EHI export analysis work. |
| High | [jmandel/ehi-living-manual](https://github.com/jmandel/ehi-living-manual) | Explicit source URL for the EHI export living manual. |
| Medium | [jmandel/health-record-mcp](https://github.com/jmandel/health-record-mcp) | Explicit source URL for the MCP-based predecessor/prototype for agent access to EHR data. |

## Jun 18, 2026 2:30 PM - Toward Conversational Interop: Agents Structuring the Long Tail on the Fly

### Relevant Posts

| Confidence | Post | Why it is relevant |
| --- | --- | --- |
| High | [Conversational Interoperability Takes Shape: A Read-Out from the HL7 Connectathon](https://joshuamandel.com/blog/posts/conversational-interoperability-takes-shape-a-read-out-from-the-hl7-connectathon/) | Direct match for COIN, Banterop, A2A/MCP testing, long-tail workflows, and prior-auth scenarios. |
| High | [Conversational Interop for Prior Auth (demo!)](https://joshuamandel.com/blog/posts/conversational-interop-for-prior-auth-demo/) | Direct demo match for conversational prior-auth and A2A/MCP themes. |
| High | [Connect the Dots for Prior Auth: A2A && MCP?](https://joshuamandel.com/blog/posts/connect-the-dots-for-prior-auth-a2a-mcp/) | Explains the proposed A2A/MCP architecture for asynchronous agent-to-agent prior auth. |
| High | [Fulfilling the Cures Act: Conversational Interop as a "Successor Technology"](https://joshuamandel.com/blog/posts/fulfilling-the-cures-act-conversational-interop-as-a-successor-technology/) | Frames COIN as a successor approach for long-tail interoperability workflows. |
| High | [Designing for Delay: A Liaison UX for Prior Auth and Other Asynchronous Clinical Tasks](https://joshuamandel.com/blog/posts/designing-for-delay-a-liaison-ux-for-prior-auth-and-other-asynchronous-clinical-tasks/) | Directly supports the async-agent workflow framing. |
| High | [Introducing Banterop: Testbed for Language-First Interoperability :-)](https://joshuamandel.com/blog/shares/share-7369053808049446912/) | Share directly introducing Banterop and the long-tail language-first interop testbed. |
| Medium | [Prior auth is friction. Can't we just talk?](https://joshuamandel.com/blog/posts/prior-auth-is-friction-can-t-we-just-talk/) | Early conceptual prior-auth agent-dialogue post that feeds into COIN. |
| Medium | [How I Used AI Agents to Assess the State of EHI Export](https://joshuamandel.com/blog/posts/how-i-used-ai-agents-to-assess-the-state-of-ehi-export/) | Relevant to the talk's point that agents can spend substantial time navigating complex EHI export datasets. |

### GitHub Repositories

| Confidence | Repository | Source |
| --- | --- | --- |
| High | [jmandel/banterop](https://github.com/jmandel/banterop) | Explicit source URL for Banterop, the live demo platform named in the talk. |
| High | [jmandel/health-record-mcp](https://github.com/jmandel/health-record-mcp) | Explicit source URL for the prior-auth conversational interop demo implementation. |
| Medium | [jmandel/ehi-export-analysis](https://github.com/jmandel/ehi-export-analysis) | Explicit source URL for the EHI export agent analysis work referenced by the talk's async-EHI theme. |
| Medium | [modelcontextprotocol/modelcontextprotocol](https://github.com/modelcontextprotocol/modelcontextprotocol) | Explicit source URL in a related MCP transport discussion post. |

## Notes

- The talk file itself names projects but does not include explicit GitHub URLs. Repository mappings above come from relevant blog posts and shares that mention or link the named projects.
- I kept low-confidence items out except where a share names panelists or is otherwise useful for context.
- The `jmandell/shl-wallet` repository spelling appears exactly as linked in the blog post.
