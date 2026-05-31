import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createWeaponAttackTemplate from '~/document/types/item/types/weapon/WeaponAttack.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import { WEAPON_IMAGE } from '~/system/DefaultImages.js';
import EditAttackTraitsDialog from '~/document/types/item/types/weapon/dialog/EditAttackTraitsDialog.js';
import AddCustomAttackTraitDialog from '~/document/types/item/types/weapon/dialog/AddCustomAttackTraitDialog.js';
import EditCustomAttackTraitDialog from '~/document/types/item/types/weapon/dialog/EditCustomAttackTraitDialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Data model with extra functionality for Weapons.
 * @extends {RulesElementItemDataModel}
 */
export default class WeaponDataModel extends RulesElementItemDataModel {
   /**
    * Defines the data schema for Weapon documents.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity.
      schema.rarity = createStringField('common');

      // Value.
      schema.value = createIntegerField();

      // Equipped.
      schema.equipped = createBooleanField();

      // Attacks.
      schema.attack = createArrayField(
         createObjectField(() => createWeaponAttackTemplate()),
         [createWeaponAttackTemplate()],
      );

      // Attack Notes.
      schema.attackNotes = createStringField();

      // Weapon Traits.
      schema.trait = createArrayField(createObjectField());

      return schema;
   }

   /**
    * Returns the roll data object for this document.
    * @override
    * @returns {object} Object of properties usable as substitution variables when evaluating roll formulas.
    */
   getRollData() {
      const retVal = super.getRollData();
      retVal.rarity = this.rarity;
      retVal.value = this.value;
      retVal.equipped = this.equipped;
      retVal.attack = structuredClone(this.attack);
      retVal.attackNotes = this.attackNotes;
      retVal.trait = structuredClone(this.trait);

      return retVal;
   }

   /**
    * Returns the default image path for new Weapon documents.
    * @override
    * @returns {string} The default image path.
    */
   _getDefaultImage() {
      return WEAPON_IMAGE;
   }

   /**
    * Returns the default name for new Weapon documents.
    * @override
    * @returns {string} Localized placeholder label applied to a freshly created Weapon.
    */
   _getDefaultName() {
      return localize('newWeapon');
   }

   /**
    * Creates a dialog for editing the Standard Traits of an Attack.
    * @param {number} attackIdx - The index of the Attack in the Attacks array.
    * @returns {void}
    */
   editAttackTraits(attackIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         const dialog = new EditAttackTraitsDialog(
            this.parent,
            attackIdx,
         );
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for adding a new Custom Trait to an Attack.
    * @param {number} attackIdx - The index of the Attack in the Attacks array.
    * @returns {void}
    */
   addCustomAttackTrait(attackIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         const dialog = new AddCustomAttackTraitDialog(
            this.parent,
            attackIdx,
         );
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for editing an Attack's existing Custom Trait.
    * @param {number} attackIdx - The index of the Attack in the Attacks array.
    * @param {number} traitIdx - The index of the Custom Trait in the Attack's Custom Traits array.
    * @returns {void}
    */
   editCustomAttackTrait(attackIdx, traitIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         const dialog = new EditCustomAttackTraitDialog(
            this.parent,
            attackIdx,
            traitIdx,
         );
         dialog.render(true);
      }
   }

   /**
    * Removes a Custom Trait from an Attack.
    * @param {number} attackIdx - The index of the Attack in the Attacks array.
    * @param {number} traitIdx - The index of the Custom Trait in the Attack's Custom Traits array.
    * @returns {Promise<void>}
    */
   async deleteCustomAttackTrait(attackIdx, traitIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         this.parent.system.attack[attackIdx].customTrait.splice(traitIdx, 1);
         await this.parent.update({
            system: {
               attack: structuredClone(this.parent.system.attack),
            },
         });
      }
   }

   /**
    * Adds a new Attack to this Weapon.
    * @returns {Promise<void>}
    */
   async addAttack() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         this.attack.push(createWeaponAttackTemplate());
         await this.parent.update({
            system: {
               attack: structuredClone(this.attack),
            },
         });

         // Notify the sheet of the added attack.
         const sheet = this.parent._sheet;
         if (this._sheet) {
            sheet.postAddCheck();
         }
      }
   }

   /**
    * Removes an Attack from this Weapon.
    * @param {number} idx - The index of the Attack in the Attacks array.
    * @returns {Promise<void>}
    */
   async deleteAttack(idx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         // Notify the sheet before deletion.
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.postDeleteAttack(idx);
         }

         this.attack.splice(idx, 1);
         await this.parent.update({
            system: {
               attack: structuredClone(this.attack),
            }
         });
      }
   }
}
