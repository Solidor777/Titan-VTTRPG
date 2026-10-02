import { chromium } from '@playwright/test';
import { assertCensusWorld, countCensus, sweepWorld, takeCensus } from './census.js';
import { joinWorld } from './fixtures.js';
import { DEFAULT_GM } from './users.js';
import { hasWork, readRegistry, resetRegistry } from './registry.js';

// Deletes everything the suite made, as the plan's suite-end deletion: the running list through the API in dependency
// order, then the census's sweep of `E2E `-prefixed leftovers (its count is printed), then the census, which must be
// zero. `global-setup.js` runs the same function over a list a crashed run left behind.

/**
 * Deletes the documents on the running list through the API, in dependency order: combats, tokens, scenes, embedded
 * documents, world documents, folders, and last the world compendia (unlocked first, which deletes the documents in
 * them). A document that is already gone is skipped.
 * @param {import('@playwright/test').Page} page - A page logged in as a GM to the census world.
 * @param {import('./registry.js').RegistryDocument[]} documents - The recorded documents.
 * @returns {Promise<Record<string, number>>} The number of recorded documents deleted of each document class.
 */
async function deleteRegisteredDocuments(page, documents) {
   return page.evaluate(async (documents) => {
      /** @type {Record<string, number>} The number of recorded documents deleted of each document class. */
      const deleted = {};

      /**
       * Counts a deletion.
       * @param {string} documentName - The deleted document's class name.
       * @returns {void}
       */
      const count = (documentName) => {
         deleted[documentName] = (deleted[documentName] ?? 0) + 1;
      };

      /** @type {string[]} The world document classes, in deletion order. */
      const worldOrder = [
         'Combat',
         'Scene',
         'Actor',
         'Item',
         'Macro',
         'RollTable',
         'JournalEntry',
         'Playlist',
         'Cards',
         'Folder',
      ];

      // Tokens first: a token's scene may be deleted by a later step, and a scene's other tokens go with it.
      for (const entry of documents.filter((document) => document.documentName === 'Token')) {
         /** @type {TokenDocument|undefined} The token, when it still exists. */
         const token = game.scenes.get(entry.sceneId)?.tokens.get(entry.id);
         if (token) {
            await token.parent.deleteEmbeddedDocuments('Token', [entry.id]);
            count('Token');
         }
      }

      // Other embedded documents, before the documents that embed them.
      for (const entry of documents.filter((document) => document.parent && document.documentName !== 'Token')) {
         /** @type {foundry.abstract.Document|null} The embedding document. */
         const embedder = await fromUuid(entry.parent);
         if (embedder?.getEmbeddedCollection(entry.documentName).has(entry.id)) {
            await embedder.deleteEmbeddedDocuments(entry.documentName, [entry.id]);
            count(entry.documentName);
         }
      }

      // World documents.
      for (const documentName of worldOrder) {
         for (const entry of documents.filter((document) => document.documentName === documentName
            && !document.parent && !document.packId)) {
            /** @type {foundry.abstract.Document|undefined} The document, when it still exists. */
            const document = game.collections.get(documentName).get(entry.id);
            if (document) {
               await document.delete();
               count(documentName);
            }
         }
      }

      // World compendia, with every document in them. A document recorded in a pack that is not itself recorded is
      // deleted from its pack.
      /** @type {Set<string>} The recorded compendia. */
      const recordedPacks = new Set(documents
         .filter((document) => document.documentName === 'Compendium')
         .map((document) => document.id));
      for (const entry of documents.filter((document) => document.packId && !recordedPacks.has(document.packId))) {
         /** @type {foundry.abstract.Document|null} The document in the pack. */
         const document = await game.packs.get(entry.packId)?.getDocument(entry.id);
         if (document) {
            await document.delete();
            count(entry.documentName);
         }
      }
      for (const id of recordedPacks) {
         /** @type {foundry.documents.collections.CompendiumCollection|undefined} The pack, when it still exists. */
         const pack = game.packs.get(id);
         if (pack) {
            if (pack.locked) {
               await pack.configure({ locked: false });
            }
            await pack.deleteCompendium();
            count('Compendium');
         }
      }
      return deleted;
   }, documents);
}

/**
 * Clears the recorded hotbar slots whose macro is still the recorded one. Deleting a Macro does not clear its slot (the
 * slot map lives on the User), so each slot is cleared on its own.
 * @param {import('@playwright/test').Page} page - A page logged in as a GM to the census world.
 * @param {import('./registry.js').RegistryHotbarEntry[]} hotbar - The recorded assignments.
 * @returns {Promise<number>} The number of slots cleared.
 */
async function clearRegisteredHotbar(page, hotbar) {
   return page.evaluate(async (hotbar) => {
      /** @type {number} The number of slots cleared. */
      let cleared = 0;
      for (const { userId, slot, macroId } of hotbar) {
         /** @type {User|undefined} The user the slot belongs to. */
         const user = game.users.get(userId);
         if (user?.hotbar[slot] === macroId) {
            await user.assignHotbarMacro(null, slot);
            cleared += 1;
         }
      }
      return cleared;
   }, hotbar);
}

/**
 * Deletes every chat message created since the run started.
 * @param {import('@playwright/test').Page} page - A page logged in as a GM to the census world.
 * @param {number} since - The run's start time (ms since the epoch).
 * @returns {Promise<number>} The number of messages deleted.
 */
async function deleteMessagesSince(page, since) {
   return page.evaluate(async (since) => {
      /** @type {string[]} The ids of the messages created since the run started. */
      const ids = game.messages.filter((message) => message.timestamp >= since).map((message) => message.id);
      if (ids.length > 0) {
         await ChatMessage.deleteDocuments(ids);
      }
      return ids.length;
   }, since);
}

/**
 * Restores each recorded setting to the value it held before the suite first set it.
 * @param {import('@playwright/test').Page} page - A page logged in as a GM to the census world.
 * @param {import('./registry.js').RegistrySetting[]} settings - The recorded settings.
 * @returns {Promise<number>} The number of settings restored.
 */
async function restoreSettings(page, settings) {
   return page.evaluate(async (settings) => {
      for (const { namespace, key, prior } of settings) {
         await game.settings.set(namespace, key, prior);
      }
      return settings.length;
   }, settings);
}

/**
 * @typedef {object} TeardownResult
 * @property {string[]} bootErrors - The errors the teardown's own world boot raised.
 * @property {object} registered - What was removed from the running list, by step.
 * @property {Record<string, number>} sweep - What the census's sweep removed beyond the list, by kind.
 * @property {Record<string, number>} census - The count of each kind left after both; every value must be zero.
 */

/**
 * Tears down a run: the running list, then the census's sweep, then the census, in one browser logged in as the
 * default E2E GM. The list is emptied afterwards (the file is overwritten, never deleted).
 * @param {string} origin - What runs the teardown, named when the boot reports errors.
 * @returns {Promise<TeardownResult>} What was removed and what is left.
 */
export async function tearDownRun(origin) {
   /** @type {import('./registry.js').Registry} The list to tear down. */
   const registry = readRegistry();
   /** @type {import('@playwright/test').Browser} The headless browser. */
   const browser = await chromium.launch();
   try {
      /** @type {import('@playwright/test').Page} The page logged in to the world. */
      const page = await (await browser.newContext({
         baseURL: 'http://localhost:30000',
         viewport: {
            width: 1920,
            height: 1080,
         },
      })).newPage();
      /** @type {string[]} The errors the boot raised. */
      const bootErrors = await joinWorld(page, DEFAULT_GM, origin);
      await assertCensusWorld(page);

      /** @type {object} What was removed from the running list, by step. */
      const registered = {};
      registered.documents = await deleteRegisteredDocuments(page, registry.documents);
      registered.hotbar = await clearRegisteredHotbar(page, registry.hotbar);
      if (registry.runStartedAt !== null) {
         registered.messages = await deleteMessagesSince(page, registry.runStartedAt);
      }
      registered.settings = await restoreSettings(page, registry.settings);

      /** @type {Record<string, number>} What the sweep removed beyond the list. */
      const sweep = await sweepWorld(page);

      /** @type {Record<string, number>} What is left. */
      const census = countCensus(await takeCensus(page, { since: registry.runStartedAt ?? undefined }));
      resetRegistry();
      return {
         bootErrors,
         registered,
         sweep,
         census,
      };
   }
   finally {
      await browser.close();
   }
}

/**
 * Tears a run down, prints what was removed, and throws when the census is not zero or the teardown's boot raised an
 * error.
 * @param {string} origin - What runs the teardown, named when the boot reports errors.
 * @returns {Promise<void>} Resolves once the world is clean.
 */
export async function tearDownAndReport(origin) {
   /** @type {TeardownResult} What was removed and what is left. */
   const result = await tearDownRun(origin);
   console.log(`e2e teardown (${origin}): ${JSON.stringify(result)}`);
   if (result.bootErrors.length > 0) {
      throw new Error(`The teardown's world boot raised errors:\n${result.bootErrors.join('\n')}`);
   }
   if (Object.values(result.census).some((count) => count > 0)) {
      throw new Error(`The census is not zero after the teardown: ${JSON.stringify(result.census)}`);
   }
}

/**
 * Playwright global teardown: tears the run down when the running list shows one.
 * @returns {Promise<void>} Resolves once the world is clean.
 */
export default async function globalTeardown() {
   if (hasWork(readRegistry())) {
      await tearDownAndReport('global-teardown.js');
   }
}
