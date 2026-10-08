import { describe, it, expect } from 'vitest';
import { buildTables, buildArrayPathMatcher, detectArrayPaths } from '~/spreadsheet/codec/BuildTables.js';
import { encodeXlsx, decodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { encodeCsv, decodeCsv } from '~/spreadsheet/format/Csv.js';
import { readTables } from '~/spreadsheet/codec/ReadTables.js';
import createWeaponSystemTemplate from '~/document/types/item/types/weapon/WeaponSystemTemplate.js';
import createArmorSystemTemplate from '~/document/types/item/types/armor/ArmorSystemTemplate.js';
import createShieldSystemTemplate from '~/document/types/item/types/shield/ShieldSystemTemplate.js';
import createAbilitySystemTemplate from '~/document/types/item/types/ability/AbilitySystemTemplate.js';
import createSpellSystemTemplate from '~/document/types/item/types/spell/SpellSystemTemplate.js';
import createEquipmentSystemTemplate from '~/document/types/item/types/equipment/EquipmentSystemTemplate.js';
import createCommoditySystemTemplate from '~/document/types/item/types/commodity/CommoditySystemTemplate.js';
import createEffectSystemTemplate from '~/document/types/active-effect/EffectSystemTemplate.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import createCustomItemTraitTemplate from '~/document/types/item/CustomItemTrait.js';
import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import createCustomAspectTemplate from '~/document/types/item/types/spell/SpellCustomAspect.js';
import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';
import { ATTACK_TRAITS } from '~/document/types/item/types/weapon/AttackTraits.js';
import { ARMOR_TRAITS } from '~/document/types/item/types/armor/ArmorTraits.js';
import { SHIELD_TRAITS } from '~/document/types/item/types/shield/ShieldTraits.js';

/** A minimal typeSchemas stand-in: no schema-typed fields, so column order falls back to first-seen. */
const NO_SCHEMA = {};

/**
 * Builds one document envelope per item and effect system shape template. Each system comes from the real
 * `create*SystemTemplate()` function, and every object-array field its template holds is filled with entries built by
 * the real element factories and constants, so the shapes are the ones the data models persist.
 * @returns {object[]} The envelopes, one per document type.
 */
function buildRealShapeEnvelopes() {
   /** @type {object[]} The document types with their system shape template and standard trait source. */
   const types = [
      {
         documentType: 'weapon',
         template: createWeaponSystemTemplate,
         trait: ATTACK_TRAITS,
      },
      {
         documentType: 'armor',
         template: createArmorSystemTemplate,
         trait: ARMOR_TRAITS,
      },
      {
         documentType: 'shield',
         template: createShieldSystemTemplate,
         trait: SHIELD_TRAITS,
      },
      {
         documentType: 'ability',
         template: createAbilitySystemTemplate,
      },
      {
         documentType: 'spell',
         template: createSpellSystemTemplate,
      },
      {
         documentType: 'equipment',
         template: createEquipmentSystemTemplate,
      },
      {
         documentType: 'commodity',
         template: createCommoditySystemTemplate,
      },
      {
         documentType: 'effect',
         template: createEffectSystemTemplate,
      },
   ];

   return types.map(({ documentType, template, trait }, idx) => {
      /** @type {object} The system data of the shape template. */
      const system = template();

      // Fill each object-array field the template holds with entries from the real factories.
      /** @type {object} The real array entries keyed by the system field they belong to. */
      const entries = {
         check: [createItemCheckTemplate()],
         customTrait: [createCustomItemTraitTemplate()],
         rulesElement: [createFlatModifierElement()],
         trait: trait ? [{ ...trait[0] }] : void 0,
         aspect: [{ ...SpellAspects.range.template }],
         customAspect: [createCustomAspectTemplate()],
      };
      for (const [field, value] of Object.entries(entries)) {
         if (field in system && value) {
            system[field] = value;
         }
      }

      // The weapon's attacks carry their own trait arrays.
      for (const attack of system.attack ?? []) {
         attack.trait = [{ ...ATTACK_TRAITS[0] }];
         attack.customTrait = [createCustomItemTraitTemplate()];
      }

      return {
         documentType,
         source: {
            _id: String.fromCharCode(97 + idx).repeat(16),
            name: documentType,
            type: documentType,
            img: 'i.svg',
            sort: 1,
            system,
         },
      };
   });
}

describe('buildTables — wide layout', () => {
   it('builds one sheet per document type with fixed columns first, plus a _manifest sheet', () => {
      const envelopes = [
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
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      expect(workbook.sheets[0].name).toBe('_manifest');
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns.slice(0, 7)).toEqual([
         '_id',
         '_parentId',
         '_folder',
         'name',
         'type',
         'img',
         'sort',
      ]);
      expect(weaponSheet.columns).toContain('system.rarity');
      expect(weaponSheet.rows[0]).toMatchObject({
         _id: 'a'.repeat(16),
         name: 'Sword',
         'system.rarity': 'common',
         _parentId: '',
         _folder: '',
      });
   });

   it('expands arrays into indexed dotted columns and unions columns across documents', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: { attack: [{ damage: 5 }] },
            },
         },
         {
            documentType: 'weapon',
            source: {
               _id: 'b'.repeat(16),
               system: {
                  attack: [
                     { damage: 1 },
                     { damage: 2 },
                  ],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).toContain('system.attack.0.damage');
      expect(weaponSheet.columns).toContain('system.attack.1.damage');
      expect(weaponSheet.rows[0]['system.attack.1.damage']).toBeUndefined();
   });

   it('records _parentId and _folder from the envelope', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16) },
            parentId: 'b'.repeat(16),
            folderPath: 'Loot/Rare',
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]._parentId).toBe('b'.repeat(16));
      expect(weaponSheet.rows[0]._folder).toBe('Loot/Rare');
   });

   it('orders non-fixed columns by schema field order, falling back to first-seen for the rest', () => {
      const typeSchemas = {
         weapon: {
            fieldTypes: {},
            fieldOrder: [
               'system.value',
               'system.rarity',
            ],
         },
      };
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  rarity: 'common',
                  value: 5,
                  extra: 'x',
               },
            },
         },
      ];
      const weaponSheet = buildTables(envelopes, 'wide', 'Item', typeSchemas).sheets.find((s) => s.name === 'weapon');
      /** @type {string[]} */
      const rest = weaponSheet.columns.slice(7);
      expect(rest.indexOf('system.value')).toBeLessThan(rest.indexOf('system.rarity'));
      expect(rest).toContain('system.extra');
   });

   it('writes manifest rows naming layout, packType, and one entry per data sheet', () => {
      const envelopes = [{
         documentType: 'weapon',
         source: { _id: 'a'.repeat(16) },
      }];
      const manifest = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA).sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         {
            key: 'layout',
            value: 'wide',
            documentType: '',
            arrayPath: '',
         },
         {
            key: 'packType',
            value: 'Item',
            documentType: '',
            arrayPath: '',
         },
         {
            key: 'sheet',
            value: 'weapon',
            documentType: 'weapon',
            arrayPath: '',
         },
      ]));
   });
});

describe('buildTables — relational layout', () => {
   it('drops array columns from the document sheet and puts them in a child sheet keyed by _id and _index', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               name: 'Sword',
               system: {
                  rarity: 'common',
                  attack: [
                     {
                        label: 'Slash',
                        damage: 5,
                     },
                     {
                        label: 'Stab',
                        damage: 3,
                     },
                  ],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).not.toEqual(expect.arrayContaining(['system.attack.0.label']));
      expect(weaponSheet.columns).toContain('system.rarity');

      /** @type {object} */
      const attackSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack');
      expect(attackSheet.columns).toEqual([
         '_id',
         '_index',
         'label',
         'damage',
      ]);
      expect(attackSheet.rows).toEqual([
         {
            _id: 'a'.repeat(16),
            _index: '0',
            label: 'Slash',
            damage: 5,
         },
         {
            _id: 'a'.repeat(16),
            _index: '1',
            label: 'Stab',
            damage: 3,
         },
      ]);
   });

   it('builds a separate child sheet per nesting level, with a compound dotted _index', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  attack: [{
                     label: 'Slash',
                     trait: [
                        { name: 'Reach' },
                        { name: 'Heavy' },
                     ],
                  }],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const attackSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack');
      expect(attackSheet.columns).toEqual([
         '_id',
         '_index',
         'label',
      ]);

      /** @type {object} */
      const traitSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack.trait');
      expect(traitSheet.rows).toEqual([
         {
            _id: 'a'.repeat(16),
            _index: '0.0',
            name: 'Reach',
         },
         {
            _id: 'a'.repeat(16),
            _index: '0.1',
            name: 'Heavy',
         },
      ]);
   });

   it('records each child sheet in the manifest with its array path', () => {
      const envelopes = [{
         documentType: 'weapon',
         source: {
            _id: 'a'.repeat(16),
            system: { attack: [{ damage: 5 }] },
         },
      }];
      const tables = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const manifest = tables.sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         {
            key: 'sheet',
            value: 'weapon.system.attack',
            documentType: 'weapon',
            arrayPath: 'system.attack',
         },
      ]));
   });

   it('puts a primitive array element value under the reserved "_value" sub-field, not a wide column', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  statuses: [
                     'prone',
                     'stunned',
                  ],
               },
            },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).not.toEqual(expect.arrayContaining(['system.statuses.0']));

      /** @type {object} */
      const statusesSheet = workbook.sheets.find((s) => s.name === 'weapon.system.statuses');
      expect(statusesSheet.columns).toEqual([
         '_id',
         '_index',
         '_value',
      ]);
      expect(statusesSheet.rows).toEqual([
         {
            _id: 'a'.repeat(16),
            _index: '0',
            _value: 'prone',
         },
         {
            _id: 'a'.repeat(16),
            _index: '1',
            _value: 'stunned',
         },
      ]);

      /** @type {object} */
      const manifest = workbook.sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         {
            key: 'sheet',
            value: 'weapon.system.statuses',
            documentType: 'weapon',
            arrayPath: 'system.statuses',
         },
      ]));
   });

   it('truncates/de-duplicates long sheet names once, keeping the manifest in agreement, and round-trips '
      + 'through encodeXlsx/decodeXlsx', () => {
      /** @type {string} A 33-character document type whose own sheet name already exceeds 31 characters. */
      const documentType = 'averyveryverylongdocumenttypename';
      const envelopes = [
         {
            documentType,
            source: {
               _id: 'a'.repeat(16),
               name: 'Longname',
               system: {
                  somethingreallylong: [
                     'one',
                     'two',
                  ],
               },
            },
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
      expect(readEnvelopes[0].source.system.somethingreallylong).toEqual([
         'one',
         'two',
      ]);
   });
});

describe('buildTables — untyped-bag string protection', () => {
   it('protects a number-like untyped-bag string through a wide-layout XLSX round trip', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: '5',
                  }],
               },
            },
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
            source: {
               _id: 'a'.repeat(16),
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: '5',
                  }],
               },
            },
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
         weapon: {
            fieldTypes: {
               'system.value': {
                  type: 'number',
                  nullable: false,
               },
            },
            fieldOrder: [],
         },
      };
      const envelopes = [{
         documentType: 'weapon',
         source: {
            _id: 'a'.repeat(16),
            system: { value: 5 },
         },
      }];
      const weaponSheet = buildTables(envelopes, 'wide', 'Item', typeSchemas).sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]['system.value']).toBe(5);
   });

   it('leaves a plain untyped-bag string untouched (no quoting)', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: 'Slashing',
                  }],
               },
            },
         },
      ];
      const weaponSheet = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA).sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]['system.rulesElement.0.value']).toBe('Slashing');
   });

   it('round-trips an already-quoted untyped-bag string', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: '"x"',
                  }],
               },
            },
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
            source: {
               _id: 'a'.repeat(16),
               system: {
                  rulesElement: [{
                     name: 'code',
                     value: '',
                  }],
               },
            },
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
      expect(matcher('statuses.0')).toEqual({
         index: '0',
         subField: '_value',
      });
   });

   it('only matches paths under its own array when two arrays are siblings, not nested', () => {
      const allArrayPaths = [
         'attack',
         'trait',
      ];
      const attackMatcher = buildArrayPathMatcher('attack', allArrayPaths);
      const traitMatcher = buildArrayPathMatcher('trait', allArrayPaths);

      expect(attackMatcher('attack.0.damage')).toEqual({
         index: '0',
         subField: 'damage',
      });
      expect(attackMatcher('trait.0.name')).toBeNull();
      expect(traitMatcher('trait.0.name')).toEqual({
         index: '0',
         subField: 'name',
      });
      expect(traitMatcher('attack.0.damage')).toBeNull();
   });
});

describe('detectArrayPaths', () => {
   it('returns both a shallow and a nested array path, ordered outermost-first', () => {
      expect(detectArrayPaths(['a.b.0.c.1.d'])).toEqual([
         'a.b',
         'a.b.c',
      ]);
   });
});

describe('buildTables — relational guards', () => {
   it('throws when a primitive array is nested directly inside another primitive array', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  matrix: [
                     [
                        1,
                        2,
                     ],
                     [
                        3,
                        4,
                     ],
                  ],
               },
            },
         },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow(
         'Unsupported field shape: a primitive array nested directly inside a primitive array at "system.matrix.0.0"',
      );
   });

   it('throws when an array-of-objects field has a sub-field named "_id"', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  trait: [{
                     _id: 'x',
                     name: 'Reach',
                  }],
               },
            },
         },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow(
         'Reserved column name "_id" used by a field under "system.trait"',
      );
   });

   it('throws when an array-of-objects field has a sub-field named "_index"', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  trait: [{
                     _index: 0,
                     name: 'Reach',
                  }],
               },
            },
         },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow(
         'Reserved column name "_index" used by a field under "system.trait"',
      );
   });

   it('does not throw for any real TITAN shape (one envelope per system shape template)', () => {
      // The shape templates localize and read settings while they build; stand in for both.
      globalThis.game = {
         i18n: { localize: (key) => key },
         settings: { get: () => 1 },
      };
      try {
         expect(() => buildTables(buildRealShapeEnvelopes(), 'relational', 'Item', NO_SCHEMA)).not.toThrow();
      }
      finally {
         delete globalThis.game;
      }
   });

   it('does not throw in wide layout for a shape that throws in relational layout, and yields a flat column', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: {
               _id: 'a'.repeat(16),
               system: {
                  matrix: [
                     [
                        1,
                        2,
                     ],
                     [
                        3,
                        4,
                     ],
                  ],
               },
            },
         },
      ];
      expect(() => buildTables(envelopes, 'relational', 'Item', NO_SCHEMA)).toThrow();
      /** @type {object} */
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).toContain('system.matrix.0.1');
   });
});
