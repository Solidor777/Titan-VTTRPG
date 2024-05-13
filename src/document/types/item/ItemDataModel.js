import TitanDataModel from '~/document/data-model/DataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import createCustomItemTraitTemplate from '~/document/types/item/CustomItemTrait.js';
import localize from '~/helpers/utility-functions/Localize.js';
import { ITEM_IMAGE } from '~/system/DefaultImages.js';

/**
 * Data model with extra functionality for Items.
 * @augments TitanDataModel
 */
export default class ItemDataModel extends TitanDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Description
      schema.description = createStringField();

      // Checks
      schema.check = createArrayField(
         createObjectField(() => createItemCheckTemplate()),
      );

      // Custom Traits
      schema.customTrait = createArrayField(
         createObjectField(() => createCustomItemTraitTemplate()),
      );

      return schema;
   }

   _getInitialDocumentData(data) {
      const updateData = {};
      let shouldReturnData = false;

      // Set the image if none is set
      if (!data.img) {
         shouldReturnData = true;
         updateData.img = this._getDefaultImage();
      }

      // Set the name if none is set
      const newItemLabel = localize('newItem');
      if (data.name.includes(newItemLabel)) {
         shouldReturnData = true;
         updateData.name = data.name.replace(newItemLabel, this._getDefaultName());
      }

      if (shouldReturnData) {
         return updateData;
      }
   }

   /**
    * Gets the default image for this document type.
    * @returns {string} The default image for this document type.
    * @private
    */
   _getDefaultImage() {
      return ITEM_IMAGE;
   }

   /**
    * Gets the default name for this document type.
    * @returns {string} The default name for this document type.
    * @private
    */
   _getDefaultName() {
      return localize('newItem');
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.check = foundry.utils.deepClone(this.check);
      retVal.customTrait = foundry.utils.deepClone(this.customTrait);

      return retVal;
   }
}
