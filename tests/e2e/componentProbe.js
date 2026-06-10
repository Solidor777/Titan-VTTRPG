import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {string} Absolute path to the probe IIFE built by Playwright global-setup into test/build/. */
const PROBE_BUNDLE = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../test/build/probe.iife.js',
);

/** @type {string} Absolute path to the probe's extracted global stylesheet (tippy.js), built alongside the IIFE. */
const PROBE_STYLES = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../test/build/probe.css',
);

/**
 * Ensure the in-page component-probe API is registered, injecting the probe bundle (and its global
 * stylesheet) when absent. The IIFE (built by global-setup) registers `game.titan._probe` synchronously
 * on execution; the stylesheet covers global (non-scoped) styles such as tippy.js tooltips.
 * @param {import('@playwright/test').Page} page - The Playwright page (must already be at a ready world).
 * @returns {Promise<void>} Resolves once the probe bundle has been injected (or was already present).
 */
async function ensureProbe(page) {
   // Wait for the system to finish init before injecting: a mid-boot injection skips the IIFE's
   // immediate-registration path and would strand the current test.
   await page.waitForFunction(() => !!globalThis.game?.titan);

   // Whether the probe API is already registered on this page.
   const present = await page.evaluate(() => !!globalThis.game?.titan?._probe);
   if (!present) {
      await page.addStyleTag({ path: PROBE_STYLES });
      await page.addScriptTag({ path: PROBE_BUNDLE });

      // Block until registration lands, so a ready-hook fallback registration cannot strand the
      // first probe call of the file.
      await page.waitForFunction(() => !!globalThis.game?.titan?._probe);
   }
}

/**
 * Mount a single registered primitive in isolation inside the live Foundry runtime and return a
 * handle. Props (including instrumented callbacks) are built inside the page because functions
 * cannot cross the Node<->page boundary.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} name - The registered component name (see game.titan._probe.components).
 * @param {{ props?: object, events?: string[], context?: object }} [spec] - Scalar props plus the
 *   callback prop names to instrument and an optional context object forwarded as a Svelte context
 *   Map; each instrumented callback records `{ event, key }` into window.__titanProbeEvents.
 * @returns {Promise<{ id: string, selector: string }>} The probe id and its container selector.
 */
export async function mountProbe(page, name, { props = {}, events = [], context = {} } = {}) {
   await ensureProbe(page);
   return page.evaluate(({ name, props, events, context }) => {
      globalThis.window.__titanProbeEvents = globalThis.window.__titanProbeEvents ?? [];
      const probe = globalThis.game.titan._probe;
      if (!probe) {
         throw new Error(
            'game.titan._probe is not registered — ensure test/build/probe.iife.js was built '
            + '(npm run test:e2e builds it via global-setup).',
         );
      }
      const builtProps = { ...props };
      for (const ev of events) {
         builtProps[ev] = (arg) => {
            globalThis.window.__titanProbeEvents.push({ event: ev, key: arg && arg.key });
         };
      }
      const contextMap = new Map(Object.entries(context));
      return probe.mount(name, builtProps, contextMap);
   }, { name, props, events, context });
}

/**
 * Build a Svelte context object exposing a minimal non-reactive `document` store for components that read
 * `getContext('document')`. Sufficient for render/click probes; reactivity is covered by the Phase 3d sweep.
 * @param {{ isOwner?: boolean }} [options] - Owner flag the component reads via `document.data.isOwner`.
 * @returns {{ document: { data: { isOwner: boolean } } }} The context object passed to `mountProbe`.
 */
export function documentContext({ isOwner = true } = {}) {
   return {
      document: {
         data: {
            isOwner,
         },
      },
   };
}

/**
 * Build a marker the harness resolves in-page to a registered component constructor, for props that take a
 * component reference (functions cannot cross the Node<->page boundary).
 * @param {string} name - A registered component name (see game.titan._probe.components).
 * @returns {{ __probeComponent: string }} The marker object.
 */
export function probeComponent(name) {
   return {
      __probeComponent: name,
   };
}

/**
 * Build a marker the harness resolves in-page to a real function, for props that take a function
 * (functions cannot cross the Node<->page boundary). Supported kinds: `returnTrue` (always-true
 * predicate), `returnEntry` (identity over the entry), `returnComponent` (constant supplier of a
 * registered component, named via `component`), `entryKeep` (predicate keeping entries whose `keep`
 * flag is truthy), and `labelFromIdx` (props supplier labelling an entry by its original index).
 * @param {string} kind - The function marker kind (`returnTrue` | `returnEntry` | `returnComponent` |
 *   `entryKeep` | `labelFromIdx`).
 * @param {{ component?: string }} [options] - Extra marker fields; `component` names a registered component
 *   for the `returnComponent` kind.
 * @returns {{ __probeFn: string, component?: string }} The marker object.
 */
export function probeFn(kind, { component = void 0 } = {}) {
   return {
      __probeFn: kind,
      ...(component !== void 0 ? { component } : {}),
   };
}

/**
 * Read the recorded probe event log.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @returns {Promise<Array<{ event: string, key?: string }>>} The recorded events.
 */
export async function readProbeEvents(page) {
   return page.evaluate(() => globalThis.window.__titanProbeEvents ?? []);
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
