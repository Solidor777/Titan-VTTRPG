/**
 * Creates the shared base fragment of every item's `system` shape — the fields declared by
 * `TitanItemDataModel` and shared by all item subtypes (description, checks, custom traits). The
 * fragment is a plain-object "shape template" of representative values: each value's runtime type
 * drives the field type produced by `buildSchemaFromShape`, and an array literal supplies the field's
 * default contents (its element schema is an untyped `ObjectField` bag).
 *
 * This is the canonical base that each per-type `create<Type>SystemTemplate()` spreads before adding
 * its type-specific fields. It is intentionally framework-agnostic (plain data, no Foundry fields) so
 * it can be consumed by BOTH the chat-message data models (now) and a future item-data-model refactor.
 * @returns {object} The shared base item-system shape fragment.
 */
export default function createItemSystemTemplate() {
   return {
      // Rich-text description shown on the sheet and the chat card.
      description: '',

      // Item checks: a dynamic array defaulting to empty, storing untyped object bags.
      check: [],

      // Custom traits: a dynamic array defaulting to empty, storing untyped object bags.
      customTrait: [],
   };
}
