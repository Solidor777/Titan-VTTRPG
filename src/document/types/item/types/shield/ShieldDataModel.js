import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import ShieldEditTraitsDialog from '~/document/types/item/types/shield/ShieldEditTraitsDialog.js';
import { SHIELD_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Shields.
 * @augments TitanDataModel
 */
export default class ShieldDataModel extends RulesElementItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity
      schema.rarity = createStringField('common');

      // Value
      schema.value = createIntegerField();

      // Defense
      schema.defense = createIntegerField();

      // Shield Traits
      schema.trait = createArrayField(createObjectField());

      return schema;
   }

   _getDefaultImage() {
      return SHIELD_IMAGE;
   }

   _getDefaultName() {
      return localize('newShield');
   }

   /**
    * Creates a dialog for editing the Shield's traits.
    */
   editShieldTraits() {
      if (this.parent.isOwner) {
         const dialog = new ShieldEditTraitsDialog(this.parent);
         dialog.render(true);
      }
   }
}
