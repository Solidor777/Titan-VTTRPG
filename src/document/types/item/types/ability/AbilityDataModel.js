import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createAbilitySystemTemplate from '~/document/types/item/types/ability/AbilitySystemTemplate.js';
import { ABILITY_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Ability items.
 * @extends {RulesElementItemDataModel}
 */
export default class AbilityDataModel extends RulesElementItemDataModel {
   /**
    * Defines the data schema for Ability documents, built from the shared Ability system shape template
    * (which spreads the base item and rules-element fragments before the ability-specific fields), so the
    * item schema and its chat-card schema stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createAbilitySystemTemplate()),
      };
   }

   _getDefaultImage() {
      return ABILITY_IMAGE;
   }

   _getDefaultName() {
      return localize('newAbility');
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
}
