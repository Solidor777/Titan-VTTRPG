# Phase 3b Component-Tier Probe Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a build-flag-gated, in-Foundry probe harness that mounts a single Svelte primitive in isolation with controlled props, and add behavioral probe specs for a 7-component core set (Button, TextInput, NumberInput, IntegerInput, CheckboxInput, Select, LabelTag).

**Architecture:** A test-only module (`src/test-probe/`) registers `game.titan._probe = { mount, unmount, unmountAll, components }` inside the live Foundry runtime, gated by a Vite `define` constant `__TITAN_PROBE__` that is `true` only under `vite build --mode e2e` (tree-shaken from production). A Playwright page object (`tests/e2e/componentProbe.js`) constructs props (including instrumented callbacks) inside `page.evaluate`, mounts a named component into a detached container, and reads interaction outcomes from `window.__titanProbeEvents` plus live DOM state.

**Tech Stack:** Foundry VTT v14 (ApplicationV2), Svelte 5 runes (`mount`/`unmount`/`createRawSnippet`), Vite 8 lib build, Playwright.

---

## Delegation & conventions (read before every task)

- **Route ALL `.js` / `.svelte` / `.svelte.js` edits through the `titan-svelte-dev` subagent** (loads `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase`), per `.claude/CLAUDE.md`. Test specs (`tests/e2e/*.spec.js`) and the page object are plain Playwright JS and may be written directly, but anything under `src/` goes through the subagent.
- **Style:** 120-col wrap; multi-line `{}` for conditionals; typed JSDoc on functions; comments with correct grammar. Match surrounding code.
- **Build discipline:** the probe specs require the **probe build**. After any `src/` edit, run `npm run build:e2e` (NOT `npm run build`) before running probe specs — the live Foundry on `:30000` serves the built root `index.js`.
- **Login** as `E2E GM 1` (the `login(page)` default). Stay on the `development` branch. Never `git add` build output (`index.js`, `index.js.map`, `style.css`) or the `packs/effects/**` runtime churn.

---

## File structure

- **Create** `src/test-probe/componentRegistry.js` — string→component map; grows one entry per component task.
- **Create** `src/test-probe/registerProbe.js` — installs `game.titan._probe`; owns mount/unmount/snippet logic.
- **Modify** `src/hooks/OnceInit.js` — gated fire-and-forget registration at the end of `onceInit()`.
- **Modify** `vite.config.mjs` — read `mode`, define `__TITAN_PROBE__`.
- **Modify** `package.json` — add `build:e2e` script.
- **Create** `tests/e2e/componentProbe.js` — Playwright page object (mount/read/clear/unmount helpers).
- **Create** `tests/e2e/component-probe.spec.js` — behavioral specs; one `describe` per component.
- **Modify** (testId parity) `NumberInput.svelte`, `IntegerInput.svelte`, `CheckboxInput.svelte`, `Select.svelte`, `LabelTag.svelte`.
- **Modify** `docs/superpowers/e2e-suite-status.md` and the memory file — record completion.

---

### Task 1: Foundation — gating, probe registry (Button only), page object, Button spec

**Files:**
- Modify: `vite.config.mjs:20` (signature) and `:53-55` (define)
- Modify: `package.json:41` (scripts)
- Create: `src/test-probe/componentRegistry.js`
- Create: `src/test-probe/registerProbe.js`
- Modify: `src/hooks/OnceInit.js:169` (insert before the closing brace at line 170)
- Create: `tests/e2e/componentProbe.js`
- Test: `tests/e2e/component-probe.spec.js`

- [ ] **Step 1: Write the failing Button spec** (`tests/e2e/component-probe.spec.js`)

```javascript
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, unmountAll } from './componentProbe.js';

test.describe('component probe — Button', () => {
   // Authenticate as E2E GM 1 before each probe.
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   // Tear down every mounted probe so containers never leak between tests.
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
   });

   test('click fires onclick', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Click me',
            testId: 'probe-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${selector} button`).click();
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);
   });

   test('disabled suppresses onclick', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Nope',
            disabled: true,
         },
         events: ['onclick'],
      });
      // force:true bypasses Playwright actionability; the disabled DOM button still dispatches nothing.
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Tagged',
            testId: 'probe-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-button"]`)).toBeVisible();
   });
});
```

- [ ] **Step 2: Write the page object** (`tests/e2e/componentProbe.js`)

```javascript
/**
 * Mount a single registered primitive in isolation inside the live Foundry runtime and return a
 * handle. Props (including instrumented callbacks) are built inside the page because functions
 * cannot cross the Node<->page boundary.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} name - The registered component name (see game.titan._probe.components).
 * @param {{ props?: object, events?: string[] }} [spec] - Scalar props plus the callback prop names
 *   to instrument; each instrumented callback records `{ event, key }` into window.__titanProbeEvents.
 * @returns {Promise<{ id: string, selector: string }>} The probe id and its container selector.
 */
export async function mountProbe(page, name, { props = {}, events = [] } = {}) {
   return await page.evaluate(({ name, props, events }) => {
      globalThis.window.__titanProbeEvents = globalThis.window.__titanProbeEvents ?? [];
      const builtProps = { ...props };
      for (const ev of events) {
         builtProps[ev] = (arg) => {
            globalThis.window.__titanProbeEvents.push({ event: ev, key: arg && arg.key });
         };
      }
      return globalThis.game.titan._probe.mount(name, builtProps);
   }, { name, props, events });
}

/**
 * Read the recorded probe event log.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @returns {Promise<Array<{ event: string, key?: string }>>} The recorded events.
 */
export async function readProbeEvents(page) {
   return await page.evaluate(() => globalThis.window.__titanProbeEvents ?? []);
}

/**
 * Reset the recorded probe event log (call after mount to drop mount-time callbacks).
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @returns {Promise<void>} Resolves once the log is cleared.
 */
export async function clearProbeEvents(page) {
   await page.evaluate(() => {
      globalThis.window.__titanProbeEvents = [];
   });
}

/**
 * Unmount every probe and remove its container node.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @returns {Promise<void>} Resolves once all probes are torn down.
 */
export async function unmountAll(page) {
   await page.evaluate(() => {
      globalThis.game.titan._probe?.unmountAll();
   });
}
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `npx playwright test tests/e2e/component-probe.spec.js --reporter=list`
Expected: FAIL — `game.titan._probe` is undefined (`Cannot read properties of undefined (reading 'mount')`).

- [ ] **Step 4: Create the component registry** (`src/test-probe/componentRegistry.js`) — via `titan-svelte-dev`

```javascript
import Button from '~/helpers/svelte-components/button/Button.svelte';

/**
 * Registry of base primitives the test probe can mount in isolation. Keyed by the name passed to
 * `game.titan._probe.mount`. Extended one entry at a time as the probe coverage grows.
 * @type {Record<string, import('svelte').Component>}
 */
const componentRegistry = {
   Button,
};

export default componentRegistry;
```

- [ ] **Step 5: Create the probe registrar** (`src/test-probe/registerProbe.js`) — via `titan-svelte-dev`

```javascript
import { mount, unmount, createRawSnippet } from 'svelte';
import componentRegistry from '~/test-probe/componentRegistry.js';

/**
 * Install the test-only component probe API on `game.titan._probe`. Mounts a registered primitive
 * into a detached container appended to `document.body`, tracks the handle, and exposes teardown.
 * This module is only imported when the bundle is built with `--mode e2e` (gated by `__TITAN_PROBE__`).
 * @returns {void}
 */
export default function registerProbe() {
   // Active probe handles keyed by generated id.
   const handles = new Map();

   // Monotonic id source for probe containers.
   let nextId = 0;

   game.titan._probe = {
      // The names available to mount.
      components: Object.keys(componentRegistry),

      /**
       * Mount a registered component in isolation.
       * @param {string} name - The registered component name.
       * @param {object} [props] - Props to pass. A string `text` prop is converted to a `children`
       *   snippet for components that render default slot content.
       * @param {Map<string, *>} [context] - Optional Svelte context map for components using getContext.
       * @returns {{ id: string, selector: string }} The probe id and its container selector.
       */
      mount(name, props = {}, context = new Map()) {
         const Component = componentRegistry[name];
         if (!Component) {
            throw new Error(`Unknown probe component: ${name}`);
         }

         // Convert a `text` shorthand into a renderable children snippet when no children supplied.
         const finalProps = { ...props };
         if (typeof finalProps.text === 'string' && finalProps.children === undefined) {
            const text = finalProps.text;
            finalProps.children = createRawSnippet(() => {
               return {
                  render: () => `<span>${text}</span>`,
               };
            });
            delete finalProps.text;
         }

         // Create a dedicated container so each probe is independently locatable and removable.
         const id = `probe-${nextId++}`;
         const target = document.createElement('div');
         target.dataset.titanProbe = id;
         document.body.appendChild(target);

         const handle = mount(Component, {
            target,
            props: finalProps,
            context,
         });
         handles.set(id, {
            handle,
            target,
         });
         return {
            id,
            selector: `[data-titan-probe="${id}"]`,
         };
      },

      /**
       * Unmount a single probe and remove its container node.
       * @param {string} id - The probe id returned from `mount`.
       * @returns {void}
       */
      unmount(id) {
         const entry = handles.get(id);
         if (!entry) {
            return;
         }
         unmount(entry.handle, { outro: false });
         entry.target.remove();
         handles.delete(id);
      },

      /**
       * Unmount every active probe.
       * @returns {void}
       */
      unmountAll() {
         for (const id of [...handles.keys()]) {
            this.unmount(id);
         }
      },
   };
}
```

- [ ] **Step 6: Gate registration in `OnceInit.js`** — via `titan-svelte-dev`

Insert immediately before the closing brace of `onceInit()` (currently line 170, just after the two `unregisterSheet` calls):

```javascript
   // Install the test-only component probe harness when built for e2e. `__TITAN_PROBE__` is a Vite
   // compile-time constant (true only under `--mode e2e`); the production build sets it false so terser
   // dead-code-eliminates this branch and the dynamic import is never bundled. Fire-and-forget so
   // `onceInit` stays synchronous and CONFIG setup ordering is unaffected.
   /* global __TITAN_PROBE__ */
   if (__TITAN_PROBE__) {
      import('~/test-probe/registerProbe.js').then((module) => {
         module.default();
      });
   }
```

- [ ] **Step 7: Add the Vite define** (`vite.config.mjs`) — via `titan-svelte-dev`

Change the export signature on line 20 from `export default () => {` to:

```javascript
export default ({ mode }) => {
```

Replace the `define` block (lines 53-55) with:

```javascript
      define: {
         'process.env.NODE_ENV': JSON.stringify('production'),
         // Test-only probe harness gate: true only under `vite build --mode e2e`.
         __TITAN_PROBE__: JSON.stringify(mode === 'e2e'),
      },
```

- [ ] **Step 8: Add the `build:e2e` npm script** (`package.json`)

Add to `scripts` (after the `build` line):

```json
      "build:e2e": "vite build --mode e2e",
```

- [ ] **Step 9: Build the probe bundle and run the spec**

Run: `npm run build:e2e && npx playwright test tests/e2e/component-probe.spec.js --reporter=list`
Expected: PASS — all 3 Button tests green.

- [ ] **Step 10: Commit**

```bash
git add vite.config.mjs package.json src/test-probe/ src/hooks/OnceInit.js tests/e2e/componentProbe.js tests/e2e/component-probe.spec.js
git commit -m "test(component-probe): gated probe harness + Button behavioral probe"
```

---

### Task 2: TextInput probe

**Files:**
- Modify: `src/test-probe/componentRegistry.js`
- Test: `tests/e2e/component-probe.spec.js`

- [ ] **Step 1: Add the failing TextInput describe block** (append to `tests/e2e/component-probe.spec.js`)

```javascript
test.describe('component probe — TextInput', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
   });

   test('typing commits the value and forwards keyup', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TextInput', {
         props: {
            value: '',
            testId: 'probe-text',
         },
         events: ['onkeyup', 'onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.fill('hello');
      // TextInput binds the value directly to the DOM input; the bound value is the input's value.
      await expect(input).toHaveValue('hello');
      // A keyup commits through the same seam the sheets rely on.
      await input.press('!');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onkeyup')).toBe(true);
   });

   test('disabled blocks editing', async ({ page }) => {
      const { selector } = await mountProbe(page, 'TextInput', {
         props: {
            value: 'locked',
            disabled: true,
         },
      });
      const input = page.locator(`${selector} input`);
      await expect(input).toBeDisabled();
      await expect(input).toHaveValue('locked');
   });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/component-probe.spec.js -g "TextInput" --reporter=list`
Expected: FAIL — `Unknown probe component: TextInput`.

- [ ] **Step 3: Register TextInput** (`src/test-probe/componentRegistry.js`) — via `titan-svelte-dev`

Add the import and registry entry:

```javascript
import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
```

```javascript
const componentRegistry = {
   Button,
   TextInput,
};
```

- [ ] **Step 4: Rebuild and run**

Run: `npm run build:e2e && npx playwright test tests/e2e/component-probe.spec.js -g "TextInput" --reporter=list`
Expected: PASS — both TextInput tests green.

- [ ] **Step 5: Commit**

```bash
git add src/test-probe/componentRegistry.js tests/e2e/component-probe.spec.js
git commit -m "test(component-probe): TextInput behavioral probe"
```

---

### Task 3: NumberInput + IntegerInput probe (with testId parity)

**Files:**
- Modify: `src/helpers/svelte-components/input/NumberInput.svelte`
- Modify: `src/helpers/svelte-components/input/IntegerInput.svelte`
- Modify: `src/test-probe/componentRegistry.js`
- Test: `tests/e2e/component-probe.spec.js`

> Note: `NumberInput` runs `value.toString()` at init, so probes MUST pass a numeric `value`. The display `<input>.value` shows the clamped committed value only after blur (the reset `$effect` runs when editing is inactive). Assert clamping after `.blur()`.

- [ ] **Step 1: Add the failing describe block** (append to `tests/e2e/component-probe.spec.js`)

```javascript
test.describe('component probe — NumberInput / IntegerInput', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
   });

   test('NumberInput clamps to max on commit and fires onchange', async ({ page }) => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 1,
            max: 5,
            isInteger: true,
            testId: 'probe-number',
         },
         events: ['onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.focus();
      await input.fill('9');
      // keyup drives parseInput (commit); blur deactivates editing so the display resets to the clamp.
      await input.press('9');
      await input.blur();
      await expect(input).toHaveValue('5');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('IntegerInput commits an integer value', async ({ page }) => {
      const { selector } = await mountProbe(page, 'IntegerInput', {
         props: {
            value: 0,
            min: 0,
            max: 10,
            testId: 'probe-integer',
         },
         events: ['onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.focus();
      await input.fill('7');
      await input.press('7');
      await input.blur();
      await expect(input).toHaveValue('7');
   });

   test('disabled blocks editing', async ({ page }) => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 3,
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} input`)).toBeDisabled();
   });

   test('testId resolves on NumberInput', async ({ page }) => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 1,
            testId: 'probe-number',
         },
      });
      await expect(page.locator(`${selector} input[data-testid="probe-number"]`)).toBeVisible();
   });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/component-probe.spec.js -g "NumberInput" --reporter=list`
Expected: FAIL — `Unknown probe component: NumberInput`.

- [ ] **Step 3: Add `testId` to NumberInput** (`src/helpers/svelte-components/input/NumberInput.svelte`) — via `titan-svelte-dev`

Add to the `@typedef` block: `* @property {string} [testId] - Optional stable selector applied as \`data-testid\`.`
Add `testId = undefined,` to the destructured `$props()`.
Add `data-testid={testId}` to the `<input>` element attributes.

- [ ] **Step 4: Add `testId` passthrough to IntegerInput** (`src/helpers/svelte-components/input/IntegerInput.svelte`) — via `titan-svelte-dev`

Add the `@property {string} [testId]` JSDoc line, add `testId = undefined,` to `$props()`, and forward `{testId}` to the inner `<NumberInput>`.

- [ ] **Step 5: Register both components** (`src/test-probe/componentRegistry.js`) — via `titan-svelte-dev`

```javascript
import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';
import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
```

```javascript
const componentRegistry = {
   Button,
   TextInput,
   NumberInput,
   IntegerInput,
};
```

- [ ] **Step 6: Rebuild and run**

Run: `npm run build:e2e && npx playwright test tests/e2e/component-probe.spec.js -g "NumberInput" --reporter=list`
Expected: PASS — all 4 tests green. If clamp/commit behavior diverges from the assertions, treat it as a real bug: triage with `superpowers:systematic-debugging`, fix via `titan-svelte-dev`, and record it in the status doc bug log.

- [ ] **Step 7: Commit**

```bash
git add src/helpers/svelte-components/input/NumberInput.svelte src/helpers/svelte-components/input/IntegerInput.svelte src/test-probe/componentRegistry.js tests/e2e/component-probe.spec.js
git commit -m "test(component-probe): NumberInput/IntegerInput probe + testId parity"
```

---

### Task 4: CheckboxInput probe (with testId parity)

**Files:**
- Modify: `src/helpers/svelte-components/input/CheckboxInput.svelte`
- Modify: `src/test-probe/componentRegistry.js`
- Test: `tests/e2e/component-probe.spec.js`

> Note: `CheckboxInput` renders a `<button>`; the checked state is the presence of `i.fa-check` inside it. Toggling calls `onClick` → flips `value` → fires `onchange`.

- [ ] **Step 1: Add the failing describe block** (append to `tests/e2e/component-probe.spec.js`)

```javascript
test.describe('component probe — CheckboxInput', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
   });

   test('toggling flips the checked glyph and fires onchange', async ({ page }) => {
      const { selector } = await mountProbe(page, 'CheckboxInput', {
         props: {
            value: false,
            testId: 'probe-checkbox',
         },
         events: ['onchange'],
      });
      const button = page.locator(`${selector} button`);
      const check = page.locator(`${selector} button i.fa-check`);
      await expect(check).toHaveCount(0);
      await button.click();
      await expect(check).toHaveCount(1);
      await button.click();
      await expect(check).toHaveCount(0);
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(2);
   });

   test('disabled blocks toggling', async ({ page }) => {
      const { selector } = await mountProbe(page, 'CheckboxInput', {
         props: {
            value: false,
            disabled: true,
         },
         events: ['onchange'],
      });
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(0);
   });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/component-probe.spec.js -g "CheckboxInput" --reporter=list`
Expected: FAIL — `Unknown probe component: CheckboxInput`.

- [ ] **Step 3: Add `testId` to CheckboxInput** (`src/helpers/svelte-components/input/CheckboxInput.svelte`) — via `titan-svelte-dev`

Add the `@property {string} [testId]` JSDoc line, add `testId = void 0,` to `$props()`, and add `data-testid={testId}` to the `<button>`.

- [ ] **Step 4: Register the component** (`src/test-probe/componentRegistry.js`) — via `titan-svelte-dev`

```javascript
import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
```

```javascript
const componentRegistry = {
   Button,
   TextInput,
   NumberInput,
   IntegerInput,
   CheckboxInput,
};
```

- [ ] **Step 5: Rebuild and run**

Run: `npm run build:e2e && npx playwright test tests/e2e/component-probe.spec.js -g "CheckboxInput" --reporter=list`
Expected: PASS — both tests green.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/svelte-components/input/CheckboxInput.svelte src/test-probe/componentRegistry.js tests/e2e/component-probe.spec.js
git commit -m "test(component-probe): CheckboxInput probe + testId parity"
```

---

### Task 5: Select probe (with testId parity)

**Files:**
- Modify: `src/helpers/svelte-components/input/select/Select.svelte`
- Modify: `src/test-probe/componentRegistry.js`
- Test: `tests/e2e/component-probe.spec.js`

> Note: `Select`'s clamp `$effect` fires `onchange` once on mount when `value` is out of range. The spec passes a valid initial `value` AND clears the event log after mount so only the user-driven change is asserted.

- [ ] **Step 1: Add the failing describe block** (append to `tests/e2e/component-probe.spec.js`)

Add `clearProbeEvents` to the import at the top of the file:

```javascript
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';
```

```javascript
test.describe('component probe — Select', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
   });

   test('changing the selection fires onchange and updates the value', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Select', {
         props: {
            value: 'a',
            options: [
               { value: 'a', label: 'Alpha' },
               { value: 'b', label: 'Beta' },
            ],
            testId: 'probe-select',
         },
         events: ['onchange'],
      });
      // Drop the mount-time clamp onchange (if any) so we assert only the user-driven change.
      await clearProbeEvents(page);
      const select = page.locator(`${selector} select`);
      await select.selectOption('b');
      await expect(select).toHaveValue('b');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('disabled blocks selection', async ({ page }) => {
      const { selector } = await mountProbe(page, 'Select', {
         props: {
            value: 'a',
            disabled: true,
            options: [
               { value: 'a', label: 'Alpha' },
               { value: 'b', label: 'Beta' },
            ],
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/component-probe.spec.js -g "Select" --reporter=list`
Expected: FAIL — `Unknown probe component: Select`.

- [ ] **Step 3: Add `testId` to Select** (`src/helpers/svelte-components/input/select/Select.svelte`) — via `titan-svelte-dev`

Add `@property {string} [testId] - Optional stable selector applied as \`data-testid\`.` to the `SelectProps` typedef, add `testId = void 0` to the destructured `$props()`, and add `data-testid={testId}` to the `<select>` element.

- [ ] **Step 4: Register the component** (`src/test-probe/componentRegistry.js`) — via `titan-svelte-dev`

```javascript
import Select from '~/helpers/svelte-components/input/select/Select.svelte';
```

```javascript
const componentRegistry = {
   Button,
   TextInput,
   NumberInput,
   IntegerInput,
   CheckboxInput,
   Select,
};
```

- [ ] **Step 5: Rebuild and run**

Run: `npm run build:e2e && npx playwright test tests/e2e/component-probe.spec.js -g "Select" --reporter=list`
Expected: PASS — both tests green.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/svelte-components/input/select/Select.svelte src/test-probe/componentRegistry.js tests/e2e/component-probe.spec.js
git commit -m "test(component-probe): Select probe + testId parity"
```

---

### Task 6: LabelTag probe (with testId parity)

**Files:**
- Modify: `src/helpers/svelte-components/tag/LabelTag.svelte`
- Modify: `src/test-probe/componentRegistry.js`
- Test: `tests/e2e/component-probe.spec.js`

> Note: `LabelTag` renders `<div class="tag">{label}</div>` and takes only `label` + `tooltip`. The probe asserts the label text renders and `testId` resolves.

- [ ] **Step 1: Add the failing describe block** (append to `tests/e2e/component-probe.spec.js`)

```javascript
test.describe('component probe — LabelTag', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
   });

   test('renders the supplied label and resolves testId', async ({ page }) => {
      const { selector } = await mountProbe(page, 'LabelTag', {
         props: {
            label: 'Frostbite',
            testId: 'probe-label',
         },
      });
      const tag = page.locator(`${selector} .tag`);
      await expect(tag).toHaveText('Frostbite');
      await expect(page.locator(`${selector} .tag[data-testid="probe-label"]`)).toBeVisible();
   });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/component-probe.spec.js -g "LabelTag" --reporter=list`
Expected: FAIL — `Unknown probe component: LabelTag`.

- [ ] **Step 3: Add `testId` to LabelTag** (`src/helpers/svelte-components/tag/LabelTag.svelte`) — via `titan-svelte-dev`

Update the props typedef and destructuring to add `testId`, and add `data-testid={testId}` to the `.tag` div:

```svelte
   /** @type {{ tooltip?: string | TooltipAction, label?: string, testId?: string }} Props for this component. */
   let { tooltip = void 0, label = void 0, testId = void 0 } = $props();
```

```svelte
<div class="tag" data-testid={testId} use:tooltipAction={tooltip}>
   {label}
</div>
```

- [ ] **Step 4: Register the component** (`src/test-probe/componentRegistry.js`) — via `titan-svelte-dev`

```javascript
import LabelTag from '~/helpers/svelte-components/tag/LabelTag.svelte';
```

```javascript
const componentRegistry = {
   Button,
   TextInput,
   NumberInput,
   IntegerInput,
   CheckboxInput,
   Select,
   LabelTag,
};
```

- [ ] **Step 5: Rebuild and run**

Run: `npm run build:e2e && npx playwright test tests/e2e/component-probe.spec.js -g "LabelTag" --reporter=list`
Expected: PASS — the test is green.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/svelte-components/tag/LabelTag.svelte src/test-probe/componentRegistry.js tests/e2e/component-probe.spec.js
git commit -m "test(component-probe): LabelTag probe + testId parity"
```

---

### Task 7: Production-safety verification + full-suite regression

**Files:** none (verification only), then docs in Task 8.

- [ ] **Step 1: Confirm the gate tree-shakes out of the production build**

Run a release build and grep the emitted bundle:

```bash
npm run build
grep -c "_probe\|test-probe\|__TITAN_PROBE__" index.js
```

Expected: `0` — no probe identifiers in the production bundle. (If non-zero, the gate is not eliminating; fix the `if (__TITAN_PROBE__)` / dynamic-import pattern before proceeding.)

- [ ] **Step 2: Restore the probe build and run the full probe spec**

Run: `npm run build:e2e && npx playwright test tests/e2e/component-probe.spec.js --reporter=list`
Expected: PASS — all probe tests green (Button 3, TextInput 2, Number/Integer 4, Checkbox 2, Select 2, LabelTag 1).

- [ ] **Step 3: Full-suite regression**

Run: `npx vitest run`
Expected: 35 passing.

Run: `npx playwright test --reporter=list`
Expected: previously-passing suite (61) still green PLUS the new probe tests. (Foundry on :30000 must be serving the `build:e2e` bundle from Step 2.)

- [ ] **Step 4: Commit** (only if any test-only fixups were needed)

```bash
git add tests/e2e/component-probe.spec.js
git commit -m "test(component-probe): full-suite regression green on probe build"
```

---

### Task 8: Update status doc + memory

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: `C:\Users\emper\.claude\projects\C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan\memory\e2e-suite-progress.md`
- Modify (conventions): the `titan-codebase` skill if the probe harness is a reusable convention worth recording.

- [ ] **Step 1: Update the status doc** — mark Phase 3b complete: new files (`src/test-probe/**`, `tests/e2e/componentProbe.js`, `tests/e2e/component-probe.spec.js`), the `build:e2e` gating mechanism and its build-discipline gotcha, the 7-component core set, any bugs found, new suite total, and the remaining-primitives backlog as the next 3b increment. Note 3c (integration manifests) and 3d (reactive sweep, next item item/effect expanded toggle) still pending.

- [ ] **Step 2: Update the memory file** — reflect Phase 3b done, suite total, the probe-build gotcha (`npm run build:e2e`, not `npm run build`), and the reusable harness (`game.titan._probe` + `componentProbe.js` page object).

- [ ] **Step 3: Record the harness convention in `titan-codebase`** if warranted (the `game.titan._probe` gated mount API + how to add a component to the registry).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase/
git commit -m "docs(e2e): mark Phase 3b component-probe complete; backlog remaining primitives"
```

---

## Self-review notes

- **Spec coverage:** probe module + registry (Tasks 1,3,4,5,6) ✓; build gating + `build:e2e` (Task 1) ✓; page object with in-page callback instrumentation (Task 1) ✓; behavioral specs for all 7 core components (Tasks 1–6) ✓; `testId` parity for the 5 lacking it (Tasks 3–6) ✓; production-safety grep (Task 7) ✓; status/memory update (Task 8) ✓; context-map harness capability (Task 1 `mount` signature) ✓.
- **Type consistency:** `mountProbe`/`readProbeEvents`/`clearProbeEvents`/`unmountAll` page-object names are used identically across all specs; `game.titan._probe.mount/unmount/unmountAll/components` are stable; `{ id, selector }` return shape is consistent; the `text`→`children` snippet shorthand is defined in Task 1 and used by the Button spec.
- **Ambiguity resolved:** probe selects by container selector (`[data-titan-probe="<id>"]`) in every spec; `testId` is parity/ergonomics, asserted where added.
- **Latent issues flagged inline:** `NumberInput` `value.toString()` requires a numeric `value`; `Select` mount-time clamp `onchange` is dropped via `clearProbeEvents`; disabled-button clicks use `force:true` and still assert zero callbacks.
