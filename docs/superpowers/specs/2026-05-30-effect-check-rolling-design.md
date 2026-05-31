# Effect check-rolling from the character-sheet row — Design

**Date:** 2026-05-30
**Backlog item:** #4 (Active Effects conversion — related items)
**Status:** Approved — pending implementation plan

## Goal

Restore inline check-roll buttons on effect rows in `CharacterSheetEffect`,
matching item-check rows in look and behavior (stat tags, resolve-cost button,
options dialog), by driving the **existing** item-check engine through its
`itemRollData` passthrough branch.

## Background

Effects are now native Active Effects (`TitanActiveEffect`) and carry a
`check[]` array built from the same `createItemCheckTemplate()` shape as items
(`TitanActiveEffectDataModel`, schema field `check`). They are editable on the
AE sheet and can be posted via `sendToChat`, but the inline roll-from-row
affordance on `CharacterSheetEffect` was dropped during the conversion.

## Key principle — the engine is already source-agnostic

The item-check engine on `CharacterDataModel` already branches on
`options.itemRollData` and never touches `actor.items.get(id)` when roll data is
supplied directly:

- `validateItemCheckOptions` — `options.itemRollData ?? this.parent.items.get(...)`
- `initializeItemCheckOptions` — `options.itemRollData ? ... : this.parent.items.get(...)`
- `getItemCheckParameters` — same branch
- `createItemCheckOptions` preserves `itemRollData` (so it survives the
  `initialize → getParameters` hand-off)
- `ItemCheckDialog` / `ItemCheckDialogShell` re-roll and recompute entirely from
  the `$checkOptions` store (which carries `itemRollData`)
- `ItemChatMessageItemChecks` (the chat report) re-rolls via
  `requestItemCheck({ itemRollData: item, checkIdx })` using flag roll data

The effect chat card already exercises this exact path end-to-end: `sendToChat`
spreads `getRollData()` flat onto the titan flags, and rolling a check from that
card calls `requestItemCheck` with `itemRollData`. The sheet row is the only
missing surface.

**Therefore `CharacterDataModel` and the `TitanCheck`/`ItemCheck` classes get no
changes.**

## Changes

### 1. `TitanActiveEffectDataModel.getRollData()` — one-line addition

Add `retVal.description = this.parent.description;`.

Item roll data already carries `description`, which `getItemCheckParameters`
reads into `parameters.itemDescription` for the resulting check chat card.
Effect roll data currently omits it, so a check rolled from the row would
produce a card with a blank description. Adding it restores parity.

(This also makes `sendToChat`'s explicit `description` spread redundant, but
simplifying `sendToChat` is out of scope.)

### 2. `CharacterSheetEffectChecks.svelte` (new)

Mirror of `CharacterSheetItemChecks.svelte`.

- Prop: `effect` (the reactive bridge element from `document.data.effects`).
- Iterates `effect.system.check` keyed by `check.uuid`.
- Renders one `CharacterSheetEffectCheck` per check, passing
  `effectId={effect.id}` and `checkIdx`.
- Same `.checks` / `.check` layout and SCSS as the item version.

### 3. `CharacterSheetEffectCheck.svelte` (new)

Mirror of `CharacterSheetItemCheck.svelte`. Differs only in how it resolves its
source document.

- Props: `effectId`, `checkIdx`.
- Resolve reactively: `$derived` reads `document.data.effects.get(effectId)`,
  guards `effect?.system.check.length > checkIdx`, and builds
  `checkOptions = { itemRollData: effect.getRollData(), checkIdx }`.
- Display params:
  `document.data.system.getItemCheckParameters(
     document.data.system.initializeItemCheckOptions(checkOptions))`.
- Roll: `document.data.system.requestItemCheck(checkOptions)`.
- Resolve-cost spend: `document.data.system.spendResolve(resolveCost)`
  (actor-level — identical to the item path).
- Reuses `ItemCheckButton`, `SpendResolveButton`, `AttributeCheckTag`,
  `IconStatTag`, `ResistedByTag`, `OpposedCheckTag`, and the
  `autoSpendResolveChecks()` setting — visually identical to item check rows.

### 4. `CharacterSheetEffect.svelte` — wiring

Add a checks section gated on `{#if effect.system.check.length > 0}`, rendering
`CharacterSheetEffectChecks`. Place it after the description `.section` and
before the tags `.section`, following the existing `.section` border/spacing
pattern.

## Why new effect-specific components instead of generalizing the item pair

The item components are coded around `itemId` + `document.data.items.get`. New
effect-specific components resolve from `document.data.effects` and leave the
working item UI untouched — zero regression risk — while still funneling into
the shared engine. The duplication is two small presentational components.

## Data flow

```
CharacterSheetEffectCheck
  → requestItemCheck({ itemRollData, checkIdx })
    → (shift / setting)  _createItemCheckDialog  →  ItemCheckDialog (re-rolls from checkOptions)
    → (otherwise)        rollItemCheck
       → getItemCheckParameters (reads itemRollData)
       → new ItemCheck(params)
       → _rollCheck → check.sendToChat → ChatMessage
                                          → ItemChatMessageItemChecks (re-roll/resolve from flag rollData)
```

Identical to the existing effect-chat-card roll, now also reachable from the
sheet row.

## Testing

**Quench (in-client):**

- An effect carrying a `check[]` (covering damage, resolve cost, and opposed
  variants) renders check buttons + stat tags on its sheet row.
- Rolling a check from the row produces the same chat card as rolling the same
  check from that effect's chat card.
- The resolve-cost button spends resolve (auto-spend and split-button modes).
- Holding the options modifier opens `ItemCheckDialog`; adjusting and re-rolling
  works (driven by `itemRollData`, no `itemId`).

**Regression:**

- Item check rows render and roll unchanged.
- An effect with no checks renders no checks section.

## Out of scope

- Confirm-delete dialog for effects (backlog #5).
- Native visual-active-effects panel (backlog #3).
- Simplifying `sendToChat`'s now-redundant explicit `description` spread.
