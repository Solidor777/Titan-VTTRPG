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

### 5. Confirm-delete dialog for effects

- **What:** Effect deletion uses native `effect.delete()` (owner-gated) with no
  confirmation dialog. The "confirm deleting items" setting and
  `ConfirmDeleteItemDialog` are item-only, so effects bypass it.
- **To do:** Add a `requestEffectDeletion` path mirroring the item
  confirm-delete dialog, honoring the delete-confirm setting.
- **Depends on:** The "Effects → TitanActiveEffect" spec.

### 6. Convert effect Items inside compendium-packed actors

- **What:** The `convertEffectItemsToActiveEffects` migration handles world
  actors and unlinked token actors, but NOT actors stored inside compendium
  packs. Those actors keep their legacy `effect` Items.
- **To do:** Extend the converter (or add a one-shot tool) to iterate unlocked
  actor compendium packs and convert their effect Items, then re-lock.
- **Depends on:** The "Effects → TitanActiveEffect" spec.

## v14 migration — related items

### 7. Rich (TyphonJS-style) sheet header buttons

- **What:** The actor/item sheet header buttons (edit-token, dynamic
  link/unlink, import, send-to-chat) were restored under v14 via native AppV2
  `_getHeaderControls()` (see the v14 context-and-migration-repair spec, Task
  11). Native v14 controls render in the header **ellipsis dropdown**, expose
  only an icon + label (no tooltip field), so the dynamic link/unlink state is
  conveyed by a changing icon + label and is only visible when the dropdown is
  open.
- **To do:** Re-create the old TyphonJS-era experience — **always-visible inline
  header buttons rendered as Svelte components** in the sheet's window header,
  with the rich `.desc` HTML tooltips restored (especially for the dynamic
  link/unlink button). Likely approach: mount a small Svelte tree into the AppV2
  `.window-header` in `_onRender` (and unmount in `_onClose`), mirroring how
  TyphonJS injected header content — or render the buttons inside the sheet's
  Svelte header area.
- **Why deferred:** Native `_getHeaderControls()` is functional and shipped; the
  rich always-visible+tooltip version is a UX enhancement, not a correctness fix.
- **Depends on:** The v14 context-and-migration-repair spec (Task 11).
