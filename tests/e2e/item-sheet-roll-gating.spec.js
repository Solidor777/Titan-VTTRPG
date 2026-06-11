import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   deleteFixtureActor,
} from './world.js';
import { PLAYER_USERS } from './users.js';

/**
 * Item-sheet roll-button gating (player perspective): logged in as a non-GM player, an item the
 * player's character OWNS shows the sidebar roll button (replacing the info line), while an item on
 * an actor the player only OBSERVES shows the static info line and no button. The resolveRollActor
 * unit test locks the decision logic deterministically; this spec proves the gate end-to-end on the
 * rendered sheet from a real non-GM seat.
 */

/** @type {string} Name of the actor this player owns. */
const OWNED_ACTOR_NAME = 'E2E Player-Owned Roll Actor';

/** @type {string} Name of the actor this player can only observe. */
const OBSERVED_ACTOR_NAME = 'E2E Observed Roll Actor';

/** @type {string} Label shared by both seeded item checks. */
const ITEM_CHECK_LABEL = 'E2E Gating Item Check';

/** @type {import('@playwright/test').Page} The file-shared, player-logged-in page. */
let page;
/** @type {string[]} Uncaught page errors collected during the current test. */
let errors;
/** @type {{ownedItemId: string, observedItemId: string}} Seeded item ids. */
let ids;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page, PLAYER_USERS[0].name);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('item-sheet roll-button gating (player)', () => {
   test.beforeEach(async () => {
      await deleteFixtureActor(page, OWNED_ACTOR_NAME);
      await deleteFixtureActor(page, OBSERVED_ACTOR_NAME);

      ids = await page.evaluate(async ({ ownedName, observedName, playerName, itemCheck }) => {
         /** @type {User} The logged-in player whose ownership the fixtures encode. */
         const player = game.users.getName(playerName);
         const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
         const OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

         // Actor this player OWNS.
         const owned = await Actor.create({
            name: ownedName,
            type: 'player',
            ownership: { default: OBSERVER, [player.id]: OWNER },
         });
         const [ownedItem] = await owned.createEmbeddedDocuments('Item', [
            { name: 'E2E Owned Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
         ]);

         // Actor this player can only OBSERVE (default observer; player is NOT an owner).
         const observed = await Actor.create({
            name: observedName,
            type: 'player',
            ownership: { default: OBSERVER },
         });
         const [observedItem] = await observed.createEmbeddedDocuments('Item', [
            { name: 'E2E Observed Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
         ]);

         return { ownedItemId: ownedItem.id, observedItemId: observedItem.id };
      }, {
         ownedName: OWNED_ACTOR_NAME,
         observedName: OBSERVED_ACTOR_NAME,
         playerName: PLAYER_USERS[0].name,
         itemCheck: buildCheck(ITEM_CHECK_LABEL, 'e2e-gating-item-check'),
      });
   });

   test.afterAll(async () => {
      await deleteFixtureActor(page, OWNED_ACTOR_NAME);
      await deleteFixtureActor(page, OBSERVED_ACTOR_NAME);
   });

   /**
    * Opens an item's sheet by actor + item id and waits for the Svelte mount.
    * @param {string} actorName - The owning actor's name.
    * @param {string} itemId - The embedded item's id.
    * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
    */
   async function openItemSheet(actorName, itemId) {
      await closeAllApps(page);
      await page.evaluate(async ({ name, id }) => {
         const item = game.actors.getName(name).items.get(id);
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'item sheet mounted' },
         );
      }, { name: actorName, id: itemId });
      return page.locator('.application.titan-document-sheet');
   }

   test('owned item shows the roll button (presence)', async () => {
      const sheet = await openItemSheet(OWNED_ACTOR_NAME, ids.ownedItemId);

      await expect(
         sheet.locator('.sidebar-check .header .roll button').first(),
         'owned item shows the roll button',
      ).toBeVisible();
      await expect(
         sheet.locator('.sidebar-check .header .info').first(),
         'owned item hides the static info line',
      ).toHaveCount(0);

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('observed-only item shows the static info line and no button (absence)', async () => {
      const sheet = await openItemSheet(OBSERVED_ACTOR_NAME, ids.observedItemId);

      // PRESENCE first: the sidebar check renders at all.
      await expect(
         sheet.locator('.sidebar-check .header .info').first(),
         'observed item renders the static info line',
      ).toBeVisible();
      // ABSENCE: no roll button on the same surface.
      await expect(
         sheet.locator('.sidebar-check .header .roll button'),
         'observed item shows no roll button',
      ).toHaveCount(0);

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
