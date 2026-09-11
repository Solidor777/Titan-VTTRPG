import { describe, it, expect } from 'vitest';
import { strToU8 } from 'fflate';
import { decodeSpreadsheetFiles, sheetNameFromFilename } from '~/spreadsheet/format/DecodeSpreadsheetFiles.js';
import { encodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { zipFiles } from '~/spreadsheet/format/Zip.js';

describe('sheetNameFromFilename', () => {
   it('strips the .csv extension and any directory prefix', () => {
      expect(sheetNameFromFilename('weapon.csv')).toBe('weapon');
      expect(sheetNameFromFilename('sheets/weapon.csv')).toBe('weapon');
   });
});

describe('decodeSpreadsheetFiles', () => {
   it('decodes a single .xlsx entry', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const workbook = {
         sheets: [{
            name: 'weapon',
            columns: [
               '_id',
               'name',
            ],
            rows: [{
               _id: 'a',
               name: 'Sword',
            }],
         }],
      };
      /** @type {Uint8Array} */
      const bytes = encodeXlsx(workbook);

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const decoded = decodeSpreadsheetFiles([{
         name: 'export.xlsx',
         bytes,
      }]);

      expect(decoded.sheets.map((s) => s.name)).toEqual(['weapon']);
      expect(decoded.sheets[0].rows[0]).toMatchObject({
         _id: 'a',
         name: 'Sword',
      });
   });

   it('decodes every .csv entry inside a single .zip, ignoring non-csv entries', () => {
      /** @type {string} */
      const weaponCsv = '﻿_id,name\r\na,Sword\r\n';
      /** @type {string} */
      const armorCsv = '﻿_id,name\r\nb,Plate\r\n';
      /** @type {Uint8Array} */
      const bytes = zipFiles({
         'weapon.csv': weaponCsv,
         'armor.csv': armorCsv,
         'readme.txt': 'not a sheet',
      });

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const decoded = decodeSpreadsheetFiles([{
         name: 'export.zip',
         bytes,
      }]);

      expect(decoded.sheets.map((s) => s.name).sort()).toEqual([
         'armor',
         'weapon',
      ]);
   });

   it('decodes one or more loose .csv entries, one sheet per entry named after its filename', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const decoded = decodeSpreadsheetFiles([
         {
            name: 'weapon.csv',
            bytes: strToU8('﻿_id,name\r\na,Sword\r\n'),
         },
         {
            name: 'armor.csv',
            bytes: strToU8('﻿_id,name\r\nb,Plate\r\n'),
         },
      ]);

      expect(decoded.sheets.map((s) => s.name)).toEqual([
         'weapon',
         'armor',
      ]);
      expect(decoded.sheets[0].rows[0]).toMatchObject({
         _id: 'a',
         name: 'Sword',
      });
   });

   it('throws on an unsupported file extension among loose entries', () => {
      expect(() => decodeSpreadsheetFiles([{
         name: 'notes.txt',
         bytes: strToU8('hello'),
      }]))
         .toThrow('Unsupported spreadsheet file: notes.txt');
   });
});
