import { expect, test } from './harness.js';
import { DURATION_TURN_START } from '~/system/DurationTypes.js';
import { clickSheetTab } from './actions.js';
import { login } from './fixtures.js';
import {
   addEffect,
   applyCondition,
   createActor,
   createFolder,
   createOwnedItem,
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
 * record that has to hold the delta is not written (read: `dist/database/backend/embedded-delta.mjs` `#e` returns the
 * delta, not the token, as the write parent when it handles the second document, in Foundry 14.364 at
 * `C:\FoundryVTT\V14\dev\foundry`; the loss of a batch delete is measured in `test-pf2e`, which does not load TITAN).
 * `TitanActor` writes the first document alone so the delta exists before the rest is written. The tests use tokens
 * placed by dropping an actor from the Actors directory, so the stored delta is null until the first write.
 *
 * Everything is made and changed through the UI: the scene, the actors, the effects, the item folders and their
 * items, the token drops, Remove Expired Effects, the folder drops on the token's sheet and the Token HUD condition.
 * Exceptions, each a call with no control: `deleteAll` and a delete naming an id the actor lacks (a delete core
 * rejects), a create whose later document the server rejects, and a `preCreateItem` listener that vetoes a document
 * as a module does. The database requests a test sends are counted from `game.socket.emit` (a read-only wrapper).
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the scene the tokens stand on. */
let sceneId;
/** @type {string} The id of the actor with three expired effects. */
let actorId;
/** @type {string[]} The ids of that actor's expired effects. */
const effectIds = [];
/** @type {string} The id of the actor with two expired effects. */
let pairActorId;
/** @type {string[]} The ids of that actor's expired effects. */
const pairEffectIds = [];
/** @type {string} The id of the actor that owns one item. */
let ownerActorId;
/** @type {string} The id of that actor's item. */
let ownedItemId;
/** @type {string} The name of that actor's item. */
let ownedItemName;
/** @type {string} The id of the Item folder that holds three items. */
let itemFolderId;
/** @type {string[]} The names of the world items in that folder, sorted. */
const itemNames = [];
/** @type {string} The id of the Item folder that holds two items. */
let pairFolderId;
/** @type {string[]} The names of the world items in that folder, sorted. */
const pairItemNames = [];

/** @type {number} The size of the larger batches: more than two, so the rest after the first write is a batch. */
const BATCH_SIZE = 3;

/** @type {number} The size of the smaller batches: exactly two. */
const PAIR_SIZE = 2;

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
 * Makes the prototype token of an actor unlinked, with the toggle in the actor's sheet when it is linked.
 * @param {string} id - The actor's id.
 * @returns {Promise<void>} Resolves once the prototype token is unlinked.
 */
async function makeUnlinked(id) {
   if (await page.evaluate((id) => game.actors.get(id).prototypeToken.actorLink, id)) {
      await toggleTokenLink(page, id);
   }
}

/**
 * Adds expired effects to an actor with the effects tab and the effect sheets.
 * @param {string} id - The actor's id.
 * @param {number} count - How many effects to add.
 * @param {string} label - The label in the effects' names.
 * @returns {Promise<string[]>} The new effects' ids.
 */
async function addExpiredEffects(id, count, label) {
   /** @type {string[]} The new effects' ids. */
   const ids = [];
   for (let index = 0; index < count; index++) {
      ids.push(await addEffect(page, id, `E2E Delta ${label} Effect ${RUN} ${index}`, {
         duration: DURATION_TURN_START,
         remaining: 0,
      }));
   }
   return ids;
}

/**
 * Makes world items in a new Item folder with the Items directory.
 * @param {string} label - The label in the folder's and the items' names.
 * @param {number} count - How many items to make.
 * @param {string[]} names - The array that receives the items' names.
 * @returns {Promise<string>} The id of the new folder.
 */
async function makeItemFolder(label, count, names) {
   /** @type {string} The id the Items directory gave the new folder. */
   const folderId = await createFolder(page, 'items', `E2E Delta ${label} Folder ${RUN}`);
   for (let index = 0; index < count; index++) {
      names.push(`E2E Delta ${label} Item ${RUN} ${index}`);
      await createWorldItem(page, {
         name: names[index],
         type: 'equipment',
         folderId,
      });
   }
   return folderId;
}

/**
 * Places a token of an actor and checks that it is unlinked, a synthetic actor's token with no stored delta.
 * @param {string} [forActorId] - The actor to place; the actor with three expired effects by default.
 * @returns {Promise<string>} The placed token's id.
 */
async function placeBareToken(forActorId = actorId) {
   // A reload shows the active scene, which is another file's scene when the suite ran a spec before this one.
   await viewScene(page, sceneId);

   /** @type {string} The placed token's id. */
   const tokenId = await placeToken(page, forActorId);
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

/**
 * Starts counting the database requests the page sends for embedded documents.
 * @returns {Promise<void>} Resolves once `game.socket.emit` is wrapped.
 */
async function spyRequests() {
   await page.evaluate(() => {
      /** @type {{type: string, action: string, count: number}[]} The requests seen. */
      const requests = [];

      /** @type {Function} The socket's own emit. */
      const emit = game.socket.emit;
      game.socket.emit = function spy(event, request, ...rest) {
         if (event === 'modifyDocument') {
            requests.push({
               type: request.type,
               action: request.action,
               count: (request.operation.ids ?? request.operation.data ?? request.operation.updates ?? []).length,
            });
         }
         return emit.call(this, event, request, ...rest);
      };
      globalThis.titanSpy = requests;
   });
}

/**
 * Stops counting and returns the requests of one action on one document type.
 * @param {string} type - The document type (`ActiveEffect`, `Item`).
 * @param {string} action - The action (`create`, `delete`).
 * @returns {Promise<number[]>} The number of documents in each request, in the order sent.
 */
async function takeRequests(type, action) {
   return page.evaluate(({ type, action }) => {
      delete game.socket.emit;
      return globalThis.titanSpy.filter((request) => request.type === type && request.action === action)
         .map((request) => request.count);
   }, {
      type,
      action,
   });
}

/**
 * Reads the names of the items a token's actor owns.
 * @param {string} tokenId - The token on the scene.
 * @returns {Promise<string[]>} The names, sorted.
 */
function readOwnedNames(tokenId) {
   return page.evaluate(
      ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.items
         .map((item) => item.name).sort(),
      {
         sceneId,
         tokenId,
      },
   );
}

/**
 * Reads the number of effects a token's actor holds.
 * @param {string} tokenId - The token on the scene.
 * @returns {Promise<number>} The number of effects.
 */
function readEffectCount(tokenId) {
   return page.evaluate(
      ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.effects.size,
      {
         sceneId,
         tokenId,
      },
   );
}

/**
 * Clicks Remove Expired Effects on the sheet of a token's actor, with the confirmation setting off.
 * @param {string} tokenId - The token on the scene.
 * @returns {Promise<void>} Resolves once the token's actor holds no effect.
 */
async function removeExpiredEffects(tokenId) {
   /** @type {import('@playwright/test').Locator} The token's actor sheet. */
   const sheet = await openPlacedTokenSheet(page, tokenId);
   await clickSheetTab(sheet, 'Effects');
   await sheet.getByRole('button', { name: 'Remove Expired Effects' }).click();
}

/**
 * Drops an Item folder on the sheet of a token's actor.
 * @param {string} tokenId - The token on the scene.
 * @param {string} folderId - The id of the folder whose items are dropped.
 * @returns {Promise<void>} Resolves once the drag ended.
 */
async function dropItemFolder(tokenId, folderId) {
   /** @type {import('@playwright/test').Locator} The token's actor sheet. */
   const sheet = await openPlacedTokenSheet(page, tokenId);

   /** @type {import('@playwright/test').Locator} The Items directory panel. */
   const items = await openSidebarTab(page, 'items');
   await items.locator(`.directory-item.folder[data-folder-id="${folderId}"] > header`).dragTo(sheet);
}

/**
 * Checks that the stored token holds a delta with a tombstone for each of the ids.
 * @param {string} tokenId - The token on the scene.
 * @param {string[]} ids - The ids of the removed effects.
 * @returns {Promise<void>} Resolves once checked.
 */
async function expectTombstones(tokenId, ids) {
   /** @type {object|null} The stored delta of the token. */
   const delta = (await readStoredToken(tokenId)).delta;
   expect(delta, 'the stored token has a delta').not.toBeNull();
   expect(
      delta.effects.filter((effect) => effect._tombstone).map((effect) => effect._id).sort(),
      'the stored delta holds a tombstone for each removed effect',
   ).toEqual([...ids].sort());
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
   await makeUnlinked(actorId);
   effectIds.push(...await addExpiredEffects(actorId, BATCH_SIZE, 'Batch'));

   pairActorId = await createActor(page, {
      name: `E2E Delta Pair Actor ${RUN}`,
      type: 'npc',
   });
   await makeUnlinked(pairActorId);
   pairEffectIds.push(...await addExpiredEffects(pairActorId, PAIR_SIZE, 'Pair'));

   ownerActorId = await createActor(page, {
      name: `E2E Delta Owner Actor ${RUN}`,
      type: 'player',
   });
   await makeUnlinked(ownerActorId);
   ownedItemName = `E2E Delta Owned Item ${RUN}`;
   ownedItemId = await createOwnedItem(page, ownerActorId, 'equipment', ownedItemName);

   itemFolderId = await makeItemFolder('Batch', BATCH_SIZE, itemNames);
   pairFolderId = await makeItemFolder('Pair', PAIR_SIZE, pairItemNames);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await page.evaluate(() => {
      if (globalThis.titanVeto !== undefined) {
         Hooks.off('preCreateItem', globalThis.titanVeto);
         delete globalThis.titanVeto;
      }
      delete game.socket.emit;
   });
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test('Remove Expired Effects of three effects on a token with no stored delta persists across a reload', async () => {
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

   await spyRequests();
   await removeExpiredEffects(tokenId);
   await expect.poll(
      () => readEffectCount(tokenId),
      { message: 'the click removed the expired effects from the token\'s actor' },
   ).toBe(0);
   expect(
      await takeRequests('ActiveEffect', 'delete'),
      'the first effect was deleted alone, then the other two together',
   ).toEqual([
      1,
      BATCH_SIZE - 1,
   ]);

   await reloadWorld(page);
   expect(await readEffectCount(tokenId), 'the token\'s actor has no effect after the reload').toBe(0);
   await expectTombstones(tokenId, effectIds);
   expect(
      await page.evaluate((actorId) => game.actors.get(actorId).effects.size, actorId),
      'the base actor keeps its effects',
   ).toBe(BATCH_SIZE);
});

test('Remove Expired Effects of exactly two effects on a token with no stored delta persists across a reload',
   async () => {
      /** @type {string} The token under test. */
      const tokenId = await placeBareToken(pairActorId);
      expect(await readEffectCount(tokenId), 'the token\'s actor inherits both effects').toBe(PAIR_SIZE);

      await spyRequests();
      await removeExpiredEffects(tokenId);
      await expect.poll(
         () => readEffectCount(tokenId),
         { message: 'the click removed the expired effects from the token\'s actor' },
      ).toBe(0);
      expect(await takeRequests('ActiveEffect', 'delete'), 'each effect was deleted in a request of its own')
         .toEqual([
            1,
            1,
         ]);

      await reloadWorld(page);
      expect(await readEffectCount(tokenId), 'the token\'s actor has no effect after the reload').toBe(0);
      await expectTombstones(tokenId, pairEffectIds);
   });

test('Remove Expired Effects on a token whose delta is stored sends one request and persists', async () => {
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken();
   await applyCondition(page, tokenId, 'blinded');
   expect((await readStoredToken(tokenId)).delta, 'the Token HUD condition stored a delta').not.toBeNull();

   await spyRequests();
   await removeExpiredEffects(tokenId);
   await expect.poll(
      () => page.evaluate(
         ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.effects
            .filter((effect) => effect.system.isExpired).length,
         {
            sceneId,
            tokenId,
         },
      ),
      { message: 'the click removed the expired effects from the token\'s actor' },
   ).toBe(0);
   expect(await takeRequests('ActiveEffect', 'delete'), 'the three effects were deleted in one request')
      .toEqual([BATCH_SIZE]);

   await reloadWorld(page);
   await expectTombstones(tokenId, effectIds);
});

test('deleteAll on a token with no stored delta deletes every effect and persists across a reload', async () => {
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken();
   expect(await readEffectCount(tokenId), 'the token\'s actor inherits the effects').toBe(BATCH_SIZE);

   await spyRequests();
   expect(
      await page.evaluate(
         async ({ sceneId, tokenId }) => (await game.scenes.get(sceneId).tokens.get(tokenId).actor
            .deleteEmbeddedDocuments('ActiveEffect', [], { deleteAll: true })).length,
         {
            sceneId,
            tokenId,
         },
      ),
      'the call deleted every effect',
   ).toBe(BATCH_SIZE);
   expect(await takeRequests('ActiveEffect', 'delete'), 'the first effect was deleted alone, then the rest')
      .toEqual([
         1,
         BATCH_SIZE - 1,
      ]);

   await reloadWorld(page);
   expect(await readEffectCount(tokenId), 'the token\'s actor has no effect after the reload').toBe(0);
   await expectTombstones(tokenId, effectIds);
});

test('a delete naming an effect the actor lacks is rejected before any request', async () => {
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken();
   expect(await readEffectCount(tokenId), 'the token\'s actor inherits the effects').toBe(BATCH_SIZE);

   await spyRequests();
   expect(
      await page.evaluate(async ({ sceneId, tokenId, ids }) => {
         try {
            await game.scenes.get(sceneId).tokens.get(tokenId).actor.deleteEmbeddedDocuments('ActiveEffect', [
               ...ids,
               'e2eNoSuchEffect00',
            ]);
            return 'resolved';
         }
         catch {
            return 'rejected';
         }
      }, {
         sceneId,
         tokenId,
         ids: effectIds.slice(0, 2),
      }),
      'the call was rejected',
   ).toBe('rejected');
   expect(await takeRequests('ActiveEffect', 'delete'), 'no request was sent').toEqual([]);
   expect(await readEffectCount(tokenId), 'the token\'s actor keeps every effect').toBe(BATCH_SIZE);
   expect((await readStoredToken(tokenId)).delta, 'the stored token still has no delta').toBeNull();
});

test('an Item folder of three items dropped on a token with no stored delta persists across a reload', async () => {
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken();
   expect(await readOwnedNames(tokenId), 'the token\'s actor owns no item').toEqual([]);

   await spyRequests();
   await dropItemFolder(tokenId, itemFolderId);
   await expect.poll(
      () => readOwnedNames(tokenId),
      { message: 'the folder drop created an owned copy of each item' },
   ).toEqual(itemNames);
   expect(await takeRequests('Item', 'create'), 'the first item was created alone, then the other two together')
      .toEqual([
         1,
         BATCH_SIZE - 1,
      ]);

   await reloadWorld(page);
   expect(await readOwnedNames(tokenId), 'the token\'s actor owns the items after the reload').toEqual(itemNames);

   /** @type {object|null} The stored delta of the token. */
   const delta = (await readStoredToken(tokenId)).delta;
   expect(delta, 'the stored token has a delta').not.toBeNull();
   expect(delta.items.map((item) => item.name).sort(), 'the stored delta holds each created item').toEqual(itemNames);
});

test('an Item folder of exactly two items dropped on a token with no stored delta persists across a reload',
   async () => {
      /** @type {string} The token under test. */
      const tokenId = await placeBareToken();
      expect(await readOwnedNames(tokenId), 'the token\'s actor owns no item').toEqual([]);

      await spyRequests();
      await dropItemFolder(tokenId, pairFolderId);
      await expect.poll(
         () => readOwnedNames(tokenId),
         { message: 'the folder drop created an owned copy of each item' },
      ).toEqual(pairItemNames);
      expect(await takeRequests('Item', 'create'), 'each item was created in a request of its own').toEqual([
         1,
         1,
      ]);

      await reloadWorld(page);
      expect(await readOwnedNames(tokenId), 'the token\'s actor owns the items after the reload')
         .toEqual(pairItemNames);

      /** @type {object|null} The stored delta of the token. */
      const delta = (await readStoredToken(tokenId)).delta;
      expect(delta, 'the stored token has a delta').not.toBeNull();
      expect(delta.items.map((item) => item.name).sort(), 'the stored delta holds each created item')
         .toEqual(pairItemNames);
   });

test('an Item folder whose first item a listener vetoes still persists the other items across a reload', async () => {
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken();

   // The drop creates the folder's items in the folder's order; the listener vetoes the first one.
   /** @type {string} The name of the first item in the folder. */
   const vetoed = await page.evaluate((folderId) => game.folders.get(folderId).contents[0].name, itemFolderId);
   await page.evaluate((name) => {
      globalThis.titanVeto = Hooks.on('preCreateItem', (item) => (item.name === name ? false : undefined));
   }, vetoed);

   /** @type {string[]} The names of the items that are not vetoed, sorted. */
   const expected = itemNames.filter((name) => name !== vetoed);
   await spyRequests();
   await dropItemFolder(tokenId, itemFolderId);
   await expect.poll(
      () => readOwnedNames(tokenId),
      { message: 'the folder drop created a copy of each item the listener allowed' },
   ).toEqual(expected);
   expect(await takeRequests('Item', 'create'), 'the veto sent no request; the other items went one by one').toEqual([
      1,
      1,
   ]);

   await reloadWorld(page);
   expect(await readOwnedNames(tokenId), 'the token\'s actor owns the items after the reload').toEqual(expected);

   /** @type {object|null} The stored delta of the token. */
   const delta = (await readStoredToken(tokenId)).delta;
   expect(delta, 'the stored token has a delta').not.toBeNull();
   expect(delta.items.map((item) => item.name).sort(), 'the stored delta holds each created item').toEqual(expected);
});

test('a create whose later documents the server rejects leaves the first document created', async () => {
   // Core creates none of a rejected batch. The first document is written alone to store the delta, so it stays when
   // the rest is rejected; this pins that documented difference.
   /** @type {string} The token under test. */
   const tokenId = await placeBareToken(ownerActorId);
   expect(await readOwnedNames(tokenId), 'the token\'s actor inherits the owned item').toEqual([ownedItemName]);

   /** @type {string} The name of the document written before the rejection. */
   const firstName = `E2E Delta First ${RUN}`;
   expect(
      await page.evaluate(async ({ sceneId, tokenId, firstName, ownedItemId }) => {
         try {
            await game.scenes.get(sceneId).tokens.get(tokenId).actor.createEmbeddedDocuments('Item', [
               {
                  name: firstName,
                  type: 'equipment',
               },
               {
                  name: 'E2E Delta Duplicate',
                  type: 'equipment',
                  _id: ownedItemId,
               },
               {
                  name: 'E2E Delta Third',
                  type: 'equipment',
               },
            ], { keepId: true });
            return 'resolved';
         }
         catch (error) {
            return error.message;
         }
      }, {
         sceneId,
         tokenId,
         firstName,
         ownedItemId,
      }),
      'the server rejected the duplicate id',
   ).toContain('already exists');
   expect(await readOwnedNames(tokenId), 'only the first document was created').toEqual([
      firstName,
      ownedItemName,
   ].sort());

   await reloadWorld(page);
   expect(await readOwnedNames(tokenId), 'the first document is stored').toEqual([
      firstName,
      ownedItemName,
   ].sort());
});
