# SMART Ecosystem Image-Based Deck

Final deck source: `slides/slide-NNN.png`, assembled into `deck.html` and `deck.pptx`.

This deck uses generated slide images as the primary visual artifact. The style follows the SMART Evolution reference at a high level: clean white canvas, large charcoal type, teal horizontal bands, thin connector lines, rounded UI panels, and restrained blue/green/orange/purple accents. It intentionally avoids recurring SMART logos, multicolor asterisks, star marks, and watermarks.

Reference roles for regeneration:

- SMART Evolution timeline screenshot: use only for global palette, whitespace, thin connector linework, and clean standards-presentation feel. Do not copy the SMART logo, star/asterisk mark, or exact timeline layout.
- Slide 1 of this deck: use as the typography/header exemplar. Copy title weight, title placement, subtitle scale, margin rhythm, teal-band treatment, and overall density. Do not copy slide 1 content into other slides.
- Existing `slides/slide-NNN.png`: use as the per-slide content and layout reference for slide NNN. Preserve its factual content and composition intent while aligning typography and header treatment to slide 001.

Feedback incorporated:

- Launch is shown as SMART/OAuth app-session setup, not as "open a portal".
- EHR launch starts inside an EHR or portal context and receives launch context.
- Standalone launch starts in the app, uses `iss = FHIR base URL`, then proceeds through authorize, token, and FHIR access.
- `https://launch.smarthealthit.org/` is included as a practical testing surface, with a distinct sample app launch URL.
- The demo flow says "Redirect to authorize" rather than "Redirect to portal".
- Scopes are treated as capability names, with policy and real-world authority shown as separate questions.
- The reusable-surfaces slide avoids "ecosystem jobs" phrasing and uses "Same primitives. New trust and authorization patterns."

Working sources:

- `final-image-sequence/slides/` preserves the final ordered image sequence.
- `final-image-sequence/source/` preserves newly generated source images for the surfaces, launch-semantics, and SMART Launcher slides.
- `slides-1672/` preserves the accepted original generated sequence at `1672x941`.
- `slides-1920/` and `slides/` contain the standard-resolution `1920x1080` sequence used by current `deck.html` and `deck.pptx`.
- `regeneration-tests/slide-1-regenerated-requested-1920-returned-1672.png` records a built-in image-generation test where the prompt requested exact `1920x1080` but the tool returned `1672x941`; final standard resolution was therefore produced by high-quality Lanczos normalization after generation.
- `html-render-backup/` preserves the discarded deterministic HTML-rendered attempt for reference only.
