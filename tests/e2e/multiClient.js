import { login } from './fixtures.js';

/**
 * Runs a callback with several simultaneous, independent Foundry clients.
 * Each client is its own browser context (separate session/cookies), logged in as the named user.
 * @param {import('@playwright/test').Browser} browser - The Playwright browser from the test fixture.
 * @param {Object<string, string>} clientSpec - Map of label to Foundry user display name.
 * @param {(pages: Object<string, import('@playwright/test').Page>) => Promise<void>} fn - Callback receiving the page map.
 * @returns {Promise<void>} Resolves once the callback completes and all contexts are closed.
 */
export async function withClients(browser, clientSpec, fn) {
   /** @type {import('@playwright/test').BrowserContext[]} */
   const contexts = [];

   /** @type {Object<string, import('@playwright/test').Page>} */
   const pages = {};

   try {
      // Create and log in each client sequentially (single-worker world).
      for (const [label, userName] of Object.entries(clientSpec)) {
         const context = await browser.newContext();
         const page = await context.newPage();
         await login(page, userName);
         contexts.push(context);
         pages[label] = page;
      }

      await fn(pages);
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
