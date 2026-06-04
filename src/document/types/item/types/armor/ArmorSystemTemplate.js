import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';

/**
 * Creates the canonical plain-object shape of an Armor's `system` data, mirroring
 * `ArmorDataModel._defineDocumentSchema()`. Built by spreading the shared base and rules-element
 * fragments, then adding the armor-specific fields. The nested `armor` object maps to a `SchemaField`
 * with numeric `max` / `value` sub-fields (so `system.armor.value` resolves); `trait` is empty so it
 * maps to an `ArrayField(ObjectField)`, matching the data model's untyped trait storage.
 * @returns {object} The Armor `system` shape template.
 */
export default function createArmorSystemTemplate() {
   return {
      ...createItemSystemTemplate(),
      ...createRulesElementTemplate(),

      // Rarity tier of the armor.
      rarity: 'common',

      // Monetary value of the armor.
      value: 0,

      // Armor rating: a nested object so system.armor.max / system.armor.value resolve.
      armor: {
         max: 1,
         value: 1,
      },

      // Standard armor traits, stored as untyped object bags (empty -> ArrayField(ObjectField)).
      trait: [],
   };
}
