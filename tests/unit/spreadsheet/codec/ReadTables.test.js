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
            source: {
               _id: 'a'.repeat(16),
               name: 'Sword',
               type: 'weapon',
               img: 'i.svg',
               sort: 1,
               system: {
                  rarity: 'common',
                  attack: [{
                     label: 'Slash',
                     damage: 5,
                  }],
               },
            },
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
            _id: 'a'.repeat(16),
            name: 'Sword',
            type: 'weapon',
            img: 'i.svg',
            sort: 1,
            system: {
               rarity: 'common',
               attack: [{
                  label: 'Slash',
                  damage: 5,
               }],
            },
         },
      });
   });

   it('falls back to first-seen-type-per-sheet when no _manifest sheet is present', () => {
      const handMade = {
         sheets: [
            {
               name: 'weapon',
               columns: [
                  '_id',
                  'name',
               ],
               rows: [{
                  _id: 'a'.repeat(16),
                  name: 'Axe',
               }],
            },
         ],
      };
      const result = readTables(handMade, NO_SCHEMA);
      expect(result.envelopes[0]).toMatchObject({
         documentType: 'weapon',
         source: {
            _id: 'a'.repeat(16),
            name: 'Axe',
         },
      });
   });

   it('reports folderPath as undefined when the sheet has no _folder column, distinct from a blank cell', () => {
      /** @type {{sheets: object[]}} A hand-trimmed file: no _folder column at all. */
      const noFolderColumn = {
         sheets: [
            {
               name: 'weapon',
               columns: [
                  '_id',
                  'name',
               ],
               rows: [{
                  _id: 'a'.repeat(16),
                  name: 'Axe',
               }],
            },
         ],
      };
      expect(readTables(noFolderColumn, NO_SCHEMA).envelopes[0].folderPath).toBeUndefined();

      /** @type {{sheets: object[]}} The column is present but this row's cell is blank (pack root). */
      const blankFolderCell = {
         sheets: [
            {
               name: 'weapon',
               columns: [
                  '_id',
                  'name',
                  '_folder',
               ],
               rows: [{
                  _id: 'a'.repeat(16),
                  name: 'Axe',
                  _folder: '',
               }],
            },
         ],
      };
      expect(readTables(blankFolderCell, NO_SCHEMA).envelopes[0].folderPath).toBe('');
   });
});

describe('readTables — relational layout', () => {
   it('round-trips a relational-layout workbook, merging child-sheet rows back into their parent', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  attack: [
                     {
                        label: 'Slash',
                        trait: [
                           { name: 'Reach' },
                           { name: 'Heavy' },
                        ],
                     },
                     { label: 'Stab' },
                  ],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.layout).toBe('relational');
      expect(result.envelopes[0].source.system.attack).toEqual([
         {
            label: 'Slash',
            trait: [
               { name: 'Reach' },
               { name: 'Heavy' },
            ],
         },
         { label: 'Stab' },
      ]);
   });

   it('round-trips a primitive array (reserved "_value" sub-field) back into a bare-value array', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: { statuses: ['prone'] },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.envelopes[0].source.system.statuses).toEqual(['prone']);
   });

   it('decodes a blank schema-typed array-element cell to "" in relational layout, matching wide (not ABSENT)', () => {
      /** A synthetic per-type schema: "label" is a non-nullable string on each "attack" array element. */
      const typeSchemas = {
         weapon: {
            fieldTypes: {
               'system.attack.*.label': {
                  type: 'string',
                  nullable: false,
               },
            },
            fieldOrder: [],
         },
      };
      // Two documents so the "label" column exists in both layouts' sheets (seen on the first document)
      // while the second document's own attack element leaves it blank (a genuine blank cell, not a
      // simply-absent column).
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  attack: [{
                     label: 'Slash',
                     damage: 5,
                  }],
               },
            },
         },
         {
            documentType: 'weapon',
            source: {
               _id: 'b'.repeat(16),
               system: { attack: [{ damage: 3 }] },
            },
         },
      ];

      const wideResult = readTables(buildTables(envelopes, 'wide', 'Item', typeSchemas), typeSchemas);
      const wideBlank = wideResult.envelopes.find((e) => e.source._id === 'b'.repeat(16));
      expect(wideBlank.source.system.attack[0].label).toBe('');

      const relationalResult = readTables(buildTables(envelopes, 'relational', 'Item', typeSchemas), typeSchemas);
      const relationalBlank = relationalResult.envelopes.find((e) => e.source._id === 'b'.repeat(16));
      expect(relationalBlank.source.system.attack[0].label).toBe('');
   });

   it('rejects two blank-_id rows on a document sheet that has a relational child sheet', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: '',
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: 'a',
                  }],
               },
            },
         },
         {
            documentType: 'weapon',
            source: {
               _id: '',
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: 'b',
                  }],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      expect(() => readTables(workbook, NO_SCHEMA)).toThrow(
         'weapon: rows 2 and 3 both have a blank _id; give each new document a file-local key ' +
         '(e.g. "new-goblin") so its relational rows can be matched',
      );
   });

   it('still imports two blank-_id rows in wide layout (no relational child sheets to collide)', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: '',
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: 'a',
                  }],
               },
            },
         },
         {
            documentType: 'weapon',
            source: {
               _id: '',
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: 'b',
                  }],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.envelopes).toHaveLength(2);
   });

   it('still imports two blank-_id rows in relational layout for a document type with no child sheets', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: '',
               system: { rarity: 'common' },
            },
         },
         {
            documentType: 'weapon',
            source: {
               _id: '',
               system: { rarity: 'rare' },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.envelopes).toHaveLength(2);
   });

   it('still imports a single blank-_id row in relational layout', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: '',
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: 'a',
                  }],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.envelopes).toHaveLength(1);
      expect(result.envelopes[0].source.system.rulesElement[0].value).toBe('a');
   });
});
