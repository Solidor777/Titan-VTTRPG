# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.

## Active Effects conversion — related items

The "Effects → TitanActiveEffect" effort is specced in
`specs/2026-05-30-titan-active-effects-conversion-design.md`. The following were
split off to keep that spec focused.

### 1. Convert Conditions to rules elements — DONE

- **Status: COMPLETE.** Both Spec A (sum operations) and Spec B (conditions as a
  `condition`-subtype Active Effect) have shipped. Spec B design:
  `docs/superpowers/specs/2026-06-01-conditions-to-rules-elements-design.md`; plan:
  `docs/superpowers/plans/2026-06-01-conditions-to-rules-elements.md`.
- **Spec B end-state (shipped):**
  - Conditions are a native `condition` ActiveEffect subtype (`system.json`
    `documentTypes.ActiveEffect.condition`; `CONFIG.ActiveEffect.dataModels.condition =
    ConditionDataModel`, a `RulesElementMixin(TitanDataModel)` carrying only the
    v14-mandated `changes` ArrayField — no duration/checks/customTraits).
  - `Conditions.js` exports pure `buildConditionDefinitions()`; every condition is
    `type: 'condition'`, and the six mechanically-active ones (blinded, contaminated,
    prone, restrained, stunned, sleeping) carry a seeded `system.rulesElement` built
    from the Spec A operations. The five inert conditions (dead, deafened, frightened,
    incapacitated, unconscious) carry none.
  - `CharacterDataModel._applyRulesElements` derives from three sources — owned items,
    `effect`-subtype AEs, and `condition`-subtype AEs (tagged `'condition'`);
    `_resetDynamicMods` has a `condition` mod bucket; `getConditions()` filters
    `effect.type === 'condition'`. The old `_applyConditions` `switch` was **removed**.
  - `TitanActiveEffectSheet` is registered for `types: ['effect']` only; conditions use
    Foundry's default config sheet.
  - Verified by unit tests (`ConditionDefinitions.test.js`, 8) and e2e
    (`tests/e2e/logic/conditions.spec.js`, 7).
- **No migration (deliberate):** legacy applied conditions created before the subtype
  existed are inert (their mechanics no longer run through any code path) until removed
  and re-toggled, which re-instantiates them as the `condition` subtype with the seeded
  rules elements. No one-shot converter was written for in-world condition effects.
- **Spec A (sum operations) — COMPLETE.** The rules-element operations needed to
  express condition math now ship: **`mulSum`** (multiply the post-additive
  running total), **`setSum`** (force/floor/cap the running total via
  `set`/`min`/`max`), the **`'all'` key selector** (expand one element per
  concrete key under the selector, engine-wide via `_expandAllKeyElements`), and
  **`mulBase` rounding** (directional `up`/`down` round on the scaled base). All
  shipped with settings UI, unit tests (`RoundDirectional` /
  `ComputeMulSumDelta` / `ComputeSetSumDelta`), and e2e
  (`tests/e2e/logic/rules-elements.spec.js`). See spec
  `docs/superpowers/specs/2026-06-01-rules-element-sum-operations-design.md` and
  plan `docs/superpowers/plans/2026-06-01-rules-element-sum-operations.md`.
- **Spec B (the remaining work) — convert status effects into rules elements.**
  - Make each status effect a proper `TitanActiveEffect` of a **`condition`
    subtype** carrying `system.rulesElement` (via `RulesElementMixin`).
  - Seed each **mechanically-active** condition's rules elements using the Spec A
    operations: blinded / contaminated / stunned via `flatModifier` (incl.
    `'all'`); prone via `mulSum` 0.5 `up` on speed `'all'` + `flatModifier` −1
    melee/accuracy; restrained via `flatModifier` + `setSum` `set` 0 on speed
    `'all'`; sleeping via `mulSum` 0.5 `up` on awareness.
  - **Mechanically-inert** conditions (dead / deafened / frightened /
    incapacitated / unconscious) intentionally get **no** rules elements.
  - Extend `CharacterDataModel._applyRulesElements` to also process
    `effect.type === 'condition'`, then **retire `_applyConditions`**.
  - **Feasibility hinge:** how Foundry v14 instantiates a `CONFIG.statusEffects`
    entry into the `condition` subtype — verify whether
    `ActiveEffect.fromStatusEffect` honors `type` + `system`, or whether a
    `preCreate` hook is needed to stamp them.
- **Risk:** Behavior drift in condition math. Needs careful parity testing
  against the current `_applyConditions` results.
- **Depends on:** The "Effects → TitanActiveEffect" spec (conditions are already
  `TitanActiveEffect` instances after it; their mechanics still run through
  `_applyConditions`).

### 1a. Rules-element settings: `onSelectorChange` never fires (pre-existing nit)

- **What:** The per-operation settings components (`ItemSheetFlatModifierSettings`,
  `ItemSheetMulBaseSettings`, `ItemSheetMulSumSettings`, `ItemSheetSetSumSettings`)
  pass `onchange={onSelectorChange}` to `DocumentSelect`, but `DocumentSelect`
  ignores the `onchange` prop — it hardcodes its own
  `onchange={() => refreshSystemDocument(...)}`. So the curated default-key reset
  on selector change is **dead code**.
- **Impact:** Not a crash. `Select.svelte`'s clamp `$effect` auto-corrects an
  out-of-range key to the first valid option, so the key never becomes invalid —
  but the intended *sensible-default* key (e.g. `body` for `attribute`) is lost;
  the key just falls to whatever option is first.
- **To do:** Have `DocumentSelect` accept and forward an optional `onchange` (and
  still run `refreshSystemDocument`), or move the default-key logic elsewhere.
- **Found by:** Spec A (sum operations) verification — pre-existing, not
  introduced by that work.

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

## E2E suite — related items

### 8. Harden the `itemRollData` false-sentinel root cause

- **What:** The 2b-3 fix (`fix(item-check)`, commit `f155c1e0`) changed
  `validateItemCheckOptions` from `??` to `||` so the literal-`false`
  `itemRollData` default falls back to the item lookup. That was the deliberate
  minimal fix, but the underlying fragility remains: `createItemCheckOptions`
  (`src/check/types/item-check/ItemCheckOptions.js:43`) defaults `itemRollData`
  to the literal `false` (forcing every consumer to use truthy checks rather
  than `??`), and `initializeItemCheckOptions`
  (`CharacterDataModel.js:3369-3371`) resolves the real roll data into a *local*
  variable and never writes it back into `checkOptions` — so any future code that
  reads `checkOptions.itemRollData` after initialization gets `false` even when an
  item was supplied.
- **To do:** Either default `itemRollData` to `undefined` (so `??` and `||`
  behave identically everywhere and the sentinel is a true "absent"), or have
  `initializeItemCheckOptions` assign the resolved roll data back into the returned
  options. Add parity tests.
- **Why deferred:** The shipped minimal fix closes the user-facing bug (the item
  options dialog no longer self-closes) and all five dialog types pass E2E; this
  is hardening against a latent class of bug, not a live defect.
- **Found by:** The 2b-3 checks-dialog E2E (see `e2e-suite-status.md` bug #3).

### 9. Replace fixed-timeout waits in the E2E dialog/check helpers

- **What:** `tests/e2e/checkDialog.js` waits a hard-coded 400ms for the dialog to
  mount (`openCheckDialog`) and 300ms for the chat message to settle
  (`readNewestCheckFlags`), and `readNewestCheckFlags` reads the *globally* newest
  message (`game.messages.contents[size-1]`) rather than the one this roll
  produced. The same fixed-sleep + global-newest pattern exists in the 2b-2
  `checks-integration.spec.js`. These are race-prone on a loaded/CI machine.
- **To do:** Replace fixed sleeps with polling (e.g. `expect.poll`) — wait for the
  dialog locator (already auto-retried) and poll for a chat message whose creation
  postdates the roll click, across both the dialog and integration helpers.
- **Why deferred:** Non-blocking — the full suite is green (40/40 e2e); this is
  flake-prevention, and fixing it well means revisiting the shared pattern across
  specs rather than one helper.
- **Found by:** Final code review of the 2b-3 implementation.
