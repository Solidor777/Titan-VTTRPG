# Build-Architecture Redesign — Design

**Date:** 2026-06-03
**Status:** Approved (design); pending plan.
**Backlog item:** `docs/TODO.md` #13.

## Problem

The build does not yet obey CLAUDE.md's Strict Rules 1–4:

1. **No test/e2e code in shipping builds.** The e2e component-probe is *compiled into*
   the system bundle and then dead-code-eliminated. `OnceInit.js` (≈ lines 198–207) does
   `if (__TITAN_PROBE__) import('~/test-probe/registerProbe.js')`; `__TITAN_PROBE__` is a
   Vite `define` set to `mode === 'e2e'`. Production relies on terser DCE to strip the
   branch — the probe (and its 80-component registry) is *compiled then eliminated*, not
   structurally excluded.
2. **Test/e2e builds → `test/build/`, self-cleaning.** Today `build:e2e`
   (`vite build --mode e2e`) writes the probe-included bundle to the **same `dist/`** as the
   production build (it overwrites it), and `system.json`'s `esmodules` points at
   `dist/index.js`, so Foundry loads whatever was built last.
3. **No dynamic imports in shipping builds, ever.** Two real dynamic imports exist in
   shipping `src/`: the probe import above, and `EffectRowContextMenu.js:80`
   `await import('~/sidebar/tray/MoveEffectToFolderDialog.js')`. (Every other `import(` in
   `src/` is a JSDoc `@type {import('…')}` annotation, not a runtime import.) Because of the
   genuine dynamic import, even a *production* build today emits split chunks
   (`MoveEffectToFolderDialog-*.js`, `Dialog-*.js`, `Select-*.js`, …) rather than a single
   `index.js`.
4. **No stub fixes.** The menu's import is dynamic specifically because
   `MoveEffectToFolderDialog` → `Dialog.js:7` runs
   `const { ApplicationV2 } = foundry.applications.api` at **module load**, which throws in
   vitest (`tests/setup.js` mocks `foundry` as only `{ abstract, utils }`).
   `EffectRowContextMenu.js` is unit-tested, so a static import would pull `Dialog.js` into
   the vitest module graph and crash it. A bare `ApplicationV2` mock in `tests/setup.js` is
   **forbidden** by Rule 4.

### Terminology note — `tests/` vs `test/build/`

Test *source* lives in `tests/` (plural): `tests/unit/`, `tests/e2e/`, helpers.
Built test *artifacts* go in `test/build/` (singular), per CLAUDE.md Rule 2. The two are
deliberately distinct directories; do not conflate them.

## Goals (target end-state)

- Production `npm run build` → **`dist/index.js` + `dist/style.css` only** — no split
  chunks, no dynamic imports, no probe code anywhere in the bundle.
- The e2e component-probe is a **separate, self-contained bundle** in `test/build/`,
  injected into the page by Playwright at test time. It is never part of any system build.
- The single genuine app dynamic import (`MoveEffectToFolderDialog`) becomes a normal static
  import, with the vitest crash resolved at its **root cause** (not a stub/mock).
- `test/build/` is self-cleaning (wiped at the start of every e2e build) and gitignored.

## Non-goals

- No change to what the probe can mount or to any e2e assertion (behavior parity).
- No change to `TitanDialog`/`Dialog.js` or to any other dialog subclass.
- No e2e-suite speedup (TODO #14/#15) — separate work.

## Design

### Part A — Externalize the probe (Rules 1 + 3a)

**Remove from the system bundle**

- Delete the `if (__TITAN_PROBE__) { import('~/test-probe/registerProbe.js')… }` block in
  `src/hooks/OnceInit.js`.
- Delete the `__TITAN_PROBE__` entry from the `define` block in `vite.config.mjs`. With the
  probe gone, `mode` is no longer read by the production config, so the
  `export default ({ mode }) => …` wrapper simplifies (the `mode` parameter is dropped).

**Build the probe as its own bundle**

- New entry `src/test-probe/probeBundleEntry.js` — imports the existing
  `registerProbe` default export and invokes it on load. Because injection happens
  post-`ready` (see Part B), `game.titan` exists; a defensive guard registers on the
  `ready` hook if it somehow runs earlier:

  ```js
  import registerProbe from '~/test-probe/registerProbe.js';
  if (globalThis.game?.titan) {
     registerProbe();
  } else {
     Hooks.once('ready', registerProbe);
  }
  ```

- New `vite.probe.config.mjs` — a dedicated build kept entirely out of the production
  `vite.config.mjs` (so no test concern entangles the shipping config). It builds
  `probeBundleEntry.js` as a **self-contained IIFE** to `test/build/probe.iife.js`:
  - `build.lib = { entry: 'test-probe/probeBundleEntry.js', formats: ['iife'], name: 'TitanProbe', fileName: 'probe' }`
    (so the emitted file is `probe.iife.js`).
  - `build.outDir = <repo>/test/build`, `emptyOutDir: true` — so a standalone
    `npm run build:e2e` is itself self-cleaning (Rule 2). global-setup orders the builds so
    this clean never wipes the fast-check bundle (probe first, then fast-check — see Part D).
  - `root: 'src/'`, same `~/` and `$fonts/` aliases as production.
  - **`emitCss: false` on the Svelte plugin.** The probe re-compiles the 80 components, so
    their Svelte scoped-class hashes differ from the system's already-loaded
    `dist/style.css`; with `emitCss: false` the Svelte runtime injects each component's
    styles at mount time, keeping probe-mounted components styled (parity with today, where
    the probe *is* the system bundle and shares its CSS).

**Avoid config drift**

- Extract the shared Svelte-plugin/alias/SCSS setup into `vite.shared.mjs`, exporting a
  `createSveltePlugin({ emitCss = true } = {})` factory plus the shared `resolve.alias` and
  `css` blocks. `vite.config.mjs` uses `createSveltePlugin()` (emitCss defaults true →
  `style.css`); `vite.probe.config.mjs` uses `createSveltePlugin({ emitCss: false })`.

### Part B — Inject the probe via Playwright (Rule 1; mirrors fast-check)

`tests/e2e/global-setup.js` already bundles **fast-check** into a standalone IIFE that specs
inject with `page.addInitScript`. The probe follows the same "build a test bundle, inject it
into the page" model, with one difference: the probe must register **after** the world is
ready (it sets `game.titan._probe`), so it is injected with `page.addScriptTag` post-`login`.

**`mountProbe` self-injects (no per-spec edits).** All ~10 probe specs
(`component-probe-*.spec.js`, `component-probe-context.spec.js`, `logic/rules-elements.spec.js`)
route through `componentProbe.js`'s `mountProbe`. `mountProbe` gains an ensure-injected step:
before mounting, it checks `game.titan._probe`; if absent, it
`await page.addScriptTag({ path: <repo>/test/build/probe.iife.js })` (the IIFE registers
`_probe` synchronously), then proceeds. This is the single chokepoint, so:

- Zero probe-spec files change.
- Injection is lazy (only when a probe is actually mounted) and idempotent (subsequent
  mounts see `_probe` present and skip the inject).
- The presence check (`page.evaluate(() => !!globalThis.game?.titan?._probe)`) is
  authoritative, so it also self-heals after a page reload.
- `componentProbe.js`'s existing "build the e2e bundle with `npm run build:e2e`" error
  message is updated to reflect the new path (probe missing from `test/build/` → run
  `npm run test:e2e`, which builds it, or `npm run build:e2e` to build it standalone).

### Part C — Static `MoveEffectToFolderDialog` import via decoupling (Rules 3b + 4)

Root cause: the unit-tested menu factory hard-depends on a concrete `ApplicationV2`-subclass
dialog. Fix by dependency inversion — the menu describes the action; the concrete dialog is
injected by the component that owns the tray:

- `src/sidebar/tray/EffectRowContextMenu.js`:
  - Signature → `buildEffectRowContextMenu(trayState, openMoveToFolder)`.
  - The **Move to Folder** entry's `onClick` resolves the effect (unchanged) and calls
    `openMoveToFolder(effect)` — the `await import('~/sidebar/tray/MoveEffectToFolderDialog.js')`
    and `new MoveEffectToFolderDialog(...)` are removed. No import of the dialog remains
    (static or dynamic).
  - JSDoc updated to document the new `openMoveToFolder` parameter.
- `src/sidebar/tray/EffectTray.svelte`:
  - Add a top-level static `import MoveEffectToFolderDialog from '~/sidebar/tray/MoveEffectToFolderDialog.js';`.
  - Build the opener `(effect) => new MoveEffectToFolderDialog(effect, trayState).render(true)`
    and pass it as the second argument to `buildEffectRowContextMenu(trayState, openMoveToFolder)`
    at the `new foundry.applications.ux.ContextMenu(...)` call site.

Outcome: the unit-tested module no longer imports `Dialog.js`; the static import lives only
in `EffectTray.svelte`, which no unit test imports. `Dialog.js` and `TitanDialog` are
untouched; no `ApplicationV2` mock is added. The last shipping dynamic import is gone, so the
production build collapses to a single `index.js`.

**New unit test** (`tests/unit/EffectRowContextMenu.test.js`): the Move-to-Folder `onClick`
calls the injected `openMoveToFolder` with the resolved effect. This is a normal test-double
collaborator injection (a spy), not a stub fix. Existing assertions (labels / visibility),
which call `buildEffectRowContextMenu(trayState)` without an opener and never invoke the Move
`onClick`, stay green unchanged.

### Part D — Build orchestration + `test/build/` hygiene (Rule 2)

- `tests/e2e/global-setup.js` — build the two test bundles in this order so the probe's
  `emptyOutDir` clean leaves the dir holding only fresh artifacts:
  1. Build `probe.iife.js` into `test/build/` via Vite's JS API:
     `import { build } from 'vite'; await build({ configFile: <repo>/vite.probe.config.mjs })`.
     Its `emptyOutDir: true` wipes `test/build/` first (the "stale files deleted every build"
     guarantee).
  2. Build `fast-check.iife.js` into `test/build/` (existing esbuild step, output path moved
     from `tests/vendor/` to `test/build/`). Runs *after* the probe so the probe's clean
     doesn't wipe it; esbuild's `mkdir(recursive)` ensures the dir still exists.
- `tests/e2e/fast-check.js`: update `FAST_CHECK_BUNDLE` to
  `…/test/build/fast-check.iife.js`.
- `.gitignore`: add `test/build/`; remove the now-unused `tests/vendor/` entry and the
  "Vite code-split chunks emitted at repo root" entry (no more chunks are emitted).
- `package.json`:
  - `build:e2e` → `vite build --config vite.probe.config.mjs` (probe only; for standalone
    debugging — the e2e run builds it automatically via global-setup).
  - `build` unchanged (`vite build`), now naturally single-chunk.

**Developer workflow:** `npm run build` (production → `dist/`) → `npm run test:e2e`
(global-setup builds `probe.iife.js` + `fast-check.iife.js` into `test/build/`). e2e runs
against the exact production `dist/` bundle plus the injected probe.

## File-by-file change list

**Production / build config**
- `vite.config.mjs` — drop `__TITAN_PROBE__` define + unused `mode`; use `createSveltePlugin()` from shared.
- `vite.shared.mjs` *(new)* — `createSveltePlugin({ emitCss })`, shared `resolve.alias`, `css` blocks.
- `vite.probe.config.mjs` *(new)* — IIFE probe build → `test/build/probe.iife.js`, `emitCss: false`.
- `src/hooks/OnceInit.js` — delete the probe dynamic-import block.

**Probe**
- `src/test-probe/probeBundleEntry.js` *(new)* — imports + invokes `registerProbe`.
- `src/test-probe/registerProbe.js`, `componentRegistry.js` — unchanged (now only reachable via the probe build).

**Menu / dialog decoupling**
- `src/sidebar/tray/EffectRowContextMenu.js` — inject `openMoveToFolder`; remove dialog import.
- `src/sidebar/tray/EffectTray.svelte` — static import of the dialog; pass the opener.
- `src/sidebar/tray/MoveEffectToFolderDialog.js`, `src/helpers/dialogs/Dialog.js` — unchanged.

**Tests / orchestration**
- `tests/e2e/global-setup.js` — clean `test/build/`; build fast-check + probe into it.
- `tests/e2e/componentProbe.js` — `mountProbe` self-injects the probe; update error message.
- `tests/e2e/fast-check.js` — update bundle path to `test/build/`.
- `tests/unit/EffectRowContextMenu.test.js` — add the opener-wiring test.
- `.gitignore`, `package.json` — as above.

**Docs**
- `docs/TODO.md` — close/remove #13.
- `.claude/skills/titan-codebase/references/architecture.md` (and `conventions.md` if needed)
  — document the pure-system-bundle + external-probe model and the `tests/` vs `test/build/`
  distinction.

## Verification

- **Unit:** `npm test` green, including the new opener test → proves `Dialog.js` is out of
  the unit module graph and decoupling is behavior-preserving.
- **Production build:** `npm run build`, then assert:
  - `dist/` contains only `index.js`, `index.js.map`, `style.css` (+ `style.css.map` if
    emitted) — **no `*-[hash].js` chunks**.
  - `dist/index.js` contains no `registerProbe`, no `_probe`, no `import(` (dynamic) — Rules
    1 + 3 proven structurally.
- **Probe build:** `npm run build:e2e` (or global-setup) emits `test/build/probe.iife.js`;
  injecting it registers `game.titan._probe`.
- **E2E:** `npm run test:e2e` green. **User-gated** — requires the launched world
  (login is world-launch-gated); a green run is required before merge.

## Risks

- **Probe component styling.** Mitigated by `emitCss: false` (runtime style injection). Spot
  one component-probe spec that asserts on styled output to confirm parity.
- **Duplicate Svelte runtime** in the probe bundle. Harmless: the probe mounts components in
  isolated detached containers with its own runtime; it shares only the DOM and runtime
  globals (`game`, `CONFIG`) with the system, which it reads, never co-mounts.
- **Module-load side effects** in re-bundled components. The probe loads post-`ready`
  (strictly later than the system's init-time load), so any globals such components read are
  more available, not less.
- **`tests/` vs `test/build/` confusion.** Called out explicitly in docs; the `.gitignore`
  entry and orchestration target the singular `test/build/`.

## Out of scope / follow-ups

- TODO #10–#12 (chat-message follow-ups), #14/#15 (e2e speedup phases) — unchanged.
- Pre-existing deferred bugs in `docs/OPEN_BUGS.md` — untouched.
