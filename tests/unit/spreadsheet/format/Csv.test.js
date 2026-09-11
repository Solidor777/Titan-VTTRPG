import { describe, it, expect } from 'vitest';
import { encodeCsv, decodeCsv } from '~/spreadsheet/format/Csv.js';

describe('Csv', () => {
   const sheet = {
      name: 'weapon',
      columns: [
         '_id',
         'name',
         'description'
      ],
      rows: [
         {
            _id: 'a'.repeat(16),
            name: 'Sword',
            description: 'A "sharp", multi\nline blade.' 
         },
         {
            _id: 'b'.repeat(16),
            name: 'Bow',
            description: '' 
         },
      ],
   };

   it('encodes with a BOM, CRLF, and RFC 4180 quoting for commas/quotes/newlines', () => {
      const text = encodeCsv(sheet);
      expect(text.startsWith('﻿')).toBe(true);
      expect(text).toContain('\r\n');
      expect(text).toContain('"A ""sharp"", multi\nline blade."');
   });

   it('round-trips through decodeCsv, preserving blank cells as empty strings', () => {
      const decoded = decodeCsv(encodeCsv(sheet), 'weapon');
      expect(decoded).toEqual({
         name: 'weapon',
         columns: sheet.columns,
         rows: [
            {
               _id: 'a'.repeat(16),
               name: 'Sword',
               description: 'A "sharp", multi\nline blade.' 
            },
            {
               _id: 'b'.repeat(16),
               name: 'Bow',
               description: '' 
            },
         ],
      });
   });

   it('strips a leading byte-order mark on decode', () => {
      const decoded = decodeCsv('﻿a,b\r\n1,2\r\n', 'x');
      expect(decoded.rows).toEqual([{
         a: '1',
         b: '2' 
      }]);
   });
});
