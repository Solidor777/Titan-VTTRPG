import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addEffect,
   applyCondition,
   controlPlacedToken,
   createActor,
   createOwnedItem,
   createScene,
   createWorldItem,
   deleteOwnedItem,
   placeToken,
   removeCondition,
   restOnToken,
   setOwnership,
   toggleTokenLink,
   viewScene,
} from './flows.js';
import {
   deleteControlledToken,
   deleteFromDirectory,
   expectNoDeletionErrors,
   resetDeletionWatch,
   watchDeletions,
} from './deletions.js';
import { withClients } from './multiClient.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Deleting a character, item, effect or token while a surface shows it raises no uncaught error, no console error and
 * no warning or error notification: the sheet of every actor and item type and of the effect and condition, the Token
 * HUD, the Player HUD and a second client's open sheets. Everything is made and deleted through the UI (sidebar
 * Delete, the row Delete buttons, the Delete key on a controlled token, the Token HUD condition control).
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {import('./deletions.js').DeletionWatch} The page's console-error watch. */
let watch;
/** @type {string} The id of the scene the tokens stand on. */
let sceneId;

/** @type {string[]} The seven item subtypes. */
const ITEM_TYPES = [
   'ability',
   'armor',
   'commodity',
   'equipment',
   'shield',
   'spell',
   'weapon',
];

/** @type {string[]} The two actor subtypes. */
const ACTOR_TYPES = [
   'player',
   'npc',
];

/** @type {number} The run stamp in every fixture name. */
const RUN = Date.now();

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   watch = await watchDeletions(page);
   await setClientSetting(page, 'confirmDeletingItems', false);
   await setClientSetting(page, 'confirmDeletingEffects', false);
   sceneId = await createScene(page, { name: `E2E Deleted Scene ${RUN}` });
   await viewScene(page, sceneId);
});

test.beforeEach(async () => {
   await closeAllApps(page);
   await resetDeletionWatch(page, watch);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Locates the window of a document's sheet by the document id its element id ends with.
 * @param {string} suffix - The tail of the element id (`Actor-<id>`, `Item-<id>`, `ActiveEffect-<id>`).
 * @returns {import('@playwright/test').Locator} The window.
 */
function windowOf(suffix) {
   return page.locator(`.application[id$="${suffix}"]`);
}

/**
 * Takes control of a placed token and opens its Token HUD with a right click, which shows the Player HUD as well.
 * @param {string} tokenId - The placed token.
 * @returns {Promise<void>} Resolves once the Token HUD and the Player HUD are visible.
 */
async function controlWithHuds(tokenId) {
   await controlPlacedToken(page, tokenId);

   /** @type {{x: number, y: number}} The token's centre in client coordinates. */
   const centre = await page.evaluate((tokenId) => canvas.clientCoordinatesFromCanvas(
      canvas.scene.tokens.get(tokenId).object.center,
   ), tokenId);
   await restOnToken(page, tokenId, centre);
   await page.mouse.click(centre.x, centre.y, { button: 'right' });
   await expect(page.locator('#token-hud'), 'the Token HUD is open').toBeVisible();
   await expect(page.locator('#titan-player-hud'), 'the Player HUD shows the controlled token').toBeVisible();
}

/**
 * Makes an actor, places its token and sets whether the token is linked.
 * @param {string} type - The actor subtype.
 * @param {boolean} linked - Whether the prototype token is linked.
 * @returns {Promise<{actorId: string, tokenId: string}>} The ids.
 */
async function actorWithToken(type, linked) {
   /** @type {string} The new actor's id. */
   const actorId = await createActor(page, {
      name: `E2E Deleted ${type} ${RUN} ${Math.random().toString(36).slice(2, 6)}`,
      type,
   });
   if (await page.evaluate((id) => game.actors.get(id).prototypeToken.actorLink, actorId) !== linked) {
      await toggleTokenLink(page, actorId);
   }
   return {
      actorId,
      tokenId: await placeToken(page, actorId),
   };
}

test.describe('a world actor deleted from the Actors directory', () => {
   for (const type of ACTOR_TYPES) {
      test(`a ${type} with its own sheet open`, async () => {
         /** @type {string} The actor's id. */
         const actorId = await createActor(page, {
            name: `E2E Deleted Sheet ${type} ${RUN}`,
            type,
         });
         /** @type {import('@playwright/test').Locator} The sheet. */
         const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
         await deleteFromDirectory(page, 'actors', actorId);
         await expect(sheet, 'the sheet closed with the actor').toHaveCount(0);
         await expectNoDeletionErrors(page, watch, errors, `a ${type} actor`);
      });

      test(`a ${type} with a linked token under the Player HUD and Token HUD and its sheet open`, async () => {
         const { actorId, tokenId } = await actorWithToken(type, true);
         await controlWithHuds(tokenId);
         /** @type {import('@playwright/test').Locator} The sheet. */
         const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
         await resetDeletionWatch(page, watch);
         await deleteFromDirectory(page, 'actors', actorId);
         await expect(sheet, 'the sheet closed with the actor').toHaveCount(0);
         await expectNoDeletionErrors(page, watch, errors, `a ${type} actor with a linked controlled token`);
      });

      test(`a ${type} whose unlinked token's sheet is open under the Token HUD`, async () => {
         const { actorId, tokenId } = await actorWithToken(type, false);
         await controlWithHuds(tokenId);
         /** @type {import('@playwright/test').Locator} The token's actor sheet. */
         const sheet = await openSheetByUuid(
            page,
            await page.evaluate((tokenId) => canvas.scene.tokens.get(tokenId).actor.uuid, tokenId),
         );
         await resetDeletionWatch(page, watch);
         await deleteFromDirectory(page, 'actors', actorId);
         await expectNoDeletionErrors(page, watch, errors, `the world actor of an unlinked ${type} token`);
         await expect(sheet, 'the synthetic actor sheet survives the world actor').toBeVisible();
      });
   }
});

test.describe('a placed token deleted with the Delete key', () => {
   for (const type of ACTOR_TYPES) {
      for (const linked of [
         true,
         false,
      ]) {
         test(`${linked ? 'a linked' : 'an unlinked'} ${type} token under both HUDs with its actor sheet open`,
            async () => {
               const { tokenId } = await actorWithToken(type, linked);
               await controlWithHuds(tokenId);
               /** @type {import('@playwright/test').Locator} The token actor's sheet. */
               const sheet = await openSheetByUuid(
                  page,
                  await page.evaluate((tokenId) => canvas.scene.tokens.get(tokenId).actor.uuid, tokenId),
               );
               await resetDeletionWatch(page, watch);
               await deleteControlledToken(page, tokenId);
               await expect(page.locator('#titan-player-hud'), 'the Player HUD left with the token').toBeHidden();
               if (!linked) {
                  await expect(sheet, 'the synthetic actor sheet closed with the token').toHaveCount(0);
               }
               await expectNoDeletionErrors(page, watch, errors, `a ${linked ? 'linked' : 'unlinked'} ${type} token`);
            });
      }
   }
});

test.describe('a placed token deleted with its Token Configuration window open', () => {
   for (const linked of [
      true,
      false,
   ]) {
      test(`${linked ? 'a linked' : 'an unlinked'} token`, async () => {
         const { tokenId } = await actorWithToken('player', linked);
         await controlWithHuds(tokenId);
         await page.locator('#token-hud [data-action="config"]').click();

         /** @type {import('@playwright/test').Locator} The token's configuration window. */
         const config = windowOf(`Token-${tokenId}`);
         await expect(config).toBeVisible();
         await resetDeletionWatch(page, watch);
         await deleteControlledToken(page, tokenId);
         await expect(config, 'the configuration window closed with the token').toHaveCount(0);
         await expectNoDeletionErrors(page, watch, errors, 'a token with its configuration open');
      });
   }
});

test.describe('a world item deleted from the Items directory with its sheet open', () => {
   for (const type of ITEM_TYPES) {
      test(`a ${type}`, async () => {
         /** @type {string} The item's id. */
         const itemId = await createWorldItem(page, {
            name: `E2E Deleted World ${type} ${RUN}`,
            type,
         });
         /** @type {import('@playwright/test').Locator} The sheet. */
         const sheet = await openSheetByUuid(page, `Item.${itemId}`);
         await deleteFromDirectory(page, 'items', itemId);
         await expect(sheet, 'the sheet closed with the item').toHaveCount(0);
         await expectNoDeletionErrors(page, watch, errors, `a world ${type}`);
      });
   }
});

test.describe('an owned item', () => {
   for (const type of ITEM_TYPES) {
      test(`a ${type} deleted from the actor sheet with its own sheet open`, async () => {
         /** @type {string} The actor's id. */
         const actorId = await createActor(page, {
            name: `E2E Deleted Owner ${type} ${RUN}`,
            type: 'player',
         });
         /** @type {string} The item's id. */
         const itemId = await createOwnedItem(page, actorId, type, `E2E Deleted Owned ${type}`);
         /** @type {import('@playwright/test').Locator} The item's own sheet. */
         const itemSheet = await openSheetByUuid(page, `Actor.${actorId}.Item.${itemId}`);
         await resetDeletionWatch(page, watch);
         await deleteOwnedItem(
            page,
            `Actor.${actorId}`,
            {
               ability: 'Abilities',
               spell: 'Spells',
            }[type] ?? 'Inventory',
            `Actor.${actorId}.Item.${itemId}`,
         );
         await expect(itemSheet, 'the item sheet closed with the item').toHaveCount(0);
         await expectNoDeletionErrors(page, watch, errors, `an owned ${type}`);
      });

      test(`a ${type}'s sheet open while the parent actor is deleted`, async () => {
         /** @type {string} The actor's id. */
         const actorId = await createActor(page, {
            name: `E2E Deleted Parent ${type} ${RUN}`,
            type: 'player',
         });
         /** @type {string} The item's id. */
         const itemId = await createOwnedItem(page, actorId, type, `E2E Deleted Child ${type}`);
         /** @type {import('@playwright/test').Locator} The item's own sheet. */
         const itemSheet = await openSheetByUuid(page, `Actor.${actorId}.Item.${itemId}`);
         /** @type {import('@playwright/test').Locator} The actor's sheet. */
         const actorSheet = await openSheetByUuid(page, `Actor.${actorId}`);
         await resetDeletionWatch(page, watch);
         await deleteFromDirectory(page, 'actors', actorId);
         await expect(itemSheet, 'the item sheet closed with its parent').toHaveCount(0);
         await expect(actorSheet, 'the actor sheet closed').toHaveCount(0);
         await expectNoDeletionErrors(page, watch, errors, `the parent actor of an owned ${type}`);
      });
   }
});

test.describe('an effect', () => {
   test('deleted from the actor sheet with its effect sheet open', async () => {
      /** @type {string} The actor's id. */
      const actorId = await createActor(page, {
         name: `E2E Deleted Effect Host ${RUN}`,
         type: 'player',
      });
      /** @type {string} The effect's id. */
      const effectId = await addEffect(page, actorId, `E2E Deleted Effect ${RUN}`);
      /** @type {import('@playwright/test').Locator} The effect's sheet. */
      const effectSheet = await openSheetByUuid(page, `Actor.${actorId}.ActiveEffect.${effectId}`);
      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
      await resetDeletionWatch(page, watch);
      await sheet.locator(`[data-effect-id="${effectId}"]`).getByRole('button', { name: 'Delete Effect' }).click();
      await expect(effectSheet, 'the effect sheet closed with the effect').toHaveCount(0);
      await expectNoDeletionErrors(page, watch, errors, 'an effect');
   });

   test('a condition removed through the Token HUD with its sheet open', async () => {
      const { tokenId } = await actorWithToken('player', true);
      await applyCondition(page, tokenId, 'blinded');

      /** @type {string} The condition effect's uuid. */
      const uuid = await page.evaluate(
         (tokenId) => canvas.scene.tokens.get(tokenId).actor.effects.find((e) => e.statuses.has('blinded')).uuid,
         tokenId,
      );
      /** @type {import('@playwright/test').Locator} The condition's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await resetDeletionWatch(page, watch);
      await removeCondition(page, tokenId, 'blinded');
      await expect(sheet, 'the condition sheet closed with the condition').toHaveCount(0);
      await expectNoDeletionErrors(page, watch, errors, 'a condition');
   });
});

test.describe('another client with the sheet open', () => {
   test('a player with the actor, item and effect sheets open while the GM deletes them', async ({ browser }) => {
      /** @type {string} The actor's id. */
      const actorId = await createActor(page, {
         name: `E2E Deleted Shared ${RUN}`,
         type: 'player',
      });
      await setOwnership(page, actorId, 'E2E Player 1', 'OWNER');
      /** @type {string} The owned item's id. */
      const itemId = await createOwnedItem(page, actorId, 'weapon', 'E2E Deleted Shared Weapon');
      /** @type {string} The effect's id. */
      const effectId = await addEffect(page, actorId, 'E2E Deleted Shared Effect');
      await withClients(browser, { player: 'E2E Player 1' }, async ({ player }) => {
         /** @type {string[]} The player's uncaught errors. */
         const playerErrors = attachPageErrors(player);
         /** @type {import('./deletions.js').DeletionWatch} The player's watch. */
         const playerWatch = await watchDeletions(player);
         /** @type {import('@playwright/test').Locator} The player's actor sheet. */
         const actorSheet = await openSheetByUuid(player, `Actor.${actorId}`);
         /** @type {import('@playwright/test').Locator} The player's item sheet. */
         const itemSheet = await openSheetByUuid(player, `Actor.${actorId}.Item.${itemId}`);
         /** @type {import('@playwright/test').Locator} The player's effect sheet. */
         const effectSheet = await openSheetByUuid(player, `Actor.${actorId}.ActiveEffect.${effectId}`);
         await resetDeletionWatch(player, playerWatch);

         await deleteOwnedItem(page, `Actor.${actorId}`, 'Inventory', `Actor.${actorId}.Item.${itemId}`);
         await expect(itemSheet, 'the player item sheet closed').toHaveCount(0);
         await expectNoDeletionErrors(player, playerWatch, playerErrors, 'an item the player has open');

         /** @type {import('@playwright/test').Locator} The GM's actor sheet. */
         const gmSheet = await openSheetByUuid(page, `Actor.${actorId}`);
         await clickSheetTab(gmSheet, 'Effects');
         await gmSheet.locator(`[data-effect-id="${effectId}"]`).getByRole('button', { name: 'Delete Effect' })
            .click();
         await expect(effectSheet, 'the player effect sheet closed').toHaveCount(0);
         await expectNoDeletionErrors(player, playerWatch, playerErrors, 'an effect the player has open');

         await deleteFromDirectory(page, 'actors', actorId);
         await expect(actorSheet, 'the player actor sheet closed').toHaveCount(0);
         await expectNoDeletionErrors(player, playerWatch, playerErrors, 'an actor the player has open');
      });
   });
});
