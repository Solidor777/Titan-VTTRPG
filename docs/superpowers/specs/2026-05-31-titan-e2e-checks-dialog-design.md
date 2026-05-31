# TITAN E2E — 2b-3 Checks-Dialog Design

**Date:** 2026-05-31. **Branch:** `development`. **Slice:** 2b-3 of the checks-surface spec
(`docs/superpowers/specs/2026-05-30-titan-e2e-checks-design.md`). **Predecessor:** 2b-2
checks-integration (done). **Successor:** 2b-4 checks-opposed.

## 1. Goal

Prove the **check-option dialog path** — the branch the 2b-2 `roll<Type>Check` APIs deliberately
bypass — for **all five** check types at full interaction depth:

1. Open the dialog through its real gated entry point (`request<Type>Check` with the
   `getCheckOptions` setting on).
2. Mutate option inputs the way a user does (type into number inputs, change selects, toggle
   checkboxes).
3. Assert the dialog's displayed totals (`totalDice` / `totalExpertise`) recompute as options
   change.
4. Click **Roll** and assert the produced chat message's `flags.titan` via the 2b-2 forced-dice
   oracle, proving the dialog → roll handoff end-to-end.

The five types: **attribute, resistance, item, casting, attack**.

## 2. Architecture facts (verified against source — do not re-derive)

- **Gated entry, identical for all five:** `CharacterDataModel#request<Type>Check(options)` branches on
  `shouldGetCheckOptions()` (reads the `titan.getCheckOptions` setting, inverted when a modifier key is
  held). When true it calls `_create<Type>CheckDialog(options)` →
  `new <Type>CheckDialog(...).render(true)`. (`src/document/types/actor/types/character/CharacterDataModel.js`.)
- **Forcing the dialog:** set `game.settings.set('titan', 'getCheckOptions', true)`, then call
  `request<Type>Check(options)` with the same option shape 2b-2 already used for `roll<Type>Check`.
  Confirmed working by the render-smoke test in `tests/e2e/interaction-dialogs.spec.js`.
- **Dialog window selectors:** every dialog extends `TitanDialog` (ApplicationV2) → root
  `.application.titan-dialog`. Each `<Type>CheckDialog#_getDialogClasses` adds `titan-check-dialog`
  plus a per-type class: `titan-attribute-check-dialog`, `titan-attack-check-dialog`,
  `titan-casting-check-dialog`, `titan-resistance-check-dialog`, `titan-item-check-dialog`. Stable id:
  `titan-<type>-check-dialog-${actor.id}` (attribute confirmed; siblings follow the same constructor
  pattern — the implementation must confirm each id string).
- **Shells share structure:** `<Type>CheckDialogShell` builds a `rows` array of field/summary
  components and renders `<CheckDialogBase onroll={...} {rows}/>`. The shells live under
  `src/check/types/<type>/dialog/`; the shared field/summary/base components live under
  `src/check/dialog/`.
- **Recompute is automatic:** each shell runs `$effect(() => { $checkParameters =
  actor.system.get<Type>CheckParameters($checkOptions); })` whenever the options store changes, so the
  displayed totals update live as inputs change.
- **Inputs are native widgets:**
  - `NumberInput.svelte` (via `IntegerInput`) renders `<input type="number">` and commits on **keyup**
    (`parseInput` runs per keyup) — a Playwright `.fill()` triggers recompute without needing blur.
  - `Select.svelte` renders native `<select bind:value>`; option values are the raw JS values
    (numbers for difficulty/complexity).
  - Boolean fields (`doubleTraining` / `doubleExpertise`) use a checkbox component.
- **Roll handoff:** `CheckDialogBase`'s Roll button calls the shell's `onRoll()`, which validates and
  then calls `actor.system.roll<Type>Check($checkOptions)` — the **same API surface 2b-2 validated** —
  then closes the app. So forced-dice determinism + the `expectedCheckResults` oracle transfer directly.
- **Totals display:** `CheckDialogTotalDiceSummary` / `CheckDialogTotalExpertiseSummary` render through
  `CheckDialogSummary`, whose value sits in a `.tag` node bound to `$checkParameters.totalDice` /
  `.totalExpertise`.

### Per-type field inventory (verified from each shell)

- **Attribute:** attribute, skill, difficulty, complexity, diceMod, trainingMod, expertiseMod,
  doubleTraining, doubleExpertise, + totalDice/totalExpertise summaries.
- **Resistance:** resistance (select), difficulty, complexity, diceMod, expertiseMod, doubleExpertise,
  + summaries. (No training fields — resistances are not trained.)
- **Item:** attribute, skill, difficulty, complexity, diceMod, trainingMod, expertiseMod,
  doubleTraining, doubleExpertise, + summaries.
- **Casting:** attribute, skill, difficulty, complexity, (healingMod and/or damageMod inserted at
  index 4 when `$checkParameters.healing` / `.damage` are set), diceMod, trainingMod, expertiseMod,
  doubleTraining, doubleExpertise, + summaries.
- **Attack:** row 0 is dynamic — `AttackCheckDialogAttackerMeleeField` when `type === 'melee'` else
  `AttackCheckDialogAttackerAccuracyField`; then targetDefense, attackType, attribute, skill, damageMod,
  diceMod, trainingMod, expertiseMod, doubleTraining, doubleExpertise, + summaries.
  `targetDefense` is a plain `IntegerInput` (min 0) — so 2b-3 sets defense directly; **no target token
  is required** for attack at this slice.

## 3. testId plumbing (source changes)

Follow the Phase-1 `testId` convention (already on `Button` / `TextInput`). Attach the test id to the
two shared **wrappers** rather than to every leaf widget, to minimize churn:

- `src/check/dialog/CheckDialogField.svelte` — add a `testId` prop; apply `data-testid={testId}` to its
  `.field` div. Tests scope `.locator('input, select')` within it for the control.
- `src/check/dialog/CheckDialogSummary.svelte` — add a `testId` prop; apply `data-testid={testId}` to
  its value `.tag` node so Playwright `toHaveText` reads the total directly.
- `src/check/dialog/CheckDialogBase.svelte` — pass `testId="check-dialog-roll"` and
  `testId="check-dialog-cancel"` to the existing `Button` `testId` prop.
- Each concrete field/summary component passes a stable key string when it instantiates
  `CheckDialogField` / `CheckDialogSummary`.

**Naming scheme:**

- Option fields: `check-field-<key>` — e.g. `check-field-difficulty`, `check-field-diceMod`,
  `check-field-doubleExpertise`, `check-field-targetDefense`, `check-field-attackType`,
  `check-field-resistance`, `check-field-attacker` (the dynamic melee/accuracy row 0),
  `check-field-attribute`, `check-field-skill`, `check-field-complexity`, `check-field-trainingMod`,
  `check-field-expertiseMod`, `check-field-doubleTraining`, `check-field-damageMod`,
  `check-field-healingMod`.
- Summaries: `check-summary-totalDice`, `check-summary-totalExpertise`.
- Buttons: `check-dialog-roll`, `check-dialog-cancel`.

Touched: the two wrappers + base, plus each concrete field/summary component (~14 fields, 2 summaries).
All edits are mechanical (add one prop). Follow `.claude/CLAUDE.md` style: typed props, single-line
descriptive comments, multi-line component attributes when >1 prop.

After editing, run `npm run build` so the live Foundry on `:30000` serves the rebuilt `index.js`/`style.css`.

## 4. Test code (new files)

### `tests/e2e/checkDialog.js` (helper / page object)

- `openCheckDialog(page, { type, actorName, options })` — set `getCheckOptions` true inside the world,
  call `actor.system.request<Type>Check(options)`, wait for `.application.titan-<type>-check-dialog` to
  be visible, return its Playwright locator (the dialog root).
- `setField(dialog, key, value)` — locate `check-field-<key>`, dispatch by control kind: `.fill()` for
  number inputs; for `<select>`, select by visible label and assert the bound value round-trips; for a
  checkbox, set checked state. After the change, the shell's `$effect` recomputes totals.
- `readSummary(dialog, key)` — return the text of `check-summary-<key>`.
- `clickRoll(dialog)` — click `check-dialog-roll`.
- Teardown reuses the `interaction-dialogs.spec.js` pattern: close any open `titan-dialog` windows in
  `afterEach`.

### `tests/e2e/checks-dialog.spec.js` (new spec)

One `describe` block per check type. Per test:

1. Build the roller fixture via the 2b-2 `buildE2ERoller*` builders (`tests/shared/builders.js`).
2. `openCheckDialog(...)`.
3. Change ≥1 representative option for that type, asserting recomputed totals after each change
   (Section 5).
4. `forceDice(page, faces)` (`tests/e2e/dice.js`).
5. `clickRoll(dialog)`.
6. Read the produced chat message's `flags.titan` and assert against
   `expectedCheckResults(faces, params)` (`tests/shared/checkOracle.js`).
7. `resetDice(page)`.

Representative per-type option changes (depth without exhaustiveness):

- **Attribute:** change `diceMod` and toggle `doubleExpertise`.
- **Resistance:** change `difficulty` and `diceMod`.
- **Item:** change `complexity` and `diceMod`.
- **Casting:** change `diceMod`; if the spell fixture yields a damage/healing row, change that mod too.
- **Attack:** set `targetDefense`; change `diceMod`; (melee fixture, so row 0 is the melee field).

## 5. Totals assertion strategy — fixture-table deltas

The displayed `totalDice` / `totalExpertise` come from `get<Type>CheckParameters`, **not** from
`expectedCheckResults` (which computes roll outcomes). Rather than reimplement the full parameter
formula in a second oracle, assert via **fixture-table deltas** from a known baseline — the same spirit
as 2b-2's fixture tables:

- Read the baseline `totalDice` / `totalExpertise` right after the dialog opens.
- Apply a known option change and assert the relational outcome: e.g. `+2 diceMod ⇒ totalDice +2`;
  `doubleExpertise on ⇒ totalExpertise` doubles relative to the single-expertise baseline; `+1
  difficulty` leaves `totalDice` unchanged (difficulty affects success threshold, not dice count).

This keeps the totals check independent of the engine without duplicating its math. The **absolute**
end-to-end correctness is still pinned by step 6 (the forced-dice `expectedCheckResults` oracle on the
rolled result).

## 6. Scope boundary

- **In scope (2b-3):** all five check **dialogs** at full depth, attack included with `targetDefense`
  set **directly via the dialog field**.
- **Out of scope → 2b-4 (checks-opposed):** a selected **target token** auto-populating `targetDefense`
  (a Canvas/targeting concern, not a dialog concern). 2b-4 narrows to that token-target path.
- **After checks:** Phase 3 (UI component/manifest tiers), Phase 4 (multi-user permissions + 2-client
  socket sync).

## 7. Risks & mitigations

- **Numeric `<select bind:value>` vs Playwright `selectOption` string coercion** — the helper selects by
  visible label and verifies the bound value round-trips (reads back the recomputed total to confirm the
  intended option took effect).
- **Casting conditional rows** (healing/damage mod inserted only when the spell yields them) — the spell
  fixture must deterministically produce one branch; the helper waits for the row's testId before
  asserting, and the test skips the mod-change step if the row is absent.
- **Commit timing** — `NumberInput` commits per keyup, so `.fill()` is sufficient to trigger recompute;
  no blur required (confirmed in `NumberInput.svelte`).
- **Per-type dialog id strings** — only attribute's id was read directly; the implementation must
  confirm each sibling's id/class before relying on it as a selector.

## 8. Execution

Per `.claude/CLAUDE.md` and the suite working agreements: route all `.js` / `.svelte` work to the
`titan-svelte-dev` subagent (skills `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase`
loaded), via subagent-driven-development — Sonnet for the mechanical testId edits, Opus for the helper /
spec integration and any bug-fixes. Stay on `development`; never `git add` build output
(`index.js`/`style.css`); rebuild with `npm run build` between source edits and e2e runs.

## 9. Verify

- `npx vitest run` → still green (no unit changes expected; 35 passing baseline).
- `npx playwright test tests/e2e/checks-dialog.spec.js --reporter=list` → all passing (Foundry on
  `:30000`, or webServer launches it).
- Re-run the broader e2e set listed in `docs/superpowers/e2e-suite-status.md` to confirm no regression
  from the testId source edits.
