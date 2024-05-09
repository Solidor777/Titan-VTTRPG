import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createWeaponAttackTemplate from '~/document/types/item/types/weapon/WeaponAttack.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import { WEAPON_IMAGE } from '~/system/DefaultImages.js';
import WeaponEditAttackTraitsDialog from '~/document/types/item/types/weapon/dialogs/WeaponEditAttackTraitsDialog.js';
import WeaponAddCustomAttackTraitDialog
   from '~/document/types/item/types/weapon/dialogs/WeaponAddCustomAttackTraitDialog.js';
import WeaponEditCustomTraitDialog from '~/document/types/item/types/weapon/dialogs/WeaponEditCustomTraitDialog.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Weapons.
 * @augments TitanDataModel
 */
export default class WeaponDataModel extends RulesElementItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity
      schema.rarity = createStringField('common');

      // Value
      schema.value = createIntegerField();

      // Equipped
      schema.equipped = createBooleanField();

      // Attacks
      schema.attack = createArrayField(
         createObjectField(() => createWeaponAttackTemplate()),
         [createWeaponAttackTemplate()],
      );

      // Attack Notes
      schema.attackNotes = createStringField();

      // WeaponTraits
      schema.trait = createArrayField(createObjectField());

      return schema;
   }

   _getDefaultImage() {
      return WEAPON_IMAGE;
   }

   _getDefaultName() {
      return localize('newWeapon');
   }

   /**
    * Creates a dialog for editing the Standard Traits of an Attack.
    * @param {number} attackIdx The Idx of the Attack in the Attacks array.
    */
   editAttackTraits(attackIdx) {
      if (this.parent.isOwner) {
         const dialog = new WeaponEditAttackTraitsDialog(this.parent, attackIdx);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for adding a new Custom Trait to an Attack.
    * @param {number} attackIdx The Idx of the Attack in the Attacks array.
    */
   addCustomAttackTrait(attackIdx) {
      if (this.parent.isOwner) {
         const dialog = new WeaponAddCustomAttackTraitDialog(this.parent, attackIdx);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for editing an Attack's existing Custom Trait.
    * @param {number} attackIdx  The Idx of the Attack in the Attacks array.
    * @param {number} traitIdx   The Idx of the Custom Trait in the Attack's Custom Traits array.
    */
   editCustomAttackTrait(attackIdx, traitIdx) {
      if (this.parent.isOwner) {
         const dialog = new WeaponEditCustomTraitDialog(this.parent, attackIdx, traitIdx);
         dialog.render(true);
      }
   }

   /**
    * Removes a Custom Trait from an Attack.
    * @param {number} attackIdx  The Idx of the Attack in the Attacks array.
    * @param {number} traitIdx   The Idx of the Custom Trait in the Attack's Custom Traits array.
    */
   async deleteCustomAttackTrait(attackIdx, traitIdx) {
      if (this.parent.isOwner) {
         this.parent.system.attack[attackIdx].customTrait.splice(traitIdx, 1);
         await this.parent.update({
            system: {
               attack: this.parent.system.attack,
            },
         });
      }
   }
}
