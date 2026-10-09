import { expect, test } from './harness.js';
import { DURATION_TURN_START } from '~/system/DurationTypes.js';
import { clickSheetTab } from './actions.js';
import { login } from './fixtures.js';
import {
   addEffect,
   createActor,
   createFolder,
   createScene,
   createWorldItem,
   openPlacedTokenSheet,
   openSidebarTab,
   placeToken,
   readServerDocument,
   toggleTokenLink,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, closeAllApps, reloadWorld } from './world.js';

/**
 * Batches of embedded documents on an unlinked token whose stored `delta` is null. Core's server loses a create or a
 * delete of two or more embedded documents on such a token: the documents are written under the delta, but the token
 * record that has to hold the delta is not written (read: `dist/database/backend/embedded-delta.mjs` `#e` overwrites
 * the write parent chosen for the first document with the delta when the second document is handled, in Foundry
 * 14.364 at `C:\FoundryVTT\V14\dev\foundry`; the loss itself is measured in `test-pf2e`, which does not load TITAN).
 * `TitanActor` splits the first document off the batch so the delta exists before the rest is written. Both tests use
 * a token placed by dropping an actor from the Actors directory, so its stored delta is null until the first write.
 * Everything is made and changed through the UI: the scene, the actor, the effects, the item folder and its items, the
 * token drop, Remove Expired Effects, and the item folder drop on the token's sheet.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the scene the tokens stand on. */
let sceneId;
/** @type {string} The id of the actor the tokens are placed from. */
let actorId;
/** @type {string[]} The ids of the actor's expired effects. */
const effectIds = [];
/** @type {string} The id of the Item folder that holds the items. */
let itemFolderId;
/** @type {string[]} The names of the world items in the folder, sorted. */
const itemNames = [];

/** @type {number} The size of each batch: more than two, so the rest after the split is itself a batch. */
const BATCH_SIZE = 3;

/** @type {number} The run stamp in every fixture name, so a worker restart that repeats the hook finds no duplicate. */
const RUN = Date.now();

/**
 * Reads the token record the server holds.
 * @param {string} tokenId - The token on the scene.
 * @returns {Promise<object>} The token's stored data (`toObject()`).
 */
function readStoredToken(tokenId) {
   return readServerDocument(page, `Scene.${sceneId}.Token.${tokenId}`);
}

/**
 * Places a token of the actor and checks that it is unlinked, a synthetic actor's token with no stored delta.
 * @returns {Promise<string>} The placed token's id.
 */
async function placeBareToken() {
   // A reload shows the active scene, which is another file's scene when the suite ran a spec before this one.
   await viewScene(page, sceneId);

   /** @type {string} The placed token's id. */
   const tokenId = await placeToken(page, actorId);
   expect(
      await page.evaluate(({ sceneId, tokenId }) => {
         /** @type {TokenDocument} The placed token. */
         const token = game.scenes.get(sceneId).tokens.get(tokenId);
         return {
            actorLink: token.actorLink,
            isToken: token.actor.isToken,
         };
      }, {
         sceneId,
         tokenId,
      }),
      'the placed token is unlinked and has a synthetic actor',
   ).toEqual({
      actorLink: false,
      isToken: true,
   });
   expect((await readStoredToken(tokenId)).delta, 'the stored token has no delta').toBeNull();
   return tokenId;
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await setClientSetting(page, 'confirmDeletingEffects', false);

   sceneId = await createScene(page, { name: `E2E Delta Scene ${RUN}` });
   await viewScene(page, sceneId);
   actorId = await createActor(page, {
      name: `E2E Delta Actor ${RUN}`,
      type: 'npc',
   });
   if (await page.evaluate((actorId) => game.actors.get(actorId).prototypeToken.actorLink, actorId)) {
      await toggleTokenLink(page, actorId);
   }
   for (let index = 0; index < BATCH_SIZE; index++) {
      effectIds.push(await addEffect(page, actorId, `E2E Delta Effect ${RUN} ${index}`, {
         duration: DURATION_TURN_START,
         remaining: 0,
      }));
   }

   itemFolderId = await createFolder(page, 'items', `E2E Delta Folder ${RUN}`);
   for (let index = 0; index < BATCH_SIZE; index++) {
      itemNames.push(`E2E Delta Item ${RUN} ${index}`);
      await createWorldItem(page, {
         name: itemNames[index],
         type: 'equipment',
         folderId: itemFolderId,
      });
   }
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test('Remove Expired Effects on an unlinked token with no stored delta persists across a reload', async () => {
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken();
   expect(
      await page.evaluate(({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.effects
         .filter((effect) => effect.system.isExpired).map((effect) => effect.id).sort(), {
         sceneId,
         tokenId,
      }),
      'the token\'s actor inherits the expired effects',
   ).toEqual([...effectIds].sort());

   /** @type {import('@playwright/test').Locator} The token's actor sheet. */
   const sheet = await openPlacedTokenSheet(page, tokenId);
   await clickSheetTab(sheet, 'Effects');
   await sheet.getByRole('button', { name: 'Remove Expired Effects' }).click();
   await expect.poll(
      () => page.evaluate(
         ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.effects.size,
         {
            sceneId,
            tokenId,
         },
      ),
      { message: 'the click removed the expired effects from the token\'s actor' },
   ).toBe(0);

   await reloadWorld(page);
   expect(
      await page.evaluate(({ sceneId, tokenId }) => {
         /** @type {Actor} The token's synthetic actor. */
         const actor = game.scenes.get(sceneId).tokens.get(tokenId).actor;
         return actor.effects.size;
      }, {
         sceneId,
         tokenId,
      }),
      'the token\'s actor has no effect after the reload',
   ).toBe(0);

   /** @type {object|null} The stored delta of the token. */
   const delta = (await readStoredToken(tokenId)).delta;
   expect(delta, 'the stored token has a delta').not.toBeNull();
   expect(
      delta.effects.filter((effect) => effect._tombstone).map((effect) => effect._id).sort(),
      'the stored delta holds a tombstone for each removed effect',
   ).toEqual([...effectIds].sort());
   expect(
      await page.evaluate((actorId) => game.actors.get(actorId).effects.size, actorId),
      'the base actor keeps its effects',
   ).toBe(BATCH_SIZE);
});

test('an Item folder dropped on an unlinked token\'s sheet with no stored delta persists across a reload', async () => {
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken();

   /** @type {import('@playwright/test').Locator} The token's actor sheet. */
   const sheet = await openPlacedTokenSheet(page, tokenId);
   expect(
      await page.evaluate(
         ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.items.size,
         {
            sceneId,
            tokenId,
         },
      ),
      'the token\'s actor owns no item',
   ).toBe(0);

   /** @type {import('@playwright/test').Locator} The Items directory panel. */
   const items = await openSidebarTab(page, 'items');
   await items.locator(`.directory-item.folder[data-folder-id="${itemFolderId}"] > header`).dragTo(sheet);

   /**
    * Reads the names of the items the token's actor owns.
    * @returns {Promise<string[]>} The names, sorted.
    */
   const readOwnedNames = () => page.evaluate(
      ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.items
         .map((item) => item.name).sort(),
      {
         sceneId,
         tokenId,
      },
   );
   await expect.poll(readOwnedNames, { message: 'the folder drop created an owned copy of each item' })
      .toEqual(itemNames);

   await reloadWorld(page);
   expect(await readOwnedNames(), 'the token\'s actor owns the items after the reload').toEqual(itemNames);

   /** @type {object|null} The stored delta of the token. */
   const delta = (await readStoredToken(tokenId)).delta;
   expect(delta, 'the stored token has a delta').not.toBeNull();
   expect(delta.items.map((item) => item.name).sort(), 'the stored delta holds each created item').toEqual(itemNames);
});
