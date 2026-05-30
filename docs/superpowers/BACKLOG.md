# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.

## Active Effects conversion — related items

The "Effects → TitanActiveEffect" effort is specced in
`specs/2026-05-30-titan-active-effects-conversion-design.md`. The following were
split off to keep that spec focused.

### 1. Convert Conditions to rules elements

- **What:** Reimplement every condition's mechanical effect as `rulesElement[]`
  entries on its `TitanActiveEffect`, then retire the hardcoded
  `CharacterDataModel._applyConditions` logic. Fully unifies the mechanical
  engine so conditions and effects derive their stats the same way.
- **Why deferred:** The current rules-element operations (`flatModifier`,
  `mulBase`, conditional/turn/message types) cannot express several condition
  mechanics. New operations are required first:
  - a **halve/multiply-of-total** operation (prone halves speed, sleep halves
    awareness — `mulBase` only multiplies the *base*, not the computed total);
  - a **set/floor** operation (restrained sets speed to 0);
  - a **multi-target / "all" selector** (contaminated hits all attributes and
    all resistances — today that needs ~10 hand-authored `flatModifier`s).
- **Risk:** Behavior drift in condition math. Needs careful parity testing
  against the current `_applyConditions` results.
- **Note:** Condition mechanics that already map cleanly today: blinded
  (−1 melee/accuracy/defense), stunned (−1 defense).
- **Depends on:** The "Effects → TitanActiveEffect" spec (conditions are already
  `TitanActiveEffect` instances after it; their mechanics still run through
  `_applyConditions`).

### 2. Custom sidebar-tab effect directory

- **What:** A custom sidebar-tab directory (ApplicationV2 + Svelte) presenting a
  browsable library of reusable effects, backed by the ActiveEffect compendium
  (or a world-setting store), as a dedicated top-level tab.
- **Why deferred:** A *native* world ActiveEffect tab is impossible without
  forking the Foundry engine (`ActiveEffect` is not a `WORLD_DOCUMENT_TYPE`; the
  world-collection init list is hardcoded; the server vends world data per
  hardcoded type). The conversion spec delivers the reusable library via a native
  compendium instead. A custom tab is a heavier, non-standard enhancement on top.
- **Depends on:** The compendium shipped by the conversion spec.

### 3. Native visual-active-effects-style panel

- **What:** Build a native, in-system panel that displays active effects with
  their descriptions on the character UI — replacing the dependency on the
  third-party `visual-active-effects` module. Until this lands, the conversion
  spec keeps setting `flags['visual-active-effects.data.content']` on effects so
  the module still works for users who have it.
- **Reference source:** Zhell's `visual-active-effects` —
  https://git.gay/Zhell/visual-active-effects
- **Depends on:** The "Effects → TitanActiveEffect" spec (effects are native AEs
  with native `description`).

### 4. Effect check-rolling from the character-sheet row

- **What:** Effect rows on the character sheet no longer render inline
  check-roll buttons. The item-check roll path (`getItemCheckParameters` /
  `requestItemCheck`, resolving via `actor.items.get(id)`) is item-collection
  coupled, so rolling an effect's `system.check[]` from the row would crash.
  Effects still carry `check[]` (editable on the AE sheet, posted via
  `sendToChat`); only the inline roll-from-row affordance is missing.
- **To do:** Add an effect-scoped check path on `CharacterDataModel`
  (parallel to the item-check path — `getEffectCheckParameters` /
  `requestEffectCheck`, resolving via `actor.effects.get(id)`) and render the
  check buttons on `CharacterSheetEffect`.
- **Depends on:** The "Effects → TitanActiveEffect" spec.

### 5. Confirm-delete dialog for effects

- **What:** Effect deletion uses native `effect.delete()` (owner-gated) with no
  confirmation dialog. The "confirm deleting items" setting and
  `ConfirmDeleteItemDialog` are item-only, so effects bypass it.
- **To do:** Add a `requestEffectDeletion` path mirroring the item
  confirm-delete dialog, honoring the delete-confirm setting.
- **Depends on:** The "Effects → TitanActiveEffect" spec.
