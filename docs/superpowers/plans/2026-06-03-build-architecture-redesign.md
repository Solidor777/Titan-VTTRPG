# Build-Architecture Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enact CLAUDE.md Strict Rules 1–4 — make the production bundle a single, test-free `dist/index.js` + `dist/style.css`, move the e2e probe into a separate `test/build/` bundle injected by Playwright, and convert the last shipping dynamic import to a static one without a stub.

**Architecture:** Six sequential tasks, each leaving unit tests green and the production build valid. Order is chosen so the probe stays reachable for e2e at every commit: decouple the menu (1) → extract shared Vite config (2) → add the standalone probe build (3) → wire injection + test-build orchestration (4) → only then remove the probe from the system bundle (5) → full verification + docs (6). Full e2e is the final gate (it is user-gated — it needs the launched Foundry world).

**Tech Stack:** Vite 8 (Rolldown) + `@sveltejs/vite-plugin-svelte`, Svelte 5 (runes), Foundry v14 ApplicationV2, Vitest (happy-dom) for unit, Playwright for e2e, esbuild (fast-check bundling).

**Spec:** `docs/superpowers/specs/2026-06-03-build-architecture-design.md`

**CLAUDE.md routing:** Edits to `src/**/*.js` and `src/**/*.svelte` must be routed through the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded. Build-config (`*.mjs`) and test-harness (`tests/**`) edits do not require that subagent. The pack churn in `packs/effects/` is unrelated runtime artifact — never stage it.

---

## File Structure

**New files**
- `vite.shared.mjs` — shared Svelte plugin factory + `resolve.alias` + `css` blocks, used by both Vite configs (single source of truth, prevents drift).
- `vite.probe.config.mjs` — standalone probe build → `test/build/probe.iife.js` (IIFE, `emitCss: false`).
- `src/test-probe/probeBundleEntry.js` — imports and invokes `registerProbe`; the probe bundle's entry point.

**Modified files**
- `vite.config.mjs` — consume `vite.shared.mjs`; (Task 5) drop the `__TITAN_PROBE__` define + `mode`.
- `src/hooks/OnceInit.js` — (Task 5) delete the probe dynamic-import block.
- `src/sidebar/tray/EffectRowContextMenu.js` — take an injected `openMoveToFolder`; remove the dialog import.
- `src/sidebar/tray/EffectTray.svelte` — statically import the dialog; pass the opener.
- `tests/unit/EffectRowContextMenu.test.js` — add the opener-wiring test.
- `tests/e2e/global-setup.js` — build probe (Vite) then fast-check (esbuild) into `test/build/`.
- `tests/e2e/componentProbe.js` — `mountProbe` self-injects the probe bundle.
- `tests/e2e/fast-check.js` — bundle path → `test/build/`.
- `.gitignore`, `package.json` — `test/build/` ignore + `build:e2e` script.

**Unchanged (deliberately)**
- `src/sidebar/tray/MoveEffectToFolderDialog.js`, `src/helpers/dialogs/Dialog.js` — no change; Rule 4 is satisfied by decoupling, not by editing the dialog.
- `src/test-probe/registerProbe.js`, `componentRegistry.js` — reachable only via the probe build now.

---

## Task 1: Decouple the effect-row menu from the dialog (Rules 3b + 4)

**Files:**
- Modify: `src/sidebar/tray/EffectRowContextMenu.js` (line 34 signature; JSDoc; Move-to-Folder entry, lines 66–83)
- Modify: `src/sidebar/tray/EffectTray.svelte` (script imports; `effectContextMenu`, lines 56–63)
- Test: `tests/unit/EffectRowContextMenu.test.js`

- [ ] **Step 1: Write the failing test**

Add this case to `tests/unit/EffectRowContextMenu.test.js` (inside the existing `describe`, after the last `it`):

```js
   it('Move to Folder onClick invokes the injected opener with the resolved effect', () => {
      /** @type {object} The effect the menu resolves from the clicked row. */
      const effect = { id: 'abc' };
      /** @type {object} An editable, folder-capable tray state exposing the effect. */
      const trayState = { canEdit: true, selectedPack: { folders: {} }, effects: [effect] };
      /** @type {object[]} Effects captured by the injected opener spy. */
      const opened = [];
      /** @type {(effect: object) => void} The injected move-to-folder opener. */
      const openMoveToFolder = (resolved) => opened.push(resolved);

      /** @type {object[]} The built menu entries. */
      const entries = buildEffectRowContextMenu(trayState, openMoveToFolder);
      /** @type {object} The Move-to-Folder entry. */
      const move = entries.find((entry) => entry.label === 'LOCAL.effectTrayMoveToFolder.text');

      /** @type {HTMLElement} A fake row carrying the effect id read by resolveEffect. */
      const target = document.createElement('div');
      target.dataset.effectId = 'abc';

      move.onClick({}, target);
      expect(opened).toEqual([effect]);
   });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/EffectRowContextMenu.test.js`
Expected: the new case FAILS (`opened` is `[]` — the current code runs a dynamic `import()` instead of calling the opener). The three existing cases still pass.

- [ ] **Step 3: Update the menu factory to take an injected opener**

In `src/sidebar/tray/EffectRowContextMenu.js`, update the JSDoc + signature (currently line 25–34):

```js
/**
 * Builds the right-click context-menu entries for an effect-tray row. Apply and Open Sheet are always
 * available; Rename, Move to Folder, Duplicate, and Delete require edit permission (Move also requires
 * a folder-capable pack). Entry shape matches TITAN's v14 directory hooks
 * (`{ label, icon, visible(target), onClick(event, target) }`).
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - Reactive tray state
 * read by the entries for permission gating and effect resolution.
 * @param {(effect: object) => void} [openMoveToFolder] - Opens the move-to-folder picker for an effect.
 * Injected by the tray so this module carries no AppV2-dialog import and stays unit-testable.
 * @returns {object[]} The ContextMenuEntry array.
 */
export default function buildEffectRowContextMenu(trayState, openMoveToFolder) {
```

Replace the Move-to-Folder entry's `onClick` (currently lines 70–82, the `async` handler with the `await import(...)`) with:

```js
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               openMoveToFolder(effect);
            }
         },
```

(The entry's `label`, `icon`, and `visible` lines are unchanged; only the `onClick` changes, and it is no longer `async`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/EffectRowContextMenu.test.js`
Expected: all four cases PASS.

- [ ] **Step 5: Wire the opener in EffectTray.svelte**

In `src/sidebar/tray/EffectTray.svelte`, add the static import after line 5
(`import buildEffectRowContextMenu from '~/sidebar/tray/EffectRowContextMenu.js';`):

```js
   import MoveEffectToFolderDialog from '~/sidebar/tray/MoveEffectToFolderDialog.js';
```

Then update `effectContextMenu` (lines 56–63) to build and pass the opener:

```js
   function effectContextMenu(node) {
      /**
       * Opens the move-to-folder picker for an effect. Defined here so the menu module carries no
       * AppV2-dialog import (keeping it unit-testable); the dialog is statically imported above.
       * @param {object} effect - The effect to relocate.
       * @returns {void}
       */
      const openMoveToFolder = (effect) => {
         new MoveEffectToFolderDialog(effect, trayState).render(true);
      };

      /** @type {object} The Foundry context menu bound to the tray's effect rows. */
      const menu = new foundry.applications.ux.ContextMenu(
         node,
         '[data-effect-id]',
         buildEffectRowContextMenu(trayState, openMoveToFolder),
         { jQuery: false, fixed: true },
      );
```

(The `return { destroy() {...} }` block below is unchanged.)

- [ ] **Step 6: Verify the full unit suite + production build**

Run: `npm test`
Expected: all unit tests PASS — exactly one more than the current baseline (the new opener case). Record the actual count.

Run: `npm run build`
Expected: build succeeds and `dist/` now contains a single `index.js` (no `MoveEffectToFolderDialog-*.js` / `Dialog-*.js` / `Select-*.js` chunks — the dialog is now statically inlined).

- [ ] **Step 7: Commit**

```bash
git add src/sidebar/tray/EffectRowContextMenu.js src/sidebar/tray/EffectTray.svelte tests/unit/EffectRowContextMenu.test.js
git commit -m "refactor(tray): inject move-to-folder opener so the menu drops its dynamic dialog import

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Extract shared Vite config into `vite.shared.mjs` (Part A.1)

**Files:**
- Create: `vite.shared.mjs`
- Modify: `vite.config.mjs`

- [ ] **Step 1: Create `vite.shared.mjs`**

```js
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import path from 'path';
import { fileURLToPath } from 'url';
import autoprefixer from 'autoprefixer';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // repo root (this file lives there)

/** @type {Record<string, string>} Shared intra-project import aliases. */
export const alias = {
   '~/': `${path.resolve(__dirname, 'src')}/`,
   '$fonts/': `${path.resolve(__dirname, 'fonts')}/`,
};

/** @type {object} Shared CSS / PostCSS / SCSS configuration. */
export const css = {
   postcss: {
      plugins: [autoprefixer()],
   },
   preprocessorOptions: {
      scss: {
         api: 'modern-compiler',
      },
   },
};

/**
 * Builds the project's Svelte plugin with the shared SCSS preprocessing.
 * @param {{ emitCss?: boolean }} [options] - When `emitCss` is true (production) component styles are
 * emitted as a separate stylesheet; when false (probe build) the Svelte runtime injects them at mount,
 * so a re-compiled probe bundle's components stay styled despite differing scoped-class hashes.
 * @returns {import('vite').Plugin} The configured Svelte plugin.
 */
export function createSveltePlugin({ emitCss = true } = {}) {
   return svelte({
      configFile: false,
      emitCss,
      preprocess: sveltePreprocess({
         scss: {
            api: 'modern',
            prependData: '@use "src/styles/Root.scss" as *;',
         },
         postcss: {
            plugins: [autoprefixer()],
         },
      }),
      onwarn: (warning, handler) => {
         // Don't warn on preprocess dependencies.
         if (warning.code === 'vite-plugin-svelte-preprocess-many-dependencies') {
            return;
         }

         // Let vite handle all other warnings normally.
         handler(warning);
      },
   });
}
```

- [ ] **Step 2: Rewrite `vite.config.mjs` to consume the shared module**

Replace the entire file with (note: the `__TITAN_PROBE__` define and the `({ mode })` wrapper are intentionally **kept** here — they are removed in Task 5, once `OnceInit.js` no longer references the global):

```js
import path from 'path';
import { fileURLToPath } from 'url';
import { alias, css, createSveltePlugin } from './vite.shared.mjs';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// For convenience, modify the package ID below; it fills in default proxy settings for the dev server.
const s_PACKAGE_ID = 'systems/titan';

const s_COMPRESS = true;  // Set to true to compress the module bundle.
const s_SOURCEMAPS = true; // Generate sourcemaps for the bundle (recommended).

export default ({ mode }) => {
   /** @type {import('vite').UserConfig} */
   return {
      root: 'src/',                 // Source location / esbuild root.
      base: `/${s_PACKAGE_ID}/`,    // Base module path served by the dev server.
      publicDir: false,             // No public resources to copy.
      cacheDir: '../.vite-cache',   // Relative from root directory.

      resolve: {
         conditions: ['import', 'browser'],
         alias,
      },

      esbuild: {
         target: ['es2022'],
      },

      css,

      define: {
         'process.env.NODE_ENV': JSON.stringify('production'),
         // Test-only probe harness gate: true only under `vite build --mode e2e`.
         __TITAN_PROBE__: JSON.stringify(mode === 'e2e'),
      },

      server: {
         port: 30001,
         open: '/game',
         proxy: {
            // Serves static files from main Foundry server.
            [`^(/${s_PACKAGE_ID}/(assets|lang|packs|dist/style.css))`]: 'http://localhost:30000',

            // All other paths besides package ID path are served from main Foundry server.
            [`^(?!/${s_PACKAGE_ID}/)`]: 'http://localhost:30000',

            // Enable socket.io from main Foundry server.
            '/socket.io': { target: 'ws://localhost:30000', ws: true },
         },
      },
      build: {
         outDir: path.join(__dirname, 'dist'),
         emptyOutDir: true,
         sourcemap: s_SOURCEMAPS,
         brotliSize: true,
         minify: s_COMPRESS ? 'terser' : false,
         target: ['es2022'],
         terserOptions: s_COMPRESS ? { ecma: 2022 } : void 0,
         lib: {
            entry: './index.js',
            formats: ['es'],
            fileName: 'index',
            // Emit CSS as `style.css` to match `system.json` styles and the dev-server proxy.
            cssFileName: 'style',
         },
      },
      plugins: [
         createSveltePlugin(),
      ],
   };
};
```

- [ ] **Step 3: Verify the production build is unchanged**

Run: `npm run build`
Expected: build succeeds; `dist/` contains `index.js`, `index.js.map`, `style.css` (single chunk, as established in Task 1). No errors about missing aliases or SCSS.

- [ ] **Step 4: Commit**

```bash
git add vite.shared.mjs vite.config.mjs
git commit -m "build: extract shared Svelte plugin/alias/css into vite.shared.mjs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add the standalone probe build (Part A.2)

**Files:**
- Create: `src/test-probe/probeBundleEntry.js`
- Create: `vite.probe.config.mjs`
- Modify: `package.json` (the `build:e2e` script)

- [ ] **Step 1: Create the probe entry point**

`src/test-probe/probeBundleEntry.js`:

```js
import registerProbe from '~/test-probe/registerProbe.js';

// This bundle is injected by Playwright after the world is ready, so `game.titan` already exists and the
// probe can register immediately. The `ready`-hook fallback covers any earlier injection.
if (globalThis.game?.titan) {
   registerProbe();
}
else {
   Hooks.once('ready', registerProbe);
}
```

- [ ] **Step 2: Create `vite.probe.config.mjs`**

```js
import path from 'path';
import { fileURLToPath } from 'url';
import { alias, css, createSveltePlugin } from './vite.shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Standalone build of the e2e component-probe. Emits a self-contained IIFE to `test/build/` that, when
 * injected into a ready Foundry page, registers `game.titan._probe`. This bundle is NEVER part of a
 * system build — it is the structural guarantee behind Strict Rule 1.
 * @type {import('vite').UserConfig}
 */
export default {
   root: 'src/',
   publicDir: false,
   cacheDir: '../.vite-cache',

   resolve: {
      conditions: ['import', 'browser'],
      alias,
   },

   esbuild: {
      target: ['es2022'],
   },

   css,

   define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
   },

   build: {
      outDir: path.join(__dirname, 'test/build'),
      // Self-cleaning per Rule 2: a standalone `npm run build:e2e` wipes test/build first. global-setup
      // builds the probe BEFORE fast-check so this clean never removes the fast-check bundle.
      emptyOutDir: true,
      sourcemap: false,
      minify: false,
      target: ['es2022'],
      lib: {
         entry: './test-probe/probeBundleEntry.js',
         formats: ['iife'],
         name: 'TitanProbe',
         fileName: 'probe',
      },
   },

   // emitCss:false → the Svelte runtime injects component styles at mount, so probe-mounted components
   // stay styled despite scoped-class hashes differing from the system's dist/style.css.
   plugins: [
      createSveltePlugin({ emitCss: false }),
   ],
};
```

- [ ] **Step 3: Point `build:e2e` at the probe config**

In `package.json`, change the `build:e2e` script from `vite build --mode e2e` to:

```json
      "build:e2e": "vite build --config vite.probe.config.mjs",
```

- [ ] **Step 4: Build the probe and verify the artifact**

Run: `npm run build:e2e`
Expected: build succeeds; the file `test/build/probe.iife.js` exists. (If Vite emits a differently-suffixed name, the `fileName: 'probe'` + `formats: ['iife']` combination yields `probe.iife.js`; confirm the exact name and use it consistently in Task 4.)

Run: `git status --short dist/`
Expected: no changes under `dist/` — the probe build wrote only to `test/build/`, leaving the production bundle untouched.

- [ ] **Step 5: Commit** (`test/build/` is gitignored in Task 4; nothing to stage from it)

```bash
git add src/test-probe/probeBundleEntry.js vite.probe.config.mjs package.json
git commit -m "build: add standalone probe IIFE build (vite.probe.config.mjs -> test/build/)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire probe injection + test-build orchestration (Parts B + D)

**Files:**
- Modify: `tests/e2e/global-setup.js`
- Modify: `tests/e2e/componentProbe.js`
- Modify: `tests/e2e/fast-check.js`
- Modify: `.gitignore`

- [ ] **Step 1: Build both test bundles in global-setup**

Replace `tests/e2e/global-setup.js` with:

```js
import { build as esbuildBuild } from 'esbuild';
import { build as viteBuild } from 'vite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The directory of this setup file, used to resolve repo paths.
const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright global setup: build the two self-contained test bundles into `test/build/`.
 *   1. The component-probe IIFE (Vite + Svelte) — its `emptyOutDir` cleans `test/build/` first.
 *   2. The fast-check IIFE (esbuild) — built AFTER the probe so the probe's clean does not wipe it.
 * @returns {Promise<void>} Resolves once both bundles have been written.
 */
export default async function globalSetup() {
   // The repo root, used as the module-resolution base and the config location.
   const repoRoot = path.resolve(dirname, '../..');

   // The output directory for built test artifacts (gitignored, self-cleaning).
   const buildDir = path.resolve(repoRoot, 'test/build');

   // 1. Build the component-probe IIFE → test/build/probe.iife.js (clears test/build/ via emptyOutDir).
   await viteBuild({ configFile: path.resolve(repoRoot, 'vite.probe.config.mjs') });

   // 2. Bundle fast-check into an IIFE exposing the `fc` global for in-page property tests. An inline
   // stdin entry re-exports the package (esbuild entry points are file paths, not bare specifiers).
   await mkdir(buildDir, { recursive: true });
   await esbuildBuild({
      stdin: {
         contents: "export * from 'fast-check';",
         resolveDir: repoRoot,
         sourcefile: 'fast-check-entry.js',
      },
      bundle: true,
      format: 'iife',
      globalName: 'fc',
      // Promote the IIFE result onto `globalThis` so `fc` is readable across page.evaluate contexts.
      footer: {
         js: 'globalThis.fc = fc;',
      },
      platform: 'browser',
      outfile: path.join(buildDir, 'fast-check.iife.js'),
      logLevel: 'silent',
   });
}
```

- [ ] **Step 2: Make `mountProbe` self-inject the probe bundle**

In `tests/e2e/componentProbe.js`, add imports at the top of the file and an `ensureProbe` helper, then call it from `mountProbe`.

Add at the very top (before the existing JSDoc/`mountProbe`):

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Absolute path to the probe IIFE built by Playwright global-setup into test/build/.
const PROBE_BUNDLE = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../test/build/probe.iife.js',
);

/**
 * Ensure the in-page component-probe API is registered, injecting the probe bundle when absent. The
 * bundle (built by global-setup) registers `game.titan._probe` synchronously on execution.
 * @param {import('@playwright/test').Page} page - The Playwright page (must already be at a ready world).
 * @returns {Promise<void>} Resolves once the probe bundle has been injected (or was already present).
 */
async function ensureProbe(page) {
   /** @type {boolean} Whether the probe API is already registered on this page. */
   const present = await page.evaluate(() => !!globalThis.game?.titan?._probe);
   if (!present) {
      await page.addScriptTag({ path: PROBE_BUNDLE });
   }
}
```

In `mountProbe`, add `await ensureProbe(page);` as the first line of the function body (before the `return page.evaluate(...)`), and update the existing in-page error message from:

```js
         throw new Error('game.titan._probe is not registered — build the e2e bundle with `npm run build:e2e`.');
```

to:

```js
         throw new Error('game.titan._probe is not registered — ensure test/build/probe.iife.js was built (npm run test:e2e builds it via global-setup).');
```

- [ ] **Step 3: Point fast-check at the new bundle location**

In `tests/e2e/fast-check.js`, change `FAST_CHECK_BUNDLE`:

```js
// The absolute path to the fast-check IIFE bundle produced by global-setup.js.
const FAST_CHECK_BUNDLE = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../test/build/fast-check.iife.js',
);
```

- [ ] **Step 4: Update `.gitignore`**

In `.gitignore`, replace the `tests/vendor/` line (line 20) with `test/build/`, and remove the now-obsolete chunk-ignore block (lines 11–13: the `# Vite code-split chunks…` comment and the two `/*-????????.js` patterns — no chunks are emitted at the repo root anymore).

Result (relevant region):

```gitignore
dist/
node_modules/
/index.js
/index.js.map
/style.css
titan.zip
test-results/
playwright-report/
packs/**/LOG
packs/**/LOCK
*.old
test/build/
.superpowers/
```

- [ ] **Step 5: Verify orchestration builds both bundles**

Run: `npm run build:e2e`
Expected: `test/build/probe.iife.js` exists (the standalone probe build still works against the shared config).

Run: `git status --short`
Expected: `test/build/` does not appear (it is now gitignored); only the modified tracked files appear.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/global-setup.js tests/e2e/componentProbe.js tests/e2e/fast-check.js .gitignore
git commit -m "test(e2e): build probe + fast-check into test/build/; mountProbe self-injects

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Remove the probe from the system bundle (Part A.3)

**Files:**
- Modify: `src/hooks/OnceInit.js` (delete the probe block, ≈ lines 198–207)
- Modify: `vite.config.mjs` (drop the `__TITAN_PROBE__` define + `mode`)

- [ ] **Step 1: Delete the probe block in `OnceInit.js`**

Remove this entire block (the comment, the `/* global */` directive, and the `if`) from `src/hooks/OnceInit.js`, leaving the `unregisterSheet` lines above it and the function's closing brace below:

```js
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

- [ ] **Step 2: Drop the probe define + `mode` from `vite.config.mjs`**

Change the wrapper line from:

```js
export default ({ mode }) => {
```

to:

```js
export default () => {
```

And change the `define` block from:

```js
      define: {
         'process.env.NODE_ENV': JSON.stringify('production'),
         // Test-only probe harness gate: true only under `vite build --mode e2e`.
         __TITAN_PROBE__: JSON.stringify(mode === 'e2e'),
      },
```

to:

```js
      define: {
         'process.env.NODE_ENV': JSON.stringify('production'),
      },
```

- [ ] **Step 3: Build and prove the probe is structurally absent (Rules 1 + 3)**

Run: `npm run build`
Expected: build succeeds; `dist/` contains only `index.js`, `index.js.map`, `style.css` (+ `style.css.map` if emitted) — no `*-[hash].js` chunks.

Run (PowerShell): `Select-String -Path dist/index.js -Pattern 'registerProbe','_probe','__TITAN_PROBE__' -SimpleMatch`
Expected: **no matches** — the probe code, the `game.titan._probe` assignment, and the build flag are all absent from the shipping bundle (Rule 1 proven structurally).

Run (PowerShell): `Select-String -Path dist/index.js -Pattern 'import\('`
Expected: **no matches** — no dynamic imports remain in the shipping bundle (Rule 3 proven).

- [ ] **Step 4: Verify unit suite still green**

Run: `npm test`
Expected: all unit tests PASS (count unchanged from Task 1).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/OnceInit.js vite.config.mjs
git commit -m "build: remove the e2e probe from the system bundle (no test code in shipping builds)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Full verification + docs

**Files:**
- Modify: `docs/TODO.md` (close #13)
- Modify: `.claude/skills/titan-codebase/references/architecture.md` (new build model)

- [ ] **Step 1: Unit suite**

Run: `npm test`
Expected: all PASS. Record the count.

- [ ] **Step 2: Production-build proofs (re-confirm Rules 1 + 3)**

Run: `npm run build`
Run (PowerShell): `Get-ChildItem dist | Select-Object Name`
Expected: only `index.js`, `index.js.map`, `style.css` (+ optional `style.css.map`).

Run (PowerShell): `Select-String -Path dist/index.js -Pattern 'registerProbe','_probe' -SimpleMatch`
Expected: no matches.

- [ ] **Step 3: Full e2e suite (USER-GATED — requires the launched Foundry world)**

Ask the user to confirm the dev world is launched on `:30000`, then run: `npm run test:e2e`
Expected: green. global-setup builds `test/build/probe.iife.js` + `test/build/fast-check.iife.js`; `mountProbe` injects the probe (now sourced only from `test/build/`); the `component-probe-*` specs, `logic/rules-elements`, the fast-check specs, and `effect-tray` move-to-folder all pass. Record the count (~355+).

If any probe spec fails to find `game.titan._probe`, confirm `test/build/probe.iife.js` exists and that `mountProbe` runs after `login(page)` in that spec.

- [ ] **Step 4: Close TODO #13**

In `docs/TODO.md`, delete the `### 13. Build-architecture redesign …` section (the work is complete). Confirm #14/#15 and the chat-message items remain.

- [ ] **Step 5: Update the titan-codebase skill**

In `.claude/skills/titan-codebase/references/architecture.md`, update the build description to reflect: production `vite build` → `dist/index.js` + `dist/style.css` only (single chunk, no dynamic imports, no test code); the e2e probe is a separate IIFE built by `vite.probe.config.mjs` into `test/build/` and injected by Playwright (`mountProbe` self-injects); shared Vite config lives in `vite.shared.mjs`; test *source* is `tests/` (plural) while built test *artifacts* are `test/build/` (singular). Keep it descriptive and concise per the skill's self-update protocol.

- [ ] **Step 6: Commit**

```bash
git add docs/TODO.md .claude/skills/titan-codebase/references/architecture.md
git commit -m "docs: close TODO #13; document the externalized-probe build model

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to merge `chore/build-architecture-redesign` into `main` (the project's branch-then-merge workflow) once all of the above is green.

---

## Self-Review notes

- **Spec coverage:** Part A → Tasks 2, 3, 5; Part B → Task 4 (mountProbe self-inject); Part C → Task 1; Part D → Tasks 3 (script) + 4 (global-setup, gitignore); Verification → Tasks 1/2/5/6; Docs → Task 6. All spec sections map to a task.
- **Coherent commits:** every task leaves `npm test` green and `npm run build` valid; the probe stays reachable for e2e until Task 5, and injection (Task 4) lands before removal (Task 5). Full e2e is the final gate (Task 6).
- **No stub fix:** Rule 4 is met by decoupling (Task 1); `Dialog.js`/`TitanDialog` and `tests/setup.js` are untouched.
