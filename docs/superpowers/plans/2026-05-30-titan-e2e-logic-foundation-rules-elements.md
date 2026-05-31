# TITAN E2E — Phase 2a: Logic Foundation + Rules Elements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project rule:** all `.js` / `.svelte` work routes to the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, `foundry-svelte`, `titan-codebase` skills loaded, following `.claude/CLAUDE.md` style rules (120-col wrap, multi-line objects/arrays, typed single-line variable comments, multi-line function doc comments).

**Goal:** Remove the v14-broken Quench layer, stand up the Playwright + fast-check logic-test harness, and deliver behavioral coverage of the rules-element math (example-based per-operation tests plus fast-check stacking/clamp property tests).

**Architecture:** Logic tests are Playwright specs that perform data operations inside the Foundry runtime via `page.evaluate` and assert the outputs in Node. For math surfaces, fast-check runs property checks inside `page.evaluate`; fast-check is bundled to an IIFE by esbuild in Playwright `globalSetup` and injected as the `fc` page global via `addInitScript`. No in-client test runner; the shipped system bundle is untouched.

**Tech Stack:** Playwright, fast-check 4.x (+ esbuild to bundle it), Vitest (existing unit tests), Svelte 5 / Foundry v14.

**Scope note:** This is Phase 2a. Checks, conditions, and trait/damage logic each get their own follow-up plan (each needs surface-specific API facts — a deterministic-dice/invariant strategy for checks, the rating-stat paths for conditions, the stamina/wounds damage flow — to stay fully concrete). This plan supersedes Phase 1's Quench bridge (Task 1 removes it).

---

## Confirmed source facts this plan relies on

- **Quench wiring:** `src/index.js` line 16 `import registerQuenchTests from '~/quench/RegisterQuenchTests.js';` and line 32 `registerQuenchTests();`. Quench source lives in `src/quench/RegisterQuenchTests.js` and `src/quench/batches/player-sheet-render.batch.js`. The bridge spec is `tests/e2e/quench-runner.spec.js`; the npm script `test:e2e:quench` is in `package.json`.
- **Derived attribute path:** `actor.system.attribute.body.value`. A fresh `player` actor's attributes default to **1** (`createBaseStatField(1)`, `CharacterDataModel.js:361`). Derived value = `baseValue + Σ mods`, floored at 0 (`_applyMods`, `CharacterDataModel.js:1625-1628`).
- **Rules-element application is type- + equip-gated** (`CharacterDataModel.js:729-763`): **ability** items apply their `rulesElement` on mere ownership; weapons/equipment need `system.equipped === true`; armor/shield must be the actor's equipped slot. **Therefore all derived-stat tests use `ability` items.**
- **flatModifier element shape** (`FlatModifier.js`): `{ operation: 'flatModifier', selector: 'attribute', key: 'body', value, uuid }`. **mulBase** adds `baseValue * (value - 1)` to the mod (`_applyMulBaseElements`, ~`:897`). With both present: `derived = base + base*(mulValue-1) + flatValue`, floored at 0. Multiple elements may live in one ability's `system.rulesElement` array.
- **fast-check 4.8.0** ships ESM/CJS only (no UMD/`browser` field) — it must be bundled to an IIFE to inject as a page global.
- **Test infra:** Playwright `testDir: ./tests/e2e`, `workers: 1`, `webServer` reuses/launches Foundry on :30000. `login(page, user)` defaults to `E2E GM 1`. Builders in `tests/shared/builders.js` return `Document.create` payloads. Build output (`index.js`/`style.css`) is gitignored — never `git add` it; rebuild with `npm run build`.

---

## Task 1: Remove Quench from the shipped system and test infra

**Files:**
- Delete: `src/quench/RegisterQuenchTests.js`, `src/quench/batches/player-sheet-render.batch.js` (and the now-empty `src/quench/` tree)
- Modify: `src/index.js` (remove the import + call)
- Delete: `tests/e2e/quench-runner.spec.js`
- Modify: `package.json` (remove the `test:e2e:quench` script)
- Modify: `.claude/skills/titan-codebase/references/conventions.md` and `references/architecture.md`

- [ ] **Step 1: Remove the Quench source and registration**

Delete `src/quench/RegisterQuenchTests.js` and `src/quench/batches/player-sheet-render.batch.js`. In `src/index.js`, delete line 16 (`import registerQuenchTests from '~/quench/RegisterQuenchTests.js';`) and line 32 (`registerQuenchTests();`). Read `src/index.js` first to confirm the exact lines and remove only those two (and any now-orphaned blank line/comment directly tied to them).

- [ ] **Step 2: Remove the bridge spec and npm script**

Delete `tests/e2e/quench-runner.spec.js`. In `package.json`, remove the `"test:e2e:quench": "playwright test tests/e2e/quench-runner.spec.js",` line (leave `test:e2e`, `test:e2e:headed`, `test:e2e:ui`).

- [ ] **Step 3: Update the titan-codebase skill**

In `.claude/skills/titan-codebase/references/conventions.md`, remove the Quench batch-registrar and "Quench → Playwright bridge" paragraphs, and replace them with a short note: the logic layer is **Playwright + fast-check** (data ops run via `page.evaluate` in the live runtime; fast-check property tests injected as the `fc` page global); record that **Quench 0.10.0 is broken for headless runs on v14** (`runBatches` executes 0 tests due to async-`describe`/ApplicationV2 timing) so it was removed. In `references/architecture.md`, remove the Quench mention from the test-layout section.

- [ ] **Step 4: Rebuild and verify Quench is gone from the bundle**

Run: `npm run build`
Expected: build succeeds.

Run: `npx playwright test tests/e2e/render-smoke.spec.js --reporter=list`
Expected: render-smoke 10/10 PASS (system still loads cleanly without the Quench registration).

Run: `npx vitest run`
Expected: all unit tests still pass (Quench was never unit-tested; no regressions).

Verify no dangling references remain:
Run: `git grep -n "quench" src tests package.json` (case-insensitive: add `-i`)
Expected: no matches in `src/`, `tests/`, or `package.json` (matches only in `docs/` and `.claude/skills` history are fine).

- [ ] **Step 5: Commit**

```bash
git add -A src/ tests/e2e/quench-runner.spec.js src/index.js package.json .claude/skills/titan-codebase/references/conventions.md .claude/skills/titan-codebase/references/architecture.md
git commit -m "refactor(test): remove v14-broken Quench layer; logic layer moves to Playwright + fast-check"
```

(`git add -A src/` stages the `src/quench/` deletions. Confirm `git status` shows the deletions and no stray build output staged.)

---

## Task 2: fast-check IIFE bundle + injection helper + smoke test

**Files:**
- Modify: `package.json` (add `fast-check` and `esbuild` devDependencies)
- Create: `tests/e2e/global-setup.js`
- Create: `tests/e2e/fast-check.js`
- Modify: `playwright.config.mjs` (register `globalSetup`)
- Modify: `.gitignore` (ignore the generated vendor bundle)
- Create (test): `tests/e2e/logic/fast-check-smoke.spec.js`

- [ ] **Step 1: Add the dependencies**

Run: `npm install --save-dev fast-check@^4.8.0 esbuild`
Expected: both appear under `devDependencies` in `package.json`; `npm install` exits 0.

- [ ] **Step 2: Ignore the generated bundle**

Append to `.gitignore`:

```
tests/vendor/
```

- [ ] **Step 3: Write `globalSetup` to bundle fast-check to an IIFE**

Create `tests/e2e/global-setup.js`:

```js
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The directory of this setup file, used to resolve the vendor output path.
const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright global setup: bundle fast-check into a self-contained IIFE that exposes the library on
 * the `fc` global, so logic specs can inject it into the Foundry page via `addInitScript`.
 * @returns {Promise<void>} Resolves once `tests/vendor/fast-check.iife.js` has been written.
 */
export default async function globalSetup() {
   // The repo root, used as the module resolution base so the bare `fast-check` import resolves.
   const repoRoot = path.resolve(dirname, '../..');

   // The vendor directory that holds the generated browser bundle (gitignored).
   const vendorDir = path.resolve(dirname, '../vendor');
   await mkdir(vendorDir, { recursive: true });

   // Bundle fast-check into an IIFE exposing the `fc` global for in-page property tests. An inline
   // stdin entry re-exports the package (esbuild entry points are file paths, not bare specifiers).
   await build({
      stdin: {
         contents: "export * from 'fast-check';",
         resolveDir: repoRoot,
         sourcefile: 'fast-check-entry.js',
      },
      bundle: true,
      format: 'iife',
      globalName: 'fc',
      // Playwright's addInitScript wraps the file in a function, so the IIFE's top-level `var fc`
      // would be function-scoped and never reach the page. The footer promotes it to a true global.
      footer: { js: 'globalThis.fc = fc;' },
      platform: 'browser',
      outfile: path.join(vendorDir, 'fast-check.iife.js'),
      logLevel: 'silent',
   });
}
```

- [ ] **Step 4: Write the injection helper**

Create `tests/e2e/fast-check.js`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The absolute path to the fast-check IIFE bundle produced by global-setup.js.
const FAST_CHECK_BUNDLE = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../vendor/fast-check.iife.js',
);

/**
 * Inject the fast-check library into the page so it is available as the `fc` global before any page
 * navigation. Must be called before `login(page)` so the init script is present on the join/game load.
 * @param {import('@playwright/test').Page} page - The Playwright page to inject into.
 * @returns {Promise<void>} Resolves once the init script is registered.
 */
export async function injectFastCheck(page) {
   await page.addInitScript({ path: FAST_CHECK_BUNDLE });
}
```

- [ ] **Step 5: Register `globalSetup` in the Playwright config**

In `playwright.config.mjs`, add `globalSetup: './tests/e2e/global-setup.js',` inside the `defineConfig({ ... })` object (e.g. directly after `workers: 1,`). Leave everything else unchanged.

- [ ] **Step 6: Write the smoke spec**

Create `tests/e2e/logic/fast-check-smoke.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { injectFastCheck } from '../fast-check.js';

/**
 * Proves the fast-check harness works end to end: the `fc` global is injected into the live Foundry
 * page and a trivial property runs inside `page.evaluate`, returning a clean (non-failed) report.
 */
test('fast-check is injected and runs a property in the Foundry page', async ({ page }) => {
   // Inject fast-check BEFORE navigating/logging in so the init script is present on page load.
   await injectFastCheck(page);
   await login(page);

   // Run a trivial property inside the runtime and report fast-check's result back to Node.
   const result = await page.evaluate(async () => {
      // `fc` is the injected fast-check global; `fc.check` returns a report instead of throwing.
      const report = await fc.check(
         fc.property(fc.integer(), (n) => n === n),
         { numRuns: 25 },
      );
      return { available: typeof fc !== 'undefined', failed: report.failed, numRuns: report.numRuns };
   });

   expect(result.available, 'fc global should be present in the page').toBe(true);
   expect(result.failed, 'trivial property should not fail').toBe(false);
   expect(result.numRuns, 'property should have executed its runs').toBe(25);
});
```

- [ ] **Step 7: Run the smoke**

Run: `npx playwright test tests/e2e/logic/fast-check-smoke.spec.js --reporter=list`
Expected: PASS — `globalSetup` builds the bundle, `fc` is injected, the property runs (25 runs, not failed).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore tests/e2e/global-setup.js tests/e2e/fast-check.js tests/e2e/logic/fast-check-smoke.spec.js playwright.config.mjs
git commit -m "test(e2e): fast-check harness (esbuild IIFE bundle + addInitScript injection)"
```

---

## Task 3: Rules element — flatModifier example test

**Files:**
- Modify: `tests/shared/builders.js` (add `buildFlatModifierAbilityData`)
- Modify: `tests/unit/builders.test.js` (cover the new builder)
- Create (test): `tests/e2e/logic/rules-elements.spec.js`

- [ ] **Step 1: Add a builder unit test for the ability builder**

Append to `tests/unit/builders.test.js` (inside the existing `describe('fixture builders', ...)`):

```js
   it('builds an ability carrying flatModifier rules elements on Body', () => {
      const data = buildFlatModifierAbilityData('E2E Mod Ability', [2, 3]);
      expect(data.type).toBe('ability');
      expect(data.name).toBe('E2E Mod Ability');
      expect(data.system.rulesElement).toHaveLength(2);
      expect(data.system.rulesElement[0]).toMatchObject({
         operation: 'flatModifier',
         selector: 'attribute',
         key: 'body',
         value: 2,
      });
      expect(data.system.rulesElement[1].value).toBe(3);
   });
```

Update the import at the top of `tests/unit/builders.test.js` to include the new builder:

```js
import { buildPlayerActorData, buildFlatModifierItemData, buildFlatModifierAbilityData } from '../shared/builders.js';
```

- [ ] **Step 2: Run the builder test to verify it fails**

Run: `npx vitest run tests/unit/builders.test.js`
Expected: FAIL — `buildFlatModifierAbilityData` is not exported.

- [ ] **Step 3: Add the builder**

Append to `tests/shared/builders.js`:

```js
/**
 * Builds an ability item create-payload carrying one flatModifier rules element per supplied value,
 * each targeting the Body attribute. Abilities apply their rules elements on mere ownership (no equip),
 * making them the simplest fixture for asserting derived-attribute deltas.
 * @param {string} name - The ability name.
 * @param {number[]} values - The flat modifier values; one flatModifier element is created per value.
 * @returns {object} An `Item.create` payload of type `ability`.
 */
export function buildFlatModifierAbilityData(name, values) {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: values.map((value, index) => ({
            operation: 'flatModifier',
            selector: 'attribute',
            key: 'body',
            value: value,
            uuid: `e2e-flatmod-${index}`,
         })),
      },
   };
}
```

- [ ] **Step 4: Run the builder test to verify it passes**

Run: `npx vitest run tests/unit/builders.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the flatModifier example e2e test**

Create `tests/e2e/logic/rules-elements.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { buildFlatModifierAbilityData } from '../../shared/builders.js';

/**
 * Behavioral coverage of the rules-element math, asserted against the live derived-data pipeline.
 * A fresh player actor has Body 1; an owned ability carrying flatModifier rules elements must move
 * `actor.system.attribute.body.value` by the exact sum of the modifiers (floored at 0).
 */
const ACTOR_NAME = 'E2E RulesElement Actor';

test.describe('rules elements — derived attribute math', () => {
   // Log in and assert the TITAN system initialized before each test.
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });

   // Remove the fixture actor after each test so the world does not accumulate state.
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('a single +2 flatModifier raises Body from 1 to 3', async ({ page }) => {
      const bodyValue = await page.evaluate(async ({ name, abilityData }) => {
         // Build a clean player actor (Body defaults to 1) owning the flatModifier ability.
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);

         // Let the derived-data preparation settle, then read the derived Body value.
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, { name: ACTOR_NAME, abilityData: buildFlatModifierAbilityData('E2E +2 Body', [2]) });

      // Base Body 1 + flat 2 = 3.
      expect(bodyValue, 'derived Body should be base 1 + flat 2').toBe(3);
   });
});
```

- [ ] **Step 6: Run the e2e test**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js --reporter=list`
Expected: PASS — derived Body is 3. (If it is not 3, STOP and report the actual value; the base or apply-gating assumption is wrong and the plan needs correction before continuing.)

- [ ] **Step 7: Commit**

```bash
git add tests/shared/builders.js tests/unit/builders.test.js tests/e2e/logic/rules-elements.spec.js
git commit -m "test(e2e): flatModifier raises derived attribute by exact delta"
```

---

## Task 4: Rules element — mulBase + combined example tests

**Files:**
- Modify: `tests/shared/builders.js` (add `buildMulBaseAbilityData`)
- Modify: `tests/e2e/logic/rules-elements.spec.js` (add two tests)

- [ ] **Step 1: Add the mulBase builder**

Append to `tests/shared/builders.js`:

```js
/**
 * Builds an ability item create-payload carrying a single mulBase rules element on the Body attribute,
 * optionally followed by flatModifier elements. mulBase adds `base * (value - 1)` to the attribute mod.
 * @param {string} name - The ability name.
 * @param {number} mulValue - The mulBase multiplier value.
 * @param {number[]} [flatValues] - Optional flatModifier values appended after the mulBase element.
 * @returns {object} An `Item.create` payload of type `ability`.
 */
export function buildMulBaseAbilityData(name, mulValue, flatValues = []) {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: [
            {
               operation: 'mulBase',
               selector: 'attribute',
               key: 'body',
               value: mulValue,
               uuid: 'e2e-mulbase-0',
            },
            ...flatValues.map((value, index) => ({
               operation: 'flatModifier',
               selector: 'attribute',
               key: 'body',
               value: value,
               uuid: `e2e-mulbase-flat-${index}`,
            })),
         ],
      },
   };
}
```

- [ ] **Step 2: Add the mulBase + combined tests**

In `tests/e2e/logic/rules-elements.spec.js`, add to the imports:

```js
import { buildFlatModifierAbilityData, buildMulBaseAbilityData } from '../../shared/builders.js';
```

(Replace the existing single-builder import line.) Then add these two tests inside the `describe`, after the flatModifier test. Both reuse the actor build/read pattern; the helper is inlined per test for readability:

```js
   test('a mulBase of 2 raises Body from 1 to 2', async ({ page }) => {
      const bodyValue = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, { name: ACTOR_NAME, abilityData: buildMulBaseAbilityData('E2E x2 Body', 2) });

      // Base 1 + base*(2-1) = 1 + 1 = 2.
      expect(bodyValue, 'derived Body should be base 1 + base*(mul-1)=1').toBe(2);
   });

   test('mulBase 2 plus flatModifier 3 raises Body from 1 to 5', async ({ page }) => {
      const bodyValue = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, { name: ACTOR_NAME, abilityData: buildMulBaseAbilityData('E2E x2 +3 Body', 2, [3]) });

      // Base 1 + base*(2-1) + 3 = 1 + 1 + 3 = 5.
      expect(bodyValue, 'derived Body should be 1 + 1 + 3').toBe(5);
   });
```

- [ ] **Step 3: Run the e2e tests**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js --reporter=list`
Expected: all three tests PASS. (If mulBase math differs, STOP and report the observed values rather than adjusting the expected numbers blindly — the formula assumption must be re-verified.)

- [ ] **Step 4: Commit**

```bash
git add tests/shared/builders.js tests/e2e/logic/rules-elements.spec.js
git commit -m "test(e2e): mulBase and mulBase+flat derived-attribute math"
```

---

## Task 5: Rules element — fast-check stacking + clamp property test

**Files:**
- Modify: `tests/e2e/logic/rules-elements.spec.js` (add a property test)

- [ ] **Step 1: Add the stacking property test**

In `tests/e2e/logic/rules-elements.spec.js`, add the fast-check import at the top:

```js
import { injectFastCheck } from '../fast-check.js';
```

Add a second `describe` block (so this group injects fast-check; the existing `beforeEach` logs in — here we inject first). Append to the file:

```js
test.describe('rules elements — stacking invariants (property-based)', () => {
   // Inject fast-check, then log in and assert the system is ready.
   test.beforeEach(async ({ page }) => {
      await injectFastCheck(page);
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });

   // Remove the fixture actor after the property run.
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, 'E2E Stacking Actor');
   });

   test('for any set of flat modifiers, Body = max(0, 1 + sum)', async ({ page }) => {
      // Run a fast-check property inside the runtime: one actor + one ability reused across iterations,
      // mutating the ability's rulesElement per iteration to avoid create/delete churn.
      const result = await page.evaluate(async () => {
         // Build the reusable fixture once.
         const stale = game.actors.getName('E2E Stacking Actor');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Stacking Actor', type: 'player' });
         const [ability] = await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Stacking Ability', type: 'ability' },
         ]);

         // Property: applying N flatModifiers (each on Body) yields Body = max(0, base + sum).
         const report = await fc.check(
            fc.asyncProperty(
               fc.array(fc.integer({ min: -10, max: 10 }), { maxLength: 5 }),
               async (values) => {
                  // Replace the ability's rules elements with one flatModifier per generated value.
                  await ability.update({
                     system: {
                        rulesElement: values.map((value, index) => ({
                           operation: 'flatModifier',
                           selector: 'attribute',
                           key: 'body',
                           value: value,
                           uuid: `e2e-prop-${index}`,
                        })),
                     },
                  });

                  // Base Body is 1; derived must equal the floored sum.
                  const expected = Math.max(0, 1 + values.reduce((sum, v) => sum + v, 0));
                  return actor.system.attribute.body.value === expected;
               },
            ),
            { numRuns: 40 },
         );

         return { failed: report.failed, counterexample: report.counterexample, numRuns: report.numRuns };
      });

      expect(
         result.failed,
         `stacking invariant failed on counterexample ${JSON.stringify(result.counterexample)}`,
      ).toBe(false);
      expect(result.numRuns, 'property should have executed its runs').toBeGreaterThan(0);
   });
});
```

- [ ] **Step 2: Run the property test**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js --reporter=list`
Expected: all rules-element tests PASS, including the property test (40 runs, not failed). (If it fails with a counterexample, that is a genuine finding — report the counterexample; it likely indicates a stacking or clamp bug in the system, not a test bug. Verify by hand before assuming the test is wrong.)

- [ ] **Step 3: Run the full e2e + unit suites for regressions**

Run: `npx vitest run`
Expected: all unit tests PASS.

Run: `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/trait-add-custom.spec.js tests/e2e/logic --reporter=list`
Expected: render-smoke, the trait regression, the fast-check smoke, and all rules-element tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/logic/rules-elements.spec.js
git commit -m "test(e2e): fast-check property test for rules-element stacking + clamp"
```

---

## Final verification

- [ ] **Full unit suite**

Run: `npx vitest run`
Expected: PASS (existing + the new `buildFlatModifierAbilityData` coverage).

- [ ] **Full logic + smoke e2e**

Run: `npx playwright test tests/e2e/logic tests/e2e/render-smoke.spec.js --reporter=list`
Expected: fast-check smoke, all rules-element example tests, and the stacking property test PASS; render-smoke 10/10.

- [ ] **No Quench residue**

Run: `git grep -ni quench src tests package.json`
Expected: no matches.

---

## Phase exit criteria

- Quench is fully removed from `src/`, `tests/`, `package.json`, and the shipped bundle.
- The fast-check harness (esbuild IIFE bundle via `globalSetup` + `injectFastCheck`) is proven by the smoke test.
- Rules-element math has example coverage (flatModifier, mulBase, combined) and a fast-check stacking/clamp property test, all green.
- Follow-up plans (own files): checks logic, conditions logic, traits/damage logic — each gathers its surface-specific APIs and reuses the harness, builders, and patterns established here.
