import { describe, it, expect } from 'vitest';
import { buildTables } from '~/spreadsheet/codec/BuildTables.js';
import { readTables } from '~/spreadsheet/codec/ReadTables.js';

/** A minimal typeSchemas stand-in: no schema-typed fields, so decoding falls back to literal rules. */
const NO_SCHEMA = {};

describe('readTables — wide layout', () => {
   it('round-trips a wide-layout workbook back into document envelopes', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), name: 'Sword', type: 'weapon', img: 'i.svg', sort: 1, system: { rarity: 'common', attack: [{ label: 'Slash', damage: 5 }] } },
            parentId: '',
            folderPath: 'Loot',
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.layout).toBe('wide');
      expect(result.packType).toBe('Item');
      expect(result.envelopes).toHaveLength(1);
      expect(result.envelopes[0]).toMatchObject({
         documentType: 'weapon',
         parentId: '',
         folderPath: 'Loot',
         source: {
            _id: 'a'.repeat(16), name: 'Sword', type: 'weapon', img: 'i.svg', sort: 1,
            system: { rarity: 'common', attack: [{ label: 'Slash', damage: 5 }] },
         },
      });
   });

   it('falls back to first-seen-type-per-sheet when no _manifest sheet is present', () => {
      const handMade = {
         sheets: [
            { name: 'weapon', columns: ['_id', 'name'], rows: [{ _id: 'a'.repeat(16), name: 'Axe' }] },
         ],
      };
      const result = readTables(handMade, NO_SCHEMA);
      expect(result.envelopes[0]).toMatchObject({ documentType: 'weapon', source: { _id: 'a'.repeat(16), name: 'Axe' } });
   });
});

describe('readTables — relational layout', () => {
   it('round-trips a relational-layout workbook, merging child-sheet rows back into their parent', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { attack: [{ label: 'Slash', trait: [{ name: 'Reach' }, { name: 'Heavy' }] }, { label: 'Stab' }] } },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.layout).toBe('relational');
      expect(result.envelopes[0].source.system.attack).toEqual([
         { label: 'Slash', trait: [{ name: 'Reach' }, { name: 'Heavy' }] },
         { label: 'Stab' },
      ]);
   });

   it('round-trips a primitive array (reserved "_value" sub-field) back into a bare-value array', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { statuses: ['prone'] } },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.envelopes[0].source.system.statuses).toEqual(['prone']);
   });
});
