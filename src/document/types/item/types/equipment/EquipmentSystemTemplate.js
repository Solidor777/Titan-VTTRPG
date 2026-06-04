import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';

/**
 * Creates the canonical plain-object shape of an Equipment item's `system` data, mirroring
 * `EquipmentDataModel._defineDocumentSchema()`. Built by spreading the shared base and rules-element
 * fragments, then adding the equipment-specific fields (rarity, value, equipped) whose runtime types
 * drive the schema produced by `buildSchemaFromShape`.
 * @returns {object} The Equipment `system` shape template.
 */
export default function createEquipmentSystemTemplate() {
   return {
      ...createItemSystemTemplate(),
      ...createRulesElementTemplate(),

      // Rarity tier of the equipment.
      rarity: 'common',

      // Monetary value of the equipment.
      value: 0,

      // Whether the equipment is currently equipped.
      equipped: false,
   };
}
