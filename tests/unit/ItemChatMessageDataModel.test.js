import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// The item chat-message data models chain through TitanChatMessageDataModel -> TitanDataModel ->
// foundry.abstract.TypeDataModel and define their schema via the create*Field helpers, which call
// foundry.data.fields.*. The shared test setup only mocks foundry.abstract.Document + foundry.utils,
// so this suite installs stand-ins for TypeDataModel and the data-field classes (mirroring the
// approach in BuildSchemaFromShape.test.js), then dynamically imports the data models so their imports
// resolve against those stand-ins. Dynamic import is permitted in tests (the no-dynamic-import rule
// governs the shipping bundle only).

/**
 * Minimal stand-in for a Foundry DataField that records the options it was constructed with, so a test
 * can assert on the field type produced for a given shape value.
 */
class MockField {
   /**
    * Stores the field options.
    * @param {object} options - The field configuration, such as the initial value and nullability.
    */
   constructor(options = {}) {
      /** @type {object} The field configuration. */
      this.options = options;
   }
}

/** Stand-in for StringField, a distinct subclass so the produced field type can be asserted. */
class MockStringField extends MockField {}

/** Stand-in for NumberField, a distinct subclass so the produced field type can be asserted. */
class MockNumberField extends MockField {}

/** Stand-in for BooleanField, a distinct subclass so the produced field type can be asserted. */
class MockBooleanField extends MockField {}

/** Stand-in for ObjectField, a distinct subclass so the produced field type can be asserted. */
class MockObjectField extends MockField {}

/** Stand-in for ArrayField that captures its element field as the first constructor argument. */
class MockArrayField extends MockField {
   /**
    * Stores the element field and options.
    * @param {MockField} element - The field describing each array element.
    * @param {object} options - The array field configuration.
    */
   constructor(element, options = {}) {
      super(options);
      /** @type {MockField} The element field. */
      this.element = element;
   }
}

/** Stand-in for SchemaField that captures its sub-fields map as the first constructor argument. */
class MockSchemaField extends MockField {
   /**
    * Stores the sub-fields map and options.
    * @param {object} fields - The map of sub-field name to MockField.
    * @param {object} options - The schema field configuration.
    */
   constructor(fields, options = {}) {
      super(options);
      /** @type {object} The map of sub-field name to MockField. */
      this.fields = fields;
   }
}

/** Stand-in for TypeDataModel so the data-model classes can be declared and their statics invoked. */
class MockTypeDataModel {}

/** @type {object} Holds the dynamically imported leaf data-model classes keyed by item type. */
const leaves = {};

/** @type {object} Holds the dynamically imported leaf Svelte components keyed by item type. */
const components = {};

/** @type {Function} Holds the dynamically imported WeaponChatMessageDataModel for schema tests. */
let WeaponChatMessageDataModel;

beforeAll(async () => {
   // The shared shape templates call localize() (which reads game.i18n) when a schema is built, so
   // provide a pass-through i18n stand-in for the duration of this suite.
   globalThis.game = { i18n: { localize: (key) => key } };

   // Install the TypeDataModel and data-field stand-ins before importing the data models.
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;
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

   // Dynamically import every leaf data model and its corresponding Svelte component so the
   // get-component getter can be asserted to resolve to the right component.
   leaves.weapon = (await import(
      '~/document/types/item/types/weapon/chat-message/WeaponChatMessageDataModel.js'
   )).default;
   leaves.armor = (await import(
      '~/document/types/item/types/armor/chat-message/ArmorChatMessageDataModel.js'
   )).default;
   leaves.spell = (await import(
      '~/document/types/item/types/spell/chat-message/SpellChatMessageDataModel.js'
   )).default;
   leaves.ability = (await import(
      '~/document/types/item/types/ability/chat-message/AbilityChatMessageDataModel.js'
   )).default;
   leaves.shield = (await import(
      '~/document/types/item/types/shield/chat-message/ShieldChatMessageDataModel.js'
   )).default;
   leaves.equipment = (await import(
      '~/document/types/item/types/equipment/chat-message/EquipmentChatMessageDataModel.js'
   )).default;
   leaves.commodity = (await import(
      '~/document/types/item/types/commodity/chat-message/CommodityChatMessageDataModel.js'
   )).default;

   components.weapon = (await import(
      '~/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte'
   )).default;
   components.armor = (await import(
      '~/document/types/item/types/armor/chat-message/ArmorChatMessage.svelte'
   )).default;
   components.spell = (await import(
      '~/document/types/item/types/spell/chat-message/SpellChatMessage.svelte'
   )).default;
   components.ability = (await import(
      '~/document/types/item/types/ability/chat-message/AbilityChatMesssage.svelte'
   )).default;
   components.shield = (await import(
      '~/document/types/item/types/shield/chat-message/ShieldChatMessage.svelte'
   )).default;
   components.equipment = (await import(
      '~/document/types/item/types/equipment/chat-message/EquipmentChatMessage.svelte'
   )).default;
   components.commodity = (await import(
      '~/document/types/item/types/commodity/chat-message/CommodityChatMessage.svelte'
   )).default;

   WeaponChatMessageDataModel = leaves.weapon;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.game;
});

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

describe('WeaponChatMessageDataModel schema (path parity with weapon system)', () => {
   /** @type {object} The flat schema field map produced for the weapon chat message system data. */
   let schema;

   beforeAll(() => {
      schema = WeaponChatMessageDataModel._defineDocumentSchema();
   });

   it('includes the shared item snapshot fields (description, check, customTrait) and label metadata', () => {
      // Shared base fields, generated from createItemSystemTemplate().
      expect(schema.description).toBeInstanceOf(MockStringField);
      expect(schema.check).toBeInstanceOf(MockArrayField);
      expect(schema.customTrait).toBeInstanceOf(MockArrayField);

      // Label metadata not present in item.system.
      expect(schema.name).toBeInstanceOf(MockStringField);
      expect(schema.img).toBeInstanceOf(MockStringField);
   });

   it('round-trips the weapon-specific fields so system.rarity / value / attack survive', () => {
      // rarity (string), value (number) survive with the right field types.
      expect(schema.rarity).toBeInstanceOf(MockStringField);
      expect(schema.value).toBeInstanceOf(MockNumberField);

      // equipped (boolean) and attackNotes (string) survive too.
      expect(schema.equipped).toBeInstanceOf(MockBooleanField);
      expect(schema.attackNotes).toBeInstanceOf(MockStringField);

      // attack is an array whose element schema mirrors a real weapon attack (a SchemaField).
      expect(schema.attack).toBeInstanceOf(MockArrayField);
      expect(schema.attack.element).toBeInstanceOf(MockSchemaField);
      expect(schema.attack.element.fields.label).toBeInstanceOf(MockStringField);
      expect(schema.attack.element.fields.damage).toBeInstanceOf(MockNumberField);

      // rulesElement is an array of untyped object bags (empty-array fallback), and trait likewise.
      expect(schema.rulesElement).toBeInstanceOf(MockArrayField);
      expect(schema.rulesElement.element).toBeInstanceOf(MockObjectField);
      expect(schema.trait).toBeInstanceOf(MockArrayField);
      expect(schema.trait.element).toBeInstanceOf(MockObjectField);
   });

   it('seeds the weapon-specific string fields with their representative initials', () => {
      // The create*Field helpers pass the representative value through as the field's initial.
      expect(schema.rarity.options.initial).toBe('common');
   });
});

describe('ItemChatMessageDataModel family schema', () => {
   /** @type {object} The flat schema field map produced for the commodity (simple) chat message. */
   let commoditySchema;

   beforeAll(() => {
      commoditySchema = leaves.commodity._defineDocumentSchema();
   });

   it('provides the shared base fields and label metadata to every leaf', () => {
      // Even a leaf without rules elements inherits the shared base + label metadata.
      expect(commoditySchema.description).toBeInstanceOf(MockStringField);
      expect(commoditySchema.check).toBeInstanceOf(MockArrayField);
      expect(commoditySchema.customTrait).toBeInstanceOf(MockArrayField);
      expect(commoditySchema.name).toBeInstanceOf(MockStringField);
      expect(commoditySchema.img).toBeInstanceOf(MockStringField);
   });

   it('adds the commodity-specific fields without a rulesElement field', () => {
      expect(commoditySchema.rarity).toBeInstanceOf(MockStringField);
      expect(commoditySchema.value).toBeInstanceOf(MockNumberField);
      expect(commoditySchema.quantity).toBeInstanceOf(MockNumberField);

      // Commodities do not carry rules elements.
      expect(commoditySchema.rulesElement).toBeUndefined();
   });
});
