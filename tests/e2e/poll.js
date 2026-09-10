/**
 * Install an in-page polling helper on the given Playwright page. After this runs, every
 * `page.evaluate` in the page can `await globalThis.titanWait(predicate, options)` to wait for a
 * condition instead of sleeping a fixed duration. Must be called BEFORE navigation (uses
 * `addInitScript`, which runs on every document load).
 * @param {import('@playwright/test').Page} page - The Playwright page to instrument.
 * @returns {Promise<void>} Resolves once the init script is registered.
 */
export async function installPoll(page) {
   await page.addInitScript(() => {
      /**
       * Polls `predicate` until it returns truthy or the timeout elapses.
       * @param {() => boolean} predicate - Condition to await; evaluated in the page realm.
       * The default timeout is the suite's 1-second operation budget, so a wait that exceeds it fails
       * loudly rather than silently absorbing a longer ceiling. Pass an explicit `timeout` only for an
       * inherently multi-second wait, such as a world boot.
       * @param {{ timeout?: number, interval?: number, message?: string }} [options] - Wait options.
       * @returns {Promise<void>} Resolves when the predicate is truthy; rejects on timeout.
       */
      globalThis.titanWait = async (predicate, options = {}) => {
         const { timeout = 1000, interval = 50, message = 'condition' } = options;
         const start = Date.now();
         while (!predicate()) {
            if (Date.now() - start > timeout) {
               throw new Error(`titanWait timed out after ${timeout}ms waiting for: ${message}`);
            }
            await new Promise((resolve) => {
               setTimeout(resolve, interval);
            });
         }
      };
   });
}
