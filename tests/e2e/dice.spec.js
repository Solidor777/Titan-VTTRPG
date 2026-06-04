import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';
import { forceDice, resetDice } from './dice.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
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
 * Guards the determinism seam the whole checks-integration approach depends on: stubbing
 * `CONFIG.Dice.randomUniform` so a d6 lands on a chosen face. If Foundry ever changes
 * `DiceTerm.mapRandomFace`, this spec fails loudly before the check tests do.
 */
test.describe('forced dice seam', () => {
   test.afterEach(async () => {
      // Restore the original RNG so a failed test cannot leak a stub into later specs.
      await resetDice(page);
   });

   test('forceDice maps each queued face onto a real Roll', async () => {
      // Force three faces, then roll a real 3d6 inside the world and read the raw results.
      await forceDice(page, [6, 4, 1]);
      const faces = await page.evaluate(async () => {
         const roll = new Roll('3d6');
         await roll.evaluate();
         return roll.terms[0].results.map((die) => die.result);
      });

      // The Roll consumes the queue in order; assert exact faces (order as produced, pre-sort).
      expect(faces).toEqual([6, 4, 1]);
   });

   test('resetDice restores the original RNG', async () => {
      // Capture the genuine RNG reference in a test-owned global before any stubbing.
      await page.evaluate(() => {
         globalThis.__titanGenuineRandomUniform = CONFIG.Dice.randomUniform;
      });

      // Install then reset; the live RNG must be the genuine function again and state cleared.
      await forceDice(page, [2]);
      await resetDice(page);
      const state = await page.evaluate(() => ({
         active: globalThis.__titanForcedDiceActive === true,
         restored: CONFIG.Dice.randomUniform === globalThis.__titanGenuineRandomUniform,
      }));

      // The stub must be gone (flag false) and the live RNG must be the captured genuine one.
      expect(state.active).toBe(false);
      expect(state.restored).toBe(true);
   });
});
