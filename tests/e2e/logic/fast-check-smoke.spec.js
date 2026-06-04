import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from '../world.js';
import { injectFastCheck } from '../fast-check.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   // Inject fast-check BEFORE login: `injectFastCheck` registers an init script that must be present at
   // page load, and `login` performs the only navigation on the shared world.
   await injectFastCheck(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Proves the fast-check harness works end to end: the `fc` global is injected into the live Foundry
 * page and a trivial property runs inside `page.evaluate`, returning a clean (non-failed) report.
 */
test('fast-check is injected and runs a property in the Foundry page', async () => {
   // Run a trivial property inside the runtime and report fast-check's result back to Node.
   const result = await page.evaluate(async () => {
      // `fc` is the injected fast-check global; `fc.check` returns a report instead of throwing.
      const report = await fc.check(
         fc.property(fc.integer(), (n) => n === n),
         { numRuns: 25 },
      );
      return { available: typeof fc !== 'undefined', failed: report.failed, numRuns: report.numRuns };
   });

   expect(result.available, 'fc global should be present in the page').toBe(true);
   expect(result.failed, 'trivial property should not fail').toBe(false);
   expect(result.numRuns, 'property should have executed its runs').toBe(25);
});
