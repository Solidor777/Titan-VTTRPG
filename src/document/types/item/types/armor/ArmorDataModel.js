import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createArmorSystemTemplate from '~/document/types/item/types/armor/ArmorSystemTemplate.js';
import { ARMOR_IMAGE } from '~/system/DefaultImages.js';
import EditArmorTraitsDialog from '~/document/types/item/types/armor/dialog/EditArmorTraitsDialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Data model with extra functionality for Armor items.
 * @extends {RulesElementItemDataModel}
 */
export default class ArmorDataModel extends RulesElementItemDataModel {
   /**
    * Defines the data schema for Armor documents, built from the shared Armor system shape template
    * (which spreads the base item and rules-element fragments before the armor-specific fields), so the
    * item schema and its chat-card schema stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createArmorSystemTemplate()),
      };
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.armor = structuredClone(this.armor);
      retVal.trait = structuredClone(this.trait);

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
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         const dialog = new EditArmorTraitsDialog(this.parent);
         dialog.render(true);
      }
   }
}
