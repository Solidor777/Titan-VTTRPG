import TitanDataModel from '~/document/data-model/TitanDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import localize from '~/helpers/utility-functions/Localize.js';
import { ITEM_IMAGE } from '~/system/DefaultImages.js';

/**
 * Data model with extra functionality for Items.
 * @property {TitanItem} parent - The Item that owns this data model.
 * @extends {TitanDataModel}
 */
export default class TitanItemDataModel extends TitanDataModel {
   /**
    * Defines the schema for Item documents, built from the shared item-system shape template. The base
    * `TitanDataModel` supplies `documentVersion`; the template supplies the shared description, checks,
    * and custom-trait fields, keeping the item schema and its chat-card schema a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createItemSystemTemplate()),
      };
   }

   /**
    * Gets the initial data for this document, setting a default image and name if none are provided.
    * @override
    * @param {object} data - The initial data object provided to the document creation request.
    * @returns {object|void} The initial data to update the document with.
    * @protected
    */
   _getInitialDocumentData(data) {
      /** @type {object} */
      const updateData = {};
      /** @type {boolean} */
      let shouldReturnData = false;

      // Set the image if none is set.
      if (!data.img) {
         shouldReturnData = true;
         updateData.img = this._getDefaultImage();
      }

      // Set the name if none is set.
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
    * Gets the type specific Roll Data for this item, including checks and custom traits.
    * @override
    * @returns {object} Roll Data for this item.
    */
   getRollData() {
      const retVal = super.getRollData();
      retVal.check = structuredClone(this.check);
      retVal.customTrait = structuredClone(this.customTrait);
      retVal.description = this.description;

      return retVal;
   }

   /**
    * Gets the default image for this document type.
    * @returns {string} The default image for this document type.
    * @protected
    */
   _getDefaultImage() {
      return ITEM_IMAGE;
   }

   /**
    * Gets the default name for this document type.
    * @returns {string} The default name for this document type.
    * @protected
    */
   _getDefaultName() {
      return localize('newItem');
   }
}
