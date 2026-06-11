import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createWeaponSystemTemplate from '~/document/types/item/types/weapon/WeaponSystemTemplate.js';
import createWeaponAttackTemplate from '~/document/types/item/types/weapon/WeaponAttack.js';
import { WEAPON_IMAGE } from '~/system/DefaultImages.js';
import EditAttackTraitsDialog from '~/document/types/item/types/weapon/dialog/EditAttackTraitsDialog.js';
import AddCustomAttackTraitDialog from '~/document/types/item/types/weapon/dialog/AddCustomAttackTraitDialog.js';
import EditCustomAttackTraitDialog from '~/document/types/item/types/weapon/dialog/EditCustomAttackTraitDialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import assert from '~/helpers/utility-functions/Assert.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';

/**
 * Data model with extra functionality for Weapons.
 * @extends {RulesElementItemDataModel}
 */
export default class WeaponDataModel extends RulesElementItemDataModel {
   /**
    * Defines the data schema for Weapon documents, built from the shared Weapon system shape template
    * (which spreads the base item and rules-element fragments before the weapon-specific fields), so the
    * item schema and its chat-card schema stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createWeaponSystemTemplate()),
      };
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
         if (sheet) {
            sheet.addAttack();
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

   /**
    * Reorders an Attack within this Weapon, keeping the sheet's per-attack expansion state aligned.
    * @param {number} fromIdx - The attack's current index.
    * @param {number} toIdx - The insertion point to move it before.
    * @returns {Promise<void>}
    */
   async moveAttack(fromIdx, toIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         // Keep per-attack expansion state aligned before the reactive re-render.
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.postMoveAttack(fromIdx, toIdx);
         }

         await this.parent.update({
            system: {
               attack: moveArrayEntry(this.attack, fromIdx, toIdx),
            }
         });
      }
   }

   /**
    * Inserts a copy of an Attack (from this or another weapon) at a position, with a fresh uuid.
    * @param {object} element - The attack data to copy in.
    * @param {number} atIdx - The insertion point.
    * @returns {Promise<void>}
    */
   async insertAttack(element, atIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
         const next = this.attack.slice();
         next.splice(atIdx, 0, cloneElementWithNewUuid(element));

         // Seed expansion state for the inserted row before the reactive re-render.
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.postInsertAttack(atIdx);
         }

         await this.parent.update({
            system: {
               attack: next,
            }
         });
      }
   }
}
