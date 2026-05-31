/**
 * Deterministic-dice helpers for Playwright check tests.
 *
 * Foundry maps a uniform random `u` in [0,1) to a d6 face via `Math.ceil((1 - u) * 6)`
 * (DiceTerm.mapRandomFace). To force face `f`, feed `u = (6.5 - f) / 6`. These helpers replace
 * `CONFIG.Dice.randomUniform` with a queue-backed stub so successive die rolls land on chosen faces,
 * then restore the original RNG.
 */

/**
 * Installs a queue-backed stub on `CONFIG.Dice.randomUniform` that forces the given faces, in order.
 * Once the queue drains, the stub falls back to the original RNG. Safe to call repeatedly; the
 * original RNG is captured only once.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {number[]} faces - The d6 faces (1-6) to force, in roll order.
 * @returns {Promise<void>} Resolves once the stub is installed in the page context.
 */
export async function forceDice(page, faces) {
   await page.evaluate((forcedFaces) => {
      // Capture the genuine RNG exactly once so repeated forcing never loses it.
      if (typeof globalThis.__titanOriginalRandomUniform !== 'function') {
         globalThis.__titanOriginalRandomUniform = CONFIG.Dice.randomUniform;
      }

      // The queue of uniform values mapped from the requested faces (u = (6.5 - f) / 6).
      globalThis.__titanForcedQueue = forcedFaces.map((face) => (6.5 - face) / 6);
      globalThis.__titanForcedDiceActive = true;

      // The stub: drain the queue, then defer to the original RNG.
      CONFIG.Dice.randomUniform = () => {
         if (globalThis.__titanForcedQueue.length > 0) {
            return globalThis.__titanForcedQueue.shift();
         }
         return globalThis.__titanOriginalRandomUniform();
      };
   }, faces);
}

/**
 * Restores the original `CONFIG.Dice.randomUniform` and clears the forced-dice state.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<void>} Resolves once the original RNG is restored.
 */
export async function resetDice(page) {
   await page.evaluate(() => {
      // Restore only if a stub was installed; otherwise leave the live RNG untouched.
      if (typeof globalThis.__titanOriginalRandomUniform === 'function') {
         CONFIG.Dice.randomUniform = globalThis.__titanOriginalRandomUniform;
      }
      globalThis.__titanForcedQueue = [];
      globalThis.__titanForcedDiceActive = false;
   });
}
