import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';

/**
 * Creates the canonical plain-object shape of a Shield's `system` data, mirroring
 * `ShieldDataModel._defineDocumentSchema()`. Built by spreading the shared base and rules-element
 * fragments, then adding the shield-specific fields (rarity, value, defense, traits). The `trait`
 * array is empty so it maps to an `ArrayField(ObjectField)`, matching the data model's untyped storage.
 * @returns {object} The Shield `system` shape template.
 */
export default function createShieldSystemTemplate() {
   return {
      ...createItemSystemTemplate(),
      ...createRulesElementTemplate(),

      // Rarity tier of the shield.
      rarity: 'common',

      // Monetary value of the shield.
      value: 0,

      // Defense rating granted by the shield.
      defense: 0,

      // Standard shield traits, stored as untyped object bags (empty -> ArrayField(ObjectField)).
      trait: [],
   };
}
