import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { injectFastCheck } from '../fast-check.js';

/**
 * Proves the fast-check harness works end to end: the `fc` global is injected into the live Foundry
 * page and a trivial property runs inside `page.evaluate`, returning a clean (non-failed) report.
 */
test('fast-check is injected and runs a property in the Foundry page', async ({ page }) => {
   // Inject fast-check BEFORE navigating/logging in so the init script is present on page load.
   await injectFastCheck(page);
   await login(page);

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
