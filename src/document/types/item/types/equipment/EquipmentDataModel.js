import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEquipmentSystemTemplate from '~/document/types/item/types/equipment/EquipmentSystemTemplate.js';
import { EQUIPMENT_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Equipment.
 * @extends {RulesElementItemDataModel}
 */
export default class EquipmentDataModel extends RulesElementItemDataModel {
   /**
    * Defines the data schema for Equipment documents, built from the shared Equipment system shape
    * template (which spreads the base item and rules-element fragments before the equipment-specific
    * fields), so the item schema and its chat-card schema stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createEquipmentSystemTemplate()),
      };
   }

   _getDefaultImage() {
      return EQUIPMENT_IMAGE;
   }

   _getDefaultName() {
      return localize('newEquipment');
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.equipped = this.equipped;

      return retVal;
   }
}
