import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { login } from './fixtures.js';
import { selectTitanOption } from './select.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Compendium spreadsheet export/import: exercises the context-menu "Export to Spreadsheet" and
 * "Import Spreadsheet" entries, and the sidebar-header "Import spreadsheet" button, against a real
 * browser download/upload. `titan.effects` is this system's one shipped compendium and other specs
 * only ever read from it, so every scenario that mutates or creates pack documents (Steps 2-4 below)
 * creates, seeds, and deletes its own scratch world-package compendium instead — see
 * `tests/e2e/pack-conversion.spec.js` for the precedent this follows (`configure({ locked: false })`
 * then `deleteCompendium()`, with a stale-pack sweep at the start).
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
 * Opens the Compendium sidebar tab and right-clicks the named pack's directory entry, waiting for its
 * context menu to appear. Selects by the exact `data-pack` collection id (not display-label text
 * matching) — the live world can carry other packs whose label is a superset match of another pack's
 * label (e.g. "TITAN Effects" is a substring of an unrelated "TITAN Effects (Copy)" pack), which a
 * text-based locator resolves ambiguously.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {string} packId - The pack's collection id, e.g. "titan.effects".
 * @returns {Promise<void>} Resolves once the context menu is visible.
 */
async function openPackContextMenu(page, packId) {
   await page.locator('#sidebar-tabs [data-tab="compendium"]').click();
   await page.locator(`.directory-item[data-pack="${packId}"]`).click({ button: 'right' });
   await page.locator('#context-menu').waitFor();
}

/**
 * Deletes the named world-package compendium if it exists, unlocking it first (a locked pack refuses
 * deletion). Used both to sweep a stale pack left by a crashed prior run and to clean up after a test.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {string} packId - The compendium's collection id (e.g. "world.e2e-spreadsheet-update").
 * @returns {Promise<void>} Resolves once the pack is gone (or was never present).
 */
async function deleteScratchPackIfExists(page, packId) {
   await page.evaluate(async (id) => {
      /** @type {CompendiumCollection|undefined} */
      const pack = game.packs.get(id);
      if (pack) {
         await pack.configure({ locked: false });
         await pack.deleteCompendium();
      }
   }, packId);
}

/**
 * Creates a fresh Item-type world-package compendium seeded with the given documents, sweeping any
 * same-id pack left by a crashed prior run first.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {{packId:string, packName:string, packLabel:string, documents:object[]}} fixture - The pack to
 *    create (`packId` is `world.<packName>`) and the Item create-data to seed it with.
 * @returns {Promise<void>} Resolves once the pack exists and every document is created.
 */
async function seedScratchPack(page, fixture) {
   await deleteScratchPackIfExists(page, fixture.packId);
   await page.evaluate(async ({ packId, packName, packLabel, documents }) => {
      await foundry.documents.collections.CompendiumCollection.createCompendium({
         name: packName,
         label: packLabel,
         type: 'Item',
      });

      // The newly created compendium's on-disk store attaches asynchronously behind the resolved
      // CompendiumCollection: an immediate Item.create() can race it and fail with a "Database ...
      // is not ready to be accessed" server error. A read-only probe (e.g. getIndex()) does not
      // reliably exercise the same readiness gate as a write, so retry the real create call itself.
      for (const documentData of documents) {
         /** @type {number} */
         const readyDeadline = Date.now() + 5000;
         for (;;) {
            try {
               await Item.create(documentData, { pack: `world.${packName}` });
               break;
            }
            catch (error) {
               if (Date.now() > readyDeadline || !error.message.includes('not ready to be accessed')) {
                  throw error;
               }
               await new Promise((resolve) => setTimeout(resolve, 200));
            }
         }
      }

      // Stabilize before returning: the export/import flow this fixture feeds into reads the pack via
      // pack.getDocuments(), which can hit the same readiness race independently of the creates above.
      /** @type {CompendiumCollection} */
      const pack = game.packs.get(packId);
      /** @type {number} */
      const readDeadline = Date.now() + 5000;
      for (;;) {
         try {
            await pack.getDocuments();
            break;
         }
         catch (error) {
            if (Date.now() > readDeadline || !error.message.includes('not ready to be accessed')) {
               throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
         }
      }
   }, fixture);
}

test.describe('compendium spreadsheet export/import', () => {
   test('exporting the seeded effects pack produces a manifest and one row per effect', async () => {
      await openPackContextMenu(page, 'titan.effects');
      /** @type {Promise<import('@playwright/test').Download>} */
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#context-menu .context-item', { hasText: 'Export to Spreadsheet' }).click();
      // Default format/layout (xlsx/wide) exports as a single .xlsx with no dialog interaction needed —
      // the context-menu action opens the dialog; accept its defaults by clicking the confirm button.
      await page.locator('[data-testid="export-confirm-button"]').click();
      /** @type {import('@playwright/test').Download} */
      const download = await downloadPromise;
      /** @type {string} */
      const path = await download.path();
      /** @type {Buffer} */
      const bytes = await readFile(path);
      /** @type {Object<string,Uint8Array>} */
      const entries = unzipSync(new Uint8Array(bytes));
      expect(Object.keys(entries)).toContain('xl/worksheets/sheet1.xml');
      /** @type {string} */
      const workbookXml = strFromU8(entries['xl/workbook.xml']);
      expect(workbookXml).toContain('_manifest');
      expect(workbookXml).toContain('effect');
   });

   test('a mutated exported CSV file imports back into the same pack, updating a field', async () => {
      /** @type {string} */
      const packId = 'world.e2e-spreadsheet-update';
      try {
         await seedScratchPack(page, {
            packId,
            packName: 'e2e-spreadsheet-update',
            packLabel: 'E2E Spreadsheet Update',
            documents: [{ name: 'E2E Original Weapon', type: 'weapon' }],
         });

         await openPackContextMenu(page, packId);
         /** @type {Promise<import('@playwright/test').Download>} */
         const downloadPromise = page.waitForEvent('download');
         await page.locator('#context-menu .context-item', { hasText: 'Export to Spreadsheet' }).click();
         await selectTitanOption(page, page.locator('[data-testid="export-format-select"]'), 'csv');
         await page.locator('[data-testid="export-confirm-button"]').click();
         /** @type {string} */
         const zipPath = await (await downloadPromise).path();

         /** @type {Object<string,Uint8Array>} */
         const entries = unzipSync(new Uint8Array(await readFile(zipPath)));
         /** @type {string} */
         const weaponCsv = strFromU8(entries['weapon.csv']);
         // Replace the seeded weapon's `name` column value with a fixed marker string, locating the `name`
         // column by the header row rather than assuming its position.
         /** @type {string[]} */
         const lines = weaponCsv.replace(/^﻿/, '').split('\r\n').filter(Boolean);
         /** @type {string[]} */
         const header = lines[0].split(',');
         /** @type {number} */
         const nameIndex = header.indexOf('name');
         /** @type {string[]} */
         const firstDataRow = lines[1].split(',');
         firstDataRow[nameIndex] = 'E2E Renamed Weapon';
         lines[1] = firstDataRow.join(',');
         /** @type {string} */
         const rewritten = `﻿${lines.join('\r\n')}\r\n`;

         /** @type {string} */
         const tmpPath = join(tmpdir(), 'titan-e2e-weapon.csv');
         await writeFile(tmpPath, rewritten);

         await openPackContextMenu(page, packId);
         await page.locator('#context-menu .context-item', { hasText: 'Import Spreadsheet' }).click();
         await page.locator('[data-testid="import-file-input"]').setInputFiles(tmpPath);
         await page.locator('[data-testid="import-preview-button"]').click();
         /** @type {import('@playwright/test').Locator} */
         const summary = page.locator('[data-testid="import-preview-summary"]');
         await expect(summary).toContainText('1 to update');
         await page.locator('[data-testid="import-apply-button"]').click();

         // The click dispatches the DOM event and returns immediately; the dialog's async onApply()
         // handler keeps running afterward, so poll for the renamed entry rather than reading the
         // index in the same tick the click resolves.
         await expect.poll(() => page.evaluate(async (id) => {
            /** @type {object} */
            const pack = game.packs.get(id);
            /** @type {object[]} */
            const index = await pack.getIndex();
            return index.find((e) => e.name === 'E2E Renamed Weapon')?.name ?? null;
         }, packId)).toBe('E2E Renamed Weapon');
      }
      finally {
         await deleteScratchPackIfExists(page, packId);
      }
   });

   test('importing into "New Compendium" creates a pack with the imported documents', async () => {
      // This scenario creates a compendium and bulk-imports the full seeded effects pack's content into
      // it (many documents across depths), which legitimately takes longer than the suite's default
      // per-test budget under load — see pack-conversion.spec.js's identical extension for a heavier op.
      test.setTimeout(120_000);

      /** @type {string} */
      const newPackLabel = 'E2E Imported Effects';
      try {
         await openPackContextMenu(page, 'titan.effects');
         /** @type {Promise<import('@playwright/test').Download>} */
         const downloadPromise = page.waitForEvent('download');
         await page.locator('#context-menu .context-item', { hasText: 'Export to Spreadsheet' }).click();
         await selectTitanOption(page, page.locator('[data-testid="export-format-select"]'), 'csv');
         await page.locator('[data-testid="export-confirm-button"]').click();
         /** @type {import('@playwright/test').Download} */
         const download = await downloadPromise;
         // download.path() has no filename/extension of its own — PlanImport's decodeFiles() dispatches
         // on the uploaded File's name ending in ".zip"/".xlsx", so the browser-visible filename must be
         // preserved by saving to a path using the download's own suggested name before uploading it back.
         /** @type {string} */
         const zipPath = join(tmpdir(), download.suggestedFilename());
         await download.saveAs(zipPath);

         await page.locator('#sidebar-tabs [data-tab="compendium"]').click();
         await page.locator('[data-testid="titan-import-spreadsheet-button"]').click();
         await page.locator('[data-testid="import-file-input"]').setInputFiles(zipPath);
         await selectTitanOption(page, page.locator('[data-testid="import-target-mode-select"]'), 'new');
         await page.locator('[data-testid="import-new-label-input"]').fill(newPackLabel);
         await page.locator('[data-testid="import-preview-button"]').click();
         await page.locator('[data-testid="import-apply-button"]').click();

         // The click dispatches the DOM event and returns immediately; the dialog's async onApply()
         // handler (creating the compendium and every imported document) keeps running afterward, so
         // poll for a populated index rather than reading pack state in the same tick the click resolves.
         await expect.poll(() => page.evaluate(async (label) => {
            /** @type {object|undefined} */
            const pack = [...game.packs].find((p) => p.metadata.label === label);
            if (!pack) {
               return 0;
            }
            /** @type {object} */
            const index = await pack.getIndex();
            return index.size ?? index.length;
         }, newPackLabel), { timeout: 60_000 }).toBeGreaterThan(0);
      }
      finally {
         // The context-menu export never wrote to titan.effects; only the freshly created pack needs cleanup.
         await page.evaluate(async (label) => {
            /** @type {object|undefined} */
            const pack = [...game.packs].find((p) => p.metadata.label === label);
            if (pack) {
               await pack.configure({ locked: false });
               await pack.deleteCompendium();
            }
         }, newPackLabel);
      }
   });

   test('deleteMissing removes a top-level pack document absent from the imported file', async () => {
      /** @type {string} */
      const packId = 'world.e2e-spreadsheet-delete-missing';
      try {
         await seedScratchPack(page, {
            packId,
            packName: 'e2e-spreadsheet-delete-missing',
            packLabel: 'E2E Spreadsheet Delete Missing',
            documents: [
               { name: 'E2E Keep Weapon', type: 'weapon' },
               { name: 'E2E Remove Weapon', type: 'weapon' },
            ],
         });

         await openPackContextMenu(page, packId);
         /** @type {Promise<import('@playwright/test').Download>} */
         const downloadPromise = page.waitForEvent('download');
         await page.locator('#context-menu .context-item', { hasText: 'Export to Spreadsheet' }).click();
         await selectTitanOption(page, page.locator('[data-testid="export-format-select"]'), 'csv');
         await page.locator('[data-testid="export-confirm-button"]').click();
         /** @type {string} */
         const zipPath = await (await downloadPromise).path();

         /** @type {Object<string,Uint8Array>} */
         const entries = unzipSync(new Uint8Array(await readFile(zipPath)));
         /** @type {string[]} */
         const lines = strFromU8(entries['weapon.csv']).replace(/^﻿/, '').split('\r\n').filter(Boolean);
         /** @type {string[]} */
         const header = lines[0].split(',');
         /** @type {number} */
         const nameIndex = header.indexOf('name');
         /** @type {number} */
         const idIndex = header.indexOf('_id');
         /** @type {number} The data-row index (1-based within `lines`) of the weapon being removed. */
         const removedLineIndex = lines.findIndex(
            (line, i) => i > 0 && line.split(',')[nameIndex] === 'E2E Remove Weapon',
         );
         /** @type {string} The id column value being removed, read before dropping the row. */
         const removedId = lines[removedLineIndex].split(',')[idIndex];
         /** @type {string} The file with the targeted data row removed (one fewer weapon than the pack). */
         const rewritten = `﻿${lines.filter((_line, i) => i !== removedLineIndex).join('\r\n')}\r\n`;
         /** @type {string} */
         const tmpPath = join(tmpdir(), 'titan-e2e-weapon-missing.csv');
         await writeFile(tmpPath, rewritten);

         await openPackContextMenu(page, packId);
         await page.locator('#context-menu .context-item', { hasText: 'Import Spreadsheet' }).click();
         await page.locator('[data-testid="import-file-input"]').setInputFiles(tmpPath);
         await page.locator('[data-testid="import-delete-missing-checkbox"]').click();
         await page.locator('[data-testid="import-preview-button"]').click();
         await page.locator('[data-testid="import-apply-button"]').click();

         // The click dispatches the DOM event and returns immediately; the dialog's async onApply()
         // handler keeps running afterward, so poll for the deletion rather than reading pack state in
         // the same tick the click resolves.
         await expect.poll(() => page.evaluate(async ({ id, packId: pid }) => {
            /** @type {object} */
            const pack = game.packs.get(pid);
            return Boolean(await pack.getDocument(id));
         }, { id: removedId, packId })).toBe(false);
      }
      finally {
         await deleteScratchPackIfExists(page, packId);
      }
   });

   test('importing into a locked pack is refused, leaving the pack unchanged', async () => {
      // Targets the real shipped effects pack (not a lightweight scratch pack); give the apply click
      // more headroom under load, matching the "New Compendium" scenario above.
      test.setTimeout(120_000);

      // A row with a blank _id goes through planImport's CREATE path, which fully validates the row
      // against the ActiveEffect schema — TITAN's hand-rolled `changes` ArrayField requires a populated
      // dummy element there (see the keep-hand-rolled-changes-field convention), so a bare `_id,name`
      // row fails at PREVIEW with "changes is not iterable", never reaching apply. Referencing an
      // EXISTING effect's real id instead routes through the UPDATE path (a partial dry-run field
      // change against an already-valid instance), which previews cleanly — letting the refusal
      // genuinely happen at apply, as the test intends.
      /** @type {{id: string, originalName: string}} */
      const existingEffect = await page.evaluate(async () => {
         /** @type {object[]} */
         const index = await game.packs.get('titan.effects').getIndex();
         /** @type {object} */
         const first = index.contents[0];
         return { id: first._id, originalName: first.name };
      });

      await page.evaluate(async () => {
         await game.packs.get('titan.effects').configure({ locked: true });
      });

      try {
         await openPackContextMenu(page, 'titan.effects');
         await page.locator('#context-menu .context-item', { hasText: 'Import Spreadsheet' }).click();
         /** @type {string} */
         const tmpPath = join(tmpdir(), 'titan-e2e-locked.csv');
         await writeFile(tmpPath, `﻿_id,name\r\n${existingEffect.id},E2E Should Not Be Renamed\r\n`);
         await page.locator('[data-testid="import-file-input"]').setInputFiles(tmpPath);
         await page.locator('[data-testid="import-preview-button"]').click();
         await page.locator('[data-testid="import-apply-button"]').click();

         await expect(page.locator('.notification.error')).toBeVisible();
         /** @type {string} */
         const nameAfterRefusal = await page.evaluate(async (id) => {
            /** @type {object[]} */
            const index = await game.packs.get('titan.effects').getIndex();
            return index.find((e) => e._id === id)?.name;
         }, existingEffect.id);
         expect(nameAfterRefusal).toBe(existingEffect.originalName);
      }
      finally {
         await page.evaluate(async () => {
            await game.packs.get('titan.effects').configure({ locked: false });
         });
      }
   });
});
