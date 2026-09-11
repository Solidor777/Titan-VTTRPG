import { describe, it, expect } from 'vitest';
import { buildTables, buildArrayPathMatcher, detectArrayPaths } from '~/spreadsheet/codec/BuildTables.js';
import { encodeXlsx, decodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { encodeCsv, decodeCsv } from '~/spreadsheet/format/Csv.js';
import { readTables } from '~/spreadsheet/codec/ReadTables.js';

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

   it('puts a primitive array element value under the reserved "_value" sub-field, not a wide column', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { statuses: ['prone', 'stunned'] } } },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).not.toEqual(expect.arrayContaining(['system.statuses.0']));

      /** @type {object} */
      const statusesSheet = workbook.sheets.find((s) => s.name === 'weapon.system.statuses');
      expect(statusesSheet.columns).toEqual(['_id', '_index', '_value']);
      expect(statusesSheet.rows).toEqual([
         { _id: 'a'.repeat(16), _index: '0', _value: 'prone' },
         { _id: 'a'.repeat(16), _index: '1', _value: 'stunned' },
      ]);

      /** @type {object} */
      const manifest = workbook.sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         { key: 'sheet', value: 'weapon.system.statuses', documentType: 'weapon', arrayPath: 'system.statuses' },
      ]));
   });

   it('truncates/de-duplicates long sheet names once, keeping the manifest in agreement, and round-trips '
      + 'through encodeXlsx/decodeXlsx', () => {
      /** @type {string} A 33-character document type whose own sheet name already exceeds 31 characters. */
      const documentType = 'averyveryverylongdocumenttypename';
      const envelopes = [
         {
            documentType,
            source: { _id: 'a'.repeat(16), name: 'Longname', system: { somethingreallylong: ['one', 'two'] } },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);

      /** @type {string[]} Every non-manifest sheet's final name. */
      const dataSheetNames = workbook.sheets.filter((s) => s.name !== '_manifest').map((s) => s.name);
      expect(dataSheetNames.every((name) => name.length <= 31)).toBe(true);
      expect(new Set(dataSheetNames).size).toBe(dataSheetNames.length);

      /** @type {object} */
      const manifest = workbook.sheets.find((s) => s.name === '_manifest');
      /** @type {string[]} The manifest's recorded 'sheet' row values. */
      const manifestSheetNames = manifest.rows.filter((r) => r.key === 'sheet').map((r) => r.value);
      expect([...manifestSheetNames].sort()).toEqual([...dataSheetNames].sort());

      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} The workbook after an XLSX round trip. */
      const decoded = decodeXlsx(encodeXlsx(workbook));
      /** @type {{envelopes: Array<object>}} */
      const { envelopes: readEnvelopes } = readTables(decoded, NO_SCHEMA);
      expect(readEnvelopes).toHaveLength(1);
      expect(readEnvelopes[0].documentType).toBe(documentType);
      expect(readEnvelopes[0].source.system.somethingreallylong).toEqual(['one', 'two']);
   });
});

describe('buildTables — untyped-bag string protection', () => {
   it('protects a number-like untyped-bag string through a wide-layout XLSX round trip', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { rulesElement: [{ name: 'code', value: '5' }] } },
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const decoded = decodeXlsx(encodeXlsx(workbook));
      /** @type {{envelopes: Array<object>}} */
      const { envelopes: readEnvelopes } = readTables(decoded, NO_SCHEMA);
      expect(readEnvelopes[0].source.system.rulesElement[0].value).toBe('5');
   });

   it('protects a number-like untyped-bag string through a relational-layout CSV round trip', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { rulesElement: [{ name: 'code', value: '5' }] } },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} Every sheet round-tripped through CSV text. */
      const roundTripped = { sheets: workbook.sheets.map((sheet) => decodeCsv(encodeCsv(sheet), sheet.name)) };
      /** @type {{envelopes: Array<object>}} */
      const { envelopes: readEnvelopes } = readTables(roundTripped, NO_SCHEMA);
      expect(readEnvelopes[0].source.system.rulesElement[0].value).toBe('5');
   });

   it('leaves a schema-typed number field untouched (no quoting)', () => {
      const typeSchemas = {
         weapon: { fieldTypes: { 'system.value': { type: 'number', nullable: false } }, fieldOrder: [] },
      };
      const envelopes = [{ documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { value: 5 } } }];
      const weaponSheet = buildTables(envelopes, 'wide', 'Item', typeSchemas).sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]['system.value']).toBe(5);
   });

   it('leaves a plain untyped-bag string untouched (no quoting)', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { rulesElement: [{ name: 'code', value: 'Slashing' }] } },
         },
      ];
      const weaponSheet = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA).sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]['system.rulesElement.0.value']).toBe('Slashing');
   });

   it('round-trips an already-quoted untyped-bag string', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { rulesElement: [{ name: 'code', value: '"x"' }] } },
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]['system.rulesElement.0.value']).toBe('""x""');
      /** @type {{envelopes: Array<object>}} */
      const { envelopes: readEnvelopes } = readTables(workbook, NO_SCHEMA);
      expect(readEnvelopes[0].source.system.rulesElement[0].value).toBe('"x"');
   });

   it('leaves an untyped-bag field holding an empty string blank (not a quoted "") and drops it as ABSENT', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { rulesElement: [{ name: 'code', value: '' }] } },
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]['system.rulesElement.0.value']).toBe('');
      /** @type {{envelopes: Array<object>}} */
      const { envelopes: readEnvelopes } = readTables(workbook, NO_SCHEMA);
      expect(readEnvelopes[0].source.system.rulesElement[0].value).toBeUndefined();
   });
});

describe('buildArrayPathMatcher', () => {
   it('matches a primitive array element path with the reserved "_value" sub-field', () => {
      const matcher = buildArrayPathMatcher('statuses', ['statuses']);
      expect(matcher('statuses.0')).toEqual({ index: '0', subField: '_value' });
   });

   it('only matches paths under its own array when two arrays are siblings, not nested', () => {
      const allArrayPaths = ['attack', 'trait'];
      const attackMatcher = buildArrayPathMatcher('attack', allArrayPaths);
      const traitMatcher = buildArrayPathMatcher('trait', allArrayPaths);

      expect(attackMatcher('attack.0.damage')).toEqual({ index: '0', subField: 'damage' });
      expect(attackMatcher('trait.0.name')).toBeNull();
      expect(traitMatcher('trait.0.name')).toEqual({ index: '0', subField: 'name' });
      expect(traitMatcher('attack.0.damage')).toBeNull();
   });
});

describe('detectArrayPaths', () => {
   it('returns both a shallow and a nested array path, ordered outermost-first', () => {
      expect(detectArrayPaths(['a.b.0.c.1.d'])).toEqual(['a.b', 'a.b.c']);
   });
});

describe('buildTables — relational guards', () => {
   it('throws when a primitive array is nested directly inside another primitive array', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { matrix: [[1, 2], [3, 4]] } } },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow(
         'Unsupported field shape: a primitive array nested directly inside a primitive array at "system.matrix.0.0"',
      );
   });

   it('throws when an array-of-objects field has a sub-field named "_id"', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { trait: [{ _id: 'x', name: 'Reach' }] } } },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow(
         'Reserved column name "_id" used by a field under "system.trait"',
      );
   });

   it('throws when an array-of-objects field has a sub-field named "_index"', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { trait: [{ _index: 0, name: 'Reach' }] } } },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow(
         'Reserved column name "_index" used by a field under "system.trait"',
      );
   });

   it('does not throw for any real TITAN shape (one representative envelope per shape template)', () => {
      /** @type {object[]} One representative envelope per item/actor-item/effect shape template. */
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
                  description: '',
                  check: [],
                  customTrait: [{ name: 'Custom', description: 'x', uuid: 'u1' }],
                  rulesElement: [{ name: 'code', value: 'v' }],
                  rarity: 'common',
                  value: 0,
                  equipped: false,
                  attackNotes: '',
                  trait: [{ name: 'Reach' }],
                  attack: [
                     {
                        label: 'Slash',
                        type: 'melee',
                        range: 1,
                        attribute: 'body',
                        skill: 'meleeWeapons',
                        damage: 5,
                        plusExtraSuccessDamage: true,
                        trait: [{ name: 'Heavy' }],
                        customTrait: [{ name: 'Custom Trait', description: 'y', uuid: 'u2' }],
                        uuid: 'u3',
                     },
                  ],
               },
            },
         },
         {
            documentType: 'armor',
            source: {
               _id: 'b'.repeat(16),
               name: 'Plate',
               type: 'armor',
               img: 'i.svg',
               sort: 1,
               system: {
                  description: '',
                  check: [],
                  customTrait: [{ name: 'Custom', description: 'x', uuid: 'u4' }],
                  rulesElement: [{ name: 'code', value: 'v' }],
                  rarity: 'common',
                  value: 0,
                  armor: { max: 1, value: 1 },
                  trait: [{ name: 'Reach' }],
               },
            },
         },
         {
            documentType: 'shield',
            source: {
               _id: 'c'.repeat(16),
               name: 'Buckler',
               type: 'shield',
               img: 'i.svg',
               sort: 1,
               system: {
                  description: '',
                  check: [],
                  customTrait: [{ name: 'Custom', description: 'x', uuid: 'u5' }],
                  rulesElement: [{ name: 'code', value: 'v' }],
                  rarity: 'common',
                  value: 0,
                  defense: 0,
                  trait: [{ name: 'Reach' }],
               },
            },
         },
         {
            documentType: 'ability',
            source: {
               _id: 'd'.repeat(16),
               name: 'Feat of Strength',
               type: 'ability',
               img: 'i.svg',
               sort: 1,
               system: {
                  description: '',
                  check: [],
                  customTrait: [{ name: 'Custom', description: 'x', uuid: 'u6' }],
                  rulesElement: [{ name: 'code', value: 'v' }],
                  xpCost: 1,
                  rarity: 'common',
                  action: false,
                  reaction: false,
                  passive: false,
               },
            },
         },
         {
            documentType: 'spell',
            source: {
               _id: 'e'.repeat(16),
               name: 'Fireball',
               type: 'spell',
               img: 'i.svg',
               sort: 1,
               system: {
                  description: '',
                  check: [],
                  customTrait: [{ name: 'Custom', description: 'x', uuid: 'u7' }],
                  rarity: 'common',
                  xpCost: 1,
                  tradition: '',
                  castingCheck: {
                     attribute: 'mind',
                     skill: 'arcana',
                     difficulty: 4,
                     complexity: 1,
                     autoCalculateDC: true,
                  },
                  quantity: 1,
                  aspect: [{ name: 'Damage', value: 'v', option: ['ignoreArmor', 'penetrating'] }],
                  customAspect: [{ name: 'Custom Aspect', description: 'z', uuid: 'u8' }],
               },
            },
         },
         {
            documentType: 'equipment',
            source: {
               _id: 'f'.repeat(16),
               name: 'Rope',
               type: 'equipment',
               img: 'i.svg',
               sort: 1,
               system: {
                  description: '',
                  check: [],
                  customTrait: [{ name: 'Custom', description: 'x', uuid: 'u9' }],
                  rulesElement: [{ name: 'code', value: 'v' }],
                  rarity: 'common',
                  value: 0,
                  equipped: false,
               },
            },
         },
         {
            documentType: 'commodity',
            source: {
               _id: 'g'.repeat(16),
               name: 'Gold',
               type: 'commodity',
               img: 'i.svg',
               sort: 1,
               system: {
                  description: '',
                  check: [],
                  customTrait: [],
                  rarity: 'common',
                  value: 0,
                  quantity: 1,
               },
            },
         },
         {
            documentType: 'effect',
            source: {
               _id: 'h'.repeat(16),
               name: 'Burning',
               type: 'effect',
               img: 'i.svg',
               sort: 1,
               system: {
                  duration: { type: 'turnStart', remaining: 1, initiative: 1, custom: '' },
                  check: [{ name: 'Check', attribute: 'body' }],
                  customTrait: [{ name: 'Custom', description: 'x', uuid: 'u10' }],
               },
            },
         },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).not.toThrow();
   });

   it('does not throw in wide layout for a shape that throws in relational layout, and yields a flat column', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { matrix: [[1, 2], [3, 4]] } } },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow();
      /** @type {object} */
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).toContain('system.matrix.0.1');
   });
});
