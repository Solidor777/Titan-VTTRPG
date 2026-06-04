import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { buildRulesElementAbilityData } from '../../shared/builders.js';

/**
 * Behavioral coverage of condition mechanics, asserted against the live derived-data pipeline. Each test
 * builds a player actor with a "boost" ability that raises the relevant stats well above zero (so a -1 or a
 * halving is observable and not lost to the floor-at-0 clamp), captures the baseline, toggles the condition,
 * then asserts the derived deltas relative to that baseline.
 */
const ACTOR_NAME = 'E2E Condition Actor';

// A boost ability covering every stat the condition tests read: ratings +5, all attributes +4, all
// resistances +4, stride speed +6.
const BOOST_ELEMENTS = [
   { operation: 'flatModifier', selector: 'rating', key: 'melee', value: 5 },
   { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: 5 },
   { operation: 'flatModifier', selector: 'rating', key: 'defense', value: 5 },
   { operation: 'flatModifier', selector: 'rating', key: 'awareness', value: 5 },
   { operation: 'flatModifier', selector: 'attribute', key: 'all', value: 4 },
   { operation: 'flatModifier', selector: 'resistance', key: 'all', value: 4 },
   { operation: 'flatModifier', selector: 'speed', key: 'stride', value: 6 },
];

test.describe('conditions — derived-stat mechanics', () => {
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

   /**
    * Creates the boosted actor, captures a baseline snapshot, toggles the condition, and returns
    * { baseline, after } snapshots of the derived stat block. Runs entirely in the browser.
    * @param {import('@playwright/test').Page} page - The Playwright page fixture.
    * @param {string} statusId - The status effect id to toggle (e.g., 'blinded').
    * @returns {Promise<{baseline: object, after: object}>} Before and after derived-stat snapshots.
    */
   async function applyCondition(page, statusId) {
      return page.evaluate(async ({ name, abilityData, statusId }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         // Wait until the boost ability is owned and its +4 has reached the derived Body value (base 1).
         await titanWait(() => actor.items.size > 0 && actor.system.attribute.body.value > 1, {
            message: 'boost ability applied to derived attributes',
         });

         const snapshot = () => ({
            melee: actor.system.rating.melee.value,
            accuracy: actor.system.rating.accuracy.value,
            defense: actor.system.rating.defense.value,
            awareness: actor.system.rating.awareness.value,
            stride: actor.system.speed.stride.value,
            attribute: Object.fromEntries(Object.entries(actor.system.attribute).map(([k, v]) => [k, v.value])),
            resistance: Object.fromEntries(Object.entries(actor.system.resistance).map(([k, v]) => [k, v.value])),
         });

         const baseline = snapshot();
         await actor.toggleStatusEffect(statusId, { active: true });
         // Wait until the condition is present in the actor's statuses (proves the toggle reached the
         // recomputed derived data); inert conditions still register their status id.
         await titanWait(() => !!actor.statuses?.has(statusId), {
            message: `condition ${statusId} applied to actor`,
         });
         const after = snapshot();

         return { baseline, after };
      }, { name: ACTOR_NAME, abilityData: buildRulesElementAbilityData('E2E Condition Boost', BOOST_ELEMENTS), statusId });
   }

   test('blinded lowers melee, accuracy, and defense by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'blinded');
      expect(after.melee).toBe(baseline.melee - 1);
      expect(after.accuracy).toBe(baseline.accuracy - 1);
      expect(after.defense).toBe(baseline.defense - 1);
   });

   test('contaminated lowers every attribute and resistance by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'contaminated');
      for (const key of Object.keys(baseline.attribute)) {
         expect(after.attribute[key], `attribute ${key}`).toBe(baseline.attribute[key] - 1);
      }
      for (const key of Object.keys(baseline.resistance)) {
         expect(after.resistance[key], `resistance ${key}`).toBe(baseline.resistance[key] - 1);
      }
   });

   test('stunned lowers defense by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'stunned');
      expect(after.defense).toBe(baseline.defense - 1);
   });

   test('prone halves speed (round up) and lowers melee/accuracy by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'prone');
      expect(after.stride).toBe(Math.ceil(baseline.stride / 2));
      expect(after.melee).toBe(baseline.melee - 1);
      expect(after.accuracy).toBe(baseline.accuracy - 1);
   });

   test('restrained sets speed to 0 and lowers melee/accuracy/defense by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'restrained');
      expect(after.stride).toBe(0);
      expect(after.melee).toBe(baseline.melee - 1);
      expect(after.accuracy).toBe(baseline.accuracy - 1);
      expect(after.defense).toBe(baseline.defense - 1);
   });

   test('sleeping halves awareness (round up)', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'sleeping');
      expect(after.awareness).toBe(Math.ceil(baseline.awareness / 2));
   });

   test('an inert condition (dead) changes no derived stats', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'dead');
      expect(after).toEqual(baseline);
   });
});
