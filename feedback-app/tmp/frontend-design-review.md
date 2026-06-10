# DevDays Feedback/Q&A Frontend Design Review

Review lens: Anthropic `frontend-design` skill principles, applied as a design lead: create a distinct identity grounded in the product context; spend boldness on one justified signature element; keep the rest restrained; verify responsive/accessibility/reduced-motion basics; prefer specific, plain copy; avoid button soup and layout wrapping issues.

Repository: `/home/exedev/devdays-2026`  
App: `feedback-app`  
Service reviewed: `http://localhost:8000`  
Theme context: local commit `4d43f19` softened the previous dark neon/cyber theme to a mint/off-white theme.  
Source files were not modified for this review.

## Routes reviewed

- `/` — public room chooser
- `/t/smart` — attendee talk page with slides link, live pulse, public Q&A, private feedback
- `/slides/t/smart/qa` — projector/live room Q&A view
- `/admin/talks/smart` — operator/control room
- Also briefly viewed `/admin/dashboard` during login flow to reach the control room

## Runtime observations

- No app runtime errors were observed on the reviewed routes.
- Browser console showed only development/info logs from React DevTools and Bun HMR.
- One expected/intentional `401 POST /admin/login` occurred while testing an incorrect key path; subsequent authenticated admin access worked.
- Admin key/capability details were not recorded in this report.

## Overall assessment

The redesign successfully moves the product away from an intimidating dark/cyber aesthetic. It now feels calm, safer, and more appropriate for healthcare-adjacent conference feedback. The flows are understandable, the copy is mostly plain, and the interface supports the user's preference for automatic workflows over lots of controls.

The tradeoff is that the current look is now close to a generic clean SaaS/card UI: off-white background, rounded white panels, green buttons, uppercase eyebrows, and subtle borders. It is functional and friendly, but not yet very specific to **DevDays**, **live rooms**, **audience signal**, or **feedback/Q&A**.

The next design step should not be to add more decoration everywhere. Instead, add one intentional signature visual system around the idea of a **live room signal / pulse**, and keep the rest of the UI restrained.

## What works well

### Tone and palette

- The mint/off-white background is much less scary than the prior neon/cyber direction.
- The green primary color feels positive and action-oriented without being aggressive.
- The soft background gradients on wide screens help prevent the pages from feeling stark.
- The theme is likely more trustworthy for a healthcare/data interoperability audience than the earlier dark style.

### Attendee flow clarity: `/t/smart`

The attendee page is ordered around the real job-to-be-done:

1. Identify the talk.
2. Open slides.
3. Tap a live pulse quickly.
4. Ask a public question.
5. Send private feedback.

This is the right hierarchy. The page does not require login, does not explain too much, and does not expose organizer concepts to attendees.

The phrase **“How is this landing right now?”** is especially strong. It is human, specific, and immediately understandable.

### Public room chooser: `/`

- Room cards are clear and scan well.
- The recent desktop layout appears to handle long titles better than before: title text stays in the left column while the `Open room` button remains stable on the right.
- Mobile stacking behavior looks sane: actions move below content instead of fighting the title width.
- “Open the public page for slides, live Q&A, and private feedback” accurately describes the destination.

### Projector view: `/slides/t/smart/qa`

- Strong legibility for a room display.
- Large title and generous spacing are appropriate for projected content.
- The page avoids presenter/operator controls, which is good.
- The segmented `Themes / Raw questions` switch is a reasonable single control for live display mode.
- Empty state is not alarming.

### Admin/control room: `/admin/talks/smart`

- The admin route emphasizes automation: “Questions are accepted automatically. Themes update as attendees ask and vote.” This aligns with the user's preference for simple automatic workflows.
- There is not too much operational chrome for the empty-state case.
- Feedback map and Q&A themes are conceptually separated.
- The action set is understandable: projector, AI log, public page, export.

## What feels generic or templated

### Repeated card pattern

Across attendee, projector, admin, and room chooser, the main visual structure is mostly:

- rounded white/off-white card;
- thin mint border;
- subtle shadow;
- uppercase green eyebrow;
- bold black heading;
- muted gray-green body text;
- green pill button.

That is clean but common. Because every section uses nearly the same treatment, the app lacks a clear “this is the live feedback product” moment.

Relevant likely selectors/components:

- Global card style: `.card`
- Public room card style in server-rendered CSS: `.room-card`, `.room-card-title`, `.room-card-action`
- Attendee sections in `feedback-app/src/ui/main.tsx`: `AttendeePage`, especially the pulse, Q&A, and private feedback sections
- Projector sections in `SlidesPage`
- Admin sections in `AdminPage`

### The green button is doing too much identity work

The filled green primary button is currently the strongest brand element. It appears on:

- `Open room`
- `Open slides`
- `Submit question`
- `Send feedback`
- `Create`
- admin/control links in some contexts

Because it is used broadly, it no longer clearly communicates the single next best action. It also makes the product identity feel like “generic green SaaS” rather than DevDays/live audience feedback.

Relevant likely selectors:

- `.btn`
- `.btn.primary` in React UI
- `.btn-primary`, `.btn-ghost`, `.btn-outline` in server-rendered CSS

### Typography is readable but not distinctive

The heavy headings are effective, but the combination of bold sans, uppercase eyebrow labels, and pill buttons is a familiar startup-dashboard pattern. It is not wrong, but it does not yet add a DevDays/conference/live-room point of view.

Potential refinements:

- Keep the strong type scale, but reduce the number of all-caps labels.
- Use one distinctive typographic treatment for live-state modules, not every section.
- Consider slightly more editorial headings on admin/projector views.

### Page roles are not visually differentiated enough

The attendee page, projector view, and admin control room have different audiences and contexts, but they share very similar surfaces.

- Attendee should feel quick and thumb-friendly.
- Projector should feel like a live broadcast/display surface.
- Admin should feel like a calm control dashboard.

Right now, all three primarily feel like card stacks.

## One possible signature visual idea

### “Live room signal” / “room pulse” motif

Introduce a restrained visual motif based on the idea that the app captures live signal from the audience. This can make the interface feel specific to DevDays feedback without returning to cyberpunk/neon.

Possible treatments:

1. **Pulse rings behind live modules**
   - A very soft radial/concentric pulse behind the talk title or live pulse card.
   - Use low-opacity mint/blue-green rings.
   - Avoid high-contrast glow.

2. **Signal line beside `LIVE`**
   - Add a tiny animated waveform or three-bar signal indicator next to the `LIVE` pill.
   - Only animate under `@media (prefers-reduced-motion: no-preference)`.
   - Static fallback for reduced motion.

3. **Pulse card as the signature component**
   - Give the attendee `Live pulse check` section a unique treatment: subtle gradient, tiny “signal” rail, or calm ring accent.
   - Keep Q&A and private feedback plain, so the signature element has room to matter.

4. **Projector “room signal” panel**
   - On `/slides/t/smart/qa`, make the `Room pulse` card feel more like a live room instrument: small meter bars, signal line, or ambient pulse background.
   - This is an ideal place for the signature element because it is literally the live room view.

Suggested implementation locations:

- CSS defining reusable motif classes, likely in the app stylesheet served through `feedback-app/src/ui` or server CSS in `feedback-app/src/server.ts` depending on current style split.
- React components in `feedback-app/src/ui/main.tsx`:
  - `Status` for the `LIVE` pill/signal indicator.
  - `AttendeePage` pulse section.
  - `SlidesPage` room pulse panel.
  - Potentially `AdminPage` feedback map, but more subtly.

Design guidance: spend boldness here only. Do **not** add the motif to every card, button, and background.

## Prioritized recommendations

### 1. Create a distinct pulse/signal component and use it in only 2–3 places

Priority: High  
Why: Adds product-specific identity without making the UI busy.

Recommended target areas:

- `Status` component in `feedback-app/src/ui/main.tsx` for `LIVE` states.
- Attendee pulse section in `AttendeePage`:
  - Current heading: `Live pulse check`
  - Current title: `How is this landing right now?`
  - Current classes: `.card`, `.choice-grid`, `.chip`, `.tap`
- Projector room pulse panel in `SlidesPage`:
  - Current heading: `Room pulse`
  - Current classes: `.pulse-compact`, `.pulse-row`, `.pulse-chip`, `.mini-bar`

Possible selectors/classes to add:

- `.live-signal`
- `.live-signal::before`
- `.pulse-card`
- `.pulse-orbit`
- `.status.live`

Reduced-motion requirement:

```css
@media (prefers-reduced-motion: no-preference) {
  .live-signal::before {
    animation: signalPulse 3s ease-out infinite;
  }
}
```

Keep animation slow and subtle; avoid blinking. A prior dark/cyber theme likely felt scary partly because of high contrast and tech-noir cues. This should feel more like a calm vital sign or room heartbeat.

### 2. Strengthen button hierarchy to reduce “green button everywhere”

Priority: High  
Why: Preserves simplicity while preventing button soup and generic SaaS feel.

Specific suggestions:

- Keep filled green only for the primary next action in each local context:
  - `/`: `Open room` can remain primary.
  - `/t/smart`: `Submit question` and `Send feedback` can be primary, but `Open slides` might be secondary if the session page's main job is feedback/Q&A.
  - `/admin/talks/smart`: `Open projector Q&A` may be the main action; `AI processing log`, `Open public page`, and `Export CSV` should be quieter.
- Use outline/quiet styles for navigational or secondary actions.
- Consider a small “link group” treatment in admin rather than four equally chunky buttons.

Relevant files/components/selectors:

- `feedback-app/src/ui/main.tsx`
  - `AttendeePage`
  - `AdminPage`
  - `AdminDashboard`
- CSS selectors:
  - `.btn`
  - `.btn.primary`
  - `.btn.quiet`
  - `.btn.outline`
  - server-rendered equivalents `.btn-primary`, `.btn-ghost`, `.btn-outline`

### 3. Differentiate attendee, projector, and admin page surfaces

Priority: High  
Why: Different contexts need different visual rhythms.

Recommendations:

#### Attendee `/t/smart`

- Keep a narrow, thumb-friendly single column.
- Make the pulse section the visually special component.
- Keep Q&A and private feedback plain and form-like.
- Avoid adding more controls.

#### Projector `/slides/t/smart/qa`

- Reduce default card feeling; make it feel more like a display board.
- The large title works, but the content panels could use stronger internal hierarchy for live data.
- Consider making `Room pulse` a horizontal live meter module with the signature signal treatment.

#### Admin `/admin/talks/smart`

- Treat as a dashboard rather than attendee cards.
- Make the top action row more compact and grouped.
- Keep the feedback map data-dense and calm.

Relevant files/components:

- `feedback-app/src/ui/main.tsx`
  - `AttendeePage`
  - `SlidesPage`
  - `AdminPage`
- Likely CSS classes:
  - `.shell`
  - `.card`
  - `.top`
  - `.grid`
  - `.spread`
  - `.metric-row`
  - `.bar`

### 4. Fix mobile admin title/LIVE positioning

Priority: Medium-high  
Why: The route works, but the mobile header feels cramped and the `LIVE` pill floats awkwardly beside a multi-line title.

Observed on `/admin/talks/smart` at ~390px wide:

- The long title breaks into many lines: “SMART Across / the Ecosystem: / App Launch, / Permission / Tickets, and / More”.
- `LIVE` sits to the right around mid-title height.
- This is not broken, but it feels accidental.

Recommendation:

At small breakpoints, make the header vertical:

- brand line
- `LIVE` pill
- title
- presenter

Or place `LIVE` directly under/above title in normal flow.

Likely target:

- `AdminPage` top area in `feedback-app/src/ui/main.tsx`
- CSS selectors `.top`, `.brand`, `.status` or equivalent

### 5. Make mobile private feedback rating more compact

Priority: Medium  
Why: It is readable and accessible, but the current vertical cards make the form feel long.

Observed on `/t/smart` mobile:

- Rating options 1–5 become five large stacked cards.
- This consumes significant vertical space before the comment field and topic chips.

Recommendations:

- Use a compact segmented scale where each option still has a large tap target.
- Consider two-line layout: numbers in one row, labels below the selected number only.
- Or use 5 equal columns on mobile if labels are shortened/hidden accessibly.

Relevant component/selectors:

- `AttendeePage` private feedback form in `feedback-app/src/ui/main.tsx`
- `.rating-scale`
- `.rating-option`
- `.rating-option.selected`

Accessibility requirement:

- Keep native radio inputs or equivalent ARIA radiogroup behavior.
- Do not sacrifice tap target size below comfortable mobile dimensions.

### 6. Simplify/rewrite a few labels and empty states

Priority: Medium  
Why: Copy is already decent; small changes can make it more human and less system-generated.

Suggestions:

- Current: `Public Q&A question for Josh Mandel`  
  Suggested: `Your question for Josh Mandel`

- Current placeholder: `Ask a concise question for the presenter…`  
  Suggested: `Ask what you want clarified…` or keep as-is if concise is important.

- Current projector empty state: `No answerable themes yet. Switch to Raw questions to see the latest submissions.`  
  Suggested for projector: `No themes yet — questions will appear here as the room submits them.`

- Current admin empty state: `No answerable themes yet. Recent raw submissions may still be queued or need more detail.`  
  This is useful for operators; keep or slightly shorten.

- Current repeated privacy text: `Private to the presenter/organizer` appears multiple times. It is clear, but consider saying it once strongly near the private feedback area and shorter elsewhere.

Relevant file:

- `feedback-app/src/ui/main.tsx`

### 7. Check and strengthen focus states

Priority: Medium  
Why: Visual focus appeared subtle in the screenshots; this app will be used in a live event on varied devices.

Recommendations:

- Ensure all buttons, links, chips, segmented controls, textareas, and rating options have a visible focus style.
- Do not rely only on a slight border color change.
- Suggested focus pattern: 2–3px outline in green/teal with a small offset, while preserving rounded corners.

Likely selectors:

- `button:focus-visible`
- `a:focus-visible`
- `textarea:focus-visible`
- `input:focus-visible`
- `.chip:focus-visible`
- `.rating-option:focus-within`
- `.segmented button:focus-visible`

### 8. Revisit uppercase eyebrow labels

Priority: Low-medium  
Why: They provide structure, but overuse contributes to templated feel.

Current examples:

- `TALK`
- `LIVE PULSE CHECK`
- `PUBLIC Q&A`
- `PRIVATE FEEDBACK TO PRESENTER`
- `RUN Q&A`
- `FEEDBACK MAP`

Recommendations:

- Keep eyebrows where they help scanning, especially admin/dashboard areas.
- Use fewer on attendee pages; the section headings are already clear.
- Consider making `Live pulse check` title-case instead of all caps if the signature signal motif carries the “live” feeling.

Relevant selector:

- `.eyebrow`

## Accessibility notes

### Positive observations

- Forms appear to use actual labels for key inputs.
- The private rating scale appears to use radio inputs, which is good for semantics.
- Status messages use `role="status"` in some places, which is appropriate.
- The UI is not dependent on hover-only interactions.
- Text contrast appears generally strong: dark ink on off-white/mint backgrounds.

### Recommendations

1. **Focus visibility**
   - Strengthen `:focus-visible` styles globally.
   - Chips and rating cards especially need obvious keyboard focus.

2. **Reduced motion**
   - Current static UI is safe.
   - If adding the proposed pulse/signal motif, implement animation only inside `prefers-reduced-motion: no-preference`.
   - Provide static visual equivalents when motion is reduced.

3. **Status and live updates**
   - Ensure live Q&A updates do not over-announce to screen readers.
   - Use polite live regions only for explicit attendee actions such as successful pulse/question/feedback submission.

4. **Rating scale semantics**
   - Preserve native radio behavior or equivalent ARIA semantics if restyling.
   - If labels are visually shortened on mobile, keep full label text available to assistive tech.

5. **Touch targets**
   - Current mobile pulse buttons and rating options are comfortably large.
   - If compacting rating, maintain adequate tap area.

## Responsive notes

### Desktop

- `/` room chooser: works well; long titles no longer collide with the right-side `Open room` button.
- `/t/smart`: readable narrow column; lots of vertical whitespace but appropriate.
- `/slides/t/smart/qa`: strong room-display layout; title dominates appropriately.
- `/admin/talks/smart`: good width and data visibility, though top action row could be more organized.

### Mobile

Observed around 390px wide.

#### `/t/smart`

- Header and talk card fit well.
- Pulse choices stack into large tap targets; this is good.
- Private feedback rating is very tall; consider compacting.
- Topic chips wrap acceptably and do not appear broken.

#### `/admin/talks/smart`

- Long title wraps heavily.
- `LIVE` pill placement feels awkward beside the multi-line title.
- The four admin action buttons stack cleanly, but they visually dominate the first control card.
- Consider grouping or de-emphasizing secondary admin actions on mobile.

#### `/`

- Room card responsive behavior looked appropriate in the desktop screenshot and server CSS suggests sensible mobile stacking:
  - `.room-card { grid-template-columns: 1fr }`
  - `.room-card-action { justify-content: flex-start }`
  - `.room-card-action .btn { width: 100%; max-width: 220px }`

## Specific component/file map

Primary file for React UI:

- `feedback-app/src/ui/main.tsx`

Important components/areas seen in source excerpts:

- `App` route switch
- `AttendeePage`
  - talk hero
  - live pulse check
  - public Q&A form
  - private feedback form
- `SlidesPage`
  - live room title
  - room pulse
  - themes/raw segmented switch
- `AdminPage`
  - control room header
  - action links
  - feedback map
  - synthesized presenter themes
- `AdminDashboard`
  - rooms overview and create talk form
- `Status`
  - used for `LIVE`, `OPEN`, connection/status badges
- `PublicQuestionRow`, `ThemeRow`
  - likely affected if Q&A visual hierarchy changes

Styles appear split between React CSS and server-rendered CSS. Server-rendered layout/CSS is in:

- `feedback-app/src/server.ts`

Selectors/classes referenced or likely relevant:

- `.shell`
- `.container`
- `.card`
- `.top`
- `.brand`
- `.eyebrow`
- `.btn`
- `.btn.primary`
- `.btn.quiet`
- `.btn.outline`
- `.btn-primary`
- `.btn-ghost`
- `.btn-outline`
- `.chip`
- `.tap`
- `.choice-grid`
- `.rating-scale`
- `.rating-option`
- `.segmented`
- `.pulse-compact`
- `.pulse-row`
- `.pulse-chip`
- `.mini-bar`
- `.metric-row`
- `.bar`
- `.room-card`
- `.room-card-title`
- `.room-card-action`
- `.notice`
- `.muted`

## What I would not change

- **Do not return to the dark neon/cyber theme.** The new lighter direction is much closer to the user's stated preference.
- **Do not add a lot more buttons or workflow controls.** The product's strength is that attendees can tap/ask/respond and organizers get automatic synthesis.
- **Do not make attendees choose modes or categories before asking a question.** Keep public Q&A friction low.
- **Do not over-brand every surface.** One signature live-signal element is enough; the rest should stay calm.
- **Do not reduce the clarity of privacy boundaries.** Public Q&A vs private presenter feedback is an important distinction and currently understandable.
- **Do not make projector view dense.** It should remain legible at room scale.
- **Do not sacrifice mobile tap target size while compacting the rating scale.** The current form is tall, but it is usable.
- **Do not hide operational state from admins.** Admin empty states and feedback counts are useful, even if they can be visually refined.

## Suggested design direction summary

Keep the softened mint/off-white foundation. Add one memorable, calm **live room signal** visual treatment around the pulse/live modules. Then reduce generic SaaS signals by tightening button hierarchy, varying card surfaces by page role, compacting a few mobile layouts, and making copy slightly more human. The result should feel less scary than the old cyber theme, but more specific and intentional than a default green card UI.
