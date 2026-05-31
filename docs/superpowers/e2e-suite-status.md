# TITAN E2E Test Suite — Status & Resume Handoff

**Last updated:** 2026-05-31. **Branch:** `development`. **Next action:** write + execute the
**2b-3 (checks-dialog)** plan.

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

## Bugs found & fixed (by this testing effort)

1. **Trait reactivity** — in-place mutation of `document.system.customTrait` before `update()` defeated
   `ReactiveDocument` change-detection (saved but didn't re-render). Fixed across custom-trait
   add/edit/delete (items + effects). Regression test: `tests/e2e/trait-add-custom.spec.js`. (Same
   antipattern still lurks in `TitanActiveEffect` inline-`check` paths and `RulesElementMixin`
   add/delete — see conventions.md gotcha.)
2. **Expertise overspend** — `_applyExpertise` (`src/check/Check.js`) crit-success loop spent expertise
   it didn't have (negative remaining, unpaid crit). Found by the fast-check invariant. Fixed with an
   affordability guard (commit `29c5083e`).

## NEXT: 2b-3 checks-dialog (write the plan, then execute)

**Goal:** prove the check-OPTION dialog path (which the `roll<Type>Check` APIs bypass) assembles and
mutates parameters correctly — e.g. `requestAttributeCheck` opening `AttributeCheckDialog` when
`shouldGetCheckOptions()` is true, the `CheckDialogShell` + type-shell recomputing totals from
`actor.system.getAttributeCheckParameters($checkOptions)` as options change, and the Roll button handing
off to `rollAttributeCheck($checkOptions)`.

**Key facts already gathered (don't re-derive):**

- **How to force the dialog path:** `requestAttributeCheck` (and siblings) branch on `shouldGetCheckOptions()`,
  which reads the `titan.getCheckOptions` setting (inverted when a modifier key is held). The bypass APIs
  used in 2b-2 (`rollAttributeCheck`, etc.) skip the dialog; to test the dialog, either set that setting or
  call `_createAttributeCheckDialog(options)` directly. Still UNVERIFIED: how to drive the rendered Svelte
  dialog DOM (option inputs → recomputed totals → Roll button) from Playwright.
- **Reuse from 2b-2:** the `forceDice`/`resetDice` seam (`tests/e2e/dice.js`), the `expectedCheckResults`
  oracle (`tests/shared/checkOracle.js`), and the `buildE2ERoller*` builders (`tests/shared/builders.js`)
  all transfer directly.

**Then:** 2b-4 checks-opposed (needs: how `AttackCheckParameters` reads target Defense — select a target
token so `targetDefense` is non-default, vs the 2b-2 no-target case where difficulty defaults to 4). After
checks: Phase 3 (UI component/manifest tiers, `testId` already on base primitives) and Phase 4 (multi-user
permissions + 2-client socket sync via per-user browser contexts).

## How to verify current state quickly on resume

- `npx vitest run` → expect 35 passing (incl. `tests/unit/check/**` and `check-oracle.test.js`).
- `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/dice.spec.js tests/e2e/checks-integration.spec.js --reporter=list`
  → expect all passing (Foundry must be running on :30000, or webServer launches it).
