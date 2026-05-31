# TITAN E2E — Phase 3b Component-Tier Probe Harness (Design)

**Date:** 2026-05-31. **Branch:** `development`. **Status:** approved design, pre-plan.

## Problem

The e2e suite drives Svelte components only through fully rendered document sheets
(`render-smoke.spec.js`, `traits.spec.js`, the checks-dialog specs). The base UI primitives in
`src/helpers/svelte-components/**` (~70 components) have no isolated coverage: there is no way to mount a
single primitive with controlled props, drive a real interaction, and assert its contract independent of any
sheet. This phase builds that capability (the **probe harness**) and proves it with a representative core set
of primitives, exercised **behaviorally**.

## Scope

**In scope (this pass):**
- A build-flag-gated probe-mount API exposed inside the live Foundry page.
- A Playwright page object that mounts a named primitive in isolation and reads back interaction outcomes.
- Behavioral probe specs for a **core set of 7 primitives**: `Button`, `TextInput`, `NumberInput`,
  `IntegerInput`, `CheckboxInput`, `Select`, `LabelTag`.
- Any real primitive bugs the probes surface, fixed red→green.
- `testId` props added to core-set components that lack one.

**Out of scope (later 3b increments):**
- The remaining ~63 primitives (tags, labels, the many `select/` subtypes, meters, editors, etc.).
- Components requiring rich Foundry context (document data bridge, `getContext('application')`) beyond a
  stub — the harness will *support* a context map, but the core set is chosen to be context-free.

## Chosen approach: in-Foundry probe registry (gated)

Mount real primitives inside the live Foundry runtime so the shipped SCSS mixins (`@include button`,
`@include input`), `game.i18n` localization, and the `tooltipAction` Svelte action all execute exactly as in
production. Rejected alternatives:

- **Probe ApplicationV2 gallery** — a test-only AppV2 window per component. Adds window chrome and a render
  lifecycle with no assertion benefit.
- **Standalone probe page + separate bundle** — components bundled into a static page with no Foundry login.
  Loses the Foundry CSS mixins, i18n, and tooltip manager the primitives depend on → false confidence.

## Architecture

### 1. Probe module — `src/test-probe/` (gated; never ships)

- **`componentRegistry.js`** — a plain string→component map for the core set:
  `{ Button, TextInput, NumberInput, IntegerInput, CheckboxInput, Select, LabelTag }`. New components are
  added here as later increments cover them.
- **`registerProbe.js`** — exposes:
  ```
  game.titan._probe = {
     components,                       // array of registered names (for test discovery)
     mount(name, props, context?),     // returns { id, selector }
     unmount(id),                      // tears down the handle and removes its container node
     unmountAll(),                     // safety net for afterEach
  }
  ```
  `mount` creates a detached `<div data-titan-probe="<id>">` appended to `document.body`, calls Svelte
  `mount(Component, { target, props, context })`, stores the handle in an internal `Map`, and returns the
  generated id plus the `[data-titan-probe="<id>"]` selector. `context` is an optional `Map` (defaults to an
  empty `Map`) so the harness can later serve components that read `getContext`.

### 2. Build gating

- `vite.config.mjs` defines a compile-time constant keyed off Vite mode:
  ```
  define: {
     'process.env.NODE_ENV': JSON.stringify('production'),  // unchanged
     __TITAN_PROBE__: JSON.stringify(mode === 'e2e'),
  }
  ```
  (The exported config becomes `({ mode }) => ({ … })` to read `mode`.)
- The system entry (`src/index.js` or `OnceInit`) gates registration:
  ```
  if (__TITAN_PROBE__) {
     const { registerProbe } = await import('~/test-probe/registerProbe.js');
     registerProbe();
  }
  ```
  In a production `vite build`, `__TITAN_PROBE__` is `false`; terser dead-code-eliminates the branch and the
  probe module + registry are never bundled.
- New npm script: `"build:e2e": "vite build --mode e2e"`. The release `build` script is unchanged. No
  `cross-env` dependency is introduced (Vite `--mode` carries the flag cross-platform).

### 3. Test-side — `tests/e2e/componentProbe.js` page object

Functions (callbacks) cannot cross the Node↔page boundary, so the props object — including instrumented
callbacks — is constructed **inside** `page.evaluate`. Callbacks push records into a page-global event log
(`window.__titanProbeEvents`, an array of `{ event, value, … }`). The page object:

- `mountProbe(page, name, propsSpec)` — runs `page.evaluate`, builds props from a JSON-serializable
  `propsSpec` (which event hooks to instrument, scalar prop values), mounts via `game.titan._probe.mount`,
  and returns `{ id, selector }`.
- `readProbeEvents(page)` / `clearProbeEvents(page)` — read and reset `window.__titanProbeEvents`.
- `unmountProbe(page, id)` — calls `game.titan._probe.unmount(id)`.

Tests drive the rendered DOM through Playwright locators scoped to the returned `selector`, and assert on a
combination of (a) the recorded event log and (b) live DOM state (e.g. an input's `.value`, a button's
`disabled`).

### 4. Probe specs — `tests/e2e/component-probe.spec.js` (behavioral)

One `describe` per primitive. `beforeEach` logs in (`E2E GM 1`); `afterEach` calls `unmountAll`. Coverage:

- **Button** — click fires `onclick`; `disabled` suppresses the click; `testId`→`data-testid` resolves;
  tooltip wiring present (the `tippy` instance / `aria` attribute is attached).
- **TextInput** — typing commits the value through the real keyup/change seam (reuse the 2b-3 dispatched
  `keyup` insight); `disabled` blocks edits; the bound value round-trips to the DOM.
- **NumberInput** / **IntegerInput** — numeric entry commits and reflects; non-numeric / out-of-range input
  is handled per the component's contract; `disabled` blocks edits.
- **CheckboxInput** — toggling flips the checked state and fires the change callback.
- **Select** — changing the selection fires `onchange` carrying the new value; the rendered value updates.
- **LabelTag** — renders the supplied label text; tooltip wiring resolves; `testId` (added if missing).

Each probe failure that traces to a real primitive defect is fixed **red→green** via the `titan-svelte-dev`
subagent, and the fix is recorded in the status doc's bug log.

### 5. `testId` additions

`Button` and `TextInput` already carry a `testId` prop. `NumberInput`, `IntegerInput`, `CheckboxInput`,
`Select`, and `LabelTag` will gain a `testId` prop (`data-testid` passthrough) where absent, matching the
existing pattern. Routed through `titan-svelte-dev`. (Probes can also select via the container selector, so
`testId` is for ergonomics and parity, not strictly required.)

## Data flow (one probe)

1. Test calls `mountProbe(page, 'Button', { onclick: 'record', children: 'Click me' })`.
2. Inside `page.evaluate`: build `props = { onclick: (e) => window.__titanProbeEvents.push({ event:'click' }), … }`,
   call `game.titan._probe.mount('Button', props)`, return `{ id, selector }`.
3. Test clicks `page.locator(selector + ' button')`.
4. Test reads `readProbeEvents(page)` and asserts a `click` record exists.
5. `afterEach` → `unmountAll`.

## Verification

- `npm run build:e2e`, then `npx playwright test tests/e2e/component-probe.spec.js --reporter=list` → all
  green (Foundry on :30000, or the Playwright `webServer` launches it).
- Production-safety check: `npm run build` (release), then confirm the built root `index.js` contains **no**
  `_probe` / `test-probe` / `__TITAN_PROBE__` reference (grep) — the gate tree-shakes cleanly.
- Full suite (`npx playwright test`) stays green; `npx vitest run` stays at 35 passing.

## Risks / open items for the plan

- **Context-free assumption** — confirm during planning that all 7 core components mount without
  `getContext('application')` or a document bridge. If `Select`/`LabelTag` need context, supply a minimal stub
  `Map` via the harness's `context` parameter (already designed in).
- **Build-step discipline** — the probe specs require the `build:e2e` bundle, not the release bundle. This is
  the new analogue of the existing "run `npm run build` after source edits" gotcha; it must be documented in
  the status doc and (optionally) wired into CI. Default: documented manual/CI step, not auto-built in
  `global-setup.js`, to keep every run fast.
- **`__TITAN_PROBE__` lint** — the bare global constant may trip ESLint `no-undef`; declare it (e.g. a
  `globals` entry or `/* global __TITAN_PROBE__ */`) so lint stays clean.

## Reuse

- Login / `E2E GM 1` default from `tests/e2e/fixtures.js`.
- The dispatched-`keyup` commit insight from 2b-3 (`tests/e2e/checkDialog.js`) for input value commits.
- The `page.evaluate`-builds-props-with-callbacks pattern generalizes the existing in-page evaluation style.
