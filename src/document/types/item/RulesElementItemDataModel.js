import ItemDataModel from '~/document/types/item/ItemDataModel.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';

/**
 * Data model with extra functionality for items that can contain Rules Elements.
 * @augments TitanDataModel
 */
export default class RulesElementItemDataModel extends ItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rules Elements
      schema.rulesElement = createArrayField(createObjectField());

      return schema;
   }

   /**
    * Adds a new Rules Element to this item.
    * @returns {Promise<void>}
    */
   async addRulesElement() {
      if (this.parent.isOwner) {

         // Create a new element
         const newElement = createFlatModifierElement();

         // Add the Element to the Rules Elements array
         this.parent.system.rulesElement.push(newElement);
         await this.parent.update({
            system: this.parent.system,
         });
      }
   }

   /**
    * Removes a Rules Element from this item.
    * @param {number} idx The index of the Rules Element in the Rules Elements array.
    * @returns {Promise<void>}
    */
   async removeRulesElement(idx) {
      if (this.parent.isOwner) {

         // Remove the Element from the Rules Elements array
         this.parent.system.rulesElement.splice(idx, 1);
         await this.parent.update({
            system: {
               rulesElement: this.parent.system.rulesElement,
            },
         });
      }
   }
}
