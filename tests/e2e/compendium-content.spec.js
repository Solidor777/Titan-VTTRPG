import { expect, flushPageErrors, test } from './harness.js';
import { clickTabButton } from './actions.js';
import { collectLocalizationOffenders, login, openSheetByUuid } from './fixtures.js';
import { createActor, openSidebarTab } from './flows.js';
import { record } from './registry.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Every document of the compendium module's packs (read from the live packs at run time, none sampled) is placed on a
 * character by dragging it from its open pack window onto the character sheet, shown in each tab of that sheet, shown
 * in the sheet of its owned copy and in the sheet of its pack entry. Each step must raise no uncaught page error, no
 * error notification and no `LOCAL.` text, and the sheet must have rendered content. Problems are gathered per pack so
 * one failing document does not hide the rest.
 */

/** @type {string} The package name of the compendium module. */
const MODULE = 'titan-vttrpg-compendium';

/** @type {string} The root class every TITAN document sheet carries. */
const SHEET = '.titan-document-sheet';

/** @type {number} How many documents one character receives before the next batch starts on a new character. */
const BATCH_SIZE = 40;

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared after every document). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);

   // Records every error notification that appears, so a notification that fades before a check still counts.
   await page.evaluate(() => {
      globalThis.titanE2ENotifications = [];
      new MutationObserver((mutations) => {
         for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
               if (node instanceof Element && node.matches('.notification.error')) {
                  globalThis.titanE2ENotifications.push(node.textContent.trim());
               }
            }
         }
      }).observe(document.querySelector('#notifications'), {
         childList: true,
         subtree: true,
      });
   });
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads the packs of the module that hold a document type, with their entries.
 * @param {string} documentName - The pack document type (`Item`, `ActiveEffect`, `Actor`).
 * @returns {Promise<{id: string, label: string, entries: {id: string, name: string, type: string}[]}[]>} Each pack's
 * collection id, label and every entry of its index.
 */
async function readModulePacks(documentName) {
   return page.evaluate(async ({ documentName, module }) => {
      /** @type {{id: string, label: string, entries: object[]}[]} The packs and their entries. */
      const result = [];
      for (const pack of game.packs) {
         if (pack.metadata.packageName !== module || pack.documentName !== documentName) {
            continue;
         }
         const index = await pack.getIndex();
         result.push({
            id: pack.collection,
            label: pack.metadata.label,
            entries: index.map((entry) => ({
               id: entry._id,
               name: entry.name,
               type: entry.type ?? '',
            })),
         });
      }
      return result;
   }, {
      documentName,
      module: MODULE,
   });
}

/**
 * Takes what went wrong since the last call: uncaught page errors, hook errors and error notifications.
 * @returns {Promise<string[]>} One line per problem; empty when nothing went wrong.
 */
async function takeFaults() {
   await flushPageErrors(page);

   /** @type {string[]} The error notifications since the last call. */
   const notifications = await page.evaluate(() => globalThis.titanE2ENotifications.splice(0));

   /** @type {string[]} The problems. */
   const faults = [
      ...errors.splice(0).map((error) => `page error: ${error}`),
      ...notifications.map((text) => `error notification: ${text}`),
   ];
   return faults;
}

/**
 * Sets the position of an open application window (a window layout change, not a document change).
 * @param {string} appId - The element id of the application.
 * @param {object} position - The `left`, `top`, `width` and `height` to set.
 * @returns {Promise<void>} Resolves once the position is set.
 */
async function positionWindow(appId, position) {
   await page.evaluate(
      ({ appId, position }) => {
         foundry.applications.instances.get(appId).setPosition(position);
      },
      {
         appId,
         position,
      },
   );
}

/**
 * Opens a pack's window by clicking its entry in the Compendium tab and puts it left of the character sheet.
 * @param {string} packId - The pack's collection id.
 * @returns {Promise<import('@playwright/test').Locator>} The pack window.
 */
async function openPackWindow(packId) {
   /** @type {import('@playwright/test').Locator} The compendium directory's panel. */
   const panel = await openSidebarTab(page, 'compendium');
   /** @type {import('@playwright/test').Locator} The pack's entry. */
   const packEntry = panel.locator(`.directory-item.compendium[data-pack="${packId}"]`);

   // The module's packs sit in a folder that starts collapsed; expanding it is a click on its header. The `has`
   // locator is matched inside each folder, so it is built from the page, not from the panel.
   /** @type {import('@playwright/test').Locator} The collapsed folders that hold the pack, outermost first. */
   const collapsed = panel.locator('li.directory-item.folder:not(.expanded)').filter({
      has: page.locator(`.directory-item.compendium[data-pack="${packId}"]`),
   });
   for (let remaining = await collapsed.count(); remaining > 0; remaining--) {
      await collapsed.first().locator('> header.folder-header').click();
      await expect(collapsed).toHaveCount(remaining - 1);
   }
   await packEntry.locator('a.entry-name').click();

   /** @type {string} The pack window's element id. */
   const appId = `Compendium-${packId.replaceAll('.', '_')}`;

   /** @type {import('@playwright/test').Locator} The pack window. */
   const packWindow = page.locator(`.application.compendium-directory[id="${appId}"]`);
   await expect(packWindow).toBeVisible();
   await positionWindow(appId, {
      left: 10,
      top: 50,
      width: 420,
      height: 900,
   });

   // Pack documents sit in folders that start collapsed; a folder header click expands one, and each expansion can
   // show collapsed subfolders.
   /** @type {import('@playwright/test').Locator} The folders of the window that show collapsed. */
   const collapsedFolders = packWindow.locator('li.directory-item.folder:not(.expanded)').filter({ visible: true });
   while (await collapsedFolders.count() > 0) {
      /** @type {string} The id of the folder this pass expands. */
      const folderId = await collapsedFolders.first().getAttribute('data-folder-id');

      /** @type {import('@playwright/test').Locator} That folder. */
      const folder = packWindow.locator(`li.directory-item.folder[data-folder-id="${folderId}"]`);
      await folder.locator('> header.folder-header').click();
      await expect(folder).toHaveClass(/expanded/);
   }
   return packWindow;
}

/**
 * Scans a sheet: clicks every tab of its tab strip and on each asserts that content rendered and that no `LOCAL.`
 * text shows.
 * @param {import('@playwright/test').Locator} sheet - The open sheet.
 * @param {string} rootSelector - CSS selector of the sheet's root, for the localization scan.
 * @param {string} what - What the sheet shows, for the problem lines.
 * @returns {Promise<string[]>} The problems found; empty when the sheet is sound.
 */
async function scanSheet(sheet, rootSelector, what) {
   /** @type {string[]} The problems found. */
   const problems = [];

   /** @type {import('@playwright/test').Locator} The tab buttons. */
   const buttons = sheet.locator('.tab-list button');

   /** @type {number} How many tabs the sheet has. */
   const count = await buttons.count();
   if (count === 0) {
      problems.push(`${what}: the sheet has no tab strip`);
   }
   for (let index = 0; index < count; index++) {
      try {
         await clickTabButton(buttons.nth(index));
      }
      catch (error) {
         const firstLines = error.message.split(/\r?\n/).slice(0, 8).join(' | '); // First lines of Playwright's click log.
         problems.push(`${what}: tab ${index} did not activate: ${firstLines}`);
         continue;
      }

      /** @type {string} The text the sheet's content shows. */
      const text = await sheet.locator('.window-content').innerText();
      if (text.trim().length === 0) {
         problems.push(`${what}: tab ${index} rendered no content`);
      }
      for (const offender of await collectLocalizationOffenders(page, rootSelector)) {
         problems.push(`${what}: tab ${index} shows LOCAL. text: ${offender}`);
      }
   }
   return problems;
}

/**
 * Opens the sheet of a document by uuid, scans every tab, collects the faults and closes the sheet.
 * @param {string} uuid - The document's uuid.
 * @param {string} rootSelector - CSS selector of the sheet's root.
 * @param {string} what - What the sheet shows, for the problem lines.
 * @returns {Promise<string[]>} The problems found; empty when the sheet is sound.
 */
async function inspectOwnSheet(uuid, rootSelector, what) {
   /** @type {string[]} The problems found. */
   const problems = [];
   try {
      /** @type {import('@playwright/test').Locator} The sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      problems.push(...await scanSheet(sheet, rootSelector, what));
   }
   catch (error) {
      problems.push(`${what}: the sheet did not open: ${error.message.split('\n')[0]}`);
   }
   problems.push(...(await takeFaults()).map((fault) => `${what}: ${fault}`));
   await page.evaluate(async (uuid) => {
      await (await fromUuid(uuid))?.sheet.close({ animate: false });
   }, uuid);
   return problems;
}

/**
 * Creates a character, opens its sheet on the right of the pack window and drags every entry of a batch from the pack
 * window onto the sheet; then scans the character sheet's tabs and the sheet of every document that arrived.
 * @param {object} batch - What to place.
 * @param {string} batch.packId - The pack's collection id.
 * @param {string} batch.label - The pack's label, for names and problem lines.
 * @param {number} batch.number - The batch number within the pack.
 * @param {{id: string, name: string, type: string}[]} batch.entries - The pack entries of the batch.
 * @param {'items' | 'effects'} batch.collection - Whether the entries arrive as owned items or actor effects.
 * @param {'Item' | 'ActiveEffect'} batch.documentName - The pack's document type.
 * @returns {Promise<string[]>} The problems found; empty when every document placed and rendered soundly.
 */
async function placeBatch({ packId, label, number, entries, collection, documentName }) {
   /** @type {string[]} The problems found. */
   const problems = [];

   /** @type {string} The receiving character's id. */
   const actorId = await createActor(page, {
      name: `E2E Compendium ${label} ${number}`,
      type: 'player',
   });
   await takeFaults();

   /** @type {string[]} The ids the character holds before the drops. */
   const initialIds = await page.evaluate(
      ({ actorId, collection }) => game.actors.get(actorId)[collection].map((document) => document.id),
      {
         actorId,
         collection,
      },
   );

   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
   await positionWindow(await sheet.getAttribute('id'), {
      left: 460,
      top: 50,
      width: 900,
      height: 900,
   });

   /** @type {import('@playwright/test').Locator} The pack window. */
   const packWindow = await openPackWindow(packId);
   for (const entry of entries) {
      /** @type {number} How many documents the character holds before the drop. */
      const before = await page.evaluate(
         ({ actorId, collection }) => game.actors.get(actorId)[collection].size,
         {
            actorId,
            collection,
         },
      );
      await packWindow.locator(`.directory-item.entry[data-entry-id="${entry.id}"]`).dragTo(sheet);
      try {
         await expect.poll(
            () => page.evaluate(
               ({ actorId, collection }) => game.actors.get(actorId)[collection].size,
               {
                  actorId,
                  collection,
               },
            ),
            { message: `the drop of ${entry.name} placed one document` },
         ).toBe(before + 1);
      }
      catch {
         problems.push(`${label} / ${entry.name} (${entry.id}): the drop onto the character placed nothing`);
      }
      problems.push(...(await takeFaults()).map((fault) => `${label} / ${entry.name} (${entry.id}): drop: ${fault}`));
   }
   await settle(page);
   await packWindow.locator('header.window-header [data-action="close"]').click();
   await expect(packWindow).toHaveCount(0);

   // The character sheet shows every tab with the whole batch on it.
   problems.push(...await scanSheet(sheet, SHEET, `${label} batch ${number} character sheet`));
   problems.push(...(await takeFaults()).map((fault) => `${label} batch ${number} character sheet: ${fault}`));
   await page.evaluate(async (actorId) => {
      await game.actors.get(actorId).sheet.close({ animate: false });
   }, actorId);

   // Each placed document in its own sheet, then the matching pack entry in its own sheet.
   /** @type {{uuid: string, name: string, effectUuids: string[]}[]} The documents the drops added. */
   const owned = await page.evaluate(
      ({ actorId, collection, initialIds }) => game.actors.get(actorId)[collection]
         .filter((document) => !initialIds.includes(document.id))
         .map((document) => ({
            uuid: document.uuid,
            name: document.name,
            effectUuids: collection === 'items' ? document.effects.map((effect) => effect.uuid) : [],
         })),
      {
         actorId,
         collection,
         initialIds,
      },
   );
   if (owned.length !== entries.length) {
      problems.push(`${label} batch ${number}: ${entries.length} dragged, ${owned.length} on the character`);
   }
   for (const document of owned) {
      problems.push(...await inspectOwnSheet(document.uuid, SHEET, `${label} / ${document.name} owned sheet`));
      for (const effectUuid of document.effectUuids) {
         problems.push(...await inspectOwnSheet(effectUuid, SHEET, `${label} / ${document.name} item effect sheet`));
      }
   }
   for (const entry of entries) {
      problems.push(...await inspectOwnSheet(
         `Compendium.${packId}.${documentName}.${entry.id}`,
         SHEET,
         `${label} / ${entry.name} pack entry sheet`,
      ));
   }
   return problems;
}

/**
 * Places and inspects every entry of every module pack of a document type, in batches.
 * @param {'Item' | 'ActiveEffect'} documentName - The pack document type.
 * @returns {Promise<void>} Resolves once every document has been placed and inspected.
 */
async function coverPacks(documentName) {
   /** @type {{id: string, label: string, entries: object[]}[]} The packs. */
   const packs = await readModulePacks(documentName);
   expect(packs.length, `the module has ${documentName} packs`).toBeGreaterThan(0);

   /** @type {string[]} The problems found across all packs. */
   const problems = [];
   for (const pack of packs) {
      for (let start = 0, number = 1; start < pack.entries.length; start += BATCH_SIZE, number++) {
         problems.push(...await placeBatch({
            packId: pack.id,
            label: pack.label,
            number,
            entries: pack.entries.slice(start, start + BATCH_SIZE),
            collection: documentName === 'Item' ? 'items' : 'effects',
            documentName,
         }));
         await closeAllApps(page);
      }
   }
   expect(problems, `compendium documents that failed:\n${problems.join('\n')}`).toEqual([]);
}

test.describe('compendium module content', () => {
   test.setTimeout(3_600_000);

   test('every module item places on a character and renders in the sheet, its own sheet and the pack', async () => {
      await coverPacks('Item');
   });

   test('every module effect places on a character and renders in the sheet, its own sheet and the pack', async () => {
      await coverPacks('ActiveEffect');
   });

   test('every module actor imports to the world and renders with its items and effects', async () => {
      /** @type {{id: string, label: string, entries: {id: string, name: string}[]}[]} The actor packs. */
      const packs = await readModulePacks('Actor');
      expect(packs.length, 'the module has Actor packs').toBeGreaterThan(0);

      /** @type {string[]} The problems found. */
      const problems = [];
      for (const pack of packs) {
         for (const entry of pack.entries) {
            /** @type {import('@playwright/test').Locator} The pack window. */
            const packWindow = await openPackWindow(pack.id);

            /** @type {string[]} The ids of the world actors before the import. */
            const before = await page.evaluate(() => game.actors.map((actor) => actor.id));

            /** @type {import('@playwright/test').Locator} The Actors tab's panel, the drop target. */
            const panel = await openSidebarTab(page, 'actors');
            await packWindow.locator(`.directory-item.entry[data-entry-id="${entry.id}"]`)
               .dragTo(panel.locator('.directory-list'));

            /** @type {string[]} The ids of the new world actors. */
            let added = [];
            await expect.poll(async () => {
               added = await page.evaluate(
                  (before) => game.actors.filter((actor) => !before.includes(actor.id)).map((actor) => actor.id),
                  before,
               );
               return added.length;
            }, { message: `the import of ${entry.name} created one actor` }).toBe(1);
            record({
               documentName: 'Actor',
               id: added[0],
               createdBy: 'compendium-content.spec.js',
            });
            problems.push(...(await takeFaults()).map((fault) => `${entry.name}: import: ${fault}`));
            await packWindow.locator('header.window-header [data-action="close"]').click();
            await expect(packWindow).toHaveCount(0);

            /** @type {{uuid: string, name: string}[]} The imported actor's items and effects. */
            const parts = await page.evaluate((actorId) => {
               /** @type {Actor} The imported actor. */
               const actor = game.actors.get(actorId);
               return [
                  ...actor.items.map((item) => ({
                     uuid: item.uuid,
                     name: item.name,
                     kind: 'item',
                  })),
                  ...actor.effects.map((effect) => ({
                     uuid: effect.uuid,
                     name: effect.name,
                     kind: 'effect',
                  })),
               ];
            }, added[0]);
            problems.push(...await inspectOwnSheet(`Actor.${added[0]}`, SHEET, `${entry.name} actor sheet`));
            for (const part of parts) {
               problems.push(...await inspectOwnSheet(
                  part.uuid,
                  SHEET,
                  `${entry.name} / ${part.name} ${part.kind} sheet`,
               ));
            }
            problems.push(...await inspectOwnSheet(
               `Compendium.${pack.id}.Actor.${entry.id}`,
               SHEET,
               `${entry.name} pack entry sheet`,
            ));
         }
      }
      expect(problems, `compendium actors that failed:\n${problems.join('\n')}`).toEqual([]);
   });
});
