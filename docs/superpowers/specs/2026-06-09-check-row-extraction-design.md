# Shared check-row extraction (TODO #23) — design

## Problem

After the CheckTags extraction (embedded-context conversion, Stage 3),
`CharacterSheetItemCheck.svelte` and `CharacterSheetEffectCheck.svelte` are byte-identical in
template and styles (~115 lines each; only the roll-handler name differs). Only the scripts'
options-building differs: the item row captures a static `itemId` once (provider instances are
id-keyed), while the effect row builds fresh `itemRollData` from the effect at derive/roll time
(the item-check engine cannot resolve an effect from the item collection).

## Decision

Extract one shared presentational component, **`src/document/svelte-components/check/CheckRow.svelte`**
(sibling of the shared `CheckTags.svelte`; user-approved name/location). The two consumers keep
their options-building scripts and pass display/roll wiring down.

### CheckRow API

- Props: `checkParameters` (`ItemCheckParameters | undefined`), `checkIdx` (`number`), `onRoll`
  (`() => void` callback, per the codebase's callback-prop convention).
- Renders nothing when `checkParameters` is undefined (the `{#if checkParameters}` gate moves into
  CheckRow; consumers render `<CheckRow …/>` unconditionally).
- Reads the `'document'` (embedded item/effect bridge) and `'sheetDocument'` (actor bridge)
  contexts internally — both consumers render under an `EmbeddedDocumentProvider`, and the shared
  `CheckTags` sets the same precedent. Used for the owner-gate (`!document.data?.isOwner`) and
  `sheetDocument.data.system.spendResolve(...)`.
- Reads the `autoSpendResolveChecks` setting internally (it only selects the button layout).
- Template + styles move verbatim from the two consumers (buttons block: combined vs split
  check/spend-resolve buttons; stats block: `CheckTags` + dice/training/expertise `IconStatTag`s).

### Consumers after the extraction

- `CharacterSheetItemCheck.svelte`: keeps the static `checkOptions` (`itemId` + `checkIdx`)
  capture, the `checkParameters` `$derived`, and `rollItemCheck()`; renders
  `<CheckRow {checkParameters} {checkIdx} onRoll={rollItemCheck}/>`.
- `CharacterSheetEffectCheck.svelte`: keeps `getCheckOptions()` (fresh `itemRollData` passthrough),
  the `checkParameters` `$derived`, and `rollEffectCheck()`; renders the same way.

## Non-goals / invariants

- Zero behavior change: same DOM, same classes/styles, same owner-gating, same roll and
  spend-resolve wiring. No engine (`CharacterDataModel`) changes.
- All surfaces that compose the two consumers (7 item-type rows via `CharacterSheetItemChecks`,
  effect rows + Effect HUD via `CharacterSheetEffectChecks`) are untouched.

## Verification

- `npm run build` clean; unit suite green (221).
- Targeted e2e: the check-roll and effect-check surfaces (`checks-integration.spec.js`,
  `embedded-context-effects.spec.js`, `effect-hud.spec.js`) if the e2e world is available;
  otherwise full-suite verification deferred to the user-gated world launch.
