import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import defaultXpCostSpell from '~/helpers/Settings/DefaultXpCostSpell.js';

/**
 * Creates the canonical plain-object shape of a Spell's `system` data, mirroring
 * `SpellDataModel._defineDocumentSchema()`. Spells do NOT carry rules elements, so the rules-element
 * fragment is intentionally omitted. The `castingCheck` object maps to a `SchemaField` (so
 * `system.castingCheck.difficulty` resolves); `aspect` and `customAspect` are dynamic arrays defaulting
 * to empty, mapping to `ArrayField(ObjectField)` (untyped object bags) matching the data model.
 * @returns {object} The Spell `system` shape template.
 */
export default function createSpellSystemTemplate() {
   return {
      ...createItemSystemTemplate(),

      // Rarity tier of the spell.
      rarity: 'common',

      // Experience-point cost to learn the spell; default comes from the world setting.
      xpCost: defaultXpCostSpell(),

      // Magical tradition the spell belongs to.
      tradition: '',

      // Casting check: a nested object so system.castingCheck.* paths resolve.
      castingCheck: {
         attribute: 'mind',
         skill: 'arcana',
         difficulty: 4,
         complexity: 1,
         autoCalculateDC: true,
      },

      // Number of charges / quantity of the spell.
      quantity: 1,

      // Standard aspects: a dynamic array defaulting to empty, storing untyped object bags.
      aspect: [],

      // Custom aspects: a dynamic array defaulting to empty, storing untyped object bags.
      customAspect: [],
   };
}
