import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';

/**
 * Creates the canonical plain-object shape of an Ability's `system` data, mirroring
 * `AbilityDataModel._defineDocumentSchema()`. Built by spreading the shared base and rules-element
 * fragments, then adding the ability-specific fields (xp cost, rarity, and the action / reaction /
 * passive flags) whose runtime types drive the schema produced by `buildSchemaFromShape`.
 * @returns {object} The Ability `system` shape template.
 */
export default function createAbilitySystemTemplate() {
   return {
      ...createItemSystemTemplate(),
      ...createRulesElementTemplate(),

      // Experience-point cost to learn the ability.
      xpCost: 0,

      // Rarity tier of the ability.
      rarity: 'common',

      // Whether the ability is used as an action.
      action: false,

      // Whether the ability is used as a reaction.
      reaction: false,

      // Whether the ability is passive.
      passive: false,
   };
}
