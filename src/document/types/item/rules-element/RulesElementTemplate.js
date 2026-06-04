/**
 * Creates the shared rules-element fragment of an item's `system` shape — the `rulesElement` array
 * declared by `RulesElementMixin` and shared by the five item subtypes that carry rules elements
 * (ability, armor, equipment, shield, weapon). Rules elements are heterogeneous, so the item data
 * model stores them as untyped object bags (`ArrayField(ObjectField)`); the shape mirrors this with an
 * EMPTY array, which `buildSchemaFromShape` maps to an `ArrayField` whose element is an `ObjectField`.
 *
 * Spread this into a per-type system template alongside `createItemSystemTemplate()` for types that
 * support rules elements. Plain data only, so it is reusable by a future item-data-model refactor.
 * @returns {object} The shared rules-element shape fragment.
 */
export default function createRulesElementTemplate() {
   return {
      // Rules elements: an empty array maps to ArrayField(ObjectField), matching the item data model.
      rulesElement: [],
   };
}
