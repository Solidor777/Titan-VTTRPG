import TitanItemDataModel from '~/document/types/item/TitanItemDataModel.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Data model with extra functionality for items that can contain Rules Elements.
 * @extends {TitanItemDataModel}
 */
export default class RulesElementItemDataModel extends TitanItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rules Elements.
      schema.rulesElement = createArrayField(createObjectField());

      return schema;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.rulesElement = structuredClone(this.rulesElement);

      return retVal;
   }

   /**
    * Adds a new Rules Element to this item.
    * @returns {Promise<void>}
    */
   async addRulesElement() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Create a new element.
         const newElement = createFlatModifierElement();

         // Add the Element to the Rules Elements array.
         this.rulesElement.push(newElement);
         await this.parent.update({
            system: {
               rulesElement: this.rulesElement,
            }
         });
      }
   }

   /**
    * Removes a Rules Element from this item.
    * @param {number} idx - The index of the Rules Element in the Rules Elements array.
    * @returns {Promise<void>}
    */
   async deleteRulesElement(idx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Remove the Element from the Rules Elements array.
         this.rulesElement.splice(idx, 1);
         await this.parent.update({
            system: {
               rulesElement: this.parent.system.rulesElement,
            },
         });
      }
   }
}
