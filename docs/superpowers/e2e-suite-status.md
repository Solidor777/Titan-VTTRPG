# TITAN E2E Test Suite — Status & Resume Handoff

**Last updated:** 2026-05-31. **Branch:** `development`. **Next action:** **2b-4 checks-opposed** —
brainstorm first. The open question: how a selected **target token** auto-populates `targetDefense`
(Canvas/targeting), vs the 2b-3 case where the dialog sets `targetDefense` directly. Resolve the
target-selection approach, then plan + execute via subagent-driven-development through the
`titan-svelte-dev` subagent.

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

## Bugs found & fixed (by this testing effort)

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

## NEXT: 2b-4 checks-opposed (BRAINSTORM first, then plan, then execute)

**Start by invoking `superpowers:brainstorming`.** 2b-3 set `targetDefense` directly via the dialog
field; 2b-4's unresolved question is the **token-target** path: how a selected target token
auto-populates `targetDefense`. The mechanics are known — `getAttackCheckParameters` (and the request
flow at `CharacterDataModel.js:2498-2507`) reads `getTargetedCharacters()` and pulls
`target.system.getRollData().rating.defense.value` when `options.targetDefense === undefined`; difficulty
is then `clamp(targetDefense − attackerRating + 4, 2, 6)`. The open question is the **Playwright
mechanism** to select a target token on the Canvas (place/target a token, then roll) — settle that before
planning. Load `foundry-vtt` + `titan-codebase` (+ `foundry-canvas` for token targeting, and `svelte-5` +
`foundry-svelte` if a dialog surface is touched).

**Reuse from 2b-2/2b-3:** `forceDice`/`resetDice` (`tests/e2e/dice.js`), `expectedCheckResults`
(`tests/shared/checkOracle.js`), `buildE2ERoller*` (`tests/shared/builders.js`), and the dialog page
object (`tests/e2e/checkDialog.js`) all transfer. Dialogs select by element-id prefix, not by per-type
class (the `_getDialogClasses()` overrides are dead in v14 — see conventions.md).

**After checks:** Phase 3 (UI component/manifest tiers, `testId` already on base primitives + dialog
fields) and Phase 4 (multi-user permissions + 2-client socket sync via per-user browser contexts).

## How to verify current state quickly on resume

- `npx vitest run` → expect 35 passing (incl. `tests/unit/check/**` and `check-oracle.test.js`).
- `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/dice.spec.js tests/e2e/checks-integration.spec.js tests/e2e/checks-dialog.spec.js --reporter=list`
  → expect 40 passing (Foundry must be running on :30000, or webServer launches it).
