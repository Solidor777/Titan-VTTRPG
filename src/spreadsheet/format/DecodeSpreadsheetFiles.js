import { strFromU8 } from 'fflate';
import { decodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { decodeCsv } from '~/spreadsheet/format/Csv.js';
import { unzipFilesAsBytes } from '~/spreadsheet/format/Zip.js';

/**
 * Derives a sheet name from an archived or uploaded filename by stripping its extension and any
 * directory prefix.
 * @param {string} filename - The archive-relative or uploaded filename.
 * @returns {string} The derived sheet name.
 */
export function sheetNameFromFilename(filename) {
   return filename.split('/').pop().replace(/\.csv$/i, '');
}

/**
 * Decodes one or more named file entries into a single Workbook: a lone `.xlsx`, a lone `.zip` of CSVs
 * (non-`.csv` archive entries ignored), or one-or-more loose `.csv` entries (each becomes one sheet,
 * named after its filename). Pure over already-read bytes, so callers (browser upload, Node file read)
 * only need to adapt their own source into `{ name, bytes }`.
 * @param {Array<{name: string, bytes: Uint8Array}>} entries - The file entries to decode.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The decoded workbook.
 * @throws {Error} When a loose entry's extension isn't `.csv`.
 */
export function decodeSpreadsheetFiles(entries) {
   if (entries.length === 1 && entries[0].name.toLowerCase().endsWith('.xlsx')) {
      return decodeXlsx(entries[0].bytes);
   }
   if (entries.length === 1 && entries[0].name.toLowerCase().endsWith('.zip')) {
      /** @type {Object<string, Uint8Array>} Archive-relative filename -> raw entry bytes. */
      const archiveEntries = unzipFilesAsBytes(entries[0].bytes);
      return {
         sheets: Object.entries(archiveEntries)
            .filter(([name]) => name.toLowerCase().endsWith('.csv'))
            .map(([name, bytes]) => decodeCsv(strFromU8(bytes), sheetNameFromFilename(name))),
      };
   }

   /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet[]} */
   const sheets = [];
   for (const entry of entries) {
      if (!entry.name.toLowerCase().endsWith('.csv')) {
         throw new Error(`Unsupported spreadsheet file: ${entry.name}`);
      }
      sheets.push(decodeCsv(strFromU8(entry.bytes), sheetNameFromFilename(entry.name)));
   }
   return { sheets };
}
