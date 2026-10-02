import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { login } from './fixtures.js';
import { DEFAULT_GM, E2E_USERS } from './users.js';

// Counts, and on request removes, what the e2e suite has left in the `test-titan` world: `E2E `-prefixed documents
// of the world document kinds and world compendia, tokens whose actor does not resolve, chat messages since a run
// started, and hotbar entries of the E2E users whose macro does not resolve. User documents are never touched.
//
// Run as a script against the live world on localhost:30000, logged in as `E2E GM 1`:
//    node tests/e2e/census.js            counts only
//    node tests/e2e/census.js --sweep    counts, removes through the API, and counts again
// The script prints the counts as JSON and exits 1 when the final count is not zero.

/** @type {string} The name prefix of every document the e2e suite makes. */
export const E2E_PREFIX = 'E2E ';

/**
 * @typedef {object} CensusEntry
 * @property {string} id - The document id (for a hotbar entry, the user id).
 * @property {string} name - The document name, the pack label, or for a hotbar entry `<user> slot <n>`.
 * @property {string} [detail] - Where the entry lives: a token's scene, a pack's collection id, or a hotbar macro id.
 */

/**
 * @typedef {Record<string, CensusEntry[]>} Census
 * The entries of each kind, keyed by kind: `actors`, `items`, `scenes`, `folders`, `macros`, `tables`, `journal`,
 * `playlists`, `cards`, `packs`, `orphanTokens`, `hotbar`, and `messages` when a run start is given.
 */

/**
 * Counts what the e2e suite has left in the world.
 * @param {import('@playwright/test').Page} page - A page logged in as a GM.
 * @param {object} [options] - What else to count.
 * @param {number} [options.since] - A run's start time (ms since the epoch); messages from then on are counted.
 * @returns {Promise<Census>} The entries of each kind.
 */
export async function takeCensus(page, { since } = {}) {
   return page.evaluate(({ prefix, userNames, since }) => {
      /** @type {Record<string, string>} The world collection of each prefixed document kind. */
      const collections = {
         actors: 'actors',
         items: 'items',
         scenes: 'scenes',
         folders: 'folders',
         macros: 'macros',
         tables: 'tables',
         journal: 'journal',
         playlists: 'playlists',
         cards: 'cards',
      };

      /** @type {Record<string, object[]>} The entries of each kind. */
      const census = {};
      for (const [kind, collection] of Object.entries(collections)) {
         census[kind] = game[collection]
            .filter((document) => document.name?.startsWith(prefix))
            .map((document) => ({
               id: document.id,
               name: document.name,
            }));
      }
      census.packs = game.packs
         .filter((pack) => pack.metadata.packageType === 'world' && pack.metadata.label.startsWith(prefix))
         .map((pack) => ({
            id: pack.metadata.id,
            name: pack.metadata.label,
            detail: pack.collection,
         }));
      census.orphanTokens = game.scenes.contents.flatMap((scene) => scene.tokens
         .filter((token) => !token.actorId || !game.actors.get(token.actorId))
         .map((token) => ({
            id: token.id,
            name: token.name,
            detail: `scene ${scene.id} (${scene.name})`,
         })));
      census.hotbar = game.users
         .filter((user) => userNames.includes(user.name))
         .flatMap((user) => Object.entries(user.hotbar)
            .filter(([, macroId]) => !game.macros.get(macroId))
            .map(([slot, macroId]) => ({
               id: user.id,
               name: `${user.name} slot ${slot}`,
               detail: `macro ${macroId}`,
            })));
      if (since !== undefined) {
         census.messages = game.messages
            .filter((message) => message.timestamp >= since)
            .map((message) => ({
               id: message.id,
               name: message.type,
            }));
      }
      return census;
   }, {
      prefix: E2E_PREFIX,
      userNames: E2E_USERS.map((user) => user.name),
      since,
   });
}

/**
 * Removes, through the API, every `E2E `-prefixed document of the census kinds, every world compendium so labelled,
 * every token whose actor does not resolve, and every hotbar entry of the E2E users whose macro does not resolve.
 * Scenes go first (taking their tokens), folders after their contents, then orphaned tokens and dangling hotbar
 * entries, which the earlier deletions can create.
 * @param {import('@playwright/test').Page} page - A page logged in as a GM.
 * @returns {Promise<Record<string, number>>} The number removed of each kind.
 */
export async function sweepWorld(page) {
   return page.evaluate(async ({ prefix, userNames }) => {
      /** @type {string[]} The world collections of the prefixed document kinds, in deletion order. */
      const collections = [
         'scenes',
         'actors',
         'items',
         'macros',
         'tables',
         'journal',
         'playlists',
         'cards',
         'folders',
      ];

      /** @type {Record<string, number>} The number removed of each kind. */
      const removed = {};
      for (const collection of collections) {
         /** @type {foundry.abstract.Document[]} The prefixed documents of the kind. */
         const documents = game[collection].filter((document) => document.name?.startsWith(prefix));
         for (const document of documents) {
            // A folder deleted earlier in the loop may have taken a nested one with it.
            if (game[collection].has(document.id)) {
               await document.delete();
            }
         }
         removed[collection] = documents.length;
      }

      /** @type {foundry.documents.collections.CompendiumCollection[]} The prefixed world compendia. */
      const packs = game.packs
         .filter((pack) => pack.metadata.packageType === 'world' && pack.metadata.label.startsWith(prefix));
      for (const pack of packs) {
         if (pack.locked) {
            await pack.configure({ locked: false });
         }
         await pack.deleteCompendium();
      }
      removed.packs = packs.length;

      removed.orphanTokens = 0;
      for (const scene of game.scenes) {
         /** @type {string[]} The ids of the scene's tokens whose actor does not resolve. */
         const orphanIds = scene.tokens
            .filter((token) => !token.actorId || !game.actors.get(token.actorId))
            .map((token) => token.id);
         if (orphanIds.length > 0) {
            await scene.deleteEmbeddedDocuments('Token', orphanIds);
         }
         removed.orphanTokens += orphanIds.length;
      }

      removed.hotbar = 0;
      for (const user of game.users.filter((entry) => userNames.includes(entry.name))) {
         /** @type {string[]} The user's hotbar slots whose macro does not resolve. */
         const slots = Object.entries(user.hotbar)
            .filter(([, macroId]) => !game.macros.get(macroId))
            .map(([slot]) => slot);
         for (const slot of slots) {
            await user.assignHotbarMacro(null, slot);
         }
         removed.hotbar += slots.length;
      }
      return removed;
   }, {
      prefix: E2E_PREFIX,
      userNames: E2E_USERS.map((user) => user.name),
   });
}

/**
 * Reduces a census to the number of entries of each kind.
 * @param {Census} census - The entries of each kind.
 * @returns {Record<string, number>} The count of each kind.
 */
export function countCensus(census) {
   return Object.fromEntries(Object.entries(census).map(([kind, entries]) => [
      kind,
      entries.length,
   ]));
}

/**
 * Runs the census from the command line: logs in as the default E2E GM, counts, and with `--sweep` removes and counts
 * again. Prints the result as JSON and sets exit code 1 when the final census is not empty.
 * @returns {Promise<void>} Resolves once the browser has closed.
 */
async function main() {
   /** @type {boolean} Whether to remove what the census finds. */
   const sweep = process.argv.includes('--sweep');
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
      await login(page, DEFAULT_GM);

      /** @type {Census} The census before any removal. */
      const before = await takeCensus(page);
      /** @type {object} The printed result. */
      const result = { before };
      /** @type {Census} The final census. */
      let final = before;
      if (sweep) {
         result.removed = await sweepWorld(page);
         final = await takeCensus(page);
         result.after = final;
      }
      result.counts = {
         before: countCensus(before),
         ...(sweep ? { after: countCensus(final) } : {}),
      };
      console.log(JSON.stringify(result, null, 3));
      process.exitCode = Object.values(final).some((entries) => entries.length > 0) ? 1 : 0;
   }
   finally {
      await browser.close();
   }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
   await main();
}
