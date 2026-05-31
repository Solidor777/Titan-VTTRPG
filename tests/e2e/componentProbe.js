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
   return page.evaluate(({ name, props, events }) => {
      globalThis.window.__titanProbeEvents = globalThis.window.__titanProbeEvents ?? [];
      const builtProps = { ...props };
      for (const ev of events) {
         builtProps[ev] = (arg) => {
            globalThis.window.__titanProbeEvents.push({ event: ev, key: arg && arg.key });
         };
      }
      const probe = globalThis.game.titan._probe;
      if (!probe) {
         throw new Error('game.titan._probe is not registered — build the e2e bundle with `npm run build:e2e`.');
      }
      return probe.mount(name, builtProps);
   }, { name, props, events });
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
