import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createShieldSystemTemplate from '~/document/types/item/types/shield/ShieldSystemTemplate.js';
import EditShieldTraitsDialog from '~/document/types/item/types/shield/dialog/EditShieldTraitsDialog.js';
import { SHIELD_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Data model with extra functionality for Shields.
 * @extends {RulesElementItemDataModel}
 */
export default class ShieldDataModel extends RulesElementItemDataModel {
   /**
    * Defines the data schema for Shield documents, built from the shared Shield system shape template
    * (which spreads the base item and rules-element fragments before the shield-specific fields), so the
    * item schema and its chat-card schema stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createShieldSystemTemplate()),
      };
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.defense = this.defense;
      retVal.trait = structuredClone(this.trait);

      return retVal;
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
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         const dialog = new EditShieldTraitsDialog(this.parent);
         dialog.render(true);
      }
   }
}
