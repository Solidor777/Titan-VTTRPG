import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import { EQUIPMENT_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Equipment.
 * @augments TitanDataModel
 */
export default class EquipmentDataModel extends RulesElementItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity
      schema.rarity = createStringField('common');

      // Value
      schema.value = createIntegerField();

      // Equipped
      schema.equipped = createBooleanField();

      return schema;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.equipped = this.equipped;

      return retVal;
   }

   _getDefaultImage() {
      return EQUIPMENT_IMAGE;
   }

   _getDefaultName() {
      return localize('newEquipment');
   }
}
