import { describe, it, expect } from 'vitest';
import { workbookToDocuments } from '~/spreadsheet/markdown/WorkbookToDocuments.js';
import { buildTables } from '~/spreadsheet/codec/BuildTables.js';
import { encodeXlsx, decodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { encodeCsv, decodeCsv } from '~/spreadsheet/format/Csv.js';
import { zipFiles } from '~/spreadsheet/format/Zip.js';

/** No schema-typed fields; column order falls back to first-seen and cells stay literally typed. */
const NO_SCHEMA = {};

/**
 * Builds the hand-made envelope set for the shared fixture: a weapon, an armor, a spell inside
 * `Magic/Fire`, and an effect embedded on the weapon.
 * @returns {object[]} The document envelopes.
 */
function fixtureEnvelopes() {
   return [
      {
         documentType: 'weapon',
         source: {
            _id: 'a'.repeat(16),
            name: 'Sword',
            type: 'weapon',
            img: 'i.svg',
            sort: 1,
            system: { rarity: 'common' },
         },
         parentId: '',
         folderPath: '',
      },
      {
         documentType: 'effect',
         source: { _id: 'e'.repeat(16), name: 'Sharp', type: 'effect', img: 'i.svg', sort: 1, system: {} },
         parentId: 'a'.repeat(16),
         folderPath: '',
      },
      {
         documentType: 'armor',
         source: {
            _id: 'b'.repeat(16),
            name: 'Plate',
            type: 'armor',
            img: 'i.svg',
            sort: 1,
            system: { rarity: 'common' },
         },
         parentId: '',
         folderPath: '',
      },
      {
         documentType: 'spell',
         source: {
            _id: 'c'.repeat(16),
            name: 'Fireball',
            type: 'spell',
            img: 'i.svg',
            sort: 1,
            system: { tradition: 'evocation' },
         },
         parentId: '',
         folderPath: 'Magic/Fire',
      },
   ];
}

/**
 * Asserts the three top-level renderable documents from the shared fixture, independent of layout.
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument[]} documents - The
 *    decoded documents.
 */
function assertFixtureDocuments(documents) {
   expect(documents).toHaveLength(3);
   expect(documents.find((d) => d.type === 'weapon')).toMatchObject({ name: 'Sword', folderPath: [] });
   expect(documents.find((d) => d.type === 'armor')).toMatchObject({ name: 'Plate', folderPath: [] });
   /** @type {object} */
   const spell = documents.find((d) => d.type === 'spell');
   expect(spell).toMatchObject({ name: 'Fireball', folderPath: ['Magic', 'Fire'] });
   expect(spell.system.tradition).toBe('evocation');
   expect(documents.some((d) => d.name === 'Sharp')).toBe(false);
}

describe('workbookToDocuments', () => {
   it('extracts top-level Item documents from a wide-layout xlsx workbook, dropping embedded rows', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(fixtureEnvelopes(), 'wide', 'Item', NO_SCHEMA);
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const decoded = decodeXlsx(encodeXlsx(built));

      assertFixtureDocuments(workbookToDocuments(decoded));
   });

   it('extracts top-level Item documents from a relational-layout xlsx workbook', () => {
      /** @type {object[]} Same fixture, but the weapon carries a nested array to exercise a child sheet. */
      const envelopes = fixtureEnvelopes().map((envelope) => (
         envelope.documentType === 'weapon'
            ? {
               ...envelope,
               source: {
                  ...envelope.source,
                  system: { rarity: 'common', attack: [{ damage: 5 }, { damage: 3 }] },
               },
            }
            : envelope
      ));
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const decoded = decodeXlsx(encodeXlsx(built));

      assertFixtureDocuments(workbookToDocuments(decoded));
   });

   it('extracts top-level Item documents from a zip-of-CSV workbook', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(fixtureEnvelopes(), 'wide', 'Item', NO_SCHEMA);
      /** @type {Object<string, string>} */
      const csvFiles = Object.fromEntries(built.sheets.map((sheet) => [`${sheet.name}.csv`, encodeCsv(sheet)]));
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const decoded = {
         sheets: Object.entries(csvFiles).map(([name, text]) => decodeCsv(text, name.replace(/\.csv$/, ''))),
      };

      assertFixtureDocuments(workbookToDocuments(decoded));
   });

   it('refuses an Actor pack export', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(
         [{
            documentType: 'npc',
            source: { _id: 'a'.repeat(16), name: 'Goblin', type: 'npc', system: {} },
            parentId: '',
            folderPath: '',
         }],
         'wide',
         'Actor',
         NO_SCHEMA,
      );

      expect(() => workbookToDocuments(built)).toThrow(
         'Only Item compendium exports can be rendered as Markdown (this file is an Actor export)',
      );
   });

   it('refuses an ActiveEffect pack export', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(
         [{
            documentType: 'effect',
            source: { _id: 'a'.repeat(16), name: 'Blessed', type: 'effect', system: {} },
            parentId: '',
            folderPath: '',
         }],
         'wide',
         'ActiveEffect',
         NO_SCHEMA,
      );

      expect(() => workbookToDocuments(built)).toThrow(
         'Only Item compendium exports can be rendered as Markdown (this file is an ActiveEffect export)',
      );
   });

   it('accepts a manifest-less workbook whose sheets are all named after Item types', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const workbook = {
         sheets: [
            { name: 'weapon', columns: ['_id', 'name'], rows: [{ _id: 'a'.repeat(16), name: 'Sword' }] },
         ],
      };

      /** @type {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument[]} */
      const documents = workbookToDocuments(workbook);

      expect(documents).toEqual([{ type: 'weapon', name: 'Sword', folderPath: [], system: undefined }]);
   });

   it('unescapes folder segments through the shared codec escaping, including backslashes', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} Two-segment path: `A\B` then `C/D`. */
      const workbook = {
         sheets: [
            {
               name: 'weapon',
               columns: ['_id', 'name', '_folder'],
               rows: [{ _id: 'a'.repeat(16), name: 'Sword', _folder: 'A\\\\B/C\\/D' }],
            },
         ],
      };

      /** @type {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument[]} */
      const documents = workbookToDocuments(workbook);

      expect(documents[0].folderPath).toEqual(['A\\B', 'C/D']);
   });

   it('refuses a manifest-less workbook with a sheet not named after an Item type', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const workbook = {
         sheets: [
            { name: 'goblin', columns: ['_id', 'name'], rows: [{ _id: 'a'.repeat(16), name: 'Goblin' }] },
         ],
      };

      expect(() => workbookToDocuments(workbook)).toThrow(
         'Only Item compendium exports can be rendered as Markdown (unknown sheet type: goblin)',
      );
   });
});
