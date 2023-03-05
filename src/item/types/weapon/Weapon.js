import { localize } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from 'uuid';
import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';
import WeaponEditAttackTraitsDialog from '~/item/types/weapon/dialogs/WeaponEditAttackTraitsDialog';
import WeaponAddCustomTraitDialog from '~/item/types/weapon/dialogs/WeaponAddCustomTraitDialog';
import WeaponEditCustomTraitDialog from '~/item/types/weapon/dialogs/WeaponEditCustomTraitDialog';

export default class TitanWeapon extends TitanTypeComponent {

   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   setInitialData(initialData) {
      // Image
      initialData.img = 'icons/svg/sword.svg';

      // System
      if (!initialData.system) {
         initialData.system = {};
      }

      // Attack
      initialData.attack = [getAttackTemplate()];

      return;
   }


   async addAttack() {
      if (this.parent.isOwner) {
         // Create the new attack
         const newAttack = getAttackTemplate();

         // Add the attack and update the item
         const attack = this.parent.system.attack;
         attack.push(newAttack);
         await this.parent.update({
            system: {
               attack: attack,
            },
         });

         // Update sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.addAttack();
         }
      }

      return;
   }

   async removeAttack(idx) {
      if (this.parent.isOwner) {
         // Update sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.removeAttack(idx);
         }

         // Remove the attack
         const attack = this.parent.system.attack;
         attack.splice(idx, 1);

         // If we have no more attacks, ensure we have at least one
         // This will also update the item
         if (attack.length <= 0) {
            await this.addAttack();
         }

         // Otherwise, update the item
         else {
            await this.parent.update({
               system: {
                  attack: attack,
               },
            });
         }
      }

      return;
   }

   // Opens the attack traits edit dialog
   editAttackTraits(attackIdx) {
      if (this.parent.isOwner) {
         const dialog = new WeaponEditAttackTraitsDialog(this.parent, attackIdx);
         dialog.render(true);
      }
      return;
   }

   // Opens the new custom trait dialog
   addCustomAttackTrait(attackIdx) {
      if (this.parent.isOwner) {
         const dialog = new WeaponAddCustomTraitDialog(this.parent, attackIdx);
         dialog.render(true);
      }
      return;
   }

   // Opens the edit custom trait dialog
   editCustomAttackTrait(attackIdx, traitIdx) {
      if (this.parent.isOwner) {
         const dialog = new WeaponEditCustomTraitDialog(this.parent, attackIdx, traitIdx);
         dialog.render(true);
      }

      return;
   }

   // Removes a custom trait from an attack
   async deleteCustomAttackTrait(attackIdx, traitIdx) {
      if (this.parent.isOwner) {
         this.parent.system.attack[attackIdx].customTrait.splice(traitIdx, 1);
         await this.parent.update({
            system: {
               attack: this.parent.system.attack
            }
         });
      }

      return;
   }
}

function getAttackTemplate() {
   return {
      label: localize('attack'),
      type: 'melee',
      range: 1,
      attribute: 'body',
      skill: 'meleeWeapons',
      damage: 1,
      plusExtraSuccessDamage: true,
      trait: [],
      customTrait: [],
      uuid: uuidv4()
   };
}