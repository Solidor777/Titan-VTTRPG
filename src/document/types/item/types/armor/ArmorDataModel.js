import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import {ARMOR_IMAGE} from '~/system/DefaultImages.js';
import EditArmorTraitsDialog from '~/document/types/item/types/armor/dialog/EditArmorTraitsDialog.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Armor.
 * @augments TitanDataModel
 */
export default class ArmorDataModel extends RulesElementItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity
      schema.rarity = createStringField('common');

      // Value
      schema.value = createIntegerField();

      // Armor
      schema.armor = createSchemaField({
         max: createIntegerField(1),
         value: createIntegerField(1),
      });

      // Armor traits
      schema.trait = createArrayField(createObjectField({}));

      return schema;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.armor = foundry.utils.deepClone(this.armor);
      retVal.trait = foundry.utils.deepClone(this.trait);

      return retVal;
   }

   _getDefaultImage() {
      return ARMOR_IMAGE;
   }

   _getDefaultName() {
      return localize('newArmor');
   }

   /**
    * Creates a dialog for editing the Armor's traits.
    */
   editArmorTraits() {
      if (this.parent.isOwner) {
         const dialog = new EditArmorTraitsDialog(this.parent);
         dialog.render(true);
      }
   }
}
