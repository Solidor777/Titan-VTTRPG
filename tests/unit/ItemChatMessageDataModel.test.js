import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
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

// The item chat-message data models chain through TitanChatMessageDataModel -> TitanDataModel ->
// foundry.abstract.TypeDataModel and define their schema via the create*Field helpers, which call
// foundry.data.fields.*. The shared test setup only mocks foundry.abstract.Document + foundry.utils,
// so this suite installs the shared stand-ins of helpers/schemaFingerprint.js, then dynamically imports
// the data models so their imports resolve against those stand-ins. Each leaf schema is asserted against a
// hand-authored golden fingerprint, the same gate ItemDataModelSchemaEquivalence applies to the item
// systems. Dynamic import is permitted in tests (the no-dynamic-import rule governs the shipping bundle
// only).

// The weapon attack template seeds a random uuid via generateUUID(); mock that module to a fixed
// sentinel so the weapon attack array initial is deterministic and the golden can be a literal.
vi.mock('~/helpers/utility-functions/GenerateUUID.js', () => {
   return {
      default: () => 'UUID',
   };
});

/**
 * Distinct sentinel XP costs per setting key, so the golden also proves which setting feeds each
 * type's xpCost (spell -> 777, ability -> 999).
 * @type {object}
 */
const SENTINELS = {
   'defaultXpCost.spell': 777,
   'defaultXpCost.ability': 999,
};

/** @type {object} Holds the dynamically imported leaf data-model classes keyed by item type. */
const leaves = {};

/** @type {object} Holds the dynamically imported leaf Svelte components keyed by item type. */
const components = {};

beforeAll(async () => {
   // Install the shared Foundry stand-ins, then add the XP-cost settings the spell and ability
   // templates read when a schema is built.
   installSchemaMocks();
   globalThis.game.settings = {
      get: (namespace, key) => SENTINELS[key],
   };

   // Dynamically import every leaf data model and its corresponding Svelte component so the
   // get-component getter can be asserted to resolve to the right component.
   leaves.weapon = (await import(
      '~/document/types/item/types/weapon/chat-message/WeaponChatMessageDataModel.js',
   )).default;
   leaves.armor = (await import(
      '~/document/types/item/types/armor/chat-message/ArmorChatMessageDataModel.js',
   )).default;
   leaves.spell = (await import(
      '~/document/types/item/types/spell/chat-message/SpellChatMessageDataModel.js',
   )).default;
   leaves.ability = (await import(
      '~/document/types/item/types/ability/chat-message/AbilityChatMessageDataModel.js',
   )).default;
   leaves.shield = (await import(
      '~/document/types/item/types/shield/chat-message/ShieldChatMessageDataModel.js',
   )).default;
   leaves.equipment = (await import(
      '~/document/types/item/types/equipment/chat-message/EquipmentChatMessageDataModel.js',
   )).default;
   leaves.commodity = (await import(
      '~/document/types/item/types/commodity/chat-message/CommodityChatMessageDataModel.js',
   )).default;

   components.weapon = (await import(
      '~/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte',
   )).default;
   components.armor = (await import(
      '~/document/types/item/types/armor/chat-message/ArmorChatMessage.svelte',
   )).default;
   components.spell = (await import(
      '~/document/types/item/types/spell/chat-message/SpellChatMessage.svelte',
   )).default;
   components.ability = (await import(
      '~/document/types/item/types/ability/chat-message/AbilityChatMesssage.svelte',
   )).default;
   components.shield = (await import(
      '~/document/types/item/types/shield/chat-message/ShieldChatMessage.svelte',
   )).default;
   components.equipment = (await import(
      '~/document/types/item/types/equipment/chat-message/EquipmentChatMessage.svelte',
   )).default;
   components.commodity = (await import(
      '~/document/types/item/types/commodity/chat-message/CommodityChatMessage.svelte',
   )).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   restoreSchemaMocks();
});

/**
 * The fingerprints every item chat-message leaf carries: the shared item snapshot fields
 * (documentVersion, description, the two object-array snapshots) and the label metadata (name, img)
 * that item.system does not hold.
 * @returns {object} The fingerprints of the shared base fields keyed by field name.
 */
function baseFields() {
   return {
      check: emptyObjectArray(),
      customTrait: emptyObjectArray(),
      description: stringField(''),
      documentVersion: numberField(0),
      name: stringField(''),
      img: stringField(''),
   };
}

/**
 * The committed golden fingerprints for each item chat-message leaf schema.
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

describe('item chat-message leaf component getters', () => {
   it.each([
      ['weapon'],
      ['armor'],
      ['spell'],
      ['ability'],
      ['shield'],
      ['equipment'],
      ['commodity'],
   ])('the %s leaf resolves get component() to its Svelte component', (type) => {
      // Construct a bare instance via the prototype so the heavy TypeDataModel constructor is skipped.
      const instance = Object.create(leaves[type].prototype);

      expect(instance.component).toBe(components[type]);
      expect(instance.component).toBeTruthy();
   });
});

describe('item chat-message leaf schema characterization (golden master)', () => {
   it.each([
      ['weapon'],
      ['armor'],
      ['spell'],
      ['ability'],
      ['shield'],
      ['equipment'],
      ['commodity'],
   ])('the %s schema fingerprint matches the committed golden', (type) => {
      // Fingerprint the live schema and compare it, key-sorted, to the hand-authored golden.
      const actual = fingerprintSchema(leaves[type]._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(GOLDENS[type]));
   });
});
