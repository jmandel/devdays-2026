Here is the complete compilation of your DevDays sessions, formatted in Markdown. For each session, I have included the finalized title, the description, and a proposed run-of-show/outline tailored to your presentation style (demo-heavy, pragmatic, and highly interactive). 

***

# DevDays 2026: Session Plans for Josh Mandel

## 1. SMART Across the Ecosystem: App Launch, Permission Tickets, and More
**Date/Time:** Jun 16, 2026, 10:30 – 11:15 AM

**Description:**
This session provides an overview of the SMART on FHIR ecosystem, balancing a review of core mechanics with a look at new and upcoming standards.

For the first half of the session, we will cover the fundamentals of SMART on FHIR. We’ll review the core SMART App Launch workflows, demonstrating how the standard provides secure, OAuth2-driven API access for patient-facing apps, provider-facing apps, and backend services.

Building on those basics, the second half of the session will explore how the SMART ecosystem is expanding to address current interoperability challenges:
* **SMART User Access Brands:** A look at how standardized logos and organizational branding help users navigate endpoint directories to reliably locate their providers.
* **SMART Permission Tickets:** A sneak peek at a new Argonaut project focused on portable, verifiable authorization artifacts. We will look at how packaging authorization context to travel with a request can help solve network scaling problems and reduce redundant OAuth flows across health systems.
* **SMART Scheduling Links:** A brief preview of how a lightweight `$bulk-publish` pattern is being used for open appointment discovery. *(Note: We will touch on this briefly to set the stage for the dedicated deep-dive session on SMART Scheduling Links happening tomorrow).*

Whether you are new to FHIR development or looking to catch up on the latest Argonaut projects, this session will ground you in the SMART fundamentals and show you where the standards are heading next.

**Proposed Run of Show (45 mins):**
* **00-05:** **Intro & The State of SMART:** Brief welcome, level-setting on where SMART on FHIR is today.
* **05-15:** **The Basics:** Refresher on App Launch (standalone vs. EHR launch), backend services, and current consumer access realities. 
* **15-20:** **User Access Brands:** The endpoint discovery problem (reference the pain of registering across 500+ orgs with similar names). Show how branding metadata fixes this for patients.
* **20-25:** *Audience Check-in:* Quick pause for questions on the current state of SMART/Brands.
* **25-35:** **Permission Tickets (Argonaut Sneak Peek):** The meat of the "new" stuff. Explain the network scaling problem (why pre-configured backend services fail at scale) and demo the concept of portable, verifiable authorization artifacts traveling with the request.
* **35-40:** **Teaser:** SMART Scheduling Links and the power of `$bulk-publish`.
* **40-45:** **Q&A & Wrap-up.**

---

## 2. Kill the Clipboard: Frictionless Intake with Patient-Shared Data
**Date/Time:** Jun 16, 2026, 2:30 – 3:15 PM

**Description:**
Intake at the doctor’s office is a universally frustrating experience. Patients are repeatedly asked to provide the exact same information (medications, allergies, active problems, and immunizations) on different paper clipboards, portals, and tablets. "Kill the Clipboard" is a community-led effort to fix this by enabling patients to securely share their health information directly from the apps they already use straight to their care team.

We’ll kick off with a brief, high-level update on the latest "Kill the Clipboard" technical milestones, showing how apps and EHRs are working together to securely exchange both structured data and patient-authored narratives (the "Patient Story") at the point of care.
 
Then, we’ll dive into a highly interactive panel discussion on what it actually takes to shift the burden of clinical intake. Joined by Anthony Polizzi (CMS), James Cummings (Participatory Health), and Dave deBronkart (e-Patient Dave), we will explore:
* **The Power of the Patient Story:** Why making space for a patient's own narrative and context is just as critical as sharing clinical facts.
* **The Caregiver Perspective:** How consumer-aggregated records change the diagnostic journey for complex and rare conditions.
* **The Federal Role:** How the CMS Health Tech Ecosystem is supporting and accelerating community-driven standards.
* **What Comes Next:** The roadmap for moving beyond basic medical history toward fully app-driven check-in workflows.

Audience participation is highly encouraged! Please bring your questions, implementation challenges, and ideas for the panel as we discuss the future of the clinical intake experience.

**Proposed Run of Show (45 mins):**
* **00-10:** **Technical Context (Josh):** Introduce the KTC vision. Walk through the April 2026 (PDFs/Patient Story) and July 2026 (FHIR PAMI persistence) milestones. Briefly show the KTC architecture diagram.
* **10-15:** **Panel Introductions:** Dave, James, and Anthony. 
* **15-30:** **Guided Discussion:** 
    * *Dave:* Focus on the human element, why patients hate redundant data entry, and the importance of the "Patient Story" artifact.
    * *James:* The caregiver perspective—why the patient must be the system of record, and how this data fuels downstream AI.
    * *Anthony:* The policy/CMS view—how federal momentum is backing this up.
* **30-45:** **Audience Q&A & Brainstorm:** Open the floor. Ask the audience: *What are the biggest EHR persistence/workflow challenges you see with importing patient-generated FHIR?*

---

## 3. Beyond "All-or-Nothing" QR Codes: Digital Credentials API, SMART Health Check-in, and Selective Disclosure JWTs
**Date/Time:** Jun 17, 2026, 11:30 AM – 12:15 PM

**Description:**
SMART Health Cards proved that verifiable health data can work at a global scale. However, the first generation of the standard required practical trade-offs: data sharing was "all-or-nothing," and the primary user experience relied on passing physical or on-screen QR codes. 

This session offers a sneak peek at evolving standards that could move verifiable clinical data beyond the static QR code and into dynamic, privacy-preserving mobile wallets. We will explore two new areas and how they might apply in healthcare:

* **Selective Disclosure (SD-JWT) for FHIR:** We will review how the new IETF standard for Selective Disclosure (SD-JWT) could fix the "all-or-nothing" problem. You will see a prototype demonstrating how an issuer can sign a comprehensive FHIR bundle, while empowering the patient to selectively redact specific fields—such as an address or an unrelated condition—at the time of presentation, without breaking the cryptographic signature.
* **SMART Health Check-in & The W3C Digital Credentials API:** We will introduce the experimental SMART Health Check-in protocol, which explores how a web verifier (like a clinic portal or a front-desk kiosk) might request specific FHIR resources and questionnaires directly from a patient's device. We will take a look at how wrapping SMART payloads in an `org-iso-mdoc` envelope could allow developers to leverage the evolving W3C Digital Credentials API for seamless wallet interactions across iOS and Android ecosystems.

Join this session to see live prototypes and discuss how these emerging technologies might shape the next generation of patient-controlled sharing.

**Proposed Run of Show (45 mins):**
* **00-05:** **Intro:** The success of SHC v1, and the "Minimal Disclosure via Profiling" compromise. Why we need to move past it.
* **05-20:** **SD-JWT (RFC 9901):** How the cryptographic "locked boxes" work. 
    * *Demo:* Live walkthrough of the **FHIR Redaction Studio**. Show taking a signed bundle, redacting a field with the "marker," and looking at the resulting sparse JSON tree.
* **20-25:** *Audience Check-in:* Pause to take questions on SD-JWT mechanics and "modifier" safety rules in FHIR.
* **25-35:** **SMART Health Check-in & Mobile Wallets:** Moving beyond the QR code. Introduce the W3C Digital Credentials API and the `org-iso-mdoc` transport envelope.
    * *Demo:* Show the web verifier requesting data and the OS-native wallet response (or the experimental web wallet fallback).
* **35-45:** **Q&A & Wrap-up.**

---

## 4. Let's Build: Making LLM Agents Work with Health Data (FHIR & EHI)
**Date/Time:** Jun 18, 2026, 10:30 – 11:15 AM

**Description:**
Frontier LLMs are great at reasoning, but to do real work in healthcare, they need access to data and systems. In this "Let's Build" session, we’ll look at how to give AI agents secure, direct access to health records using portable "AI Skills" (like `SKILL.md` files) and local tools—without needing to stand up heavy backend infrastructure.

Bring your laptop and your preferred agent harness (Claude, Cursor, exe.dev, etc.). We will use three open-source projects as starting points to explore how agents can fetch, navigate, and analyze health data:

* **Health Skillz:** A skill that uses SMART on FHIR to connect to a patient portal. We’ll look at how it pulls structured FHIR data and plain-text clinical notes directly into the agent's computational sandbox, getting out of the way so the LLM can actually inspect and synthesize the data.
* **Request My EHI:** A skill that automates the cumbersome workflow of requesting a full (b)(10) EHI Export. We'll see how the agent handles web search, PDF transcription, form-filling, and generating vendor-specific cover letters using a conversational recovery loop.
* **Working with EHI Exports (Early Preview):** What happens when a patient actually receives a massive export of undocumented TSV files or JSON? We’ll preview a new skill designed to help agents map, query, and analyze these complex data dumps locally.

We’ll walk through the code, discuss how to structure tool definitions and prompts for health data, and start tinkering. You'll leave with working prototypes you can run and modify yourself.

**Proposed Run of Show (45 mins):**
* **00-05:** **The Tinkerer's Philosophy:** Why we want to bypass heavy corporate intermediaries. The power of `SKILL.md` vs. backend MCP servers.
* **05-15:** **Project 1: Health Skillz:** Code walkthrough. Show how the skill fetches USCDI + notes, encrypts locally, and hands the data to Claude.
* **15-25:** **Project 2: Request My EHI:** Walk through the workflow. Show how the agent uses the public vendor database to generate custom cover letters, handles PDF forms, and recovers when it hits a snag.
* **25-35:** **Project 3: EHI Export Analysis:** Show the messy reality of EHI exports (thousands of TSV files) and preview how agents can be prompted to write code to map, join, and analyze them on the fly.
* **35-45:** **Let's Build / Q&A:** Encourage the audience to download the ZIPs, load them into Claude/Cursor, and try them live. Open floor for troubleshooting and prompt-engineering discussion.

---

## 5. Toward Conversational Interop: Agents Structuring the Long Tail on the Fly
**Date/Time:** Jun 18, 2026, 2:30 – 3:15 PM

**Description:**
For years, we've tried to solve complex, cross-organizational interoperability challenges by pre-specifying every possible data field and workflow step. But for the "long tail" of healthcare workflows—niche disease registries, complex prior authorizations, and specialized referrals—rigid schemas inevitably break down. 

This session introduces **Conversational Interoperability (COIN)**, a paradigm where autonomous AI agents negotiate data exchange with each other in natural language. Instead of relying on a pre-negotiated API for every edge case, cross-org agents converse to figure out exactly what is needed and structure the data on the fly, pulling from FHIR when available and improvising from unstructured notes when necessary.

We will explore how to build tools that take advantage of this shift, with a specific focus on asynchronous patterns. When we stop expecting instant, synchronous API responses, frontier agents can do profound work. We will look at what becomes possible when an agent is pointed at a massive, complex dataset like a full (b)(10) EHI Export. If a complex clinical query comes in, an agent can spend an hour deeply navigating thousands of tables and clinical notes to synthesize an answer—often yielding a more comprehensive and accurate result than a rushed clinician could compile manually.

Finally, we will do a live demo of **Banterop**, an open-source platform for simulating, building, and testing these agent-to-agent interactions. Join us to see how dynamic, conversational protocols can solve the workflows that traditional standards leave behind.

**Proposed Run of Show (45 mins):**
* **00-10:** **The Limits of Rigid Schemas:** The pain of building Da Vinci IGs for every specific prior auth scenario. Why the "long tail" (niche registries, custom intake) defies standardization. 
* **10-20:** **The COIN Paradigm & Async Power:** Explain Conversational Interoperability. Highlight the value of *time*: what happens when an agent can spend an hour executing code against a local EHI Export to answer a complex referral query, instead of requiring a 2-second synchronous API response.
* **20-35:** **Banterop Demo:** 
    * Show the browser-based simulation platform. 
    * Run a live scenario (e.g., an adversarial prior-auth negotiation or a rare-disease registry match). 
    * Show how the agents "structure on the fly," pulling FHIR when possible and generating JSON when needed.
* **35-45:** **Discussion:** Where do traditional standards stop and LLM conversations begin? How do we handle identity and authorization when agents talk to agents (A2A)? Open Q&A.
