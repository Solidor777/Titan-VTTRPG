import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
   MockArrayField,
   booleanField,
   emptyObjectArray,
   fingerprintSchema,
   installSchemaMocks,
   integerField,
   numberField,
   objectElement,
   restoreSchemaMocks,
   sortFingerprint,
   stringField,
} from './helpers/schemaFingerprint.js';

// Characterization (golden-master) gate for the seven item-type DataModel schemas. Follow-up B will
// rebuild each static _defineDocumentSchema() from shared shape templates via buildSchemaFromShape();
// this suite freezes a byte-exact fingerprint of the CURRENT schemas so that refactor can be proven to
// leave the persisted data shape unchanged. The item DataModels chain through TitanItemDataModel ->
// TitanDataModel -> foundry.abstract.TypeDataModel and define their schema via the create*Field helpers,
// which call foundry.data.fields.*; some type modules also import dialog classes that destructure
// foundry.applications.api.ApplicationV2 at import time, and Spell/Ability read default XP costs from
// game.settings. This suite installs stand-ins for all of those before dynamically importing the real
// data models, then fingerprints each schema and asserts it deep-equals a committed golden written
// inline below. Dynamic import is permitted in tests (the no-dynamic-import rule governs the shipping
// bundle only).

// The weapon attack template seeds a random uuid via generateUUID(); mock that module to a fixed
// sentinel so the weapon attack array initial is deterministic and the golden can be a literal. The
// mock is hoisted above the dynamic imports in beforeAll, so it applies to the whole module graph.
vi.mock('~/helpers/utility-functions/GenerateUUID.js', () => {
   return {
      default: () => 'UUID',
   };
});

/**
 * Distinct sentinel XP costs per setting key, so the golden also proves which setting feeds each
 * type's xpCost (spell -> 777, ability -> 999). The sentinels are deliberately implausible (not the
 * real world defaults) so a regression that hardcoded a literal xpCost instead of reading the setting
 * would fail the gate.
 * @type {object}
 */
const SENTINELS = {
   'defaultXpCost.spell': 777,
   'defaultXpCost.ability': 999,
};

/** @type {object} Holds the dynamically imported item-type DataModel classes keyed by item type. */
const models = {};

beforeAll(async () => {
   // Install the shared Foundry stand-ins (i18n, TypeDataModel, data fields, ApplicationV2), then add
   // this suite's extras: Spell/Ability read default XP costs from game.settings (per-key sentinels),
   // and TitanItem (pulled in transitively) extends the global Item document class.
   installSchemaMocks();
   globalThis.game.settings = {
      get: (namespace, key) => SENTINELS[key],
   };
   globalThis.Item = class {};

   // Dynamically import every item-type DataModel against the installed stand-ins.
   models.weapon = (await import('~/document/types/item/types/weapon/WeaponDataModel.js')).default;
   models.armor = (await import('~/document/types/item/types/armor/ArmorDataModel.js')).default;
   models.spell = (await import('~/document/types/item/types/spell/SpellDataModel.js')).default;
   models.ability = (await import('~/document/types/item/types/ability/AbilityDataModel.js')).default;
   models.shield = (await import('~/document/types/item/types/shield/ShieldDataModel.js')).default;
   models.equipment = (await import('~/document/types/item/types/equipment/EquipmentDataModel.js')).default;
   models.commodity = (await import('~/document/types/item/types/commodity/CommodityDataModel.js')).default;
});

afterAll(() => {
   // Remove the stand-ins (and this suite's extra Item global) so later suites keep the shared
   // minimal mock.
   restoreSchemaMocks();
   delete globalThis.Item;
});

/**
 * The shared base fingerprints every item DataModel inherits from TitanDataModel + TitanItemDataModel:
 * documentVersion (non-integer NumberField), description, and the two object-array snapshots.
 * @returns {object} The fingerprints of the shared base fields keyed by field name.
 */
function baseFields() {
   return {
      check: emptyObjectArray(),
      customTrait: emptyObjectArray(),
      description: stringField(''),
      documentVersion: numberField(0),
   };
}

/**
 * The committed golden fingerprints for each item-type DataModel schema, frozen from the CURRENT code.
 * Any divergence after follow-up B's refactor signals a change to the persisted item data shape.
 * @type {object}
 */
const GOLDENS = {
   // Weapon: rules-element type with an attack array seeded with one default attack object.
   weapon: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      equipped: booleanField(false),
      attack: {
         element: objectElement(),
         initial: [
            {
               attribute: 'body',
               customTrait: [],
               damage: 1,
               label: 'LOCAL.attack.text',
               plusExtraSuccessDamage: true,
               range: 1,
               skill: 'meleeWeapons',
               trait: [],
               type: 'melee',
               uuid: 'UUID',
            },
         ],
         kind: 'ArrayField',
         nullable: false,
         required: true,
      },
      attackNotes: stringField(''),
      trait: emptyObjectArray(),
   },

   // Armor: rules-element type with a nested armor SchemaField (max/value integers, both initial 1).
   armor: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      armor: {
         fields: {
            max: integerField(1),
            value: integerField(1),
         },
         kind: 'SchemaField',
         nullable: false,
         required: false,
      },
      trait: emptyObjectArray(),
   },

   // Spell: NOT a rules-element type (no rulesElement field); xpCost seeded from the spell setting (777).
   spell: {
      ...baseFields(),
      rarity: stringField('common'),
      xpCost: integerField(777),
      tradition: stringField(''),
      castingCheck: {
         fields: {
            attribute: stringField('mind'),
            autoCalculateDC: booleanField(true),
            complexity: integerField(1),
            difficulty: integerField(4),
            skill: stringField('arcana'),
         },
         kind: 'SchemaField',
         nullable: false,
         required: false,
      },
      quantity: integerField(1),
      aspect: emptyObjectArray(),
      customAspect: emptyObjectArray(),
   },

   // Ability: rules-element type; xpCost seeded from the ability setting (999), three boolean toggles.
   ability: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      xpCost: integerField(999),
      rarity: stringField('common'),
      action: booleanField(false),
      reaction: booleanField(false),
      passive: booleanField(false),
   },

   // Shield: rules-element type with a flat integer defense field.
   shield: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      defense: integerField(0),
      trait: emptyObjectArray(),
   },

   // Equipment: rules-element type with the simple rarity/value/equipped trio.
   equipment: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      equipped: booleanField(false),
   },

   // Commodity: NOT a rules-element type (no rulesElement field); rarity/value/quantity.
   commodity: {
      ...baseFields(),
      rarity: stringField('common'),
      value: integerField(0),
      quantity: integerField(1),
   },
};

describe('item DataModel schema characterization (golden master)', () => {
   it.each([
      ['weapon'],
      ['armor'],
      ['spell'],
      ['ability'],
      ['shield'],
      ['equipment'],
      ['commodity'],
   ])('the %s schema fingerprint matches the committed golden', (type) => {
      // Fingerprint the live schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models[type]._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(GOLDENS[type]));
   });

   it('spell and commodity carry no rulesElement field; the other five do', () => {
      // The five rules-element item types expose a rulesElement array; spell and commodity do not.
      for (const type of ['weapon', 'armor', 'ability', 'shield', 'equipment']) {
         expect(models[type]._defineDocumentSchema().rulesElement).toBeInstanceOf(MockArrayField);
      }
      for (const type of ['spell', 'commodity']) {
         expect(models[type]._defineDocumentSchema().rulesElement).toBeUndefined();
      }
   });
});



