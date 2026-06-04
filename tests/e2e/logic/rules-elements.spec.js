import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import {
   buildFlatModifierAbilityData,
   buildMulBaseAbilityData,
   buildRulesElementAbilityData,
} from '../../shared/builders.js';
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

         // Wait until the +2 ability is owned and its boost has reached the derived Body value (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'flatModifier ability applied to derived Body',
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
         // Wait until the mulBase ability is owned and its boost has reached the derived Body value (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'mulBase ability applied to derived Body',
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
         // Wait until the mulBase+flat ability is owned and its boost has reached derived Body (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'mulBase plus flatModifier ability applied to derived Body',
         });
         return actor.system.attribute.body.value;
      }, { name: ACTOR_NAME, abilityData: buildMulBaseAbilityData('E2E x2 +3 Body', 2, [3]) });

      // Base 1 + base*(2-1) + 3 = 1 + 1 + 3 = 5.
      expect(bodyValue, 'derived Body should be 1 + 1 + 3').toBe(5);
   });
});

test.describe('rules elements — all-key selector', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('flatModifier with key "all" shifts every attribute', async ({ page }) => {
      const attributes = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         // Wait until the all-key ability is owned and its +2 has reached the derived Body value (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'all-key flatModifier ability applied to derived attributes',
         });
         return {
            body: actor.system.attribute.body.value,
            mind: actor.system.attribute.mind.value,
            soul: actor.system.attribute.soul.value,
         };
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E All +2', [
            { operation: 'flatModifier', selector: 'attribute', key: 'all', value: 2 },
         ]),
      });

      expect(attributes).toEqual({ body: 3, mind: 3, soul: 3 });
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

test.describe('rules elements — mulSum (multiply total)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('mulSum halves the post-additive Body total, rounding up', async ({ page }) => {
      const body = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         // Wait until the mulSum ability is owned and its boost has reached the derived Body value (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'mulSum ability applied to derived Body',
         });
         return actor.system.attribute.body.value;
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E MulSum', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 4 },
            { operation: 'mulSum', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
         ]),
      });

      expect(body, 'mulSum should halve the post-additive total of 5 to 3').toBe(3);
   });

   test('stacked mulSum elements compound in order', async ({ page }) => {
      const body = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         // Wait until the stacked-mulSum ability is owned and its boost has reached derived Body (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'stacked mulSum ability applied to derived Body',
         });
         return actor.system.attribute.body.value;
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E MulSum Stack', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 7 },
            { operation: 'mulSum', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
            { operation: 'mulSum', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
         ]),
      });

      expect(body, 'two mulSum halvings of 8 should compound to 2').toBe(2);
   });
});

test.describe('rules elements — setSum (set total)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('setSum set mode forces the Body total to the value', async ({ page }) => {
      const results = await page.evaluate(async ({ name, zeroData, twoData }) => {
         const read = async (abilityData) => {
            const stale = game.actors.getName(name);
            if (stale) {
               await stale.delete();
            }
            const actor = await Actor.create({ name, type: 'player' });
            await actor.createEmbeddedDocuments('Item', [abilityData]);
            // setSum totals can land at 0, so wait on the monotonic fact that the ability is owned
            // (createEmbeddedDocuments resolves only after derived data is recomputed).
            await titanWait(() => actor.items.size > 0, {
               message: 'setSum ability owned and derived data recomputed',
            });
            const value = actor.system.attribute.body.value;
            await actor.delete();
            return value;
         };
         return { zero: await read(zeroData), two: await read(twoData) };
      }, {
         name: ACTOR_NAME,
         zeroData: buildRulesElementAbilityData('E2E SetSum 0', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 4 },
            { operation: 'setSum', selector: 'attribute', key: 'body', value: 0, mode: 'set' },
         ]),
         twoData: buildRulesElementAbilityData('E2E SetSum 2', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 4 },
            { operation: 'setSum', selector: 'attribute', key: 'body', value: 2, mode: 'set' },
         ]),
      });

      expect(results).toEqual({ zero: 0, two: 2 });
   });

   test('setSum min mode raises a low total to the floor', async ({ page }) => {
      const body = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         // Wait until the setSum-min ability is owned and its floor has reached derived Body (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'setSum min ability applied to derived Body',
         });
         return actor.system.attribute.body.value;
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E SetSum Min', [
            { operation: 'setSum', selector: 'attribute', key: 'body', value: 5, mode: 'min' },
         ]),
      });

      // Body base 1, below the floor of 5 -> raised to 5.
      expect(body, 'setSum min should raise Body from 1 to its floor of 5').toBe(5);
   });

   test('setSum max mode caps a high total', async ({ page }) => {
      const body = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         // Wait until the setSum-max ability is owned and its boost has reached derived Body (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'setSum max ability applied to derived Body',
         });
         return actor.system.attribute.body.value;
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E SetSum Max', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 7 },
            { operation: 'setSum', selector: 'attribute', key: 'body', value: 5, mode: 'max' },
         ]),
      });

      // Body base 1 + flat 7 = 8, capped at 5.
      expect(body, 'setSum max should cap Body total of 8 at 5').toBe(5);
   });
});

test.describe('rules elements — mulBase rounding', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('a fractional mulBase rounds its base contribution up or down', async ({ page }) => {
      const results = await page.evaluate(async ({ name, downData, upData }) => {
         const read = async (abilityData) => {
            const stale = game.actors.getName(name);
            if (stale) {
               await stale.delete();
            }
            const actor = await Actor.create({ name, type: 'player' });
            await actor.createEmbeddedDocuments('Item', [abilityData]);
            // mulBase rounding lands Body at 0 or 1, so wait on the monotonic fact that the ability is
            // owned (createEmbeddedDocuments resolves only after derived data is recomputed).
            await titanWait(() => actor.items.size > 0, {
               message: 'mulBase rounding ability owned and derived data recomputed',
            });
            const value = actor.system.attribute.body.value;
            await actor.delete();
            return value;
         };
         return { down: await read(downData), up: await read(upData) };
      }, {
         name: ACTOR_NAME,
         downData: buildRulesElementAbilityData('E2E MulBase Down', [
            { operation: 'mulBase', selector: 'attribute', key: 'body', value: 0.5, rounding: 'down' },
         ]),
         upData: buildRulesElementAbilityData('E2E MulBase Up', [
            { operation: 'mulBase', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
         ]),
      });

      // Body base 1; contribution = round(1 * (0.5 - 1)) = round(-0.5).
      // down -> floor(-0.5) = -1 -> Body 0. up -> ceil(-0.5) = 0 -> Body 1.
      expect(results).toEqual({ down: 0, up: 1 });
   });
});
