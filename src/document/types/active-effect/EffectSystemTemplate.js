/**
 * Creates the canonical plain-object shape of a Titan Active Effect's `system` data (the 'effect'
 * subtype), mirroring the shape-built portion of `TitanActiveEffectDataModel._defineDocumentSchema()`:
 * the custom Titan duration, the item-check array, and the custom-trait array. The `changes` field is
 * NOT part of this shape — the Foundry v14 ActiveEffect verifier requires it as an ArrayField of a
 * typed SchemaField, which a shape cannot express, so it stays hand-built in the data model.
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
