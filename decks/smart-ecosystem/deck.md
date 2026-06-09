# SMART Across the Ecosystem

Session: SMART Across the Ecosystem: App Launch, Permission Tickets, and More  
Scheduled: Jun 16, 2026, 10:30 AM  
Speaker: Josh Mandel

This deck is built as generated 16:9 slide images with embedded prompts and presenter notes.

## Slides

1. SMART Across the Ecosystem
2. The ecosystem runs on a few reusable surfaces
3. Launch is the SMART/OAuth setup for an app session
4. App Launch makes the OAuth/FHIR handshake predictable
5. SMART Launcher makes app testing cheap
6. Live demo: SMART launch with a real patient-facing app
7. Scopes name capabilities; policy decides authority
8. Backend Services works best when trust is already configured
9. The spec is not the whole system
10. Patients do not choose FHIR base URLs
11. Permission Ticket: portable authorization context
12. Redeem the ticket at the token endpoint
13. Tickets are only worth it when authority must travel
14. Scheduling Links: lightweight discovery, local booking
15. Boring implementation quality + ambitious authorization experiments

## Demo Links

- Health Skillz: https://health-skillz.joshuamandel.com
- Health Skillz repo: https://github.com/jmandel/health-skillz
- SMART App Launch v2.2.0: https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html
- SMART Scopes and Launch Context: https://hl7.org/fhir/smart-app-launch/STU2.2/scopes-and-launch-context.html
- SMART Backend Services: https://hl7.org/fhir/smart-app-launch/STU2.2/backend-services.html
- SMART User Access Brands: https://hl7.org/fhir/smart-app-launch/STU2.2/brands.html
- Epic User Access Brands: https://open.epic.com/Endpoints/Brands
- Permission Tickets WIP IG: https://build.fhir.org/ig/jmandel/smart-permission-tickets-wip/branches/app-issued-tickets/index.html
- Permission Tickets repo: https://github.com/jmandel/smart-permission-tickets-wip
- OAuth Token Exchange: https://www.rfc-editor.org/rfc/rfc8693
- JWT Client Authentication: https://www.rfc-editor.org/rfc/rfc7523
- SMART Scheduling Links: https://build.fhir.org/ig/HL7/smart-scheduling-links/
