# v14 Context & Migration Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all TITAN sheets, dialogs, and chat cards render under Foundry v14 (pure Svelte 5) by replacing the broken TyphonJS `#external` context convention, then lock the fixes in with a three-tier test strategy (Vitest unit/wiring, Playwright render-smoke, Quench in-client).

**Architecture:** Tests live outside `src/` (in `tests/`), since `src/` holds only built code — except Quench batches, which are bundled because they run inside Foundry. The Vitest tier mounts small probe components against a minimal Foundry-globals mock; Playwright drives the already-running local Foundry; Quench registers gated in-client batches.

**Tech Stack:** Vitest + happy-dom + @testing-library/svelte, @playwright/test, Quench (Foundry module), Vite 5 + `@sveltejs/vite-plugin-svelte`.

**Subagent skill requirement (applies to every Agent dispatch in this plan):** Any dispatched subagent MUST invoke the relevant skills as its first action, before reading or changing code. The required set per task is listed in that task; at minimum every JS/Svelte subagent invokes `titan-codebase`, `foundry-vtt`, `foundry-svelte`, and `svelte-5`. The audit subagent additionally invokes `foundry-versioning`, and (because this work removes a middleware) `foundry-svelte-typhonjs` to recognize TyphonJS-era conventions being replaced. The dispatch prompt must say so explicitly — do not rely on the agent's defaults. Prefer the `titan-svelte-dev` subagent for all `.js`/`.svelte`/`.svelte.js` work, per project `.claude/CLAUDE.md`.

---

## File Structure

**Created:**
- `vitest.config.mjs` — Vitest config reusing the Svelte plugin + project aliases.
- `tests/setup.js` — installs the Foundry-globals + `Hooks` mock before each test.
- `tests/unit/ResolveDocumentSheetArguments.test.js` — constructor-convention regression.
- `tests/unit/GetApplication.test.js` — application-context resolution (red→green).
- `tests/unit/ReactiveDocument.test.js` — reactivity bridge re-render.
- `tests/components/ApplicationProbe.svelte` — probe calling `getApplication()`.
- `tests/components/DocumentProbe.svelte` — probe reading `getContext('document')`.
- `playwright.config.mjs` — Playwright config targeting `localhost:30000`.
- `tests/e2e/fixtures.js` — login helper + per-type render helper.
- `tests/e2e/render-smoke.spec.js` — renders each document type, asserts zero uncaught errors.
- `src/quench/RegisterQuenchTests.js` — gated Quench batch registration.

**Modified:**
- `src/helpers/utility-functions/GetApplication.js` — read `getContext('application')`.
- `src/document/sheet/TitanDocumentSheet.js:91-104` — provide `application` mount context.
- `src/helpers/dialogs/Dialog.js:79-86` — provide `application` mount context.
- `package.json` — devDeps + `test` / `test:e2e` scripts.
- `src/hooks/OnceInit.js` (or `OnceReady.js`) — import the Quench registration (one line).
- `.claude/skills/titan-codebase/references/conventions.md` — context-key conventions + v14 constructor convention.

---

## Task 0: Commit the already-applied prerequisite fixes

These were applied while diagnosing and are currently uncommitted. Commit them before adding tests so history is clean.

**Files:**
- Modify (already changed): `src/document/sheet/TitanDocumentSheet.js`, `src/document/types/actor/sheet/TitanActorSheet.js`, `src/document/types/item/sheet/TitanItemSheet.js`, `src/document/types/active-effect/sheet/TitanActiveEffectSheet.js`, `src/document/types/active-effect/TitanActiveEffectDataModel.js`
- Create (already added): `src/helpers/utility-functions/ResolveDocumentSheetArguments.js`

- [ ] **Step 1: Confirm the build passes**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 2: Stage only the prerequisite-fix files**

```bash
git add src/helpers/utility-functions/ResolveDocumentSheetArguments.js \
  src/document/sheet/TitanDocumentSheet.js \
  src/document/types/actor/sheet/TitanActorSheet.js \
  src/document/types/item/sheet/TitanItemSheet.js \
  src/document/types/active-effect/sheet/TitanActiveEffectSheet.js \
  src/document/types/active-effect/TitanActiveEffectDataModel.js
```

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(v14): accept v14 DocumentSheetV2 construction; fix AE changes schema

Foundry v14 constructs sheets as new cls({document}); normalize both calling
conventions via resolveDocumentSheetArguments and assign options.document
directly (deep-merge recursed into read-only collections). Define a SchemaField
element for the ActiveEffect changes ArrayField (v14 verifier)."
```

---

## Task 1: Vitest harness + Foundry mock

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mjs`, `tests/setup.js`

- [ ] **Step 1: Install dev dependencies**

Run: `npm install -D vitest@^2 happy-dom@^15 @testing-library/svelte@^5 @testing-library/jest-dom@^6`
Expected: packages added to `devDependencies`.

- [ ] **Step 2: Add test scripts to package.json**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 3: Create `vitest.config.mjs`**

```js
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
   plugins: [
      svelte({
         hot: false,
         preprocess: sveltePreprocess({
            scss: { prependData: '@use "src/styles/Root.scss" as *;' },
         }),
      }),
   ],
   resolve: {
      conditions: ['browser'],
      dedupe: ['svelte'],
      alias: {
         '~/': `${path.resolve(__dirname, 'src')}/`,
         '$fonts/': `${path.resolve(__dirname, 'fonts')}/`,
      },
   },
   test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./tests/setup.js'],
      include: ['tests/unit/**/*.test.js'],
   },
};
```

- [ ] **Step 4: Create `tests/setup.js` (Foundry-globals + Hooks mock)**

```js
import { beforeEach } from 'vitest';

/** Minimal stand-in for foundry.abstract.Document (used for instanceof checks). */
class MockDocument {}

/**
 * Minimal recursive merge mirroring foundry.utils.mergeObject for plain objects.
 * @param {object} original - Target object (mutated).
 * @param {object} other - Source object.
 * @returns {object} The merged target.
 */
function mergeObject(original, other = {}) {
   for (const [key, value] of Object.entries(other)) {
      const isPlain = value && typeof value === 'object' && !Array.isArray(value);
      if (isPlain && original[key] && typeof original[key] === 'object') {
         mergeObject(original[key], value);
      } else {
         original[key] = value;
      }
   }
   return original;
}

globalThis.foundry = {
   abstract: { Document: MockDocument },
   utils: { mergeObject },
};

/** Minimal Hooks mock supporting on/off/call. */
class HooksMock {
   constructor() {
      this.handlers = {};
   }

   on(name, fn) {
      (this.handlers[name] ??= new Set()).add(fn);
      return fn;
   }

   off(name, fn) {
      this.handlers[name]?.delete(fn);
   }

   call(name, ...args) {
      for (const fn of [...(this.handlers[name] ?? [])]) {
         fn(...args);
      }
   }
}

// Fresh Hooks per test so subscriber registrations never leak across tests.
beforeEach(() => {
   globalThis.Hooks = new HooksMock();
});
```

- [ ] **Step 5: Sanity-run Vitest (no tests yet)**

Run: `npm test`
Expected: Vitest starts and reports "No test files found" (exit non-zero is fine here) — confirms config loads without error.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.mjs tests/setup.js
git commit -m "test: add Vitest harness with Foundry-globals mock"
```

---

## Task 2: Constructor-convention regression test

**Files:**
- Create: `tests/unit/ResolveDocumentSheetArguments.test.js`

- [ ] **Step 1: Write the test**

```js
import { describe, it, expect } from 'vitest';
import resolveDocumentSheetArguments from '~/helpers/utility-functions/ResolveDocumentSheetArguments.js';

describe('resolveDocumentSheetArguments', () => {
   it('resolves the positional (document, options) form', () => {
      const doc = new foundry.abstract.Document();
      const { document, options } = resolveDocumentSheetArguments(doc, { classes: ['a'] });
      expect(document).toBe(doc);
      expect(options).toEqual({ classes: ['a'] });
   });

   it('resolves the v14 ({ document }, options) form and merges options', () => {
      const doc = new foundry.abstract.Document();
      const { document, options } = resolveDocumentSheetArguments({ document: doc }, { classes: ['a'] });
      expect(document).toBe(doc);
      expect(options.document).toBe(doc);
      expect(options.classes).toEqual(['a']);
   });

   it('handles the v14 form with no second argument', () => {
      const doc = new foundry.abstract.Document();
      const { document } = resolveDocumentSheetArguments({ document: doc });
      expect(document).toBe(doc);
   });
});
```

- [ ] **Step 2: Run and verify it passes**

Run: `npm test -- ResolveDocumentSheetArguments`
Expected: 3 passed (the helper already exists from Task 0).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/ResolveDocumentSheetArguments.test.js
git commit -m "test: regression-cover the v14 sheet constructor convention"
```

---

## Task 3: Application-context fix (TDD red → green)

**Files:**
- Create: `tests/components/ApplicationProbe.svelte`, `tests/unit/GetApplication.test.js`
- Modify: `src/helpers/utility-functions/GetApplication.js`, `src/document/sheet/TitanDocumentSheet.js:91-104`, `src/helpers/dialogs/Dialog.js:79-86`

- [ ] **Step 1: Create the probe component**

`tests/components/ApplicationProbe.svelte`:

```svelte
<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';

   /** @type {object | undefined} - The application resolved from context. */
   const application = getApplication();
</script>

<span data-testid="app">{application?.name ?? 'none'}</span>
```

- [ ] **Step 2: Write the failing test**

`tests/unit/GetApplication.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ApplicationProbe from '../components/ApplicationProbe.svelte';

describe('getApplication', () => {
   it('resolves the owning application from the "application" context', () => {
      render(ApplicationProbe, { context: new Map([['application', { name: 'Sheet' }]]) });
      expect(screen.getByTestId('app').textContent).toBe('Sheet');
   });
});
```

- [ ] **Step 3: Run and verify it FAILS**

Run: `npm test -- GetApplication`
Expected: FAIL — `getApplication` currently reads `getContext('#external').application`, and `getContext('#external')` is `undefined`, so `.application` throws during render.

- [ ] **Step 4: Fix `GetApplication.js`**

Replace the whole file with:

```js
import { getContext } from 'svelte';

/**
 * Helper to read the owning Application from Svelte context. The application is provided at the mount
 * site (sheet or dialog) via the `application` context key.
 * @returns {object | undefined} The owning Application, or undefined if mounted without one (e.g. chat).
 */
export default function getApplication() {
   return getContext('application');
}
```

- [ ] **Step 5: Run and verify it PASSES**

Run: `npm test -- GetApplication`
Expected: PASS.

- [ ] **Step 6: Provide `application` context at the sheet mount**

In `src/document/sheet/TitanDocumentSheet.js`, change the `mount(...)` call in `_replaceHTML` (currently ~line 95) to add the context Map:

```js
         this.#mountHandle = mount(DocumentSheetShell, {
            target: content,
            props: {
               document: this.#bridge,
               applicationState: this.applicationState,
               shell,
            },
            context: new Map([['application', this]]),
         });
```

- [ ] **Step 7: Provide `application` context at the dialog mount**

In `src/helpers/dialogs/Dialog.js`, change the `mount(...)` call in `_replaceHTML` (currently ~line 81) to add the context Map:

```js
         this.#mountHandle = mount(this.#content.class, {
            target: content,
            props: this.#content.props,
            context: new Map([['application', this]]),
         });
```

- [ ] **Step 8: Build to confirm no syntax/import errors**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 9: Commit**

```bash
git add src/helpers/utility-functions/GetApplication.js \
  src/document/sheet/TitanDocumentSheet.js \
  src/helpers/dialogs/Dialog.js \
  tests/components/ApplicationProbe.svelte \
  tests/unit/GetApplication.test.js
git commit -m "fix(context): provide application via Svelte context (de-TyphonJS #external)"
```

---

## Task 4: ReactiveDocument reactivity test

**Files:**
- Create: `tests/components/DocumentProbe.svelte`, `tests/unit/ReactiveDocument.test.js`

- [ ] **Step 1: Create the probe component**

`tests/components/DocumentProbe.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';

   /** @type {import('~/document/reactive/ReactiveDocument.svelte.js').default} - The reactive bridge. */
   const document = getContext('document');
</script>

<span data-testid="value">{document.data.system.value}</span>
```

- [ ] **Step 2: Write the test**

`tests/unit/ReactiveDocument.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import DocumentProbe from '../components/DocumentProbe.svelte';

describe('ReactiveDocument', () => {
   it('re-renders a reader when the wrapped document updates', () => {
      const doc = { id: 'a1', documentName: 'Actor', system: { value: 1 } };
      const bridge = new ReactiveDocument(doc);
      render(DocumentProbe, { context: new Map([['document', bridge]]) });
      expect(screen.getByTestId('value').textContent).toBe('1');

      // Mutate the live document and fire the corresponding update hook.
      doc.system.value = 2;
      Hooks.call('updateActor', doc, {}, {});
      flushSync();

      expect(screen.getByTestId('value').textContent).toBe('2');
   });
});
```

- [ ] **Step 3: Run and verify it passes**

Run: `npm test -- ReactiveDocument`
Expected: PASS. (If the reader does not update, the bridge's hook wiring regressed.)

- [ ] **Step 4: Run the full unit suite**

Run: `npm test`
Expected: all unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/components/DocumentProbe.svelte tests/unit/ReactiveDocument.test.js
git commit -m "test: cover ReactiveDocument re-render on document update"
```

---

## Task 5: Playwright render-smoke E2E

**Prerequisite:** Foundry must be running at `localhost:30000` with a test world loaded that contains at least one Actor of each type (`player`, `npc`), one Item of each of the 7 types, and one Active Effect of type `effect`. Set `FOUNDRY_USER` and `FOUNDRY_PASSWORD` env vars to a Gamemaster login.

**Files:**
- Modify: `package.json`
- Create: `playwright.config.mjs`, `tests/e2e/fixtures.js`, `tests/e2e/render-smoke.spec.js`

- [ ] **Step 1: Install Playwright**

Run: `npm install -D @playwright/test@^1.48 && npx playwright install chromium`
Expected: Playwright + Chromium installed.

- [ ] **Step 2: Create `playwright.config.mjs`**

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
});
```

- [ ] **Step 3: Create `tests/e2e/fixtures.js` (login + render-and-collect helper)**

```js
import { expect } from '@playwright/test';

/**
 * Logs into the already-running Foundry world as the configured user and waits for the game view.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<void>}
 */
export async function login(page) {
   await page.goto('/join');
   await page.selectOption('select[name="userid"]', { label: process.env.FOUNDRY_USER });
   if (process.env.FOUNDRY_PASSWORD) {
      await page.fill('input[name="password"]', process.env.FOUNDRY_PASSWORD);
   }
   await page.click('button[name="join"], button[type="submit"]');
   await page.waitForURL('**/game');
   await page.waitForFunction(() => globalThis.game?.ready === true);
}

/**
 * Renders a document's sheet inside Foundry and returns any uncaught errors captured during render.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {() => unknown} locate - Browser-context function returning the document (or undefined).
 * @param {string} expectedSelector - A CSS selector the rendered sheet should contain.
 * @returns {Promise<void>}
 */
export async function renderSheet(page, locate, expectedSelector) {
   const errors = [];
   page.on('pageerror', (err) => errors.push(err.message));

   const found = await page.evaluate(async (locateSrc) => {
      // eslint-disable-next-line no-new-func
      const locateFn = new Function(`return (${locateSrc})()`);
      const doc = locateFn();
      if (!doc) {
         return false;
      }
      await doc.sheet.render(true);
      await new Promise((r) => setTimeout(r, 400));
      return true;
   }, locate.toString());

   expect(found, 'document fixture not found in test world').toBe(true);
   await expect(page.locator(expectedSelector).first()).toBeVisible();
   expect(errors, `uncaught errors during render:\n${errors.join('\n')}`).toEqual([]);
}
```

- [ ] **Step 4: Create `tests/e2e/render-smoke.spec.js`**

```js
import { test } from '@playwright/test';
import { login, renderSheet } from './fixtures.js';

test.beforeEach(async ({ page }) => {
   await login(page);
});

test('player actor sheet renders without errors', async ({ page }) => {
   await renderSheet(
      page,
      () => game.actors.find((a) => a.type === 'player'),
      '.titan-player-sheet',
   );
});

test('npc actor sheet renders without errors', async ({ page }) => {
   await renderSheet(
      page,
      () => game.actors.find((a) => a.type === 'npc'),
      '.titan-npc-sheet',
   );
});

for (const type of ['ability', 'armor', 'commodity', 'equipment', 'shield', 'spell', 'weapon']) {
   test(`${type} item sheet renders without errors`, async ({ page }) => {
      await renderSheet(
         page,
         new Function(`return game.items.find((i) => i.type === '${type}')`),
         '.titan-item-sheet',
      );
   });
}

test('effect active-effect sheet renders without errors', async ({ page }) => {
   await renderSheet(
      page,
      () => game.actors.contents.flatMap((a) => a.effects.contents).find((e) => e.type === 'effect'),
      '.titan-effect-sheet',
   );
});
```

- [ ] **Step 5: Run the suite (Foundry must be up)**

Run: `FOUNDRY_USER="Gamemaster" FOUNDRY_PASSWORD="" npm run test:e2e`
Expected: tests execute; failures here ARE the v14 break list for Task 8. Record them.

- [ ] **Step 6: Commit (infra only; do not commit env secrets)**

```bash
git add package.json package-lock.json playwright.config.mjs tests/e2e/
git commit -m "test(e2e): Playwright render-smoke suite for every document type"
```

---

## Task 6: Quench in-client groundwork

**Prerequisite:** Install the "Quench" module in the dev world and enable it.

**Files:**
- Create: `src/quench/RegisterQuenchTests.js`
- Modify: `src/hooks/OnceInit.js` (add one import)

- [ ] **Step 1: Create `src/quench/RegisterQuenchTests.js`**

```js
/**
 * Registers TITAN's in-client Quench test batches. The `quenchReady` hook only fires when the Quench
 * module is installed and active, so this registration is inert in production.
 * @returns {void}
 */
export default function registerQuenchTests() {
   Hooks.on('quenchReady', (quench) => {
      // Render smoke batch: a player sheet must open without throwing.
      quench.registerBatch('titan.render.player-sheet', (context) => {
         const { describe, it, assert, after } = context;

         describe('Player sheet render', () => {
            /** @type {object | undefined} - The sheet opened during the test, closed in after(). */
            let sheet;

            it('renders without throwing', async () => {
               const actor = game.actors.find((a) => a.type === 'player');
               assert.ok(actor, 'no player actor in world');
               sheet = actor.sheet;
               await sheet.render(true);
               assert.ok(sheet.element, 'sheet element not present after render');
            });

            after(async () => {
               await sheet?.close();
            });
         });
      });

      // Placeholder for future check-result-accuracy batches (stub RNG, roll, inspect flags.titan).
      quench.registerBatch('titan.checks.accuracy', (context) => {
         const { describe, it } = context;
         describe('Check result accuracy', () => {
            it.skip('asserts computed check results (to be implemented)', () => {});
         });
      });
   });
}
```

- [ ] **Step 2: Wire the registration into init**

In `src/hooks/OnceInit.js`, add the import near the other imports and call it inside the init handler (after CONFIG is set up):

```js
import registerQuenchTests from '~/quench/RegisterQuenchTests.js';
```

and, within the init function body:

```js
   // Register in-client Quench test batches (inert unless the Quench module is active).
   registerQuenchTests();
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Verify in Foundry (manual)**

With Quench installed: reload Foundry, open the Quench UI, confirm the `titan.render.player-sheet` batch appears and passes.
Expected: batch runs green; the `titan.checks.accuracy` batch shows one skipped test.

- [ ] **Step 5: Commit**

```bash
git add src/quench/RegisterQuenchTests.js src/hooks/OnceInit.js
git commit -m "test(quench): register gated in-client render + check-accuracy groundwork batches"
```

---

## Task 7: Static v14 break audit

**Files:** none changed in this task — it produces a findings list.

- [ ] **Step 1: Dispatch the audit subagent**

Use the Agent tool with `subagent_type: titan-svelte-dev`. The dispatch prompt MUST instruct the agent to first invoke these skills, in order, before any code reading: `titan-codebase`, `foundry-vtt`, `foundry-versioning`, `foundry-svelte`, `foundry-svelte-typhonjs`, `svelte-5`. Then audit `src/` for v13→v14 breaks, reporting concrete `file:line` findings for each category:
- `FilePicker` construction/usage and `TextEditor.enrichHTML` / ProseMirror API shape changes.
- `foundry.appv1` remnants and deprecated `Application`/`FormApplication` options.
- Changed hook names/signatures (e.g. `renderChatMessage` → `renderChatMessageHTML`).
- Direct `foundry.utils.mergeObject` calls that could merge a Document or other non-plain object.
- Document-subtype and sheet-registration APIs.

- [ ] **Step 2: Record findings**

Append the findings as a checklist to this plan under "Audit Findings" (below). Each becomes a fix in Task 8.

### Audit Findings

Confirmed against v14 source unless noted. Checkboxes track Task 8 fixes.

**FIXED this session (commits):** ChatMessage `type`→`style` (`7113b9b6`, user-reported, blocked all rolls); sheet sizes + frozen-options close (`549910e8`, user-reported); async `enrichHTML` + `FilePicker.implementation` + AppV2 `position.width` + status `icon`→`img` (`1169e7f9`); 5 directory/chat/journal hook renames + jQuery→DOM (`7042b05f`, `6f1168ab`).

**NEW finding (user-reported, fixed):** ChatMessage in v14 has document subtypes — `type` is a `DocumentTypeField` (string, default `"base"`); the numeric message style moved to `style`. Setting `type: CONST.CHAT_MESSAGE_STYLES.OTHER` failed validation.

**REMAINING polish (works via shim; do in runtime walk):** context-menu entries still use `name` (deprecated since v14, removed v16) → rename to `label` in `OnGet{Actor,Item}DirectoryEntryContext.js` + `OnGetChatLogEntryContext.js` for consistency with the `visible`/`onClick` shape already applied.

**Category 5 — Hook renames (high impact; hooks never fire in v14, bodies use jQuery):**
- [ ] `src/index.js:19` + `src/hooks/OnGetActorDirectoryEntryContext.js` — `getActorDirectoryEntryContext` → **`getActorContextOptions`**; replace jQuery `element.data('document-id')` with `element.closest('[data-entry-id]').dataset.entryId`.
- [ ] `src/index.js:21` + `src/hooks/OnGetItemDirectoryEntryContext.js` — `getItemDirectoryEntryContext` → **`getItemContextOptions`**; same id/jQuery fix.
- [ ] `src/index.js:20` + `src/hooks/OnGetChatLogEntryContext.js` — `getChatLogEntryContext` → **`getChatMessageContextOptions`**; callback receives HTMLElement `<li>`.
- [ ] `src/index.js:24` + `src/hooks/OnRenderJournalSheet.js` — `renderJournalSheet` → **`renderJournalEntrySheet`**; jQuery `.find/.addClass` → `element.closest`/`classList.add`.
- [ ] `src/index.js:25` + `src/hooks/OnRenderJournalTextPageSheet.js` — `renderJournalTextPageSheet` → **`renderJournalEntryPageProseMirrorSheet`**; jQuery → DOM.

**Category 4 — AppV1 patterns on AppV2 sheets:**
- [x] `src/document/types/actor/sheet/TitanActorSheet.js:48` — V1 `static get defaultOptions()` ignored by AppV2 (width 750 lost) → `static DEFAULT_OPTIONS = { position: { width: 750 } }`. **[user-reported: sheets too small]**
- [x] `src/document/types/item/sheet/TitanItemSheet.js:38` — same (height 650 lost) → `static DEFAULT_OPTIONS = { position: { height: 650 } }`. **[user-reported]**
- [x] `src/document/types/actor/sheet/TitanActorSheet.js:128` — `close()` assigns `this.options.token = null`; v14 freezes `this.options` → "token is read-only". **[user-reported: compendium sheet won't close]**
- [ ] `TitanActorSheet._getHeaderButtons` / `TitanItemSheet._getHeaderButtons` — AppV2 has no `_getHeaderButtons`; header API is `_getHeaderControls()`. Custom header buttons (token edit/link/unlink, import, send-to-chat) are absent. The `{ svelte: { class } }` button shape has no v14 consumer — needs re-implementation (header controls or in-shell). *Larger fix; needs design.*
- [ ] `src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte:18,24` — calls `application.getDialogRenderOptions()` (undefined) → throws once the button is wired.

**Category 3 — TextEditor / enrichHTML (high impact — all rich text broken):**
- [ ] `src/helpers/svelte-components/RichText.svelte:16` — `TextEditor.enrichHTML(...,{async:false})` is async in v14 → renders `[object Promise]`. Enrich in an `$effect`/await into `$state`; use `foundry.applications.ux.TextEditor.implementation.enrichHTML`.
- [ ] `src/helpers/svelte-components/RichText.svelte:16`, `src/document/types/actor/sheet/TitanActorSheet.js:299` — bare global `TextEditor` is a deprecation shim → use `foundry.applications.ux.TextEditor.implementation.*`.

**Category 2 — FilePicker:**
- [ ] `src/helpers/svelte-components/input/ImagePicker.svelte:30` — `new foundry.applications.apps.FilePicker(...)` → `...FilePicker.implementation(...)`.
- [ ] `src/helpers/svelte-components/input/ImagePicker.svelte:39` — `application.options.width` is undefined on AppV2 → use `application.position.width`.

**Category 8 — Other:**
- [ ] `src/system/Conditions.js:13-64` — status effects use `icon:`; v14 removed the `icon` fallback and reads `status.img` → condition icons don't render. Rename `icon:` → `img:`.

**Latent (not a current break):**
- [ ] `src/hooks/OnRenderChatMessageHTML.js:60` — chat mount provides no `application` context. Safe today (no chat consumer of `getApplication()`); add defensively if any chat component starts using it.

---

## Task 8: Automated runtime walk + fix loop

**Files:** varies per finding.

- [ ] **Step 1: Run the Playwright smoke suite**

Run: `FOUNDRY_USER="Gamemaster" FOUNDRY_PASSWORD="" npm run test:e2e`
Expected: a list of failing surfaces with captured error messages.

- [ ] **Step 2: For each failure, fix and re-verify (repeat per surface)**

For each failing test:
1. Read the captured error and the implicated component. Dispatch a `titan-svelte-dev` subagent for the `.svelte`/`.js` fix; its prompt MUST instruct it to first invoke `titan-codebase`, `foundry-vtt`, `foundry-versioning`, `foundry-svelte`, and `svelte-5` before changing code.
2. Apply the fix.
3. Run `npm run build`.
4. Re-run that single E2E test: `npm run test:e2e -- -g "<test name>"`.
5. Commit: `git add <files> && git commit -m "fix(v14): <surface> — <break>"`.

- [ ] **Step 3: Fold any Task 7 static findings not caught by E2E into the same loop**

Apply each "Audit Findings" item, build, and re-run the full E2E suite.

- [ ] **Step 4: Confirm a fully green run**

Run: `FOUNDRY_USER="Gamemaster" FOUNDRY_PASSWORD="" npm run test:e2e`
Expected: all render-smoke tests pass.

- [ ] **Step 5: Confirm the unit suite still passes**

Run: `npm test`
Expected: all unit tests pass.

---

## Task 9: Skill update + final verification

**Files:**
- Modify: `.claude/skills/titan-codebase/references/conventions.md`

- [ ] **Step 1: Document the context-key conventions**

Add a "Svelte context keys" subsection to `conventions.md` capturing: `application` (provided by the mount `context` Map in `TitanDocumentSheet._replaceHTML` and `Dialog.js._replaceHTML`; read via `getApplication()`), `document` (provided by `DocumentSheetShell` and `ChatMessageShell`; read via `getContext('document')`), `applicationState` (provided by `DocumentSheetShell`). Note chat mounts provide no `application` context.

- [ ] **Step 2: Document the v14 sheet-constructor convention**

Add a note: Foundry v14 constructs `DocumentSheetV2` sheets as `new cls({ document })`; all TITAN sheet constructors must accept both that and positional `(document, options)` via `resolveDocumentSheetArguments`, and must not `mergeObject` the document into options.

- [ ] **Step 3: Note the v14 ActiveEffect changes-schema requirement**

Add a note in `references/abstractions.md` (ActiveEffect section): the type data model must define `changes` as an `ArrayField` of `SchemaField` exposing numeric `priority` and string `type`/`phase` (v14 `#verifyActiveEffectModels`).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/titan-codebase/
git commit -m "docs(skill): record v14 context keys, sheet-constructor, and AE changes-schema conventions"
```

---

## Task 10: Interaction-path automated walk (added after render walk passed 10/10)

Render-smoke covers only sheet *render*. This task extends the Playwright walk to the **interaction**
paths where v14 breaks have surfaced manually (rolling checks → chat; the ChatMessage `style` and
initiative bugs were found this way). API-driven via `page.evaluate`, capturing `pageerror`, asserting
outcomes — same robust style as render-smoke (no brittle UI clicks).

**Prereq fixtures:** the E2E Player needs owned items to roll item/attack/casting checks. A `beforeAll`
creates a purpose-built actor with one weapon, one spell, and one ability/equipment carrying a `check[]`
(via `actor.createEmbeddedDocuments('Item', …)`), or reuses existing owned items if present.

### 10a — Check-roll → chat path (primary; each check type)
For each type, call the dialog-bypassing `roll<Type>Check` method directly, capture page errors, and
assert a `ChatMessage` with the expected `flags.titan.type` was created:
- `actor.system.rollAttributeCheck({ attribute: 'body' })` → `attributeCheck`
- `actor.system.rollResistanceCheck({ resistance: 'reflexes' })` → `resistanceCheck`
- `actor.system.rollAttackCheck({ itemId, checkIdx: 0 })` (weapon) → `attackCheck`
- `actor.system.rollCastingCheck({ itemId, checkIdx: 0 })` (spell) → `castingCheck`
- `actor.system.rollItemCheck({ itemId, checkIdx: 0 })` (item w/ check) → `itemCheck`

(Implementer confirms exact option keys from `CharacterDataModel`.) Assert per roll: zero `pageerror`,
and a new chat message of the expected type exists. Then mount each created chat card and assert it
renders (the chat-card render path) with no error.

### 10b — Dialog-render smoke (secondary)
Render each dialog reachable in normal play and assert it mounts with zero errors: the check-options
dialog (force `shouldGetCheckOptions` true, or construct `*CheckDialog` directly), the confirm-delete
dialog, the add/edit custom-trait dialog, and the edit-UUID dialog. Implementer determines the
construction/trigger for each (API-construct where possible).

### 10c — Chat-card button interaction (deferred follow-up)
Post an attack check, click the result card's apply-damage button, assert the target resource changed.
Deferred unless 10a surfaces nothing and we want deeper coverage.

### Fix loop
Each discovered break → `titan-svelte-dev` fix (skills loaded) → re-run that test → iterate to a fully
green interaction suite. Then re-run the full Playwright suite (render + interaction) and `npm test`.

---

## Self-Review notes

- **Spec coverage:** Phase 0 → Tasks 1-6; Phase 1 → Task 3; Phase 2 → Task 7; Phase 3 → Task 8; test tiers → Tasks 1-6; skill update → Task 9. All spec sections mapped.
- **Naming consistency:** `resolveDocumentSheetArguments` (helper), `getApplication` (default export), context keys `application` / `document` / `applicationState` used consistently across tasks.
- **No placeholders:** all code steps contain full code; the only intentionally-deferred item is the `it.skip` Quench check-accuracy batch (explicitly future work per spec non-goals) and the Task 7 findings list (produced at runtime by the audit).
