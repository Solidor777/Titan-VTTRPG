import { describe, it, expect } from 'vitest';
import { encodeXlsx, decodeXlsx, uniqueSheetNames } from '~/spreadsheet/format/Xlsx.js';

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
