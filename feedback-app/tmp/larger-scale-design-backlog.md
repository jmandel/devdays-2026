# Larger-scale design/product backlog

These are follow-up ideas worth considering after the low-risk polish pass. They are intentionally not implemented yet because they need product/design judgment or broader refactoring.

## 1. Make projector view feel less like a card stack

The projector route is legible, but it still shares the same card language as attendee/admin pages. A stronger live-display layout could use a dedicated display board treatment for room pulse and audience themes, while keeping controls minimal.

Potential work:
- Larger room-signal/pulse module with display-oriented meters.
- Better empty state that occupies the room display gracefully.
- Stronger visual separation between `Themes` and `Raw questions` modes.

Likely files:
- `src/ui/main.tsx` (`SlidesPage`)
- `src/ui/styles.css`

## 2. Rework admin action hierarchy

The control room now makes `Open projector Q&A` primary and utilities quieter, but it is still a button row/stack. A more refined pattern could reduce button soup further.

Potential work:
- Primary projector action as a standalone callout.
- Secondary utility links grouped as text links or a compact toolbar.
- Clearer distinction between live operation, diagnostics, attendee preview, and export.

Likely files:
- `src/ui/main.tsx` (`AdminPage`)
- `src/ui/styles.css`

## 3. Unify React UI and server-rendered style systems

There are parallel visual systems in `src/ui/styles.css` and server-rendered CSS in `src/server.ts`. This is workable but makes design consistency harder.

Potential work:
- Extract shared CSS tokens/classes.
- Reduce duplicated button/card/status styles.
- Keep server-rendered fallback/admin pages aligned with the React UI.

Likely files:
- `src/ui/styles.css`
- `src/server.ts`

## 4. More deliberate typography system

Current typography is readable but still generic: bold sans headings, uppercase eyebrows, rounded cards. A more distinctive but calm system could make DevDays feel more intentional.

Potential work:
- Reduce overuse of all-caps eyebrows.
- Define page-specific title scales for attendee/admin/projector.
- Consider a subtle editorial treatment for talk titles and live-room headings.

Likely files:
- `src/ui/styles.css`
- `src/ui/main.tsx`

## 5. Better long-title strategy

Long talk titles are common for this event. Current wrapping is functional, but titles can dominate mobile/admin/projector layouts.

Potential work:
- Dedicated long-title CSS with balanced wrapping where supported.
- Optional presenter/time metadata hierarchy improvements.
- Different title scale for admin vs projector vs attendee.

Likely files:
- `src/ui/styles.css`
- `src/ui/main.tsx`

## 6. Improve feedback/rating explanation without adding friction

The compact mobile rating is easier to scan, but numeric-only mobile ratings may benefit from a selected-state explanation or helper text so labels are still visible after choice.

Potential work:
- Show the selected rating label below the scale.
- Keep full labels on desktop.
- Preserve native radio semantics and tap targets.

Likely files:
- `src/ui/main.tsx` (`AttendeePage`)
- `src/ui/styles.css`

## 7. Define empty-state strategy across roles

Empty states exist but are inconsistent in tone and specificity. Projector, attendee, and admin need different empty-state language.

Potential work:
- Attendee: reassuring and action-oriented.
- Projector: room-display friendly.
- Admin: operationally informative.

Likely files:
- `src/ui/main.tsx`
- Some server-rendered pages in `src/server.ts`
