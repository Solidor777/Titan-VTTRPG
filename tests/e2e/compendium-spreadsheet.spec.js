import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { expect, test } from './harness.js';
import { encodeCsv } from '~/spreadsheet/format/Csv.js';
import { decodeSpreadsheetFiles } from '~/spreadsheet/format/DecodeSpreadsheetFiles.js';
import { zipFiles } from '~/spreadsheet/format/Zip.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { login } from './fixtures.js';
import {
   addEffect,
   createActor,
   createCompendium,
   createOwnedItem,
   openSidebarTab,
   putInPack,
   setCompendiumLocked,
} from './flows.js';
import { record } from './registry.js';
import { selectTitanOption } from './select.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Compendium spreadsheet export and import, driven through the pack context menu's Export to Spreadsheet and Import
 * Spreadsheet entries and the Compendium tab's header button, against real browser downloads and uploads. Every pack is
 * made in the Compendium tab; the source pack holds an actor, its weapon and two effects, all made through the sheet
 * flows and dragged into the pack. The files the importer reads are the Export dialog's own output with cells edited
 * the way a user edits them in a spreadsheet application: a value changed, a row or a column deleted, a row's parent
 * cell set to another document. Each file is decoded and encoded by TITAN's own codec in Node and handed to the
 * dialog's file input. Outcomes are read from the preview summary, the notification and the pack.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * @typedef {object} UploadFile
 * @property {string} name - The file name; the importer dispatches on its extension.
 * @property {string} mimeType - The file's media type.
 * @property {Buffer} buffer - The file's bytes.
 */

/**
 * Opens an entry of a pack's directory context menu.
 * @param {string} packId - The pack's collection id.
 * @param {string} label - The visible label of the entry.
 * @returns {Promise<void>} Resolves once the entry was chosen and the menu has closed.
 */
async function choosePackMenuEntry(packId, label) {
   /** @type {import('@playwright/test').Locator} The compendium directory's panel. */
   const panel = await openSidebarTab(page, 'compendium');
   await panel.locator(`.directory-item.compendium[data-pack="${packId}"]`).click({ button: 'right' });
   await chooseContextMenuEntry(page, page.locator('#context-menu .context-item', { hasText: label }));
}

/**
 * Exports a pack through its context menu and the Export dialog, and reads the downloaded file.
 * @param {string} packId - The pack's collection id.
 * @param {'xlsx'|'csv'} format - The file format to choose in the dialog.
 * @returns {Promise<{name: string, bytes: Uint8Array}>} The downloaded file's suggested name and bytes.
 */
async function exportPack(packId, format) {
   await choosePackMenuEntry(packId, 'Export to Spreadsheet');
   if (format !== 'xlsx') {
      await selectTitanOption(page, page.locator('[data-testid="export-format-select"]'), format);
   }

   /** @type {Promise<import('@playwright/test').Download>} The download the confirm click starts. */
   const downloadPromise = page.waitForEvent('download', { timeout: 1000 });
   await page.locator('[data-testid="export-confirm-button"]').click();

   /** @type {import('@playwright/test').Download} The download. */
   const download = await downloadPromise;
   await closeAllApps(page);
   return {
      name: download.suggestedFilename(),
      bytes: new Uint8Array(await readFile(await download.path())),
   };
}

/**
 * Decodes an exported file into its workbook, as the importer does.
 * @param {{name: string, bytes: Uint8Array}} file - The exported file.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The workbook.
 */
function decodeExport(file) {
   return decodeSpreadsheetFiles([file]);
}

/**
 * Lists the sheets that hold documents, which is every sheet but the manifest.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The workbook.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Sheet[]} The document sheets.
 */
function dataSheets(workbook) {
   return workbook.sheets.filter((sheet) => sheet.name !== '_manifest');
}

/**
 * Finds the row of a document by sheet and name.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The workbook.
 * @param {string} sheetName - The sheet, named for the document subtype (`npc`, `weapon`, `effect`).
 * @param {string} name - The document's name.
 * @returns {{[column: string]: string}} The row, whose cells are the strings of the file.
 */
function rowNamed(workbook, sheetName, name) {
   /** @type {{[column: string]: string} | undefined} The row. */
   const row = workbook.sheets.find((sheet) => sheet.name === sheetName).rows
      .find((candidate) => candidate.name === name);
   expect(row, `the ${sheetName} sheet has a row named ${name}`).toBeDefined();
   return row;
}

/**
 * Copies a workbook keeping only the document rows the predicate accepts, as a user deletes rows in a spreadsheet. The
 * manifest and every sheet's header stay.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The workbook.
 * @param {(sheetName: string, row: {[column: string]: string}) => boolean} keep - Whether a row stays.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The copy.
 */
function keepRows(workbook, keep) {
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The copy. */
   const copy = structuredClone(workbook);
   for (const sheet of dataSheets(copy)) {
      sheet.rows = sheet.rows.filter((row) => keep(sheet.name, row));
   }
   return copy;
}

/**
 * Copies a workbook without one column of its document sheets, as a user deletes a column in a spreadsheet.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The workbook.
 * @param {string} column - The column to delete.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The copy.
 */
function dropColumn(workbook, column) {
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The copy. */
   const copy = structuredClone(workbook);
   for (const sheet of dataSheets(copy)) {
      sheet.columns = sheet.columns.filter((candidate) => candidate !== column);
      for (const row of sheet.rows) {
         delete row[column];
      }
   }
   return copy;
}

/**
 * Counts the document rows of a workbook.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The workbook.
 * @returns {number} The number of rows over all document sheets.
 */
function rowCount(workbook) {
   return dataSheets(workbook).reduce((total, sheet) => total + sheet.rows.length, 0);
}

/**
 * Encodes a workbook as the zip of CSV files the Export dialog's CSV format produces, ready for the file input.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The workbook.
 * @param {string} [name] - The file name.
 * @returns {UploadFile} The file.
 */
function zipOf(workbook, name = 'E2E Spreadsheet.zip') {
   /** @type {{[column: string]: string}} The CSV text of each sheet, by file name. */
   const files = {};
   for (const sheet of workbook.sheets) {
      files[`${sheet.name}.csv`] = encodeCsv(sheet);
   }
   return {
      name,
      mimeType: 'application/zip',
      buffer: Buffer.from(zipFiles(files)),
   };
}

/**
 * Opens the Import dialog from a pack's context menu, or from the Compendium tab's header button when no pack is given.
 * @param {string | null} packId - The target pack's collection id, or null for the header button.
 * @returns {Promise<void>} Resolves once the dialog is open.
 */
async function openImport(packId) {
   if (packId === null) {
      await openSidebarTab(page, 'compendium');
      await page.locator('[data-testid="titan-import-spreadsheet-button"]').click();
   }
   else {
      await choosePackMenuEntry(packId, 'Import Spreadsheet');
   }
   await expect(page.locator('[data-testid="import-file-input"]')).toBeVisible();
}

/**
 * Gives the open Import dialog a file and runs its preview.
 * @param {UploadFile | UploadFile[]} files - The file or files to upload.
 * @param {object} [options] - What to set before the preview.
 * @param {boolean} [options.deleteMissing] - Whether to tick the delete-missing box.
 * @returns {Promise<import('@playwright/test').Locator>} The preview summary.
 */
async function previewImport(files, { deleteMissing = false } = {}) {
   await page.locator('[data-testid="import-file-input"]').setInputFiles(files);
   if (deleteMissing) {
      await page.locator('[data-testid="import-delete-missing-checkbox"]').click();
   }
   await page.locator('[data-testid="import-preview-button"]').click();

   /** @type {import('@playwright/test').Locator} The preview summary. */
   const summary = page.locator('[data-testid="import-preview-summary"]');
   await expect(summary).toBeVisible();
   return summary;
}

/**
 * The summary text of a plan.
 * @param {number} creates - Documents to create.
 * @param {number} updates - Documents to update.
 * @param {number} deletes - Documents to delete.
 * @returns {string} The text the preview shows.
 */
function summaryText(creates, updates, deletes) {
   return `${creates} to create, ${updates} to update, ${deletes} to delete.`;
}

/**
 * Clicks Apply in the open Import dialog and waits until the import finished: the Apply button goes with the plan, and
 * the completion notification reports the counts.
 * @param {number} created - The created count the notification reports.
 * @param {number} updated - The updated count.
 * @param {number} deleted - The deleted count.
 * @returns {Promise<void>} Resolves once the import is done.
 */
async function applyImport(created, updated, deleted) {
   await page.evaluate(() => ui.notifications.clear());
   await page.locator('[data-testid="import-apply-button"]').click();
   await expect(page.locator('[data-testid="import-apply-button"]')).toHaveCount(0);
   await expect(page.locator(
      '#notifications .notification.info',
      { hasText: `Import complete: ${created} created, ${updated} updated, ${deleted} deleted.` },
   )).toBeVisible();
   await settle(page);
}

/**
 * Clicks Apply in the open Import dialog and waits for the error notification the import raises.
 * @param {string} message - Text the error notification holds.
 * @returns {Promise<void>} Resolves once the notification shows.
 */
async function applyImportRefused(message) {
   await page.evaluate(() => ui.notifications.clear());
   await page.locator('[data-testid="import-apply-button"]').click();
   await expect(page.locator('#notifications .notification.error', { hasText: message })).toBeVisible();
   await expect(page.locator('[data-testid="import-apply-button"]'), 'the dialog keeps the plan').toBeVisible();
}

/**
 * Imports a file into a pack through the pack's Import dialog and closes the dialog.
 * @param {string} packId - The target pack's collection id.
 * @param {UploadFile} file - The file to import.
 * @param {{created: number, updated: number, deleted: number}} counts - The counts the plan and the completion report.
 * @returns {Promise<void>} Resolves once the import is done.
 */
async function importInto(packId, file, { created, updated, deleted }) {
   await openImport(packId);
   await expect(await previewImport(file)).toContainText(summaryText(created, updated, deleted));
   await applyImport(created, updated, deleted);
   await closeAllApps(page);
}

/**
 * Registers a world compendium the Import dialog created, which no flow made.
 * @param {string} label - The pack's label.
 * @returns {Promise<string>} The pack's collection id.
 */
async function registerPackByLabel(label) {
   /** @type {string} The pack's collection id. */
   const packId = await page.evaluate(
      (label) => game.packs.find((pack) => pack.metadata.label === label).collection,
      label,
   );
   record({
      documentName: 'Compendium',
      id: packId,
      createdBy: path.basename(test.info().file),
   });
   return packId;
}

/**
 * @typedef {object} ActorSnapshot
 * @property {string} name - The actor's name.
 * @property {string | null} folder - The name of the folder the actor sits in, or null at the pack root.
 * @property {Array<{id: string, name: string, effects: Array<{id: string, name: string}>}>} items - The owned items
 * with their effects.
 * @property {Array<{id: string, name: string}>} effects - The actor's own effects.
 */

/**
 * Reads an actor of a pack, with its items and effects, through the API.
 * @param {string} packId - The pack's collection id.
 * @param {string} actorId - The actor's id.
 * @returns {Promise<ActorSnapshot | null>} The snapshot, or null when the pack holds no such actor.
 */
function readActor(packId, actorId) {
   return page.evaluate(async ({ packId, actorId }) => {
      /** @type {object | undefined} The actor. */
      const actor = await game.packs.get(packId).getDocument(actorId);
      if (!actor) {
         return null;
      }
      return {
         name: actor.name,
         folder: actor.folder?.name ?? null,
         items: actor.items.map((item) => ({
            id: item.id,
            name: item.name,
            effects: item.effects.map((effect) => ({
               id: effect.id,
               name: effect.name,
            })),
         })),
         effects: actor.effects.map((effect) => ({
            id: effect.id,
            name: effect.name,
         })),
      };
   }, {
      packId,
      actorId,
   });
}

/**
 * Reads the ids a pack's index holds.
 * @param {string} packId - The pack's collection id.
 * @returns {Promise<string[]>} The ids, sorted.
 */
function readPackIds(packId) {
   return page.evaluate(async (packId) => [...(await game.packs.get(packId).getIndex()).keys()].sort(), packId);
}

/**
 * Makes an empty Actor compendium in the Compendium tab.
 * @param {string} title - The words that name the pack after `E2E Spreadsheet `; unique within the run.
 * @returns {Promise<string>} The pack's collection id.
 */
function emptyActorPack(title) {
   return createCompendium(page, {
      label: `E2E Spreadsheet ${title}`,
      type: 'Actor',
   });
}

test('exporting the shipped effects pack produces a manifest and one row per effect', async () => {
   /** @type {{name: string, bytes: Uint8Array}} The downloaded workbook (the dialog's default format and layout). */
   const file = await exportPack('titan.effects', 'xlsx');
   expect(file.name).toBe('TITAN Effects.xlsx');

   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The workbook. */
   const workbook = decodeExport(file);
   expect(workbook.sheets.map((sheet) => sheet.name)).toEqual([
      '_manifest',
      'effect',
   ]);

   /** @type {number} The number of effect documents the shipped pack holds. */
   const effectCount = await page.evaluate(async () => (await game.packs.get('titan.effects').getIndex()).size);
   expect(effectCount, 'the shipped pack holds effects').toBeGreaterThan(0);
   expect(workbook.sheets[1].rows.length).toBe(effectCount);
});

test('importing into "New Compendium" creates a pack with the imported documents', async () => {
   /** @type {string} The new pack's label. */
   const label = 'E2E Spreadsheet Imported Effects';

   // The shipped pack exported as CSV files is the file; the header button opens the dialog with no target pack.
   /** @type {{name: string, bytes: Uint8Array}} The downloaded file. */
   const exported = await exportPack('titan.effects', 'csv');
   /** @type {number} The number of documents the file holds. */
   const documentCount = rowCount(decodeExport(exported));
   expect(documentCount, 'the exported file holds documents to create').toBeGreaterThan(0);
   await openImport(null);
   await page.locator('[data-testid="import-file-input"]').setInputFiles({
      name: exported.name,
      mimeType: 'application/zip',
      buffer: Buffer.from(exported.bytes),
   });
   await selectTitanOption(page, page.locator('[data-testid="import-target-mode-select"]'), 'new');
   await page.locator('[data-testid="import-new-label-input"]').fill(label);
   await page.locator('[data-testid="import-preview-button"]').click();
   await expect(page.locator('[data-testid="import-preview-summary"]'))
      .toContainText(summaryText(documentCount, 0, 0));
   await applyImport(documentCount, 0, 0);

   // The dialog created the pack, so the running list receives it here.
   /** @type {string} The new pack's collection id. */
   const packId = await registerPackByLabel(label);
   expect(await page.evaluate(async (packId) => (await game.packs.get(packId).getIndex()).size, packId))
      .toBe(documentCount);
});

test.describe('importing the pack of an actor with an item and effects', () => {
   /**
    * The ids in the source workbook: the actor, the second actor that owns nothing, the actor's weapon, the effect on
    * the actor and the effect that the file moves under the weapon.
    * @type {{actor: string, other: string, weapon: string, actorEffect: string, itemEffect: string}}
    */
   let ids;
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The workbook with the item effect under the weapon. */
   let graph;

   test.beforeAll(async () => {
      test.setTimeout(180_000);

      /** @type {string} The source pack's collection id. */
      const packId = await createCompendium(page, {
         label: 'E2E Spreadsheet Source',
         type: 'Actor',
      });

      /** @type {string} The actor that owns the weapon and the effects. */
      const actorId = await createActor(page, {
         name: 'E2E Original NPC',
         type: 'npc',
      });
      await createOwnedItem(page, actorId, 'weapon', 'E2E Original Weapon');
      await addEffect(page, actorId, 'E2E Actor Effect');
      await addEffect(page, actorId, 'E2E Item Effect');
      await closeAllApps(page);
      await putInPack(page, page.locator(`#actors .directory-item.entry[data-entry-id="${actorId}"]`), packId);

      /** @type {string} The second actor, which owns nothing. */
      const otherId = await createActor(page, {
         name: 'E2E Other NPC',
         type: 'npc',
      });
      await putInPack(page, page.locator(`#actors .directory-item.entry[data-entry-id="${otherId}"]`), packId);

      // The pack's export is the base of every file; the ids are the ones the pack gave its documents.
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The pack's workbook. */
      const base = decodeExport(await exportPack(packId, 'csv'));
      ids = {
         actor: rowNamed(base, 'npc', 'E2E Original NPC')._id,
         other: rowNamed(base, 'npc', 'E2E Other NPC')._id,
         weapon: rowNamed(base, 'weapon', 'E2E Original Weapon')._id,
         actorEffect: rowNamed(base, 'effect', 'E2E Actor Effect')._id,
         itemEffect: rowNamed(base, 'effect', 'E2E Item Effect')._id,
      };

      // The item effect's parent cell names the weapon instead of the actor: an effect on an owned item.
      graph = base;
      rowNamed(graph, 'effect', 'E2E Item Effect')._parentId = ids.weapon;
   });

   /**
    * Copies the graph without the second actor, which is the four documents of the actor, its weapon and its effects.
    * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The copy.
    */
   function actorGraph() {
      return keepRows(graph, (sheet, row) => !(sheet === 'npc' && row._id === ids.other));
   }

   /**
    * Makes an Actor compendium and fills it with the actor, the weapon and the two effects by importing the graph.
    * @param {string} title - The words that name the pack; unique within the run.
    * @param {(workbook: import('~/spreadsheet/codec/Workbook.js').Workbook) => void} [edit] - Changes the workbook
    * before it is imported.
    * @returns {Promise<string>} The pack's collection id.
    */
   async function populatedPack(title, edit) {
      /** @type {string} The pack's collection id. */
      const packId = await emptyActorPack(title);

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The workbook to import. */
      const workbook = actorGraph();
      edit?.(workbook);
      await importInto(packId, zipOf(workbook), {
         created: 4,
         updated: 0,
         deleted: 0,
      });
      return packId;
   }

   test('new actor rows import into an empty pack and keep the ids of the file', async () => {
      /** @type {string} The empty pack's collection id. */
      const packId = await emptyActorPack('Create Actors');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with the two actor rows only. */
      const workbook = keepRows(graph, (sheet) => sheet === 'npc');
      expect(rowCount(workbook), 'the file holds the two actors').toBe(2);
      await importInto(packId, zipOf(workbook), {
         created: 2,
         updated: 0,
         deleted: 0,
      });

      expect(await readPackIds(packId)).toEqual([
         ids.actor,
         ids.other,
      ].sort());
   });

   test('an item row imports under the actor row of the same file', async () => {
      /** @type {string} The empty pack's collection id. */
      const packId = await emptyActorPack('Create Item');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with the actor and its weapon. */
      const workbook = keepRows(
         graph,
         (sheet, row) => (sheet === 'npc' && row._id === ids.actor) || sheet === 'weapon',
      );
      await importInto(packId, zipOf(workbook), {
         created: 2,
         updated: 0,
         deleted: 0,
      });

      /** @type {ActorSnapshot} The imported actor. */
      const actor = await readActor(packId, ids.actor);
      expect(actor.items.map((item) => [
         item.id,
         item.name,
      ])).toEqual([[
         ids.weapon,
         'E2E Original Weapon',
      ]]);
      expect(actor.effects).toEqual([]);
   });

   test('an effect row imports under an item row of the same file, two levels down', async () => {
      /** @type {string} The empty pack's collection id. */
      const packId = await emptyActorPack('Create Item Effect');
      await importInto(packId, zipOf(actorGraph()), {
         created: 4,
         updated: 0,
         deleted: 0,
      });

      /** @type {ActorSnapshot} The imported actor. */
      const actor = await readActor(packId, ids.actor);
      expect(actor.effects).toEqual([{
         id: ids.actorEffect,
         name: 'E2E Actor Effect',
      }]);
      expect(actor.items.map((item) => item.effects)).toEqual([[{
         id: ids.itemEffect,
         name: 'E2E Item Effect',
      }]]);
   });

   test('a mutated exported CSV file imports back into the same pack, updating a field', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Update Field');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The pack's own export, edited. */
      const workbook = decodeExport(await exportPack(packId, 'csv'));
      expect(rowCount(workbook), 'the export holds the four documents').toBe(4);
      rowNamed(workbook, 'npc', 'E2E Original NPC').name = 'E2E Renamed NPC';
      await importInto(packId, zipOf(workbook), {
         created: 0,
         updated: 4,
         deleted: 0,
      });

      expect((await readActor(packId, ids.actor)).name).toBe('E2E Renamed NPC');
      expect(await readPackIds(packId)).toEqual([ids.actor]);
   });

   test('a file without a _folder column leaves the folder of an updated document untouched', async () => {
      /** @type {string} The pack whose actor sits in a folder. */
      const packId = await populatedPack('Folder Untouched', (workbook) => {
         rowNamed(workbook, 'npc', 'E2E Original NPC')._folder = 'E2E Folder One';
      });
      expect((await readActor(packId, ids.actor)).folder).toBe('E2E Folder One');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The actor row without the column, edited. */
      const workbook = dropColumn(
         keepRows(graph, (sheet, row) => sheet === 'npc' && row._id === ids.actor),
         '_folder',
      );
      expect(workbook.sheets.find((sheet) => sheet.name === 'npc').columns).not.toContain('_folder');
      rowNamed(workbook, 'npc', 'E2E Original NPC').name = 'E2E Edited NPC';
      await importInto(packId, zipOf(workbook), {
         created: 0,
         updated: 1,
         deleted: 0,
      });

      /** @type {ActorSnapshot} The actor after the import. */
      const actor = await readActor(packId, ids.actor);
      expect(actor.name).toBe('E2E Edited NPC');
      expect(actor.folder).toBe('E2E Folder One');
   });

   test('changing the _folder cell moves an updated document into the new folder', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Folder Move');
      expect((await readActor(packId, ids.actor)).folder).toBeNull();

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with one actor row in a folder. */
      const workbook = keepRows(graph, (sheet, row) => sheet === 'npc' && row._id === ids.actor);
      rowNamed(workbook, 'npc', 'E2E Original NPC')._folder = 'E2E Folder Two';
      await importInto(packId, zipOf(workbook), {
         created: 0,
         updated: 1,
         deleted: 0,
      });

      expect((await readActor(packId, ids.actor)).folder).toBe('E2E Folder Two');
   });

   test('an item row under an actor of the pack imports without the actor row in the file', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Item Under Pack Actor');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with one new weapon row only. */
      const workbook = keepRows(graph, (sheet) => sheet === 'weapon');

      // The new row is a copy of the weapon's row under a file-local key.
      /** @type {{[column: string]: string}} The new row. */
      const row = workbook.sheets.find((sheet) => sheet.name === 'weapon').rows[0];
      row._id = 'added-weapon';
      row.name = 'E2E Added Weapon';
      row._parentId = ids.actor;
      await importInto(packId, zipOf(workbook), {
         created: 1,
         updated: 0,
         deleted: 0,
      });

      expect((await readActor(packId, ids.actor)).items.map((item) => item.name).sort()).toEqual([
         'E2E Added Weapon',
         'E2E Original Weapon',
      ]);
   });

   test('an effect row under an item embedded in the pack imports without the item row in the file', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Effect Under Pack Item');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with one new effect row only. */
      const workbook = keepRows(graph, (sheet, row) => sheet === 'effect' && row._id === ids.itemEffect);

      // The new row is a copy of the item effect's row under a file-local key.
      /** @type {{[column: string]: string}} The new row. */
      const row = workbook.sheets.find((sheet) => sheet.name === 'effect').rows[0];
      row._id = 'added-effect';
      row.name = 'E2E Added Item Effect';
      row._parentId = ids.weapon;
      await importInto(packId, zipOf(workbook), {
         created: 1,
         updated: 0,
         deleted: 0,
      });

      /** @type {ActorSnapshot} The actor after the import. */
      const actor = await readActor(packId, ids.actor);
      expect(actor.items.map((item) => item.effects.map((effect) => effect.name).sort())).toEqual([[
         'E2E Added Item Effect',
         'E2E Item Effect',
      ]]);
      expect(actor.effects.map((effect) => effect.name)).toEqual(['E2E Actor Effect']);
   });

   test('an item row whose parent exists nowhere is refused with an error naming the parent id', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Unknown Item Parent');

      /** @type {string} A parent id that is in neither the file nor the pack. */
      const unknownId = 'zzzzzzzzzzzzzzzz';

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with one new weapon row only. */
      const workbook = keepRows(graph, (sheet) => sheet === 'weapon');
      /** @type {{[column: string]: string}} The new row. */
      const row = workbook.sheets.find((sheet) => sheet.name === 'weapon').rows[0];
      row._id = 'orphan-weapon';
      row.name = 'E2E Orphan Weapon';
      row._parentId = unknownId;
      await openImport(packId);
      await expect(await previewImport(zipOf(workbook))).toContainText(summaryText(1, 0, 0));
      await applyImportRefused(unknownId);

      expect((await readActor(packId, ids.actor)).items.map((item) => item.name)).toEqual(['E2E Original Weapon']);
   });

   test('an edited item row with no parent cell updates the item under its actor in the pack', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Update Pack Item');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with the weapon row only, parent blank. */
      const workbook = keepRows(graph, (sheet) => sheet === 'weapon');
      /** @type {{[column: string]: string}} The weapon row. */
      const row = rowNamed(workbook, 'weapon', 'E2E Original Weapon');
      row._parentId = '';
      row.name = 'E2E Edited Weapon';
      await importInto(packId, zipOf(workbook), {
         created: 0,
         updated: 1,
         deleted: 0,
      });

      expect((await readActor(packId, ids.actor)).items.map((item) => item.name)).toEqual(['E2E Edited Weapon']);
   });

   test('an edited effect row with no parent cell updates the effect under its item in the pack', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Update Pack Item Effect');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with the item effect's row only. */
      const workbook = keepRows(graph, (sheet, row) => sheet === 'effect' && row._id === ids.itemEffect);
      /** @type {{[column: string]: string}} The effect row. */
      const row = rowNamed(workbook, 'effect', 'E2E Item Effect');
      row._parentId = '';
      row.name = 'E2E Edited Item Effect';
      await importInto(packId, zipOf(workbook), {
         created: 0,
         updated: 1,
         deleted: 0,
      });

      /** @type {ActorSnapshot} The actor after the import. */
      const actor = await readActor(packId, ids.actor);
      expect(actor.items.map((item) => item.effects.map((effect) => effect.name)))
         .toEqual([['E2E Edited Item Effect']]);
      expect(actor.effects.map((effect) => effect.name)).toEqual(['E2E Actor Effect']);
   });

   test('an update whose parent was deleted after the preview is refused, leaving the pack unchanged', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Stale Update Parent');

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with the weapon row only, parent blank. */
      const workbook = keepRows(graph, (sheet) => sheet === 'weapon');
      /** @type {{[column: string]: string}} The weapon row. */
      const row = rowNamed(workbook, 'weapon', 'E2E Original Weapon');
      row._parentId = '';
      row.name = 'E2E Stale Weapon';

      // The preview resolves the blank parent cell to the actor of the pack and plans an update of the weapon.
      await openImport(packId);
      await expect(await previewImport(zipOf(workbook))).toContainText(summaryText(0, 1, 0));

      // The actor is deleted from the pack window while the dialog holds the plan.
      await (await openSidebarTab(page, 'compendium'))
         .locator(`.directory-item.compendium[data-pack="${packId}"] a.entry-name`).click();

      /** @type {import('@playwright/test').Locator} The pack's window. */
      const packWindow = page.locator(
         `.application.compendium-directory[id="Compendium-${packId.replaceAll('.', '_')}"]`,
      );
      await packWindow.locator(`.directory-item.entry[data-entry-id="${ids.actor}"]`).click({ button: 'right' });
      await chooseContextMenuEntry(page, page.locator('#context-menu .context-item', { hasText: 'Delete' }));
      await page.locator('dialog.application.dialog button[data-action="yes"]').click();
      await expect.poll(() => readPackIds(packId)).toEqual([]);

      // The refused import writes nothing: the pack stays empty, with no weapon renamed or created anywhere.
      await applyImportRefused(`Cannot update Item documents under parent "${ids.actor}"`);
      expect(await readPackIds(packId)).toEqual([]);
   });

   test('importing into a locked pack is refused, leaving the pack unchanged', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Locked Pack');
      await setCompendiumLocked(page, packId, true);

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The file with the actor row renamed. */
      const workbook = keepRows(graph, (sheet, row) => sheet === 'npc' && row._id === ids.actor);
      rowNamed(workbook, 'npc', 'E2E Original NPC').name = 'E2E Should Not Be Renamed';
      await openImport(packId);
      await expect(await previewImport(zipOf(workbook))).toContainText(summaryText(0, 1, 0));
      await applyImportRefused('is locked and cannot be imported into');

      expect((await readActor(packId, ids.actor)).name).toBe('E2E Original NPC');
   });

   test('deleteMissing removes a top-level pack document absent from the imported file', async () => {
      /** @type {string} The pack that holds both actors. */
      const packId = await emptyActorPack('Delete Missing');
      await importInto(packId, zipOf(graph), {
         created: 5,
         updated: 0,
         deleted: 0,
      });

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The pack's own export without the second actor. */
      const workbook = keepRows(
         decodeExport(await exportPack(packId, 'csv')),
         (sheet, row) => !(sheet === 'npc' && row._id === ids.other),
      );
      await openImport(packId);
      await expect(await previewImport(zipOf(workbook), { deleteMissing: true })).toContainText(summaryText(0, 4, 1));
      await applyImport(0, 4, 1);

      expect(await readPackIds(packId)).toEqual([ids.actor]);
   });

   test('an actor pack with embedded items and effects round-trips through export and re-import', async () => {
      /** @type {string} The populated pack's collection id. */
      const packId = await populatedPack('Round Trip');

      // The item's own effect and the actor's own effect share one `effect` sheet: the cell naming the parent tells a
      // depth-1 effect from a depth-2 effect.
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The pack's export, weapon and effects renamed. */
      const workbook = decodeExport(await exportPack(packId, 'csv'));
      expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(expect.arrayContaining([
         'npc',
         'weapon',
         'effect',
      ]));
      for (const sheetName of [
         'weapon',
         'effect',
      ]) {
         for (const row of workbook.sheets.find((sheet) => sheet.name === sheetName).rows) {
            row.name = `${row.name} Renamed`;
         }
      }

      // All four documents of the pack are in the file and exist in the pack: four updates and no creates.
      await openImport(packId);
      await expect(await previewImport(zipOf(workbook))).toContainText(summaryText(0, 4, 0));
      await applyImport(0, 4, 0);

      /** @type {ActorSnapshot} The actor after the import. */
      const actor = await readActor(packId, ids.actor);
      expect(actor.items.map((item) => item.name)).toEqual(['E2E Original Weapon Renamed']);
      expect(actor.items.map((item) => item.effects.map((effect) => effect.name))).toEqual([[
         'E2E Item Effect Renamed',
      ]]);
      expect(actor.effects.map((effect) => effect.name)).toEqual(['E2E Actor Effect Renamed']);
   });
});
