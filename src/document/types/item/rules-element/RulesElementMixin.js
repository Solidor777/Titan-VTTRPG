import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';
import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import assert from '~/helpers/utility-functions/Assert.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';

/**
 * Mixin that adds a Rules Elements array and its mutators to any TitanDataModel subclass.
 * @param {typeof foundry.abstract.TypeDataModel} BaseClass - The data model class to extend.
 * @returns {typeof foundry.abstract.TypeDataModel} The extended class with rules-element support.
 */
export default function RulesElementMixin(BaseClass) {
   return class RulesElementDataModel extends BaseClass {
      /**
       * Adds the Rules Elements array to the document schema, built from the shared rules-element shape
       * template so the field mirrors the canonical rules-element shape used across the system.
       * @override
       * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
       * @protected
       */
      static _defineDocumentSchema() {
         return {
            ...super._defineDocumentSchema(),
            ...buildSchemaFromShape(createRulesElementTemplate()),
         };
      }

      /**
       * Adds the Rules Elements to the Roll Data.
       * @override
       * @returns {object} Object of properties usable as substitution variables when evaluating roll formulas.
       */
      getRollData() {
         const retVal = super.getRollData();
         retVal.rulesElement = structuredClone(this.rulesElement);

         return retVal;
      }

      /**
       * Adds a new Rules Element to this document.
       * @returns {Promise<void>}
       */
      async addRulesElement() {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            /** @type {object} - A new default Flat Modifier rules element. */
            const newElement = createFlatModifierElement();
            this.rulesElement.push(newElement);
            await this.parent.update({
               system: {
                  rulesElement: this.rulesElement,
               },
            });
         }
      }

      /**
       * Removes a Rules Element from this document.
       * @param {number} idx - The index of the Rules Element in the Rules Elements array.
       * @returns {Promise<void>}
       */
      async deleteRulesElement(idx) {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            this.rulesElement.splice(idx, 1);
            await this.parent.update({
               system: {
                  rulesElement: this.rulesElement,
               },
            });
         }
      }

      /**
       * Reorders a Rules Element within this document's array.
       * @param {number} fromIdx - The current index of the element.
       * @param {number} toIdx - The insertion point (original-frame index) to move it before.
       * @returns {Promise<void>}
       */
      async moveRulesElement(fromIdx, toIdx) {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            await this.parent.update({
               system: {
                  rulesElement: moveArrayEntry(this.rulesElement, fromIdx, toIdx),
               },
            });
         }
      }

      /**
       * Inserts a copy of a Rules Element (from this or another item) at a position, with a fresh uuid.
       * @param {object} element - The element data to copy in.
       * @param {number} atIdx - The insertion point in the array.
       * @returns {Promise<void>}
       */
      async insertRulesElement(element, atIdx) {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
            const next = this.rulesElement.slice();
            next.splice(atIdx, 0, cloneElementWithNewUuid(element));
            await this.parent.update({
               system: {
                  rulesElement: next,
               },
            });
         }
      }
   };
}
