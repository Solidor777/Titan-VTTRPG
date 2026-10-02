import { login } from './fixtures.js';
import { flushPageErrors } from './harness.js';
import { seedCombatEncounter, startCombatEncounter, viewCombat } from '../shared/combat.js';

/**
 * Runs a callback with several simultaneous, independent Foundry clients.
 * Each client is its own browser context (separate session/cookies), logged in as the named user.
 * @param {import('@playwright/test').Browser} browser - The Playwright browser from the test fixture.
 * @param {{[label: string]: string}} clientSpec - Map of label to Foundry user display name.
 * @param {(pages: {[label: string]: import('@playwright/test').Page}) => Promise<void>} fn - Callback
 * receiving the page map.
 * @returns {Promise<void>} Resolves once the callback completes and all contexts are closed.
 */
export async function withClients(browser, clientSpec, fn) {
   /** @type {import('@playwright/test').BrowserContext[]} The contexts opened so far, closed on exit. */
   const contexts = [];

   /** @type {{[label: string]: import('@playwright/test').Page}} Each client's logged-in page, by label. */
   const pages = {};

   try {
      // Create and log in each client sequentially (single-worker world).
      for (const [label, userName] of Object.entries(clientSpec)) {
         /** @type {import('@playwright/test').BrowserContext} The client's own session; closed even if login fails. */
         const context = await browser.newContext();
         contexts.push(context);

         /** @type {import('@playwright/test').Page} The client's page. */
         const page = await context.newPage();
         await login(page, userName);
         pages[label] = page;
      }

      await fn(pages);

      // Deliver every client's errors before its context closes, so the harness gate of `test` sees them.
      for (const page of Object.values(pages)) {
         await flushPageErrors(page);
      }
   }
   finally {
      // Always tear down every context, even if the callback threw.
      for (const context of contexts) {
         await context.close();
      }
   }
}

/**
 * Waits until the given client's world reports the named users as active.
 * @param {import('@playwright/test').Page} page - The client to poll.
 * @param {string[]} userNames - Display names that must be active.
 * @returns {Promise<void>} Resolves once all named users are active on that client.
 */
export async function awaitUsersActive(page, userNames) {
   await page.waitForFunction(
      (names) => names.every((name) => game.users.getName(name)?.active === true),
      userNames,
      { timeout: 30_000 },
   );
}

/**
 * Seeds an encounter on the GM's client, makes every other client's combat tracker view it, then starts it. Core's
 * `CombatTracker#_onRender` throws on each round or turn update of a combat the tracker is not viewing, so a client
 * that only views the combat after it starts reports an error for the start's own updates.
 * @param {import('@playwright/test').Page} gm - The client that seeds and runs the encounter.
 * @param {import('@playwright/test').Page[]} viewers - The other clients that stay connected while it advances.
 * @param {object} seed - The `seedCombatEncounter` options.
 * @returns {Promise<object>} The ids `seedCombatEncounter` returned.
 */
export async function seedEncounterForClients(gm, viewers, seed) {
   /** @type {object} The ids of the seeded documents. */
   const ids = await gm.evaluate(seedCombatEncounter, {
      ...seed,
      start: false,
   });
   for (const viewer of viewers) {
      await viewer.evaluate(viewCombat, ids.combatId);
   }
   await gm.evaluate(startCombatEncounter, ids.combatId);
   return ids;
}
