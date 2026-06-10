# Closed Bugs

Previously closed bugs and their history. Open bugs live in `docs/OPEN_BUGS.md`; entries move here
when fixed.

### 1. Casting-check roll-time auto-max added the purchase count, not the increment-scaled amount

- **What:** `calculateCastingCheckResults` (`src/check/types/casting-check/CastingCheckResults.js`),
  in the single-affordable-scaling-aspect auto-maximize branch, grew `currentValue` by
  `delta * Math.max(initialValue, 1)` but added only `delta` (the purchase count) to
  `results.damage`/`results.healing`. The chat card's per-step controls
  (`CastingCheckChatMessageScalingAspect.svelte`) move damage/healing by `max(initialValue, 1)` per
  step, so for an `initialValue: 2` damage aspect with 2 extra successes the roll auto-maxed value
  +4 / damage +2, and two card decreases then subtracted 4 — leaving damage 2 below its base.
- **Severity:** Low / narrow. The divergence is reachable only with `initialValue > 1` scaling
  aspects (at `initialValue` 0 or 1 the increment is 1, so `delta × 1 ≡ delta`).
- **Found:** 2026-06-06 by the Task 4 quality review of the chat-mount-keying characterization
  tests (plan `docs/superpowers/plans/2026-06-06-chat-mount-keying-and-clone-update.md`).
- **Fixed:** 2026-06-06 on the `chat-mount-keying` branch — damage/healing now add the same
  increment-scaled `increase` as `currentValue`, gated by a TDD unit case
  (`tests/unit/check/type-results.test.js`, "scales auto-maximized damage by the aspect increment,
  not the purchase count").

### 2. `report-cards.spec.js` fast-healing apply-confirm e2e read-race flake (was OPEN_BUGS #4)

- **What:** The apply-confirm e2e (`tests/e2e/report-cards.spec.js`, "clicking apply heals the actor
  and partial-merges fastHealing") flaked once in a 2026-06-05 full-suite run (logged as OPEN_BUGS
  #4, mechanism unknown) and recurred in the 2026-06-06 full-suite verification on the
  `chat-mount-keying` branch (`fastHealing.confirmed` read `false`). Mechanism: the apply handler
  (`ChatMessageApplyFastHealingButton.svelte`) updates the ACTOR first (`applyHealing`) and the
  MESSAGE second (`fastHealing.confirmed: true`); the test polled only the stamina (the first
  update), then single-shot read the message (the second) between the two updates — a read-race
  that loses under full-suite load.
- **Evidence:** The Playwright failure snapshot showed both rendered cards already re-rendered in
  the confirmed state moments after the failed read — the message update landed late, not never.
  The file passed 13/13 in isolation.
- **Found:** 2026-06-05 (original flake, full-suite run); mechanism identified 2026-06-06.
- **Fixed:** 2026-06-06 on the `chat-mount-keying` branch — the test now polls
  `fastHealing.confirmed` via `expect.poll` before asserting `total`. Production code is unchanged
  (the handler's actor-then-message update ordering is legitimate).

### 3. `MoveEffectToFolderDialogShell` initial-only `$state(prop)` capture lint error (was OPEN_BUGS #1)

- **What:** `let selectedFolderId = $state(initialValue);` tripped the `state_referenced_locally`
  compile error (`svelte/valid-compile`). The capture is intended — a new dialog is constructed per
  move request, so `initialValue` never changes during the component's lifetime.
- **Found:** during follow-up D's verification (2026-06-04), logged as OPEN_BUGS #1.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`fa159570`) — suppressed locally with a
  rationale comment (the `SpellChatAspects.svelte` precedent). A SECOND pre-existing instance of the
  same class surfaced once this one was fixed (the "system's only ESLint error" claim was stale):
  `EmbeddedDocumentProvider.svelte`'s unsupported-type `warn(...)` path — its existing in-block
  `svelte-ignore` did not suppress; moving the comment above the `if` statement does (`2c1a2162`).
  `npx eslint .` now reports 0 errors.

### 4. Attack chat header sub-label always blank — `attackName` never set by the producer (was OPEN_BUGS #2)

- **What:** `AttackCheckChatHeader.svelte` renders `system.parameters.attackName`, but
  `CharacterDataModel.getAttackCheckParameters` never assigned it, so the sub-label rendered blank
  since the field was introduced.
- **Found:** follow-up D's whole-branch review (2026-06-04), logged as OPEN_BUGS #2.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`c1fd1b40`) —
  `parameters.attackName = attackData.label;` in the item-roll-data caching block (the same field
  the weapon sheet row renders), plus a checks-integration e2e asserting the stored parameter AND
  the rendered sub-label match the rolled attack's label.

### 5. Item-check `resistanceCheck` shape default `''` vs `'none'` guards (was OPEN_BUGS #3)

- **What:** `createItemCheckParametersShape()` defaulted `resistanceCheck: ''` while the item check
  template and every consumer guard compare against `'none'` — a schema-initialized message with no
  stored value would spuriously show the resistance button.
- **Found:** follow-up D (2026-06-04), logged as OPEN_BUGS #3.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`c10e680d`) — shape default is now
  `'none'`; the check chat golden master's `resistanceCheck` initial updated to match.

### 6. `WeaponDataModel.addAttack` sheet notification dead AND mis-targeted (was OPEN_BUGS #5)

- **What:** `addAttack` read `this.parent._sheet` into a local but guarded on `this._sheet` (always
  undefined on the data model), and the dead body called `postAddCheck()` (the CHECKS-tab handler)
  instead of the attack-expansion handler — new attacks mounted collapsed.
- **Found:** embedded-document-stores Task 4 code review (2026-06-05), logged as OPEN_BUGS #5.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`7af8272d`) — guards the local `sheet`
  and calls `sheet.addAttack()` (mirrors the correct sibling `deleteAttack`).

### 7. `CharacterSheetWeaponAttack.svelte` dereferenced the `attack` derived unguarded (was OPEN_BUGS #7)

- **What:** The `attack` derived can be `undefined` in the mid-frame window between a document
  mutation (deleted weapon / removed attack index) and the row unmount, yet `trainingDice`,
  `getCheckMod`, and the template reads all dereferenced it unguarded.
- **Found:** the embedded-context conversion's final holistic review (2026-06-06), logged as
  OPEN_BUGS #7.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`73d8fae3`) — `{#if attack}` template
  gate plus guards in `getCheckMod`, `trainingDice`, `dicePool`, and `expertise`.

### 8. `TitanDataModel` component prepare/migrate hooks could never run (was OPEN_BUGS #8)

- **What:** `_migrateComponentData` and `_prepareComponentDerivedData` iterated
  `Object.entries(...)`, so the loop variable was a `[key, value]` pair and the per-component
  `migrateData`/`prepareDerivedData` hooks were always `undefined` — a latent dead path (no
  registered component defines either hook yet).
- **Found:** Task 5 quality review of the chat-mount-keying branch (2026-06-06), logged as
  OPEN_BUGS #8.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`f056dc88`) — both methods iterate
  `Object.values(...)`.

### 9. E2E `ensureProbe` stranded the first probe test when injected mid-boot (was OPEN_BUGS #6)

- **What:** The probe IIFE registers immediately when `game.titan` exists and otherwise arms a
  one-shot ready-hook fallback; an injection during a page boot window (`game` exists, `game.titan`
  not yet set) skipped the immediate path and stranded the current test on
  `game.titan._probe === undefined`. Observed once (2026-06-06) during a run that overlapped a
  concurrent `npm run build`.
- **Found:** embedded-document-stores final verification (2026-06-06), logged as OPEN_BUGS #6.
- **Fixed:** 2026-06-10 on `chore/e2e-fixture-hygiene` (`2ab39a48`) — `ensureProbe` now waits for
  `game.titan` before injecting and for `game.titan._probe` after, so a mid-boot injection blocks
  until registration instead of stranding the test. (The operator rule stands: never run
  `npm run build` concurrently with an e2e run.)
