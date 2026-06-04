import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import createCustomItemTraitTemplate from '~/document/types/item/CustomItemTrait.js';

/**
 * Creates the shared base fragment of every item's `system` shape — the fields declared by
 * `TitanItemDataModel` and shared by all item subtypes (description, checks, custom traits). The
 * fragment is a plain-object "shape template" of representative values: each value's runtime type
 * drives the field type produced by `buildSchemaFromShape`, and the arrays carry one representative
 * element so the element schemas mirror the real check / custom-trait shapes (path parity).
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

      // Item checks: one representative element so the array's element schema mirrors a real check.
      check: [
         createItemCheckTemplate(),
      ],

      // Custom traits: one representative element so the element schema mirrors a real custom trait.
      customTrait: [
         createCustomItemTraitTemplate(),
      ],
   };
}
