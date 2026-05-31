import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Mixin that adds a Rules Elements array and its mutators to any TitanDataModel subclass.
 * @param {typeof foundry.abstract.TypeDataModel} BaseClass - The data model class to extend.
 * @returns {typeof foundry.abstract.TypeDataModel} The extended class with rules-element support.
 */
export default function RulesElementMixin(BaseClass) {
   return class RulesElementDataModel extends BaseClass {
      /**
       * Adds the Rules Elements array to the document schema.
       * @override
       * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
       * @protected
       */
      static _defineDocumentSchema() {
         const schema = super._defineDocumentSchema();
         schema.rulesElement = createArrayField(createObjectField());

         return schema;
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
   };
}
