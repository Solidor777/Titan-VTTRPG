import ItemDataModel from '~/document/types/item/ItemDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import { COMMODITY_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Commodities.
 * @augments TitanDataModel
 */
export default class CommodityDataModel extends ItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity
      schema.rarity = createStringField('common');

      // Value
      schema.value = createIntegerField();

      // Quantity
      schema.quantity = createIntegerField(1);

      return schema;
   }

   _getDefaultImage() {
      return COMMODITY_IMAGE;
   }

   _getDefaultName() {
      return localize('newCommodity');
   }
}
