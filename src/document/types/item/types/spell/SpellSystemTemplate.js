import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import createCustomAspectTemplate from '~/document/types/item/types/spell/SpellCustomAspect.js';

/**
 * Creates the canonical plain-object shape of a Spell's `system` data, mirroring
 * `SpellDataModel._defineDocumentSchema()`. Spells do NOT carry rules elements, so the rules-element
 * fragment is intentionally omitted. The `castingCheck` object maps to a `SchemaField` (so
 * `system.castingCheck.difficulty` resolves); `aspect` is empty so it maps to `ArrayField(ObjectField)`
 * matching the data model's untyped aspect storage, while `customAspect` carries one representative
 * element so its element schema mirrors a real custom aspect.
 * @returns {object} The Spell `system` shape template.
 */
export default function createSpellSystemTemplate() {
   return {
      ...createItemSystemTemplate(),

      // Rarity tier of the spell.
      rarity: 'common',

      // Experience-point cost to learn the spell.
      xpCost: 0,

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

      // Standard aspects, stored as untyped object bags (empty -> ArrayField(ObjectField)).
      aspect: [],

      // Custom aspects: one representative element so the element schema mirrors a real custom aspect.
      customAspect: [
         createCustomAspectTemplate(),
      ],
   };
}
