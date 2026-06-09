# Kill the Clipboard Panel Intro

Session: Kill the Clipboard: Frictionless Intake with Patient-Shared Data  
Scheduled: Jun 16, 2026, 2:30 PM  
Format: 10-minute technical setup, then panel with Anthony Polizzi, James Cummings, and Dave deBronkart

## Core Thesis

Kill the Clipboard is a practical project to let patients share selected health information from apps they already use, so clinics can receive reusable basics without requiring a receiving-clinic portal sign-in.

The basic flow:

1. The patient chooses what to share.
2. The app creates a secure QR code or SMART Health Link.
3. The clinic scans the QR code or receives the link.
4. The EHR retains the patient-shared information with clear labels.
5. Future check-in work handles visit-specific requests that vary by clinic and encounter.

## Deck Arc

1. **Kill The Clipboard**
   A title slide that earns its keep: show the whole before/after story in miniature. Clipboard/repeated intake -> patient app choosing content -> secure QR/link -> Care Team EHR. Use the core project sentence: share selected clinical history, insurance card, and your Patient Story from your app to your care team, with no portal sign-in required.

2. **What KTC Handles Now**
   Make the current scope concrete: FHIR PAMI, Coverage/insurance card, FHIR summary PDF, and Patient Story PDF. Emphasize patient-shared retention and labels, not automatic clinician verification.

3. **What Still Needs Check-In**
   Draw the boundary between reusable basics and visit-specific asks. Reusable basics can be shared from the patient's app; questionnaires, consent forms, clinic-specific intake, specialty screeners, and billing/payment still need request/response protocol work.

4. **Discussion Setup**
   Close with practical panel questions about adoption, workflow, trust/review, patient value, AI, and the next protocol. Keep the questions frank and concrete.

## Demo Link

- KTC spec: https://ktc-spec.github.io/
- KTC reference implementation: https://pshd-shl.exe.xyz/prototype.html

## Source Grounding

- Local prep: [2026-06-16-1430-kill-the-clipboard-prep.md](/home/jmandel/hobby/devdays-2026/prep/2026-06-16-1430-kill-the-clipboard-prep.md)
- Mapped posts: [talks-to-relevant-posts.md](/home/jmandel/hobby/devdays-2026/talks-to-relevant-posts.md)
- KTC spec: Patient-Shared Health Documents via SMART Health Links
- Blog: Better Browser APIs for Sharing SMART Health Cards, FHIR Bundles, and other Digital Credentials
- Blog: Healthcare's High-Tech Future Forgets One Thing: The Humans?
- CMS Kill the Clipboard page: https://www.cms.gov/health-tech-ecosystem/early-adopters/kill-the-clipboard
- Medicare.gov Kill the Clipboard explainer: https://www.medicare.gov/health-apps/kill-clipboard
- CMS Health Technology Ecosystem categories: https://www.cms.gov/health-technology-ecosystem/categories

## Speaker Handling

Use slides 1-3 in about 4 minutes, then use slide 4 to hand off to discussion. Do not linger on April/July milestone chronology; use it as background context only. Put the KTC spec URL as a small footer/reference, not as a separate demo slide.
