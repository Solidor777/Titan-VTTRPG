import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from '../world.js';
import { buildRulesElementAbilityData } from '../../shared/builders.js';

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
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Behavioral coverage of condition mechanics against the live derived-data pipeline. Each test builds a player actor
 * whose attributes and rating skills are raised so every rating base is 8 (a quarter of the base is a whole 2), adds a
 * flat "boost" ability so each stat sits well above 0, captures a baseline, applies the conditions, and asserts each
 * stat's change from that baseline.
 */

/** @type {string} Name of the throwaway player actor seeded for each test. */
const ACTOR_NAME = 'E2E Condition Actor';

/**
 * A boost ability covering every stat the condition tests read: ratings +5, all attributes +4, all resistances +4,
 * stride speed +6.
 * @type {object[]}
 */
const BOOST_ELEMENTS = [
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'melee',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'accuracy',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'defense',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'rating',
      key: 'awareness',
      value: 5,
   },
   {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'all',
      value: 4,
   },
   {
      operation: 'flatModifier',
      selector: 'resistance',
      key: 'all',
      value: 4,
   },
   {
      operation: 'flatModifier',
      selector: 'speed',
      key: 'stride',
      value: 6,
   },
];

/**
 * The base values the fixture actor is raised to: Body, Mind, and Soul 8, and 8 Training in the skills the ratings
 * read, so Melee, Accuracy, Defense, and Awareness have base 8 and every Resistance base 12.
 * @type {object}
 */
const BASE_DATA = {
   attribute: {
      body: { baseValue: 8 },
      mind: { baseValue: 8 },
      soul: { baseValue: 8 },
   },
   skill: {
      dexterity: { training: { baseValue: 8 } },
      meleeWeapons: { training: { baseValue: 8 } },
      perception: { training: { baseValue: 8 } },
      rangedWeapons: { training: { baseValue: 8 } },
   },
};

/**
 * The change one "-¼ of base value, rounded up" penalty makes: ¾ of the base, rounded up, minus the base.
 * @param {number} base - The stat's base value.
 * @returns {number} The (non-positive) change.
 */
function quarterPenalty(base) {
   return Math.ceil(base * 0.75) - base;
}

test.describe('conditions — derived-stat mechanics', () => {
   test.beforeEach(async () => {
      /** @type {boolean} Whether the TITAN system and its player data model are registered. */
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });

   test.afterEach(async () => {
      await page.evaluate(async (name) => {
         await game.actors.getName(name)?.delete();
      }, ACTOR_NAME);
   });

   /**
    * Creates the boosted actor, captures a baseline snapshot, applies the conditions, and returns
    * `{ baseline, after }` snapshots (`{ base, value }` per attribute, resistance, and rating, plus the stride value).
    * @param {string[]} statusIds - The status effect ids to apply.
    * @returns {Promise<{baseline: object, after: object}>} Before and after derived-stat snapshots.
    */
   async function applyConditions(statusIds) {
      return page.evaluate(async ({ name, abilityData, baseData, ids }) => {
         await game.actors.getName(name)?.delete();

         /** @type {TitanActor} The boosted fixture actor. */
         const actor = await Actor.create({
            name,
            type: 'player',
            system: baseData,
         });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await titanWait(() => actor.system.rating.melee.baseValue === 8 && actor.system.attribute.body.value > 8, {
            message: 'raised bases and the boost ability applied',
         });

         /**
          * Reads a stat group's base and current value per stat.
          * @param {Record<string, object>} stats - The stat group (attributes, ratings, or resistances).
          * @returns {Record<string, {base: number, value: number}>} Each stat's base and value.
          */
         const read = (stats) => Object.fromEntries(Object.entries(stats).map(([key, stat]) => [
            key,
            {
               base: stat.baseValue,
               value: stat.value,
            },
         ]));

         /**
          * Snapshots the derived stats the condition tests compare.
          * @returns {{attribute: object, rating: object, resistance: object, stride: number}} The snapshot.
          */
         const snapshot = () => ({
            attribute: read(actor.system.attribute),
            rating: read(actor.system.rating),
            resistance: read(actor.system.resistance),
            stride: actor.system.speed.stride.value,
         });

         /** @type {{attribute: object, rating: object, resistance: object, stride: number}} The stats before. */
         const baseline = snapshot();
         for (const id of ids) {
            await actor.toggleStatusEffect(id, { active: true });
         }
         // The conditions are in the actor's statuses once the toggles reached the recomputed derived data.
         await titanWait(() => ids.every((id) => actor.statuses?.has(id)), {
            message: `conditions ${ids.join(', ')} applied to actor`,
         });

         return {
            baseline,
            after: snapshot(),
         };
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E Condition Boost', BOOST_ELEMENTS),
         baseData: BASE_DATA,
         ids: statusIds,
      });
   }

   /**
    * Asserts that each named rating dropped by one quarter-of-base penalty (times `count`).
    * @param {{baseline: object, after: object}} snapshots - The before and after snapshots.
    * @param {string[]} keys - The rating keys.
    * @param {number} [count] - How many quarter penalties apply.
    */
   function expectRatingPenalty({ baseline, after }, keys, count = 1) {
      for (const key of keys) {
         expect(after.rating[key].value, key)
            .toBe(baseline.rating[key].value + (count * quarterPenalty(baseline.rating[key].base)));
      }
   }

   test('blinded lowers melee, accuracy, and defense by a quarter of their base', async () => {
      expectRatingPenalty(await applyConditions(['blinded']), [
         'melee',
         'accuracy',
         'defense',
      ]);
   });

   test('contaminated lowers every attribute and resistance by a quarter of its base', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Contaminated. */
      const { baseline, after } = await applyConditions(['contaminated']);
      for (const group of [
         'attribute',
         'resistance',
      ]) {
         for (const [key, stat] of Object.entries(baseline[group])) {
            expect(after[group][key].value, `${group} ${key}`).toBe(stat.value + quarterPenalty(stat.base));
         }
      }
   });

   test('off-balance lowers accuracy, awareness, melee, and defense by a quarter of their base', async () => {
      expectRatingPenalty(await applyConditions(['offBalance']), [
         'accuracy',
         'awareness',
         'melee',
         'defense',
      ]);
   });

   test('stunned lowers defense by a quarter of its base', async () => {
      expectRatingPenalty(await applyConditions(['stunned']), ['defense']);
   });

   test('prone halves speed (round up) and lowers melee and accuracy by a quarter of their base', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Prone. */
      const snapshots = await applyConditions(['prone']);
      expect(snapshots.after.stride).toBe(Math.ceil(snapshots.baseline.stride / 2));
      expectRatingPenalty(snapshots, [
         'melee',
         'accuracy',
      ]);
   });

   test('restrained sets speed to 0 and lowers melee, accuracy, and defense by a quarter of their base', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Restrained. */
      const snapshots = await applyConditions(['restrained']);
      expect(snapshots.after.stride).toBe(0);
      expectRatingPenalty(snapshots, [
         'melee',
         'accuracy',
         'defense',
      ]);
   });

   test('blinded and off-balance each take a quarter of base defense', async () => {
      expectRatingPenalty(await applyConditions([
         'blinded',
         'offBalance',
      ]), ['defense'], 2);
   });

   test('sleeping halves awareness (round up)', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Sleeping. */
      const { baseline, after } = await applyConditions(['sleeping']);
      expect(after.rating.awareness.value).toBe(Math.ceil(baseline.rating.awareness.value / 2));
   });

   test('an inert condition (dead) changes no derived stats', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Dead. */
      const { baseline, after } = await applyConditions(['dead']);
      expect(after).toEqual(baseline);
   });
});
