import { readTables } from '~/spreadsheet/codec/ReadTables.js';
import { splitFolderPath } from '~/spreadsheet/io/FolderPath.js';
import { TYPE_ORDER } from '~/spreadsheet/markdown/Labels.js';

/**
 * @typedef {object} RenderableDocument
 * @property {string} type - The Item subtype (e.g. "weapon", "spell").
 * @property {string} name - The document's name.
 * @property {string[]} folderPath - Unescaped folder segments from the pack root; empty for the pack root.
 * @property {object} system - The document's `system` data.
 */

/** @type {Set<string>} The Item subtypes eligible for Markdown rendering. */
const ITEM_TYPES = new Set(TYPE_ORDER);

/**
 * Unescapes a folder path segment (`\/` -> `/`) as split out by {@link splitFolderPath}.
 * @param {string} segment - An escaped folder segment.
 * @returns {string} The unescaped segment.
 */
function unescapeSegment(segment) {
   return segment.replace(/\\\//g, '/');
}

/**
 * Extracts every renderable Item document from a decoded spreadsheet workbook: top-level (non-embedded)
 * rows whose document type is one of the seven Item subtypes. Refuses an Actor or ActiveEffect pack
 * export, and refuses a manifest-less workbook whose sheet names aren't all Item subtypes.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The decoded workbook.
 * @returns {RenderableDocument[]} The renderable documents, in read order.
 * @throws {Error} When the workbook is an Actor/ActiveEffect pack export, or a manifest-less workbook
 *    has a sheet not named after an Item type.
 */
export function workbookToDocuments(workbook) {
   /** @type {{packType: string, envelopes: Array<object>}} */
   const { packType, envelopes } = readTables(workbook, {});

   if (packType === 'Actor' || packType === 'ActiveEffect') {
      throw new Error(`Only Item compendium exports can be rendered as Markdown (this file is an ${packType} export)`);
   }

   if (!packType) {
      // Manifest-less: readTables' fallback names each data sheet's document type after the sheet
      // itself, so every sheet (even an empty one) must be checked directly, not just present rows.
      /** @type {string|undefined} The first sheet name that isn't an Item subtype. */
      const unknownSheet = workbook.sheets.map((s) => s.name).find((name) => !ITEM_TYPES.has(name));
      if (unknownSheet !== undefined) {
         throw new Error(`Only Item compendium exports can be rendered as Markdown (unknown sheet type: ${unknownSheet})`);
      }
   }

   return envelopes
      .filter((envelope) => !envelope.parentId && ITEM_TYPES.has(envelope.documentType))
      .map((envelope) => ({
         type: envelope.documentType,
         name: envelope.source.name,
         folderPath: envelope.folderPath ? splitFolderPath(envelope.folderPath).map(unescapeSegment) : [],
         system: envelope.source.system,
      }));
}
