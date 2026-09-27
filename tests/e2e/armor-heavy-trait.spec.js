import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { deleteFixtureActor } from './world.js';

/**
 * Equipped armor with the Heavy trait decreases every non-zero speed by 1 and leaves zero speeds at 0.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Heavy Armor Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   await login(page);
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('equipping Heavy armor decreases non-zero speeds by 1', async () => {
   const result = await page.evaluate(async (actorName) => {
      const stale = game.actors.getName(actorName);
      if (stale) {
         await stale.delete();
      }
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
         system: {
            speed: {
               stride: { baseValue: 5 },
               fly: { baseValue: 0 },
            },
         },
      });
      const [armor] = await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Heavy Plate',
            type: 'armor',
            system: {
               trait: [
                  {
                     name: 'heavy',
                     value: true,
                  },
               ],
            },
         },
      ]);
      const before = {
         stride: actor.system.speed.stride.value,
         fly: actor.system.speed.fly.value,
      };
      await actor.system.equipArmor(armor.id);
      return {
         before,
         after: {
            stride: actor.system.speed.stride.value,
            fly: actor.system.speed.fly.value,
         },
      };
   }, ACTOR_NAME);
   expect(result.before).toEqual({
      stride: 5,
      fly: 0,
   });
   expect(result.after).toEqual({
      stride: 4,
      fly: 0,
   });
});
