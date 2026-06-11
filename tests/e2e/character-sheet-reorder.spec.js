import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

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
 * Locks the sort-update path the character item/effect drag-reorder commits through
 * (`foundry.utils.performIntegerSort` + `updateEmbeddedDocuments`). The pointer drag and grip visuals
 * are verified live; this proves the reorder persists the new order.
 */

const ACTOR_NAME = 'E2E Reorder Character';

/**
 * Sorts an embedded collection's filtered view by sort, moves the first entry past the last via the
 * same integer-sort helper the components use, and returns the resulting name order.
 * @param {string} actorName - The seeded actor's name.
 * @param {'Item' | 'ActiveEffect'} embeddedName - The embedded document type to reorder.
 * @returns {Promise<string[]>} The post-reorder name order.
 */
async function reorderFirstToEnd(actorName, embeddedName) {
   return page.evaluate(async ({ name, type }) => {
      const actor = game.actors.getName(name);
      const collection = type === 'Item' ? actor.items : actor.effects;
      const sorted = collection.contents
         .filter((doc) => type === 'Item' ? doc.type === 'weapon' : doc.type === 'effect')
         .sort((a, b) => a.sort - b.sort);
      const source = sorted[0];
      const target = sorted[sorted.length - 1];
      const siblings = sorted.filter((doc) => doc._id !== source._id);
      const updates = foundry.utils.performIntegerSort(source, { target, siblings, sortBefore: false });
      await actor.updateEmbeddedDocuments(type, updates.map((u) => ({ ...u.update, _id: u.target._id })));

      const after = (type === 'Item' ? actor.items : actor.effects).contents
         .filter((doc) => type === 'Item' ? doc.type === 'weapon' : doc.type === 'effect')
         .sort((a, b) => a.sort - b.sort);
      return { firstName: after[0].name, lastName: after[after.length - 1].name };
   }, { name: actorName, type: embeddedName });
}

test.describe('character-sheet reorder', () => {
   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system failed to initialize').toBe(true);

      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            { name: 'Weapon A', type: 'weapon', sort: 100 },
            { name: 'Weapon B', type: 'weapon', sort: 200 },
            { name: 'Weapon C', type: 'weapon', sort: 300 },
         ]);
         await actor.createEmbeddedDocuments('ActiveEffect', [
            { name: 'Effect A', type: 'effect', sort: 100 },
            { name: 'Effect B', type: 'effect', sort: 200 },
            { name: 'Effect C', type: 'effect', sort: 300 },
         ]);
      }, ACTOR_NAME);
   });

   test('item reorder persists the new order', async () => {
      const order = await reorderFirstToEnd(ACTOR_NAME, 'Item');
      expect(order.firstName).toBe('Weapon B');
      expect(order.lastName).toBe('Weapon A');
   });

   test('effect reorder persists the new order', async () => {
      const order = await reorderFirstToEnd(ACTOR_NAME, 'ActiveEffect');
      expect(order.firstName).toBe('Effect B');
      expect(order.lastName).toBe('Effect A');
   });
});
