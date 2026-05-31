import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { buildFlatModifierAbilityData, buildMulBaseAbilityData } from '../../shared/builders.js';
import { injectFastCheck } from '../fast-check.js';

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

   test('a mulBase of 2 raises Body from 1 to 2', async ({ page }) => {
      const bodyValue = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, { name: ACTOR_NAME, abilityData: buildMulBaseAbilityData('E2E x2 Body', 2) });

      // Base 1 + base*(2-1) = 1 + 1 = 2.
      expect(bodyValue, 'derived Body should be base 1 + base*(mul-1)=1').toBe(2);
   });

   test('mulBase 2 plus flatModifier 3 raises Body from 1 to 5', async ({ page }) => {
      const bodyValue = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, { name: ACTOR_NAME, abilityData: buildMulBaseAbilityData('E2E x2 +3 Body', 2, [3]) });

      // Base 1 + base*(2-1) + 3 = 1 + 1 + 3 = 5.
      expect(bodyValue, 'derived Body should be 1 + 1 + 3').toBe(5);
   });
});

test.describe('rules elements — stacking invariants (property-based)', () => {
   // Inject fast-check, then log in and assert the system is ready.
   test.beforeEach(async ({ page }) => {
      await injectFastCheck(page);
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });

   // Remove the fixture actor after the property run.
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, 'E2E Stacking Actor');
   });

   test('for any set of flat modifiers, Body = max(0, 1 + sum)', async ({ page }) => {
      // Run a fast-check property inside the runtime: one actor + one ability reused across iterations,
      // mutating the ability's rulesElement per iteration to avoid create/delete churn.
      const result = await page.evaluate(async () => {
         // Build the reusable fixture once.
         const stale = game.actors.getName('E2E Stacking Actor');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Stacking Actor', type: 'player' });
         const [ability] = await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Stacking Ability', type: 'ability' },
         ]);

         // Property: applying N flatModifiers (each on Body) yields Body = max(0, base + sum).
         const report = await fc.check(
            fc.asyncProperty(
               fc.array(fc.integer({ min: -10, max: 10 }), { maxLength: 5 }),
               async (values) => {
                  // Replace the ability's rules elements with one flatModifier per generated value.
                  await ability.update({
                     system: {
                        rulesElement: values.map((value, index) => ({
                           operation: 'flatModifier',
                           selector: 'attribute',
                           key: 'body',
                           value: value,
                           uuid: `e2e-prop-${index}`,
                        })),
                     },
                  });

                  // Base Body is 1; derived must equal the floored sum.
                  const expected = Math.max(0, 1 + values.reduce((sum, v) => sum + v, 0));
                  return actor.system.attribute.body.value === expected;
               },
            ),
            { numRuns: 40 },
         );

         return { failed: report.failed, counterexample: report.counterexample, numRuns: report.numRuns };
      });

      expect(
         result.failed,
         `stacking invariant failed on counterexample ${JSON.stringify(result.counterexample)}`,
      ).toBe(false);
      expect(result.numRuns, 'property should have executed its runs').toBeGreaterThan(0);
   });
});
