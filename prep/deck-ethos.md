# Deck Ethos

Make the deck a guided argument, not a pile of source summaries.

## Source Grounding

- Start from the actual talk file, then pull in the already-identified blog posts, repos, demos, and specs.
- Download or clone primary sources into `background/` so the deck can be checked against real material, not memory.
- Use specs for exact terms, constraints, and caveats. Use blog posts for voice, motivation, concrete pain, and memorable mental models.
- Keep links to demos and repos close to the slides they support.
- Source grounding is not slide content by default. Specs should prevent wrong claims; they should not force busy slides.

## Story Discipline

- Find the one thesis that makes the talk worth hearing. Every slide should either set up, prove, complicate, demo, or cash out that thesis.
- Prefer one visual idea per slide. Avoid turning specs into wall charts.
- Keep the big picture visible: roles, trust boundaries, data flow, and what changes for a patient/developer/implementer.
- Demo slides should be launchpads, not documentation. They should tell the audience what to watch for before the live switch.

## Visual System

- Pick a visual anchor early: a reference image, product UI, diagram language, or domain artifact that can shape the whole deck.
- Use a stable palette, typography feel, connector style, and slide grammar across generations.
- Separate reference-image roles explicitly. A deck may need one image for global palette/linework, another for title/header typography, another for per-slide layout, and another as a literal UI/spec artifact.
- Say what each reference controls and what it must not control. Example: "Use the timeline only for palette and whitespace; do not copy the logo. Use slide 2 only for title typography and margins; do not copy its content."
- For generated-image decks, pick an approved title/header exemplar and cite it in every later slide prompt until the model reliably follows it.
- Treat generated images as visual drafts that need inspection and correction. Preserve good style; regenerate or retouch bad semantics.
- Do not let a renderer or image model decide the argument. The deck controls the visuals, not the other way around.

## Anti-Slop Rules

- Ban vague AI filler like "ecosystem jobs" unless it is real language from the talk.
- Avoid fake summaries that sound plausible but change the meaning.
- Correct domain semantics immediately. If "launch" means OAuth app-session setup, do not draw it as "open a portal."
- Keep exact technical tokens exact: scope strings, RFC terms, protocol names, URLs, claim names, and media types.
- Caveat maturity honestly: prototype, draft, standard, shipping API, and implementation experiment are different statuses.
- Do not replace an image-based deck with a low-fidelity HTML rendering unless the user asked for that. HTML/PPT export is assembly; the slide image remains the designed artifact.

## Slide Craft

- Titles should carry the argument. Captions should name the takeaway, not describe the drawing.
- Use diagrams for boundaries and transitions: who asks, who decides, who signs, who sees data, who verifies.
- Use live demos to create evidence, and slides to supply the mental model the demo would otherwise force people to infer.
- Prefer one concrete diagram, UI, question, or demo beat per slide. If the slide needs more than one protocol detail, move the detail into notes or a follow-up slide.
- Make the visual deck complete before exporting: final order, no orphan drafts, no stale metadata, and an inspected contact sheet.
- Inspect the full contact sheet for typography drift, repeated accidental branding, inconsistent footer treatments, unreadable small text, and semantic mistakes. Single-slide inspection is not enough.

## Final Checks

- Does every slide map to a source, demo beat, or audience decision?
- Are the claims true under the current spec/repo state?
- Are role boundaries and trust boundaries visible?
- Are there any recurring logos, marks, or visual tics that distract from the talk?
- Would the slide still make sense if the live demo fails and this becomes the fallback explanation?
