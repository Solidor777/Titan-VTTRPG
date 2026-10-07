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
       * Counts the finite animations that are running inside an application window's content, such as the Svelte
       * transition of a row that appears or goes. Infinite animations (spinners) and animations outside the windows
       * are not counted.
       * @returns {number} The number of unfinished finite animations inside application windows.
       */
      globalThis.titanWindowTransitions = () => document.getAnimations().filter(
         (animation) => animation.playState !== 'finished'
            && Number.isFinite(animation.effect?.getComputedTiming().endTime)
            && animation.effect.target?.closest?.('.application .window-content'),
      ).length;

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
 * Fails when the tracker is not in the path of the page's document operations and renders. For each of the four
 * wrapped functions (`createDocuments`, `updateDocuments` and `deleteDocuments` of `Item`, called with no data, and
 * `ui.chat.render`) it reads the counter right before the call and right after it starts (in the same synchronous turn,
 * so nothing else can move it between the two reads), and asserts the counter rose by exactly 1. Without this, a
 * wrapper that never installed would leave every `settle` returning at once and the races it prevents would come back
 * without any error.
 * @param {import('@playwright/test').Page} page - A page that has reached `game.ready`.
 * @returns {Promise<void>} Resolves when each call raised the counter by 1; rejects naming each that did not.
 */
export async function verifySettle(page) {
   /** @type {Record<string, number>} How far each call raised the counter while it was in flight. */
   const rose = await page.evaluate(async () => {
      /** @type {Record<string, function(): Promise<*>>} The calls, each started and not awaited by its entry. */
      const calls = {
         createDocuments: () => foundry.documents.Item.createDocuments([]),
         updateDocuments: () => foundry.documents.Item.updateDocuments([]),
         deleteDocuments: () => foundry.documents.Item.deleteDocuments([]),
         render: () => ui.chat.render(),
      };

      /** @type {Record<string, number>} How far each call raised the counter. */
      const result = {};
      for (const [name, call] of Object.entries(calls)) {
         /** @type {number} The counter right before the call starts. */
         const before = globalThis.titanPending;

         /** @type {Promise<*>} The call, started and not yet awaited. */
         const started = call();
         result[name] = globalThis.titanPending - before;
         await started;
      }
      return result;
   });

   /** @type {string[]} The calls that did not raise the counter by exactly 1, with how far they raised it. */
   const missed = Object.entries(rose)
      .filter(([, amount]) => amount !== 1)
      .map(([name, amount]) => `${name} (rose by ${amount})`);
   if (missed.length > 0) {
      throw new Error(
         `settle.js is not tracking this page: each call must raise the counter by 1; ${missed.join(', ')}.`,
      );
   }
}

/**
 * Waits until no document operation or render is in flight. With `transitions` it also waits until no finite animation
 * (a Svelte transition, for example the 400 ms `slide` of a row that appears or goes) is running inside an application
 * window: a helper after which the caller clicks or types into a row that is still moving asks for it, because
 * Playwright retries an action on a moving element after waits of 0, 20, 100, 100 and then 500 ms
 * (`playwright-core/lib/coreBundle.js:16203`), so a click on a row that is still moving completes up to a retry
 * interval after the row stops.
 * @param {import('@playwright/test').Page} page - The page that ran the action.
 * @param {object} [options] - What to wait for besides the operations and renders.
 * @param {boolean} [options.transitions] - Also wait for the window transitions to end.
 * @returns {Promise<void>} Resolves once nothing is in flight; fails after the suite's 1 s ceiling.
 */
export async function settle(page, { transitions = false } = {}) {
   await page.evaluate((withTransitions) => globalThis.titanWait(
      () => globalThis.titanPending === 0 && !(withTransitions && globalThis.titanWindowTransitions() > 0),
      { message: 'the document operations, renders and requested window transitions finished' },
   ), transitions);
}
