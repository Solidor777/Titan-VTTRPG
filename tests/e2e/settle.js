/**
 * Tracks the document operations and application renders that are in flight in a page, so an action helper can wait
 * for the observable effect of its own action: the operations the action started have resolved and the renders they
 * queued have finished. Without it, a helper that returns at the click lets the caller's next action land before the
 * re-render of the previous one, which then discards or reorders it.
 *
 * Tracked: the static `createDocuments`, `updateDocuments` and `deleteDocuments` of `foundry.abstract.Document` (every
 * document write goes through them, including those of the subclasses that call `super`), and
 * `ApplicationV2#render`. Not tracked: a write that a handler starts after an `await` of its own, and a file picker
 * browse (no document operation), which the helper concerned waits for itself.
 */

/**
 * Installs the in-flight tracker on every document the page loads. Must be called BEFORE navigation (uses
 * `addInitScript`).
 * @param {import('@playwright/test').Page} page - The Playwright page to instrument.
 * @returns {Promise<void>} Resolves once the init script is registered.
 */
export async function installSettle(page) {
   await page.addInitScript(() => {
      /** @type {number} The number of document operations and renders that have not resolved yet. */
      globalThis.titanPending = 0;

      /**
       * Wraps a function that returns a promise so the promise counts as pending until it settles.
       * @param {Function} original - The function to wrap.
       * @returns {Function} The wrapper.
       */
      const track = (original) => function tracked(...args) {
         globalThis.titanPending += 1;

         /** @type {Promise<*>} The original call's promise. */
         const result = original.apply(this, args);
         const done = () => {
            globalThis.titanPending -= 1;
         };
         Promise.resolve(result).then(done, done);
         return result;
      };

      /** @type {number} The id of the interval that waits for the client classes to exist. */
      const timer = setInterval(() => {
         const Document = globalThis.foundry?.abstract?.Document;
         const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2;
         if (!Document || !ApplicationV2) {
            return;
         }
         clearInterval(timer);
         for (const name of [
            'createDocuments',
            'updateDocuments',
            'deleteDocuments',
         ]) {
            Document[name] = track(Document[name]);
         }
         ApplicationV2.prototype.render = track(ApplicationV2.prototype.render);
      }, 5);
   });
}

/**
 * Waits until no document operation or render is in flight.
 * @param {import('@playwright/test').Page} page - The page that ran the action.
 * @returns {Promise<void>} Resolves once nothing is in flight; fails after the suite's 1 s ceiling.
 */
export async function settle(page) {
   await page.evaluate(() => globalThis.titanWait(
      () => globalThis.titanPending === 0,
      { message: 'the action\'s document operations and renders finished' },
   ));
}
