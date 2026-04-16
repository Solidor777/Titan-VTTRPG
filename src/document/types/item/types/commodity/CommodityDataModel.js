import TitanItemDataModel from '~/document/types/item/TitanItemDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
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

   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity.
      schema.rarity = createStringField('common');

      // Value.
      schema.value = createIntegerField();

      // Quantity.
      schema.quantity = createIntegerField(1);

      return schema;
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
