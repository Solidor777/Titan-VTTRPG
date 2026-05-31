# TITAN E2E Test Suite — Status & Resume Handoff

**Last updated:** 2026-05-31. **Branch:** `development`. **Next action:** write + execute the
**2b-2 (checks-integration)** plan.

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

## Bugs found & fixed (by this testing effort)

1. **Trait reactivity** — in-place mutation of `document.system.customTrait` before `update()` defeated
   `ReactiveDocument` change-detection (saved but didn't re-render). Fixed across custom-trait
   add/edit/delete (items + effects). Regression test: `tests/e2e/trait-add-custom.spec.js`. (Same
   antipattern still lurks in `TitanActiveEffect` inline-`check` paths and `RulesElementMixin`
   add/delete — see conventions.md gotcha.)
2. **Expertise overspend** — `_applyExpertise` (`src/check/Check.js`) crit-success loop spent expertise
   it didn't have (negative remaining, unpaid crit). Found by the fast-check invariant. Fixed with an
   affordability guard (commit `29c5083e`).

## NEXT: 2b-2 checks-integration (write the plan, then execute)

**Goal:** one forced-dice Playwright test per check type, proving each `roll<Type>Check` API assembles
parameters from the actor and plumbs results (through the now-verified engine) into `flags.titan`.

**Key facts already gathered (don't re-derive):**

- **Determinism seam (CONFIRMED live on 14.363):** stub `CONFIG.Dice.randomUniform`. Foundry maps a d6
  as `face = 6 - floor(u * 6)`, so to force face `f`, return `u = (6.5 - f) / 6`. Plan: a
  `tests/e2e/dice.js` helper `forceDice(page, faces)` that installs a stub returning successive mapped
  values, plus a reset to restore the original RNG in `afterEach`. (Install the stub inside the
  `page.evaluate` that performs the roll, or via a queue on `globalThis`.)
- **The 5 dialog-bypassing roll APIs** (on `CharacterDataModel`, confirmed in
  `tests/e2e/interaction-rolls.spec.js`): `rollAttributeCheck({ attribute })`,
  `rollResistanceCheck({ resistance })`, `rollAttackCheck({ itemId, attackIdx })`,
  `rollCastingCheck({ itemId })`, `rollItemCheck({ itemId, checkIdx })`. Post to chat;
  `flags.titan.type` ∈ {attributeCheck, resistanceCheck, attackCheck, castingCheck, itemCheck};
  results in `flags.titan.results`, parameters in `flags.titan.parameters` (incl. `difficulty`,
  `totalDice`, `totalExpertise`).
- **Fixture pattern:** `interaction-rolls.spec.js` builds an `E2E Roller` player actor owning a weapon
  (attack), spell (casting), and an ability with a full inlined item-check template (item check). Reuse
  / lift that into a builder in `tests/shared/builders.js`.
- **Assertion approach:** force a known dice sequence of length ≥ `totalDice`; read
  `flags.titan.parameters` (difficulty etc.) and `flags.titan.results`; compute expected results in the
  test using the verified engine rules (successes/crit/expertise/damage) for the forced faces, and
  assert exact equality. Because forced faces + parameters are both known, expected is exact.
- **fast-check NOT required here** — integration uses forced dice + `page.evaluate`; the in-page
  `injectFastCheck` harness is only for surfaces needing randomized live-actor input (e.g. rules-element
  stacking).

**Then:** 2b-3 checks-dialog (needs: how to open a check dialog programmatically — the roll APIs bypass
it), 2b-4 checks-opposed (needs: how `AttackCheckParameters` reads target Defense). After checks:
Phase 3 (UI component/manifest tiers, `testId` already on base primitives) and Phase 4 (multi-user
permissions + 2-client socket sync via per-user browser contexts).

## How to verify current state quickly on resume

- `npx vitest run` → expect 32 passing (incl. `tests/unit/check/**`).
- `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js --reporter=list`
  → expect all passing (Foundry must be running on :30000, or webServer launches it).
