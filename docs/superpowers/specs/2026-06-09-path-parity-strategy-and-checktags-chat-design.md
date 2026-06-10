# Path-parity north-star: component-driven strategy + CheckTags on item chat cards (TODO #12) — design

**Date:** 2026-06-09
**Status:** Design — user-approved strategy (component-driven); increment 1 specced below.

## Strategy (user-approved)

TODO #12's original mechanism shipped with the chat-message-subtypes conversion: item cards
snapshot full `system.*` at parity paths, check chat schemas are deep-typed from single-source
shapes, and `buildSchemaFromShape` feeds both sides. `AttackTags` (weapon sheet / character sheet
/ weapon card) proves the cross-surface component-reuse goal.

The remaining north-star ("all fields on all documents on consistent `system.*` paths") proceeds
**component-driven**: each increment converges one duplicated cross-surface display onto a shared
component reading parity paths; schema work happens only where a target surface lacks parity.
Rejected alternatives: a schema-first audit sweep (low yield — follow-ups B/D already converged
the schemas; churn without display payoff) and inventory-only deferral.

Increment queue:

1. **This spec:** shared `CheckTags` replaces the hand-rendered intrinsic check tags in the item
   chat cards' checks block (zero schema change — parity already holds).
2. **CastingCheckTags** (queued in `docs/TODO.md`): the casting-check tag display is hand-rendered
   on three spell surfaces (`SpellChatMessage`, `CharacterSheetSpellCastingCheck`, the spell sheet
   sidebar).
3. Sheet-side write-path reuse stays TODO #20 (unchanged).

Known non-goal: the chat checks **buttons** block does not share `CheckRow` — the chat card rolls
for all controlled characters, has no owner gate, and labels from config rather than
`checkParameters`.

## Increment 1 — CheckTags on the item chat cards' checks block

### Problem

`ItemChatMessageItemChecks.svelte` (the checks block consumed by all 7 item chat cards) hand-
renders the full intrinsic check-tag set — `AttributeCheckTag`, resolve-cost `IconStatTag`,
`ResistedByTag`, `OpposedCheckTag` — duplicating the markup `CheckTags.svelte` owns, plus a dead
`<div class="stat label"></div>` placeholder.

### Change

Replace the card's `.tags` block with `<CheckTags idx={idx}/>`:

- The chat tree's nearest `'document'` context is the message bridge; path parity makes
  `document.data?.system?.check?.[idx]` resolve on the item snapshot — no provider, no schema
  change, no producer change (the AttackTags proof pattern, second instance).
- No `attribute` override is passed: `CheckTags` falls back to the config attribute, which is
  exactly what the card hand-renders today (chat cards have no actor context).
- The four hand-rendered tags, the dead placeholder div, the `.tags` styles, and the six imports
  whose only uses they were (`AttributeCheckTag`, `ResistedByTag`, `OpposedCheckTag`,
  `IconStatTag`, `localize`, `RESOLVE_ICON`) are deleted.
- Buttons block and the `rollItemCheck`/`spendResolve` handlers are untouched.

### Accepted convergences (display deltas)

- Resolve-cost icon converges to `SPEND_RESOLVE_ICON` (shared component) from the card's
  `RESOLVE_ICON`.
- Tag spacing converges to the `tag-container-child-margin` mixin from the card's bespoke
  `.tag` margins.
- The `check-tags-*` testIds appear on chat cards (previously sheet-only). E2E selectors must stay
  container-scoped.

### Verification

- `npm run build` clean; unit suite green.
- Targeted e2e: `item-cards` (all 7 cards render their checks block) + `checks-integration`
  (item check rolls from the card still work) — against the live world if up.

### Documentation

- `docs/TODO.md`: record the approved strategy + increment 1 completion on #12; add the
  decomposed CastingCheckTags item (increment 2).
- titan-codebase skill: CheckTags consumer list gains the item-card checks block.
