import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createWeaponAttackTemplate from '~/document/types/item/types/weapon/WeaponAttack.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import {WEAPON_IMAGE} from '~/system/DefaultImages.js';
import EditAttackTraitsDialog from '~/document/types/item/types/weapon/dialog/EditAttackTraitsDialog.js';
import AddCustomAttackTraitDialog from '~/document/types/item/types/weapon/dialog/AddCustomAttackTraitDialog.js';
import EditCustomAttackTraitDialog from '~/document/types/item/types/weapon/dialog/EditCustomAttackTraitDialog.js';
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

   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.equipped = this.equipped;
      retVal.attack = foundry.utils.deepClone(this.attack);
      retVal.attackNotes = this.attackNotes;
      retVal.trait = foundry.utils.deepClone(this.trait);

      return retVal;
   }

   _getDefaultImage() {
      return WEAPON_IMAGE;
   }

   _getDefaultName() {
      return localize('newWeapon');
   }

   /**
    * Creates a dialog for editing the Standard Traits of an Attack.
    * @param {number} attackIdx - The Idx of the Attack in the Attacks array.
    */
   editAttackTraits(attackIdx) {
      if (this.parent.isOwner) {
         const dialog = new EditAttackTraitsDialog(this.parent, attackIdx);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for adding a new Custom Trait to an Attack.
    * @param {number} attackIdx - The Idx of the Attack in the Attacks array.
    */
   addCustomAttackTrait(attackIdx) {
      if (this.parent.isOwner) {
         const dialog = new AddCustomAttackTraitDialog(this.parent, attackIdx);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for editing an Attack's existing Custom Trait.
    * @param {number} attackIdx - The Idx of the Attack in the Attacks array.
    * @param {number} traitIdx - The Idx of the Custom Trait in the Attack's Custom Traits array.
    */
   editCustomAttackTrait(attackIdx, traitIdx) {
      if (this.parent.isOwner) {
         const dialog = new EditCustomAttackTraitDialog(this.parent, attackIdx, traitIdx);
         dialog.render(true);
      }
   }

   /**
    * Removes a Custom Trait from an Attack.
    * @param {number} attackIdx - The Idx of the Attack in the Attacks array.
    * @param {number} traitIdx - The Idx of the Custom Trait in the Attack's Custom Traits array.
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

   /**
    * Adds a new Attack to this Weapon.
    * @returns {Promise<void>}
    */
   async addAttack() {
      if (this.parent.isOwner) {
         // Update document
         this.attack.push(createWeaponAttackTemplate());
         await this.parent.update({
            system: {
               attack: this.attack,
            },
         });

         // Update Sheet
         const sheet = this.parent._sheet;
         if (this._sheet) {
            sheet.addCheck();
         }
      }
   }

   /**
    * Removes a Check from this item.
    * @param {number} idx - The Idx of the Check in this item's Checks array.
    * @returns {Promise<void>}
    */
   async removeAttack(idx) {
      if (this.parent.isOwner) {
         // Update sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.removeCheck(idx);
         }

         // Update document
         this.attack.splice(idx, 1);
         await this.parent.update({
            system: {
               attack: this.attack,
            }
         });
      }
   }
}
