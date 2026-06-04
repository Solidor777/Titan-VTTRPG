/**
 * Close every open Foundry application so sheets, dialogs, HUDs, and tooltips do not leak into the next
 * test on the shared page. Closes both ApplicationV2 instances (`foundry.applications.instances`) and
 * legacy AppV1 windows (`ui.windows`); each close is individually try-caught so one failure does not
 * abort the rest of teardown.
 * @param {import('@playwright/test').Page} page - The shared page to clean.
 * @returns {Promise<void>} Resolves once every open application has been asked to close.
 */
export async function closeAllApps(page) {
   await page.evaluate(async () => {
      // Close ApplicationV2 instances (the modern app registry).
      const appV2 = [...(foundry.applications.instances?.values?.() ?? [])];
      for (const app of appV2) {
         try {
            await app.close();
         }
         catch (error) {
            // Ignore: a mid-teardown close failure must not abort the rest of cleanup.
         }
      }

      // Close legacy AppV1 windows (the deprecated registry still used by a few core dialogs).
      const appV1 = Object.values(globalThis.ui?.windows ?? {});
      for (const app of appV1) {
         try {
            await app.close();
         }
         catch (error) {
            // Ignore: see above.
         }
      }
   });
}

/**
 * Delete every chat message in the world. Keeps renders cheap, keeps assertions deterministic, and keeps
 * the world lean so GM-to-player socket replication does not exceed test timeouts. Targeted to chat only;
 * does NOT touch actors or items (specs use find-or-create fixtures).
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {Promise<void>} Resolves once all chat messages are deleted.
 */
export async function clearChat(page) {
   await page.evaluate(async () => {
      const ids = globalThis.game.messages.map((message) => message.id);
      if (ids.length > 0) {
         await globalThis.ChatMessage.deleteDocuments(ids);
      }
   });
}

/**
 * Attach a single page-error collector to the shared page and return its backing array. Wire this ONCE in
 * the spec's `beforeAll`; clear it each `afterEach` (`errors.length = 0`) so each test still asserts
 * "no uncaught errors during MY actions". Replaces per-test `page.on('pageerror', …)` listeners, which
 * would otherwise stack on a reused page.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {string[]} The live array of collected uncaught-error messages.
 */
export function attachPageErrors(page) {
   /** @type {string[]} The collected uncaught page-error messages. */
   const errors = [];
   page.on('pageerror', (error) => {
      errors.push(error.message);
   });
   return errors;
}
