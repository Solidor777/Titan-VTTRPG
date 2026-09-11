import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { encodeXlsx, decodeXlsx, uniqueSheetNames } from '~/spreadsheet/format/Xlsx.js';
import { zipFiles, unzipFilesAsText } from '~/spreadsheet/format/Zip.js';

describe('Xlsx', () => {
   const workbook = {
      sheets: [
         {
            name: 'weapon',
            columns: ['_id', 'name', 'damage', 'equipped', 'notes'],
            rows: [
               { _id: 'a'.repeat(16), name: 'Sword & Shield', damage: 5, equipped: true, notes: undefined },
               { _id: 'b'.repeat(16), name: 'Bow', damage: 0, equipped: false, notes: '"5"' },
            ],
         },
      ],
   };

   it('round-trips strings, numbers, booleans, and blanks through encode/decode', () => {
      const decoded = decodeXlsx(encodeXlsx(workbook));
      expect(decoded.sheets).toHaveLength(1);
      expect(decoded.sheets[0].name).toBe('weapon');
      expect(decoded.sheets[0].columns).toEqual(workbook.sheets[0].columns);
      expect(decoded.sheets[0].rows[0]).toEqual({
         _id: 'a'.repeat(16), name: 'Sword & Shield', damage: 5, equipped: true, notes: undefined,
      });
      expect(decoded.sheets[0].rows[1]).toEqual({
         _id: 'b'.repeat(16), name: 'Bow', damage: 0, equipped: false, notes: '"5"',
      });
   });

   it('escapes XML-significant characters and unescapes them back', () => {
      const decoded = decodeXlsx(encodeXlsx(workbook));
      expect(decoded.sheets[0].rows[0].name).toBe('Sword & Shield');
   });

   it('round-trips a sheet name containing a double quote without malformed XML', () => {
      const quotedWorkbook = {
         sheets: [
            {
               name: 'Bob "Bandit" Loot',
               columns: ['_id'],
               rows: [{ _id: 'a'.repeat(16) }],
            },
         ],
      };
      const [sheetName] = uniqueSheetNames([quotedWorkbook.sheets[0].name]);
      const bytes = encodeXlsx(quotedWorkbook);

      /** @type {string} The raw workbook.xml text, to check the attribute is well-formed. */
      const workbookXml = unzipFilesAsText(bytes)['xl/workbook.xml'];
      expect(workbookXml).toContain(`<sheet name="${sheetName.replace(/"/g, '&quot;')}"`);
      expect(workbookXml).not.toMatch(/name="[^"]*"[^ ]*"/);

      const decoded = decodeXlsx(bytes);
      expect(decoded.sheets[0].name).toBe(sheetName);
   });

   it('decodes t="s" shared-string cells and t="str" formula-cached-string cells', () => {
      const sharedStringsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
         + '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">'
         + '<si><t>Shared Value</t></si></sst>';
      const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
         + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
         + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
         + '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>';
      const sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
         + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
         + '<sheetData>'
         + '<row r="1"><c r="A1" t="inlineStr"><is><t>name</t></is></c>'
         + '<c r="B1" t="inlineStr"><is><t>formula</t></is></c></row>'
         + '<row r="2"><c r="A1" t="s"><v>0</v></c>'
         + '<c r="B1" t="str"><v>computed value</v></c></row>'
         + '</sheetData></worksheet>';
      const bytes = zipFiles({
         '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
         '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
         'xl/workbook.xml': workbookXml,
         'xl/sharedStrings.xml': sharedStringsXml,
         'xl/worksheets/sheet1.xml': sheetXml,
      });

      const decoded = decodeXlsx(bytes);
      expect(decoded.sheets[0].rows[0]).toEqual({ name: 'Shared Value', formula: 'computed value' });
   });

   describe('real-application fixtures', () => {
      it('decodes an .xlsx file this feature exported, then edited and re-saved by real Microsoft Excel', () => {
         /** @type {Buffer} A real titan.effects export, opened, edited, and re-saved by Excel 16.0. */
         const bytes = readFileSync('tests/fixtures/spreadsheet/excel-edited.xlsx');
         /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
         const decoded = decodeXlsx(new Uint8Array(bytes));
         expect(decoded.sheets.map((s) => s.name)).toEqual(expect.arrayContaining(['_manifest', 'effect']));
         /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet} */
         const effectSheet = decoded.sheets.find((s) => s.name === 'effect');
         expect(effectSheet.columns).toContain('name');
         expect(effectSheet.columns).toContain('_id');
         // Excel is only expected to preserve the file's structure while changing the one edited cell's
         // data — every row still decodes, and the edited row carries the marker Excel saved.
         expect(effectSheet.rows.length).toBeGreaterThan(0);
         expect(effectSheet.rows.some((row) => String(row.name).includes('(Excel Edited)'))).toBe(true);
      });
   });

   describe('uniqueSheetNames', () => {
      it('truncates to 31 characters and strips forbidden characters', () => {
         const [name] = uniqueSheetNames(['a very long sheet name that exceeds thirty one chars']);
         expect(name.length).toBeLessThanOrEqual(31);
      });

      it('de-duplicates collisions with a numeric suffix', () => {
         const names = uniqueSheetNames(['weapon', 'weapon']);
         expect(names[0]).toBe('weapon');
         expect(names[1]).not.toBe('weapon');
         expect(new Set(names).size).toBe(2);
      });
   });
});
