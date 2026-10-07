/**
 * Tracks the document operations and application renders that are in flight in a page, so an action helper can wait
 * for the observable effect of its own action: the operations the action started have resolved, the renders they
 * queued have finished, and the window transitions they started have ended. Without it, a helper that returns at the
 * click lets the caller's next action land before the re-render of the previous one, which then discards or
 * reorders it.
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

         /**
          * Counts the call as finished.
          * @returns {void}
          */
         const done = () => {
            globalThis.titanPending -= 1;
         };
         Promise.resolve(result).then(done, done);
         return result;
      };

      /** @type {number} The id of the interval that waits for the client classes to exist. */
      const timer = setInterval(() => {
         /** @type {typeof foundry.abstract.Document | undefined} The base class of every document. */
         const Document = globalThis.foundry?.abstract?.Document;

         /** @type {typeof foundry.applications.api.ApplicationV2 | undefined} The base class of every window. */
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
 * Fails when the tracker is not in the path of the page's document operations and renders. It calls the real static
 * `Item.updateDocuments` with no updates and `ui.chat.render`, and asserts the counter moved on each call. Without
 * this, a wrapper that never installed would leave every `settle` returning at once and the races it prevents would
 * come back without any error.
 * @param {import('@playwright/test').Page} page - A page that has reached `game.ready`.
 * @returns {Promise<void>} Resolves when both calls moved the counter; rejects when either did not.
 */
export async function verifySettle(page) {
   /** @type {{operation: number, render: number}} The counter right after each call started. */
   const moved = await page.evaluate(async () => {
      // The boot's own renders must have finished, so a counter above 0 below comes from the call itself. This wait
      // is part of the world boot (it waits on the boot's renders, not on a loaded page), so it has the boot's ceiling.
      await globalThis.titanWait(() => globalThis.titanPending === 0, {
         timeout: 60_000,
         message: 'the boot renders finished',
      });

      /** @type {Promise<*>} The operation, started and not yet awaited. */
      const operation = foundry.documents.Item.updateDocuments([]);

      /** @type {number} The counter while the operation is in flight. */
      const duringOperation = globalThis.titanPending;
      await operation;

      /** @type {Promise<*>} The render, started and not yet awaited. */
      const render = ui.chat.render();

      /** @type {number} The counter while the render is in flight. */
      const duringRender = globalThis.titanPending;
      await render;
      return {
         operation: duringOperation,
         render: duringRender,
      };
   });
   if (!(moved.operation > 0) || !(moved.render > 0)) {
      throw new Error(
         `settle.js is not tracking this page: the counter was ${moved.operation} during Item.updateDocuments `
         + `and ${moved.render} during ApplicationV2#render (each must be above 0).`,
      );
   }
}

/**
 * Waits until no document operation or render is in flight. With `transitions` it also waits until no finite animation
 * (a Svelte transition, for example the 400 ms `slide` of a row that appears or goes) is running inside an application
 * window: a helper after which the caller clicks or types into a row that is still moving asks for it, because
 * Playwright's own stability wait for an action retries at growing intervals (20, 50, 100, 100, 500 ms), so an action
 * that meets a row moving for 430 ms completes at about 900 ms.
 * @param {import('@playwright/test').Page} page - The page that ran the action.
 * @param {object} [options] - What to wait for besides the operations and renders.
 * @param {boolean} [options.transitions] - Also wait for the window transitions to end.
 * @returns {Promise<void>} Resolves once nothing is in flight; fails after the suite's 1 s ceiling.
 */
export async function settle(page, { transitions = false } = {}) {
   await page.evaluate((withTransitions) => globalThis.titanWait(
      () => globalThis.titanPending === 0 && !(withTransitions && document.getAnimations().some(
         (animation) => animation.playState !== 'finished'
            && Number.isFinite(animation.effect?.getComputedTiming().endTime)
            && animation.effect.target?.closest?.('.application .window-content'),
      )),
      { message: 'the document operations, renders and requested window transitions finished' },
   ), transitions);
}
