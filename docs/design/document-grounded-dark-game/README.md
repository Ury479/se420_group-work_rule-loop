# RuleLoop — Document-Grounded Dark Game UI

Generated after a complete review of the repository product and architecture baseline.

## Documents used

- `README.md`
- `docs/FEATURE.md` v0.2
- `docs/ARCHITECTURE.md` v0.2
- `docs/PRD-CONSUMPTION-CONVERTER.md` v1.0
- `spec/design-impulse-spend-converter.md` v1.0
- `design-system/MASTER.md` v0.2

## User visual override

The product documents originally specify a light, non-gamified Decision Trace and defer dark mode. The user explicitly chose to retain the established dark gamified strategy-dashboard style for future screens. This set therefore preserves the documents' information architecture, business rules, privacy constraints, state semantics, and single-primary-action rule while applying the user's preferred dark game visual language.

The existing `docs/design/personal-dashboard/feedback*.png` assets are not replaced or modified by this set.

## Core route screens

- `01-home.png` — `/`, current objective, behavior loop, pending work, recent trace
- `02-record.png` — `/record`, fact capture and transparent review admission gate
- `03-event-detail.png` — `/events/[id]`, event-to-review-to-rule-to-evidence trace
- `04-reviews.png` — `/reviews`, high-impact-first review queue
- `05-review-workbench.png` — `/events/[id]/review`, minimum action and existing-rule match
- `06-rules.png` — `/rules`, status/scene filtering and evidence summaries
- `07-rule-detail.png` — `/rules/[id]`, executable rule, metrics and validation history
- `08-archive.png` — `/archive`, derived evidence timeline

## Consumption conversion screens

- `09-convert-input.png` — `/convert`, amount, stage, privacy label and 1–5 anchors
- `10-convert-result-cooldown.png` — `/convert/[id]`, three primary equivalents, immutable snapshot and cooldown
- `11-convert-resolve.png` — `/convert/[id]/resolve`, final outcome, protected amount, redirected amount and rule evidence

## Product invariants preserved

- A normal first-time, non-high-impact event is archived and does not create a rule.
- A repeated or high-impact event enters review.
- Existing rules are suggested but never linked automatically.
- Rule effectiveness is derived from validations; it is not an XP reward.
- Archive entries are derived from events, reviews, rules and validations.
- Conversion snapshots remain immutable after catalog or rate changes.
- Protected amount and redirected amount are separate facts.
- Sensitive categories use neutral display labels and remain local-first.
- Every screen has one dominant action; destructive or utility actions remain secondary.

## Final prompt set

All prompts requested a complete 390×844 mobile UI using `#0f1117` background, `#181b24` panels, warm gold primary actions, semantic red/purple/green/cobalt attributes, strategy-game status panels, tech-tree connections and restrained evidence shields. Prompts explicitly prohibited gradients, glassmorphism, casino effects, shame language, decorative XP, sensitive-category disclosure and multiple competing primary actions.
