import TitanItemDataModel from '~/document/types/item/TitanItemDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createCommoditySystemTemplate from '~/document/types/item/types/commodity/CommoditySystemTemplate.js';
import { COMMODITY_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Commodities.
 * @extends {TitanItemDataModel}
 */
export default class CommodityDataModel extends TitanItemDataModel {
   _getDefaultName() {
      return localize('newCommodity');
   }

   /**
    * Defines the data schema for Commodity documents, built from the shared Commodity system shape
    * template (which spreads the base item fragment before the commodity-specific fields; commodities
    * carry no rules elements), so the item schema and its chat-card schema stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createCommoditySystemTemplate()),
      };
   }

   _getDefaultImage() {
      return COMMODITY_IMAGE;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.quantity = this.quantity;

      return retVal;
   }
}
