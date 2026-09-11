import { buildTables } from '~/spreadsheet/codec/BuildTables.js';
import { encodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { encodeCsv } from '~/spreadsheet/format/Csv.js';
import { zipFiles } from '~/spreadsheet/format/Zip.js';
import { resolveTypeSchemasForPack } from '~/spreadsheet/io/ResolveTypeSchemas.js';
import { resolveFolderPath } from '~/spreadsheet/io/FolderPath.js';

/**
 * Recursively collects one document and every document embedded in it into flat DocumentEnvelope
 * entries. Each level walks only its own direct `items` and `effects` collections; the recursive call
 * covers everything below it, so an owned item's effects are collected exactly once — by the item's own
 * recursion, not by the owner's.
 * @param {Actor|Item|ActiveEffect} document - The document to collect.
 * @param {string|null} parentId - The owning document's id, or null for a top-level document.
 * @param {import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope[]} envelopes - Accumulator (mutated).
 */
function collectEnvelope(document, parentId, envelopes) {
   envelopes.push({
      documentType: document.type,
      source: document.toObject(),
      parentId: parentId ?? undefined,
      folderPath: parentId ? undefined : resolveFolderPath(document.folder),
   });
   for (const item of document.items ?? []) {
      collectEnvelope(item, document.id, envelopes);
   }
   for (const effect of document.effects ?? []) {
      collectEnvelope(effect, document.id, envelopes);
   }
}

/**
 * Replaces characters unsafe in a filename.
 * @param {string} text - The raw text.
 * @returns {string} The filesystem-safe text.
 */
function safeFilename(text) {
   return text.replace(/[\\/:*?"<>|]/g, '_');
}

/**
 * Exports every document in a compendium pack (including embedded items and effects) to a spreadsheet
 * file and triggers a browser download.
 * @param {CompendiumCollection} pack - The pack to export.
 * @param {'xlsx'|'csv'} format - The file format.
 * @param {'wide'|'relational'} layout - The array layout.
 * @returns {Promise<void>} Resolves once the download has been triggered.
 */
export async function exportCompendium(pack, format, layout) {
   /** @type {Array<Actor|Item|ActiveEffect>} */
   const documents = await pack.getDocuments();
   /** @type {import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope[]} */
   const envelopes = [];
   for (const document of documents) {
      collectEnvelope(document, null, envelopes);
   }

   /** @type {object} Per-subtype schema info (own type plus everything it can embed), for column ordering. */
   const typeSchemas = resolveTypeSchemasForPack(pack.metadata.type);
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
   const workbook = buildTables(envelopes, layout, pack.metadata.type, typeSchemas);
   /** @type {string} */
   const label = safeFilename(pack.metadata.label);

   if (format === 'xlsx') {
      foundry.utils.saveDataToFile(encodeXlsx(workbook), 'application/octet-stream', `${label}.xlsx`);
      return;
   }
   if (workbook.sheets.length === 1) {
      foundry.utils.saveDataToFile(encodeCsv(workbook.sheets[0]), 'text/csv', `${label}.csv`);
      return;
   }
   /** @type {Object<string, string>} One CSV file per sheet, keyed by filename. */
   const files = {};
   for (const sheet of workbook.sheets) {
      files[`${safeFilename(sheet.name)}.csv`] = encodeCsv(sheet);
   }
   foundry.utils.saveDataToFile(zipFiles(files), 'application/zip', `${label}.zip`);
}
