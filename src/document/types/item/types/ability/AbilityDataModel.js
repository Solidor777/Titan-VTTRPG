import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import {ABILITY_IMAGE} from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Ability items.
 * @augments TitanDataModel
 */
export default class AbilityDataModel extends RulesElementItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // XP cost
      schema.xpCost = createIntegerField(getSetting('defaultXpCost.ability'));

      // Rarity
      schema.rarity = createStringField('common');

      // Action
      schema.action = createBooleanField();

      // Reaction
      schema.reaction = createBooleanField();

      // Passive
      schema.passive = createBooleanField();

      return schema;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.xpCost = this.xpCost;
      retVal.rarity = this.rarity;
      retVal.action = this.action;
      retVal.reaction = this.reaction;
      retVal.passive = this.passive;

      return retVal;
   }

   _getDefaultImage() {
      return ABILITY_IMAGE;
   }

   _getDefaultName() {
      return localize('newAbility');
   }
}
