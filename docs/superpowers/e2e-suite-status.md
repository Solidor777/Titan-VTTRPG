# TITAN E2E Test Suite — Status & Resume Handoff

**Last updated:** 2026-05-31. **Branch:** `development`. **Next action:** **finish Phase 3a** — Concern A's
**item** custom-trait edit/delete is done (`tests/e2e/traits.spec.js`, 3 tests) and **fixed two real bugs**
(#4, #5 below). Remaining in 3a: (a) **effect** custom-trait edit/delete coverage (effects reuse the same
fixed `ItemSheetSidebarTraits`, so they should now work — needs a test), and (b) **Concern B** — the
rules-element add/delete reactivity **bug hunt** (`RulesElementMixin.addRulesElement/deleteRulesElement`
mutate in place and pass the mutated reference to `update()`; user pre-authorized the fresh-array fix).
Then 3b (component-tier probe harness) and 3c (integration manifests) per the spec's "Phase 3
decomposition". All of the checks surface (2b-1..2b-4) is done. **Known follow-up (bug #6, latent):**
`EditCustomTraitDialog` sets its class via the dead `_getDialogClasses()` override, so
`.titan-edit-custom-trait-dialog` is never applied — select that dialog by id prefix
`[id^="titan-edit-custom-trait-dialog-"]`; fix by moving the class to `classes:[...]` in `super()` like
`AddCustomTraitDialog`.

This is a living status doc for the multi-phase E2E test suite. Read it on resume to continue without
re-deriving context.

## Working agreements (carry across all phases)

- **Delegation:** route ALL `.js` / `.svelte` / `.svelte.js` work to the `titan-svelte-dev` subagent
  (loads `svelte-5`/`foundry-vtt`/`foundry-svelte`/`titan-codebase`). Follow `.claude/CLAUDE.md` style.
- **Execution:** subagent-driven-development — fresh subagent per task, Sonnet for mechanical tasks,
  Opus for integration/judgment/bug-fixes. Per-task spec+quality review (inline for trivial tasks).
- **No git worktree:** the running Foundry on `:30000` serves THIS directory's built `index.js`, so the
  e2e loop requires working in-place. Stay on `development`.
- **Login as `E2E GM 1`** (the `login(page, user)` default) — never the human's `Gamemaster` session.
  Four test users exist: `E2E GM 1/2`, `E2E Player 1/2` (no passwords) — see `tests/e2e/users.js`.
- **Build output is gitignored** (`index.js`, `index.js.map`, `style.css`) — never `git add` it;
  rebuild with `npm run build` so the live Foundry serves source changes.
- **Quench is removed** — it is broken on v14; logic layer is Playwright + fast-check. Do not reintroduce.
- **packs/effects/** LevelDB files churn during e2e runs (runtime noise, incl. a `lost/` recovery dir) —
  leave them uncommitted. (Candidate future cleanup: gitignore `packs/**/*.log`, `MANIFEST-*`, `lost/`.)

## Specs & plans (committed)

- Suite spec (Foundation/UI/multi-user): `docs/superpowers/specs/2026-05-30-titan-e2e-suite-design.md`
  (its Quench logic layer is **superseded**).
- Logic-layer spec (Playwright + fast-check): `docs/superpowers/specs/2026-05-30-titan-e2e-logic-layer-design.md`.
- Checks-surface spec: `docs/superpowers/specs/2026-05-30-titan-e2e-checks-design.md` (4 concerns →
  plans 2b-1..2b-4).
- Plans: `docs/superpowers/plans/2026-05-30-titan-e2e-foundation.md`,
  `…-logic-foundation-rules-elements.md`, `2026-05-31-titan-e2e-checks-engine.md`.

## Done

- **Phase 1 Foundation** ✅ — `users.js`, `login(page,user)`→`E2E GM 1`, Playwright `webServer`
  auto-launch + npm scripts, shared builders (`tests/shared/builders.js` return create-payloads),
  `testId` prop on `Button`/`TextInput`. (Quench bridge from this phase was later removed.)
- **Phase 2a rules elements** ✅ — fast-check harness (`tests/e2e/global-setup.js` esbuild-bundles
  fast-check to an IIFE; `tests/e2e/fast-check.js` `injectFastCheck(page)` adds it as the `fc` page
  global via `addInitScript` — note the esbuild `footer:{js:'globalThis.fc = fc;'}` is REQUIRED because
  addInitScript wraps the script in a function). `tests/e2e/logic/rules-elements.spec.js`: flatModifier
  / mulBase example tests + a fast-check stacking/clamp property test. Builders:
  `buildFlatModifierAbilityData`, `buildMulBaseAbilityData` (use ABILITY items — they apply rules
  elements on ownership; weapons/equipment need `equipped===true`; armor/shield must be equipped slot).
  Derived attribute path: `actor.system.attribute.body.value`; player base = 1.
- **2b-1 checks-engine** ✅ — `tests/unit/check/` vitest + fast-check: `calculate-check-results.test.js`,
  `apply-expertise.test.js`, `type-results.test.js`, `check-test-helpers.js`. fast-check imported as
  `import fc from 'fast-check'` (works). Full unit suite: 32 tests green.
- **2b-2 checks-integration** ✅ — forced-dice Playwright proof that all five `roll<Type>Check` APIs
  assemble parameters from the actor and plumb dice into `flags.titan`. Determinism seam: `tests/e2e/dice.js`
  `forceDice(page,faces)`/`resetDice(page)` stub `CONFIG.Dice.randomUniform` (force face `f` via
  `u=(6.5-f)/6`; `mapRandomFace` confirmed `ceil((1-u)*6)` on v14). Independent results oracle (no engine
  import): `tests/shared/checkOracle.js` `expectedCheckResults(faces, params)`, validated by
  `tests/unit/check/check-oracle.test.js`. Shared fixture builders `buildE2ERollerActorData` /
  `buildE2ERollerItemData` in `tests/shared/builders.js` (roller actor + weapon/spell/ability; ability
  carries the inlined item-check entry AND flatModifier +2 body/+2 mind → those checks roll 3 dice).
  `tests/e2e/checks-integration.spec.js`: 5 tests, all at `totalExpertise=0`, difficulty 4; complexity 0 for
  attribute/resistance, 1 for attack/casting/item; **resistance stays 1 die** (resistances derive from
  attribute baseValues, so attribute flatModifiers don't boost resilience). No engine bugs found; all
  fixture-table values held without loosening any assertion.
- **2b-3 checks-dialog** ✅ — drives all five rendered Svelte check-option dialogs from Playwright.
  Added a `testId` prop to the shared wrappers (`CheckDialogField`→`.field`, `CheckDialogSummary`→
  `.tag`, `CheckDialogBase` Roll/Cancel buttons) and stable keys to all 18 concrete field/summary
  components (`check-field-<key>`, `check-summary-<key>`, `check-dialog-roll`). Page object
  `tests/e2e/checkDialog.js` opens via the gated `request<Type>Check` (sets `getCheckOptions`), drives
  native widgets (number input commits on **keyup** via a dispatched keyup; native `<select>`;
  checkbox is a toggle `<button>`, checked = `i.fa-check`), reads `.tag` totals, clicks Roll, reads
  newest `flags.titan`. Spec `tests/e2e/checks-dialog.spec.js`: 5 core (mutate diceMod/expertiseMod/
  doubleExpertise → assert recomputed totals → reset expertise to 0 → Roll → verify via the 2b-2
  `expectedCheckResults` oracle) + attribute difficulty-`<select>` flow-through + attack `targetDefense`
  clamp-to-6 flow-through = **7 tests, all green**. **Gotcha:** the per-type dialog CSS classes
  (`titan-<type>-check-dialog`) are NOT rendered — v14 `TitanDialog` hardcodes `['titan','titan-dialog']`
  and never calls the (dead) `_getDialogClasses()` overrides; select dialogs by the stable element **id**
  prefix `[id^="titan-<type>-check-dialog-"]` instead. Found + fixed one real engine bug (#3 below).

- **2b-4 checks-opposed** ✅ — drives both opposed mechanics through the dialog-bypassing roll APIs;
  spec `tests/e2e/checks-opposed.spec.js` = **6 tests, all green**. **Part A (attack vs Defense, 4 tests):**
  skips the canvas entirely — temporarily reassigns `game.user.targets` to a fake `Set` of `{ actor }`
  entries (the exact shape `getTargetedCharacters()` reads via `Array.from`), restoring it in a `finally`.
  `User#targets` is a plain own-property, not a getter, so this is safe. `rollAttackCheck` (bypass API)
  reaches `initializeAttackCheckOptions`'s target auto-populate, so no dialog/canvas is needed. Covers
  interior difficulty, **both** clamp bounds (2 and 6 — needs the roller's attack rating boosted to 6 via a
  `rating`/`melee`+`accuracy` flatModifier ability, because Defense floors at 0 so a base-1 attacker can't
  drive the lower clamp), first-target-wins (`targets[0]`), and the no-target fallback (difficulty 4). Tests
  read `targetDefense`/`attackerRating` from `flags.titan.parameters` and recompute the clamp, so they don't
  hardcode rating internals. **Part B (resistance vs damage, 2 tests):** `rollResistanceCheck({ resistance,
  difficulty, complexity, damageToReduce })` — the same options the Resist button passes — with forced dice
  controlling `succeeded`; asserts `flags.titan.results.damageTaken === damageToReduce − successes` on a
  failed resist and `=== 0` on a successful one. New builders in `tests/shared/builders.js`:
  `buildE2ETargetActorData`, `buildE2ETargetDefenseItemData`, `buildE2EAttackerRatingItemData`. No engine
  bugs found; all fixture-table difficulties held exactly. Spec/plan:
  `docs/superpowers/specs/2026-05-31-titan-e2e-checks-opposed-design.md`,
  `docs/superpowers/plans/2026-05-31-titan-e2e-checks-opposed.md`.

## Bugs found & fixed (by this testing effort)

(Newest first: #4 and #5 found by Phase 3a's custom-trait edit/delete tests, `tests/e2e/traits.spec.js`.)

5. **Trait edit/delete icons rendered as the notdef "missing" box** — `EditDeleteTag.svelte`'s `.tag button`
   reset forced `font-weight: inherit` (specificity 0,1,1), overriding FontAwesome's `.fas { font-weight:
   900 }` (0,1,0). FontAwesome Free solid glyphs only exist at weight 900, so the edit/delete icons fell
   back to the notdef glyph. Fixed by removing the `font-weight: inherit` line (the FA class keeps both its
   font-family and 900 weight). Regression: the icon-weight test asserts computed `font-weight === '900'`
   (was `'700'`). Commit `3a8ef8d1`.
4. **Custom-trait edit and delete silently no-op'd** — `ItemSheetSidebarTraits.svelte` built the trait tags
   with `for (const [idx] in document.data.system.customTrait)`. `for...in` yields string keys and the
   `const [idx]` destructuring takes the first character, so `idx` was a **string** ("0",…). The downstream
   handlers compare strictly against numeric indices (`deleteCustomTrait`: `filter((t,i)=> i !== traitIdx)`
   → `0 !== "0"` true → nothing removed; `editTrait`: `map((t,i)=> i === traitIdx ? …)` → `0 === "0"` false
   → nothing replaced). ADD ignores the index, so it appeared to work — exactly the reported symptom. Fixed
   with a numeric `for` loop; the same copy-pasted antipattern in `ArmorSheetSidebarTraits` /
   `ShieldSheetSidebarTraits` (`system.trait`, render-only `LabelTag`s — benign except mis-keying ≥10
   entries) was corrected too. Commit `c7a543f6`. Found by `tests/e2e/traits.spec.js`.

1. **Trait reactivity** — in-place mutation of `document.system.customTrait` before `update()` defeated
   `ReactiveDocument` change-detection (saved but didn't re-render). Fixed across custom-trait
   add/edit/delete (items + effects). Regression test: `tests/e2e/trait-add-custom.spec.js`. (Same
   antipattern still lurks in `TitanActiveEffect` inline-`check` paths and `RulesElementMixin`
   add/delete — see conventions.md gotcha.)
2. **Expertise overspend** — `_applyExpertise` (`src/check/Check.js`) crit-success loop spent expertise
   it didn't have (negative remaining, unpaid crit). Found by the fast-check invariant. Fixed with an
   affordability guard (commit `29c5083e`).
3. **Item check-options dialog self-closes** — `createItemCheckOptions` defaults `itemRollData` to the
   literal `false`, but `validateItemCheckOptions` resolved it with `??` (`options.itemRollData ?? items
   .get(itemId)?.getRollData()`), so the `false` never fell back to the item lookup → validation failed
   → the item dialog's mount `$effect` ran `onCheckInvalid()` → `application.close()`, making item checks
   unrollable via the dialog. The 2b-2 bypass-API tests missed it (they don't round-trip initialized
   options through validate). Fixed by aligning validate to the truthy fallback (`||`) its two siblings
   (`initializeItemCheckOptions`, `getItemCheckParameters`) already use (commit `f155c1e0`). Found by the
   2b-3 item dialog test.

## NEXT: Phase 3 — UI component / manifest tiers (BRAINSTORM first, then plan, then execute)

**Start by invoking `superpowers:brainstorming`.** The checks surface (2b-1..2b-4) is complete. Phase 3
covers the UI component / manifest tiers: drive the rendered Svelte component surfaces (buttons, inputs,
sheet sections) and assert manifest-driven wiring. `testId` is already on the base primitives
(`Button`/`TextInput`) and on the check-dialog field/summary wrappers, so the first open question is which
component/sheet tiers to cover and what additional `testId` anchors are needed. Load `foundry-vtt` +
`titan-codebase` (+ `svelte-5` + `foundry-svelte` for any component/sheet surface touched). Route all
`.js`/`.svelte` work through the `titan-svelte-dev` subagent.

**After Phase 3:** Phase 4 (multi-user permissions + 2-client socket sync via per-user browser contexts).

**Reuse across phases:** `forceDice`/`resetDice` (`tests/e2e/dice.js`), `expectedCheckResults`
(`tests/shared/checkOracle.js`), the shared builders (`tests/shared/builders.js`), the dialog page object
(`tests/e2e/checkDialog.js`), and the fake-target-set pattern from 2b-4 (`game.user.targets` reassignment).
Dialogs select by element-id prefix, not by per-type class (the `_getDialogClasses()` overrides are dead in
v14 — see conventions.md).

## How to verify current state quickly on resume

- `npx vitest run` → expect 35 passing (incl. `tests/unit/check/**` and `check-oracle.test.js`).
- `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js tests/e2e/traits.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/dice.spec.js tests/e2e/checks-integration.spec.js tests/e2e/checks-dialog.spec.js tests/e2e/checks-opposed.spec.js --reporter=list`
  → expect 49 passing (Foundry must be running on :30000, or webServer launches it). **After editing any
  `.svelte`/`.js` source, run `npm run build` first** so the live Foundry serves the change (test-only
  changes don't need a build).
