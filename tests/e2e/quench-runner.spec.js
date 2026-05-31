import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Single signal for the in-client logic layer: log in, run every registered Quench batch inside the
 * Foundry runtime, and fail the Playwright run if any Quench test failed. Skips cleanly when the
 * Quench module is not installed/enabled in the world.
 */
test('quench batches all pass', async ({ page }) => {
   await login(page);

   // Bail out (skip, not fail) when Quench is absent so non-Quench worlds do not hard-fail.
   const quenchPresent = await page.evaluate(() => typeof game.quench !== 'undefined');
   test.skip(!quenchPresent, 'Quench module is not installed/enabled in the test world.');

   // Run all batches inside the runtime and report Mocha runner stats back to the Node process.
   const stats = await page.evaluate(async () => {
      // Quench.runAllBatches resolves to the Mocha runner once every batch has finished.
      const runner = await game.quench.runAllBatches();
      return {
         readable: !!runner?.stats,
         failures: runner?.stats?.failures ?? null,
         passes: runner?.stats?.passes ?? null,
      };
   });

   // The runner stats must be readable, or the bridge cannot report a trustworthy signal.
   expect(stats.readable, 'Quench runner stats were not readable after runAllBatches').toBe(true);
   expect(stats.failures, `Quench reported ${stats.failures} failing test(s).`).toBe(0);
});
