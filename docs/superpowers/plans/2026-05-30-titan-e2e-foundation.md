# TITAN E2E Suite — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project rule:** all `.js` / `.svelte` / `.svelte.js` work routes to the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, `foundry-svelte`, and `titan-codebase` skills loaded, and follows `.claude/CLAUDE.md` style rules (120-col wrap, multi-line objects/arrays, typed single-line variable comments, multi-line function doc comments, no `:global` SCSS).

**Goal:** Build the shared foundation — dedicated-user login, fixture builders, the auto-launch runner, the Quench→Playwright signal bridge, and a `testId` hook on the base UI primitives — that every later E2E phase depends on.

**Architecture:** Two test layers (Quench in-client for logic, Playwright for UI/multi-user) share fixture builders that return `Document.create` payloads. Playwright's `webServer` auto-launches Foundry only if `:30000` is down. One Playwright spec triggers `game.quench.runAllBatches()` so a single `npm run test:e2e` reports both layers.

**Tech Stack:** Playwright (`@playwright/test`), Quench (in-client Mocha/Chai), Vitest + `@testing-library/svelte` (component unit tests), Svelte 5 runes, Foundry v14 ApplicationV2.

---

## Reference: source facts this plan relies on

- `tests/e2e/fixtures.js` — current `login(page)` reads `process.env.FOUNDRY_USER || 'Gamemaster'`, selects `select[name="userid"]` by label, fills `input[name="password"]` only if `FOUNDRY_PASSWORD` set, clicks `button[name="join"]`, waits for `game.ready`.
- `playwright.config.mjs` — `testDir: './tests/e2e'`, `baseURL: 'http://localhost:30000'`, `workers: 1`, `headless: true`. No `webServer` yet.
- `package.json` scripts — `test:e2e` is `playwright test`.
- `vitest.config.mjs` — `environment: 'happy-dom'`, `globals: true`, `include: ['tests/unit/**/*.test.js']`, alias `~/ → src/`.
- Existing unit-test pattern: `render(Probe, { context: new Map([...]) })` + `screen.getByTestId(...)` (see `tests/unit/GetApplication.test.js`).
- `src/helpers/svelte-components/button/Button.svelte` — renders `<button {disabled} {onclick} onmousedown={preventDefault} use:tooltipAction={tooltip}>{@render children?.()}</button>`.
- `src/helpers/svelte-components/input/TextInput.svelte` — renders `<input bind:value {disabled} {onchange} {onkeyup} use:tooltipAction={tooltip}/>`.
- `src/quench/RegisterQuenchTests.js` — registers Quench batches on the `quenchReady` hook; inert if Quench absent.
- Four dedicated world users (no passwords): `E2E GM 1`, `E2E GM 2`, `E2E Player 1`, `E2E Player 2`.

> **Precondition for the Quench bridge (Task 4):** the test world must have the Quench module installed and enabled. The bridge skips itself cleanly when `game.quench` is absent.

---

## Task 1: Dedicated test-user registry

**Files:**
- Create: `tests/e2e/users.js`
- Test: `tests/unit/e2e-users.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/e2e-users.test.js
import { describe, it, expect } from 'vitest';
import { E2E_USERS, DEFAULT_GM, GM_USERS, PLAYER_USERS } from '../e2e/users.js';

describe('e2e user registry', () => {
   it('defines exactly four users with the expected names', () => {
      expect(E2E_USERS.map((u) => u.name)).toEqual([
         'E2E GM 1',
         'E2E GM 2',
         'E2E Player 1',
         'E2E Player 2',
      ]);
   });

   it('splits two GMs and two players by role', () => {
      expect(GM_USERS.map((u) => u.name)).toEqual(['E2E GM 1', 'E2E GM 2']);
      expect(PLAYER_USERS.map((u) => u.name)).toEqual(['E2E Player 1', 'E2E Player 2']);
   });

   it('defaults to the first GM (never the developer Gamemaster)', () => {
      expect(DEFAULT_GM).toBe('E2E GM 1');
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/e2e-users.test.js`
Expected: FAIL — cannot resolve `../e2e/users.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// tests/e2e/users.js

/**
 * @typedef {object} E2EUser
 * @property {string} name - The user's display name as it appears in the /join user picker.
 * @property {('gm'|'player')} role - The user's role for permission and socket tests.
 */

/** @type {E2EUser[]} The four dedicated E2E identities (no passwords). */
export const E2E_USERS = [
   { name: 'E2E GM 1', role: 'gm' },
   { name: 'E2E GM 2', role: 'gm' },
   { name: 'E2E Player 1', role: 'player' },
   { name: 'E2E Player 2', role: 'player' },
];

/** @type {E2EUser[]} The two Gamemaster identities. */
export const GM_USERS = E2E_USERS.filter((user) => user.role === 'gm');

/** @type {E2EUser[]} The two Player identities. */
export const PLAYER_USERS = E2E_USERS.filter((user) => user.role === 'player');

/** @type {string} The default login identity — the first test GM, never the developer's Gamemaster. */
export const DEFAULT_GM = GM_USERS[0].name;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/e2e-users.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/users.js tests/unit/e2e-users.test.js
git commit -m "test(e2e): add dedicated test-user registry"
```

---

## Task 2: `login(page, user)` — explicit user, safe default

**Files:**
- Modify: `tests/e2e/fixtures.js` (the `login` function)

- [ ] **Step 1: Replace the `login` signature and default**

Change the import block at the top of `tests/e2e/fixtures.js` to add the registry import (keep the existing `expect` import):

```js
import { expect } from '@playwright/test';
import { DEFAULT_GM } from './users.js';
```

Replace the existing `login` function's signature line and the `user` resolution line. The current body is:

```js
export async function login(page) {
   // The user name to select; defaults to the test world's Gamemaster.
   const user = process.env.FOUNDRY_USER || 'Gamemaster';
```

Replace with:

```js
/**
 * Authenticate against the live Foundry v14 `/join` screen and wait for the world to become ready.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} [user] - The user name to log in as; defaults to FOUNDRY_USER or the first test GM.
 * @returns {Promise<void>} Resolves once `game.ready === true`.
 */
export async function login(page, user = process.env.FOUNDRY_USER || DEFAULT_GM) {
```

(Delete the now-redundant `const user = process.env.FOUNDRY_USER || 'Gamemaster';` line and its comment; the rest of the function body is unchanged. Keep the original JSDoc selector notes by merging them into the new doc comment or leaving them above it — do not lose the verified-selector documentation.)

- [ ] **Step 2: Verify it compiles and the default works**

Run (with NO `FOUNDRY_USER` set, so the new default `E2E GM 1` is exercised; Foundry must be running on :30000):

```powershell
Remove-Item Env:FOUNDRY_USER -ErrorAction SilentlyContinue; npx playwright test tests/e2e/render-smoke.spec.js --reporter=list
```

Expected: PASS — `render-smoke` logs in as `E2E GM 1` by default and renders the sheets.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/fixtures.js
git commit -m "test(e2e): login() takes an explicit user, defaults to E2E GM 1"
```

---

## Task 3: Auto-launch runner + npm scripts

**Files:**
- Modify: `playwright.config.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Add the `webServer` block to `playwright.config.mjs`**

Replace the file contents with:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
   testDir: './tests/e2e',
   timeout: 60_000,
   fullyParallel: false,
   workers: 1,
   use: {
      baseURL: 'http://localhost:30000',
      headless: true,
   },
   // Reuse a running Foundry on :30000; otherwise launch it directly (no UAC elevation) and wait.
   webServer: {
      command: 'node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata',
      cwd: 'C:/FoundryVTT/V14/dev',
      url: 'http://localhost:30000',
      reuseExistingServer: true,
      timeout: 120_000,
   },
});
```

- [ ] **Step 2: Add npm scripts to `package.json`**

In the `"scripts"` object, replace the `test:e2e` line and add the new lines (keep all other scripts unchanged):

```json
      "test:e2e": "playwright test",
      "test:e2e:headed": "playwright test --headed",
      "test:e2e:ui": "playwright test --ui",
      "test:e2e:quench": "playwright test tests/e2e/quench-runner.spec.js",
```

> Per-category grep scripts (`test:e2e:rules`, `:conditions`, …) are intentionally deferred to the phases that add those tagged specs — adding them now would point `--grep` at zero tests and error.

- [ ] **Step 3: Verify reuse-existing-server works**

With Foundry already running on :30000:

Run: `npx playwright test tests/e2e/render-smoke.spec.js --reporter=list`
Expected: PASS — Playwright detects the existing server (does not launch a second one) and the smoke passes.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.mjs package.json
git commit -m "test(e2e): auto-launch Foundry via webServer; add e2e npm scripts"
```

---

## Task 4: Quench → Playwright signal bridge + batch registrar split

**Files:**
- Create: `src/quench/batches/player-sheet-render.batch.js`
- Modify: `src/quench/RegisterQuenchTests.js` (slim to a registrar)
- Create: `tests/e2e/quench-runner.spec.js`

- [ ] **Step 1: Extract the existing smoke batch into its own module**

Create `src/quench/batches/player-sheet-render.batch.js` containing the player-sheet render batch currently inlined in `RegisterQuenchTests.js`. Export a registrar function:

```js
/**
 * Registers the player-sheet render smoke batch.
 * @param {object} quench - The Quench API object passed by the `quenchReady` hook.
 * @returns {void}
 */
export default function registerPlayerSheetRenderBatch(quench) {
   quench.registerBatch(
      'titan.render.player-sheet',
      (/** @type {object} */ context) => {
         const { describe, it, assert, after } = context;

         // The actor found by the batch (or null if none exist).
         /** @type {object | null} */ let actor = null;

         describe('Player sheet render smoke test', function () {
            before(function () {
               actor = game.actors.find((/** @type {object} */ a) => a.type === 'player') ?? null;
            });

            it('finds a player-type actor in the world', function () {
               assert.ok(actor, 'No player-type actor found in the world — add one to run this batch.');
            });

            it('renders the player sheet without error', async function () {
               if (!actor) {
                  this.skip();
                  return;
               }
               await actor.sheet.render(true);
               assert.ok(actor.sheet.element, 'actor.sheet.element is absent after render.');
            });

            after(async function () {
               if (actor?.sheet?.rendered) {
                  await actor.sheet.close();
               }
            });
         });
      },
      { displayName: 'TITAN: Player sheet render smoke test' },
   );
}
```

(Carry the `before` into the destructured `context` — `const { describe, it, assert, before, after } = context;`. Match the original batch behavior exactly.)

- [ ] **Step 2: Slim `RegisterQuenchTests.js` to a registrar**

Replace the body so it imports each batch registrar and calls them on `quenchReady`. Drop the placeholder `titan.checks.accuracy` batch (Phase 2 adds real batches):

```js
import registerPlayerSheetRenderBatch from '~/quench/batches/player-sheet-render.batch.js';

/**
 * Registers all TITAN in-client Quench batches once Quench signals it is ready. Completely inert
 * unless the Quench module (v0.10+) is installed and enabled in the world.
 * @returns {void}
 */
export default function registerQuenchTests() {
   Hooks.on('quenchReady', (/** @type {object} */ quench) => {
      registerPlayerSheetRenderBatch(quench);
   });
}
```

- [ ] **Step 3: Rebuild the system so the running Foundry serves the change**

Run: `npm run build`
Expected: build succeeds (vite writes `/index.js`).

- [ ] **Step 4: Write the bridge spec**

```js
// tests/e2e/quench-runner.spec.js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Single signal for the in-client logic layer: log in, run every registered Quench batch inside the
 * Foundry runtime, and fail the Playwright run if any Quench test failed. Skips cleanly when the
 * Quench module is not installed/enabled in the world.
 */
test('quench batches all pass', async ({ page }) => {
   await login(page);

   // Bail out (skip, not fail) when Quench is absent so non-Quench worlds do not hard-fail.
   const quenchPresent = await page.evaluate(() => typeof game.quench !== 'undefined');
   test.skip(!quenchPresent, 'Quench module is not installed/enabled in the test world.');

   // Run all batches inside the runtime and report Mocha runner stats back to the Node process.
   const stats = await page.evaluate(async () => {
      // Quench.runAllBatches resolves to the Mocha runner once every batch has finished.
      const runner = await game.quench.runAllBatches();
      return {
         readable: !!runner?.stats,
         failures: runner?.stats?.failures ?? null,
         passes: runner?.stats?.passes ?? null,
      };
   });

   // The runner stats must be readable, or the bridge cannot report a trustworthy signal.
   expect(stats.readable, 'Quench runner stats were not readable after runAllBatches').toBe(true);
   expect(stats.failures, `Quench reported ${stats.failures} failing test(s).`).toBe(0);
});
```

- [ ] **Step 5: Run the bridge**

Run: `npm run test:e2e:quench -- --reporter=list`
Expected: PASS (or SKIP with the Quench-absent message if Quench is not enabled — if skipped, install/enable Quench in the test world and re-run to confirm PASS).

- [ ] **Step 6: Commit**

```bash
git add src/quench/batches/player-sheet-render.batch.js src/quench/RegisterQuenchTests.js tests/e2e/quench-runner.spec.js index.js index.js.map
git commit -m "test(e2e): Quench->Playwright signal bridge; split batch registrar"
```

---

## Task 5: Shared fixture builders

**Files:**
- Create: `tests/shared/fixtureConstants.js`
- Create: `tests/shared/builders.js`
- Test: `tests/unit/builders.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/builders.test.js
import { describe, it, expect } from 'vitest';
import { buildPlayerActorData, buildFlatModifierItemData } from '../shared/builders.js';
import { FLAT_MODIFIER } from '../shared/fixtureConstants.js';

describe('fixture builders', () => {
   it('builds a player actor create-payload', () => {
      const data = buildPlayerActorData('E2E Player Fixture');
      expect(data).toEqual({ name: 'E2E Player Fixture', type: 'player' });
   });

   it('builds an item carrying a single flatModifier rules element', () => {
      const data = buildFlatModifierItemData('E2E Mod Item');
      expect(data.type).toBe('weapon');
      expect(data.name).toBe('E2E Mod Item');
      expect(data.system.rulesElement).toHaveLength(1);
      expect(data.system.rulesElement[0]).toMatchObject({
         operation: 'flatModifier',
         selector: FLAT_MODIFIER.selector,
         key: FLAT_MODIFIER.key,
         value: FLAT_MODIFIER.value,
      });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/builders.test.js`
Expected: FAIL — cannot resolve `../shared/builders.js`.

> Schema facts (confirmed against source): the array field is `system.rulesElement` (singular —
> `RulesElementMixin` does `schema.rulesElement = createArrayField(createObjectField())`). A
> flatModifier element is `{ operation: 'flatModifier', selector: 'attribute', key: 'body', value,
> uuid }` (`createFlatModifierElement()` in `FlatModifier.js`). `selector: 'attribute'` + `key:
> 'body'` targets the Body attribute; Phase 2's apply test asserts the derived Body stat moves by
> `value`.

- [ ] **Step 3: Write the implementation**

```js
// tests/shared/fixtureConstants.js

/** @type {{ selector: string, key: string, value: number }} Known flatModifier element under test. */
export const FLAT_MODIFIER = {
   selector: 'attribute',
   key: 'body',
   value: 2,
};
```

```js
// tests/shared/builders.js
import { FLAT_MODIFIER } from './fixtureConstants.js';

/**
 * Builds a minimal player actor create-payload.
 * @param {string} name - The actor name.
 * @returns {object} A `Actor.create` payload.
 */
export function buildPlayerActorData(name) {
   return {
      name: name,
      type: 'player',
   };
}

/**
 * Builds a weapon item create-payload carrying a single flatModifier rules element with a known value.
 * The element targets the Body attribute so a derived-stat assertion can check the exact delta.
 * @param {string} name - The item name.
 * @returns {object} An `Item.create` payload.
 */
export function buildFlatModifierItemData(name) {
   return {
      name: name,
      type: 'weapon',
      system: {
         // Field key `rulesElement` and element shape confirmed against RulesElementMixin + FlatModifier.js.
         rulesElement: [
            {
               operation: 'flatModifier',
               selector: FLAT_MODIFIER.selector,
               key: FLAT_MODIFIER.key,
               value: FLAT_MODIFIER.value,
               uuid: 'e2e-flatmod-0000',
            },
         ],
      },
   };
}
```

> The builders return DATA only (create payloads), never live documents — so the same module is consumed by Quench (in-runtime `Document.create`) and Playwright (`page.evaluate` argument). Later phases extend this module with `buildConditionedActorData`, trait builders, etc.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/builders.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/shared/builders.js tests/shared/fixtureConstants.js tests/unit/builders.test.js
git commit -m "test(e2e): shared fixture builders returning create-payloads"
```

---

## Task 6: `testId` hook on the base UI primitives

**Files:**
- Modify: `src/helpers/svelte-components/button/Button.svelte`
- Modify: `src/helpers/svelte-components/input/TextInput.svelte`
- Test: `tests/unit/test-id-prop.test.js`
- Create (test harness): `tests/components/ButtonProbe.svelte`

> Scope: Foundation adds `testId` to the two most-composed primitives (`Button`, `TextInput`) and establishes the exact pattern. Later phases add the same optional prop to other wrappers only where an integration manifest needs to target a specific instance (no big-bang annotation pass).

- [ ] **Step 1: Write the failing component test**

Create the harness `tests/components/ButtonProbe.svelte`:

```svelte
<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /** @type {{ testId?: string }} */
   const { testId = undefined } = $props();
</script>

<Button {testId}>Label</Button>
```

Create `tests/unit/test-id-prop.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ButtonProbe from '../components/ButtonProbe.svelte';
import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

describe('testId prop on base primitives', () => {
   it('Button applies data-testid to the native button when provided', () => {
      const { container } = render(ButtonProbe, { props: { testId: 'add-trait' } });
      expect(container.querySelector('button[data-testid="add-trait"]')).not.toBeNull();
   });

   it('Button omits data-testid when not provided', () => {
      const { container } = render(ButtonProbe, {});
      expect(container.querySelector('button[data-testid]')).toBeNull();
   });

   it('TextInput applies data-testid to the native input when provided', () => {
      const { container } = render(TextInput, { props: { testId: 'trait-name' } });
      expect(container.querySelector('input[data-testid="trait-name"]')).not.toBeNull();
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/test-id-prop.test.js`
Expected: FAIL — `data-testid` not rendered (prop not yet supported).

- [ ] **Step 3: Add the `testId` prop to `Button.svelte`**

In the `$props()` destructure, add `testId`:

```js
   /** @type {ButtonProps} */
   const {
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      children = void 0,
      testId = void 0,
   } = $props();
```

Add the typedef line in the `ButtonProps` doc comment:

```js
    * @property {string | undefined} [testId] - Optional stable selector applied as `data-testid`.
```

Apply it on the element (Svelte omits the attribute when the value is `undefined`):

```svelte
<button
   {disabled}
   {onclick}
   data-testid={testId}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   {@render children?.()}
</button>
```

- [ ] **Step 4: Add the `testId` prop to `TextInput.svelte`**

Add to the `$props()` destructure and the typedef, then the element:

```js
   /** @type {TextInputProps} */
   let {
      value    = $bindable(undefined),
      disabled = false,
      tooltip  = undefined,
      onchange = undefined,
      onkeyup  = undefined,
      testId   = undefined,
   } = $props();
```

```svelte
<input
   bind:value
   {disabled}
   {onchange}
   {onkeyup}
   data-testid={testId}
   use:tooltipAction={tooltip}
/>
```

(Add the matching `@property {string} [testId]` line to the `TextInputProps` typedef.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/test-id-prop.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Rebuild and run the full unit + e2e smoke**

Run: `npm run build`
Expected: build succeeds.

Run: `npx vitest run`
Expected: all unit tests PASS (no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/helpers/svelte-components/button/Button.svelte src/helpers/svelte-components/input/TextInput.svelte tests/components/ButtonProbe.svelte tests/unit/test-id-prop.test.js index.js index.js.map
git commit -m "feat(components): optional testId prop on Button and TextInput primitives"
```

---

## Final verification

- [ ] **Run the whole unit suite**

Run: `npx vitest run`
Expected: PASS — including `e2e-users`, `builders`, and `test-id-prop`.

- [ ] **Run the e2e smoke + Quench bridge**

Run: `npm run test:e2e -- tests/e2e/render-smoke.spec.js tests/e2e/quench-runner.spec.js --reporter=list`
Expected: render-smoke PASS; quench-runner PASS (or SKIP if Quench not enabled).

- [ ] **Update the `titan-codebase` skill** (per its self-update protocol)

Add to `.claude/skills/titan-codebase/references/conventions.md` the convention surfaced this phase: *never mutate a live `document.system.*` array in place before `update()` — it defeats `ReactiveDocument` change-detection and the sheet will not re-render; build a fresh array.* Report the addition in the final message.

---

## Phase exit criteria

- `login(page, user)` defaults to `E2E GM 1` and accepts any of the four identities.
- `npm run test:e2e` auto-launches Foundry only when `:30000` is down and reports both layers.
- `tests/shared/builders.js` returns create-payloads consumed by both layers.
- `Button` and `TextInput` accept an optional `testId` → `data-testid`.
- All unit tests and the e2e smoke + Quench bridge pass.

Phase 2 (Quench logic batches) builds directly on `buildPlayerActorData` / `buildFlatModifierItemData` and the batch registrar split established here.
