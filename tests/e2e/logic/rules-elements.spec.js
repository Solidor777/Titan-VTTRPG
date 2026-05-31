import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { buildFlatModifierAbilityData } from '../../shared/builders.js';

/**
 * Behavioral coverage of the rules-element math, asserted against the live derived-data pipeline.
 * A fresh player actor has Body 1; an owned ability carrying flatModifier rules elements must move
 * `actor.system.attribute.body.value` by the exact sum of the modifiers (floored at 0).
 */
const ACTOR_NAME = 'E2E RulesElement Actor';

test.describe('rules elements — derived attribute math', () => {
   // Log in and assert the TITAN system initialized before each test.
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });

   // Remove the fixture actor after each test so the world does not accumulate state.
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('a single +2 flatModifier raises Body from 1 to 3', async ({ page }) => {
      const bodyValue = await page.evaluate(async ({ name, abilityData }) => {
         // Build a clean player actor (Body defaults to 1) owning the flatModifier ability.
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);

         // Let the derived-data preparation settle, then read the derived Body value.
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, { name: ACTOR_NAME, abilityData: buildFlatModifierAbilityData('E2E +2 Body', [2]) });

      // Base Body 1 + flat 2 = 3.
      expect(bodyValue, 'derived Body should be base 1 + flat 2').toBe(3);
   });
});
