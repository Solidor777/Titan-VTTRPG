import { describe, it, expect } from 'vitest';
import { buildTables } from '~/spreadsheet/codec/BuildTables.js';

/** A minimal typeSchemas stand-in: no schema-typed fields, so column order falls back to first-seen. */
const NO_SCHEMA = {};

describe('buildTables — wide layout', () => {
   it('builds one sheet per document type with fixed columns first, plus a _manifest sheet', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), name: 'Sword', type: 'weapon', img: 'i.svg', sort: 1, system: { rarity: 'common' } } },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      expect(workbook.sheets[0].name).toBe('_manifest');
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns.slice(0, 7)).toEqual(['_id', '_parentId', '_folder', 'name', 'type', 'img', 'sort']);
      expect(weaponSheet.columns).toContain('system.rarity');
      expect(weaponSheet.rows[0]).toMatchObject({ _id: 'a'.repeat(16), name: 'Sword', 'system.rarity': 'common', _parentId: '', _folder: '' });
   });

   it('expands arrays into indexed dotted columns and unions columns across documents', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { attack: [{ damage: 5 }] } } },
         { documentType: 'weapon', source: { _id: 'b'.repeat(16), system: { attack: [{ damage: 1 }, { damage: 2 }] } } },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).toContain('system.attack.0.damage');
      expect(weaponSheet.columns).toContain('system.attack.1.damage');
      expect(weaponSheet.rows[0]['system.attack.1.damage']).toBeUndefined();
   });

   it('records _parentId and _folder from the envelope', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16) }, parentId: 'b'.repeat(16), folderPath: 'Loot/Rare' },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]._parentId).toBe('b'.repeat(16));
      expect(weaponSheet.rows[0]._folder).toBe('Loot/Rare');
   });

   it('orders non-fixed columns by schema field order, falling back to first-seen for the rest', () => {
      const typeSchemas = { weapon: { fieldTypes: {}, fieldOrder: ['system.value', 'system.rarity'] } };
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { rarity: 'common', value: 5, extra: 'x' } } },
      ];
      const weaponSheet = buildTables(envelopes, 'wide', 'Item', typeSchemas).sheets.find((s) => s.name === 'weapon');
      /** @type {string[]} */
      const rest = weaponSheet.columns.slice(7);
      expect(rest.indexOf('system.value')).toBeLessThan(rest.indexOf('system.rarity'));
      expect(rest).toContain('system.extra');
   });

   it('writes manifest rows naming layout, packType, and one entry per data sheet', () => {
      const envelopes = [{ documentType: 'weapon', source: { _id: 'a'.repeat(16) } }];
      const manifest = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA).sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         { key: 'layout', value: 'wide', documentType: '', arrayPath: '' },
         { key: 'packType', value: 'Item', documentType: '', arrayPath: '' },
         { key: 'sheet', value: 'weapon', documentType: 'weapon', arrayPath: '' },
      ]));
   });
});

describe('buildTables — relational layout', () => {
   it('drops array columns from the document sheet and puts them in a child sheet keyed by _id and _index', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), name: 'Sword', system: { rarity: 'common', attack: [{ label: 'Slash', damage: 5 }, { label: 'Stab', damage: 3 }] } } },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).not.toEqual(expect.arrayContaining(['system.attack.0.label']));
      expect(weaponSheet.columns).toContain('system.rarity');

      /** @type {object} */
      const attackSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack');
      expect(attackSheet.columns).toEqual(['_id', '_index', 'label', 'damage']);
      expect(attackSheet.rows).toEqual([
         { _id: 'a'.repeat(16), _index: '0', label: 'Slash', damage: 5 },
         { _id: 'a'.repeat(16), _index: '1', label: 'Stab', damage: 3 },
      ]);
   });

   it('builds a separate child sheet per nesting level, with a compound dotted _index', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { attack: [{ label: 'Slash', trait: [{ name: 'Reach' }, { name: 'Heavy' }] }] } } },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const attackSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack');
      expect(attackSheet.columns).toEqual(['_id', '_index', 'label']);

      /** @type {object} */
      const traitSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack.trait');
      expect(traitSheet.rows).toEqual([
         { _id: 'a'.repeat(16), _index: '0.0', name: 'Reach' },
         { _id: 'a'.repeat(16), _index: '0.1', name: 'Heavy' },
      ]);
   });

   it('records each child sheet in the manifest with its array path', () => {
      const envelopes = [{ documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { attack: [{ damage: 5 }] } } }];
      /** @type {object} */
      const manifest = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA).sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         { key: 'sheet', value: 'weapon.system.attack', documentType: 'weapon', arrayPath: 'system.attack' },
      ]));
   });
});
