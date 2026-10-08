/**
 * Creates the canonical plain-object shape of a Titan Active Effect's `system` data (the 'effect'
 * subtype), mirroring the shape-built portion of `TitanActiveEffectDataModel._defineDocumentSchema()`:
 * the custom Titan duration, the item-check array, and the custom-trait array. The core `changes` field is
 * NOT part of this shape; the data model inherits it from foundry.data.ActiveEffectTypeDataModel.
 *
 * Checks and custom traits are heterogeneous object bags, so the shape mirrors them with EMPTY arrays
 * (mapping to ArrayField(ObjectField), matching the data model). Plain data only, so it is shared by
 * the live Active Effect data model and the effect chat-message snapshot schema.
 * @returns {object} The effect `system` shape template.
 */
export default function createEffectSystemTemplate() {
   return {
      // Duration: the duration type, remaining turns, captured initiative, and custom description.
      duration: {
         type: 'turnStart',
         remaining: 1,
         initiative: 1,
         custom: '',
      },

      // Checks: an empty array maps to ArrayField(ObjectField), matching the data model.
      check: [],

      // Custom Traits: an empty array maps to ArrayField(ObjectField), matching the data model.
      customTrait: [],
   };
}
