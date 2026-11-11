# Personal Dashboard — Visual Baseline

Generated on 2026-08-03 from the supplied three-route UI brief.

## Deliverables

- `night-ritual-mobile.png` — `/night-ritual`, warm and calm bedtime ritual
- `feedback-mobile.png` — `/feedback`, strategy-game feedback tracker
- `roundtable-mobile.png` — `/roundtable`, scholarly daily meeting record

### V2 functional expansion

- `night-ritual-v2-mobile.png` — upgraded ritual home with readiness, current phase, autosave, checklist, reflection, streak, and one completion action
- `night-ritual-entry-detail-mobile.png` — single-night evidence record with score breakdown, completed actions, comparison, sleep-result supplement, edit, and controlled delete
- `feedback-v2-mobile.png` — upgraded feedback home with next milestone, quick action logging, weekly evidence, achievements, and one record action
- `feedback-rhythm-detail-mobile.png` — rhythm attribute detail with level route, XP sources, suggestions, history, and action logging
- `roundtable-v2-mobile.png` — upgraded meeting home with active agenda, seven-step progress, seats, previous conclusion, and recent meetings
- `roundtable-session-detail-mobile.png` — completed session detail with transcript filters, decision, assigned actions, pain-point drill-down, copy, and export

## Shared direction

- Target viewport: 390 × 844, mobile-first
- Dark-only UI with 20px page insets and 12–14px card radii
- Chinese system sans for UI, serif reserved for editorial emphasis, monospace for data
- Restrained borders and shadows; no gradients, glassmorphism, browser chrome, or device frame
- One dominant action or conclusion per screen

## Final prompt set

### Night Ritual

High-fidelity dark mobile UI for `/night-ritual`: gold crescent header, lifespan quality card, three supply channels, five-item bedtime checklist and reflection, seven-cell lamp streak, and one full-width gold shutdown action. Warm bedside-lamp mood using `#0a0a0f`, `#16161e`, `#e8e6e3`, and `#f7d44a`.

### Feedback

High-fidelity dark mobile UI for `/feedback`: Civilization-inspired but original strategy status screen, 2×2 attribute grid with four semantic colors, 2×2 daily actions, compact achievement wall, and seven-day activity heatmap. Rewarding but restrained; no casino effects.

### Roundtable

High-fidelity dark mobile UI for `/roundtable`: indigo scholarly dashboard with horizontally scrollable guest identities, seven-step debate transcript, large core outcome, prioritized pain-point table, and compact meeting stats. Serif only for quotations and conclusions.

These PNGs are a review baseline. Production frontend implementation intentionally waits for design acceptance.

## V2 interaction model

### Night Ritual

```text
Tonight readiness → complete current ritual step → save final sentence
→ complete ritual → open a dated record → add morning sleep result
```

- Autosave protects partially completed rituals.
- Completion and editing remain separate actions.
- The record explains the quality score rather than presenting an opaque number.
- Delete is visible but never the primary action.

### Feedback

```text
See next milestone → log one real action → receive attribute XP
→ inspect attribute evidence → choose a suggested action → reach next level
```

- XP is traceable to actual actions.
- Each attribute detail explains its progress and next unlock.
- Weekly charts summarize evidence; they are not decorative analytics.
- Completed actions use proof-green and available actions use their attribute color.

### Roundtable

```text
Resume today's agenda → progress through seven reasoning steps
→ record the final decision → assign actions → review/export the meeting record
```

- The home screen prioritizes resuming the active meeting.
- The detail view separates transcript, decision, actions, and pain points.
- Speaker filters support long transcripts without adding a separate page.
- Copy and export are quiet utilities; executing the action plan remains primary.

## V2 final prompt set

All six prompts request a complete 390×844 edge-to-edge dark mobile UI, 20px insets, 12–14px cards, 44px minimum touch targets, accurate Chinese text, restrained borders and shadows, no gradients or glassmorphism, and one dominant action.

1. **Night Ritual V2:** readiness score, bedtime target, three-phase ritual progress, 3/5 checklist, editable final sentence with autosave, seven-night lamp streak, expandable quality channel, and completion action.
2. **Night record detail:** completion score and time, explainable score breakdown, timestamped checklist evidence, tomorrow's first step, editorial reflection, previous-night comparison, morning sleep-result supplement, edit, and controlled delete.
3. **Feedback V2:** next attribute milestone, four-stat strip, 2/4 daily action logger, weekly evidence chart, achievement preview, and one action-recording button.
4. **Rhythm detail:** level route, weekly performance, XP source attribution, suggested actions, recent logs, and rhythm action recording.
5. **Roundtable V2:** active agenda, seven-step progress, active speaker, resume action, current seats, previous conclusion, recent meetings, and compact evidence stats.
6. **Roundtable session detail:** meeting metadata, seven-step navigator, filtered key transcript, final decision, assigned actions, pain-point analysis, copy/export utilities, and action-plan execution.
