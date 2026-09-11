import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Minimal stand-in for a Foundry DataField, matching real DataField's own instance-property copying. */
class MockField {
   /**
    * @param {object} options - The field configuration (e.g. Nullable).
    */
   constructor(options = {}) {
      Object.assign(this, options);
   }
}

/** Stand-in for StringField. */
class MockStringField extends MockField {}
/** Stand-in for NumberField. */
class MockNumberField extends MockField {}
/** Stand-in for BooleanField. */
class MockBooleanField extends MockField {}
/** Stand-in for ObjectField (untyped bag — resolveFieldSchema must NOT add an entry for one). */
class MockObjectField extends MockField {}

/** Stand-in for ArrayField, capturing its element field. */
class MockArrayField extends MockField {
   /**
    * @param {MockField} element - The element field.
    * @param {object} [options] - Field options.
    */
   constructor(element, options = {}) {
      super(options);
      /** @type {MockField} */
      this.element = element;
   }
}

/** Stand-in for SchemaField, capturing its sub-fields map. */
class MockSchemaField extends MockField {
   /**
    * @param {object} fields - Map of sub-field name to MockField.
    * @param {object} [options] - Field options.
    */
   constructor(fields, options = {}) {
      super(options);
      /** @type {object} */
      this.fields = fields;
   }
}

/** @type {Function} */
let resolveFieldSchema;
/** @type {Function} */
let resolveTypeSchemas;
/** @type {Function} */
let resolveTypeSchemasForPack;

beforeAll(async () => {
   globalThis.foundry.data = {
      fields: {
         StringField: MockStringField,
         NumberField: MockNumberField,
         BooleanField: MockBooleanField,
         ObjectField: MockObjectField,
         ArrayField: MockArrayField,
         SchemaField: MockSchemaField,
      },
   };
   ({ resolveFieldSchema, resolveTypeSchemas, resolveTypeSchemasForPack } =
      await import('~/spreadsheet/io/ResolveTypeSchemas.js'));
});

afterAll(() => {
   delete globalThis.foundry.data;
});

describe('resolveFieldSchema', () => {
   it('walks a SchemaField into dotted paths with type and nullable info', () => {
      const schema = new MockSchemaField({
         rarity: new MockStringField({ nullable: false }),
         value: new MockNumberField({ nullable: false }),
         equipped: new MockBooleanField({ nullable: false }),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.rarity': {
            type: 'string',
            nullable: false 
         },
         'system.value': {
            type: 'number',
            nullable: false 
         },
         'system.equipped': {
            type: 'boolean',
            nullable: false 
         },
      });
   });

   it('normalizes an array of primitives to a wildcard path', () => {
      const schema = new MockSchemaField({
         statuses: new MockArrayField(new MockStringField({ nullable: false })),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.statuses.*': {
            type: 'string',
            nullable: false 
         },
      });
   });

   it('adds no entry for an untyped object bag, at top level or inside an array', () => {
      const schema = new MockSchemaField({
         customTrait: new MockArrayField(new MockObjectField()),
         flagsLikeBag: new MockObjectField(),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({});
   });

   it('recurses into a nested SchemaField', () => {
      const schema = new MockSchemaField({
         castingCheck: new MockSchemaField({
            difficulty: new MockNumberField({ nullable: false }),
         }),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.castingCheck.difficulty': {
            type: 'number',
            nullable: false 
         },
      });
   });

   it('reads nullable from the field instance', () => {
      const schema = new MockSchemaField({ armor: new MockStringField({ nullable: true }) });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.armor': {
            type: 'string',
            nullable: true 
         },
      });
   });
});

describe('resolveTypeSchemas', () => {
   it('builds fieldTypes and a matching fieldOrder per registered subtype', () => {
      /** Stand-in DataModel exposing a static `schema`. */
      class WeaponDataModel {
         static get schema() {
            return new MockSchemaField({
               rarity: new MockStringField({ nullable: false }),
               value: new MockNumberField({ nullable: false }),
            });
         }
      }
      globalThis.CONFIG = {
         Item: {
            dataModels: { weapon: WeaponDataModel },
            documentClass: { schema: new MockSchemaField({}) },
         },
      };
      const result = resolveTypeSchemas('Item');
      expect(result.weapon.fieldTypes).toEqual({
         'system.rarity': {
            type: 'string',
            nullable: false 
         },
         'system.value': {
            type: 'number',
            nullable: false 
         },
      });
      expect(result.weapon.fieldOrder).toEqual([
         'system.rarity',
         'system.value'
      ]);
   });

   it('adds prototypeToken.* paths for Actor packs only', () => {
      class PlayerDataModel {
         static get schema() {
            return new MockSchemaField({});
         }
      }
      globalThis.CONFIG = {
         Actor: {
            dataModels: { player: PlayerDataModel },
            documentClass: {
               schema: new MockSchemaField({
                  prototypeToken: new MockSchemaField({ actorLink: new MockBooleanField({ nullable: false }) }),
               }),
            },
         },
      };
      const result = resolveTypeSchemas('Actor');
      expect(result.player.fieldTypes['prototypeToken.actorLink']).toEqual({
         type: 'boolean',
         nullable: false 
      });
   });
});

describe('resolveTypeSchemasForPack', () => {
   /**
    * Stand-in DataModel exposing a static schema with one string-typed field named after the class.
    * @param {string} fieldName - The field's dotted path key under "system".
    * @returns {Function} The stand-in DataModel class.
    */
   function makeDataModel(fieldName) {
      return class {
         static get schema() {
            return new MockSchemaField({ [fieldName]: new MockStringField({ nullable: false }) });
         }
      };
   }

   beforeAll(() => {
      globalThis.CONFIG = {
         Actor: {
            dataModels: { npc: makeDataModel('npcField') },
            documentClass: { schema: new MockSchemaField({}) },
         },
         Item: {
            dataModels: { weapon: makeDataModel('weaponField') },
            documentClass: { schema: new MockSchemaField({}) },
         },
         ActiveEffect: {
            dataModels: { effect: makeDataModel('effectField') },
            documentClass: { schema: new MockSchemaField({}) },
         },
      };
   });

   it('merges Actor, Item, and ActiveEffect subtype schemas for an Actor pack', () => {
      const result = resolveTypeSchemasForPack('Actor');
      expect(Object.keys(result).sort()).toEqual([
         'effect',
         'npc',
         'weapon'
      ]);
      expect(result.weapon.fieldTypes).toEqual({
         'system.weaponField': {
            type: 'string',
            nullable: false 
         } 
      });
      expect(result.effect.fieldTypes).toEqual({
         'system.effectField': {
            type: 'string',
            nullable: false 
         } 
      });
   });

   it('merges Item and ActiveEffect subtype schemas for an Item pack, excluding Actor subtypes', () => {
      const result = resolveTypeSchemasForPack('Item');
      expect(Object.keys(result).sort()).toEqual([
         'effect',
         'weapon'
      ]);
   });

   it('resolves only ActiveEffect subtype schemas for an ActiveEffect pack', () => {
      const result = resolveTypeSchemasForPack('ActiveEffect');
      expect(Object.keys(result)).toEqual(['effect']);
   });

   it('never sees a subtype name collide across Actor, Item, and ActiveEffect in the real system.json', () => {
      /** @type {string} The absolute path to the checked-in system manifest. */
      const here = path.dirname(fileURLToPath(import.meta.url));
      /** @type {object} The shipped manifest's declared document subtypes, read from disk. */
      const { documentTypes } = JSON.parse(fs.readFileSync(path.resolve(here, '../../../../system.json'), 'utf8'));
      /** @type {string[]} Actor subtype names. */
      const actorTypes = Object.keys(documentTypes.Actor);
      /** @type {string[]} Item subtype names. */
      const itemTypes = Object.keys(documentTypes.Item);
      /** @type {string[]} ActiveEffect subtype names. */
      const effectTypes = Object.keys(documentTypes.ActiveEffect);
      /** @type {Set<string>} */
      const merged = new Set([
         ...actorTypes,
         ...itemTypes,
         ...effectTypes
      ]);
      expect(merged.size).toBe(actorTypes.length + itemTypes.length + effectTypes.length);
   });
});
