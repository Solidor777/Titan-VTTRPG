import { localize } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from 'uuid';
import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';
import WeaponEditAttackTraitsDialog from '~/item/types/weapon/dialogs/WeaponEditAttackTraitsDialog';
import WeaponAddCustomTraitDialog from '~/item/types/weapon/dialogs/WeaponAddCustomTraitDialog';

export default class TitanWeapon extends TitanTypeComponent {

   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   getInitialData() {
      let shouldReturnData = false;
      const initialData = {};

      // Image
      if (this.parent.img === 'icons/svg/item-bag.svg') {
         shouldReturnData = true;
         initialData.img = 'icons/svg/sword.svg';
      }

      // Attack
      if (this.parent.system.attack.length <= 0) {
         shouldReturnData = true;
         initialData.system = {
            attack: [getAttackTemplate()]
         }
      }

      if (shouldReturnData) {
         return initialData;
      }

      return false;
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

   // Opens the attack traits edit dialog
   addCustomTrait(attackIdx) {
      if (this.parent.isOwner) {
         const dialog = new WeaponAddCustomTraitDialog(this.parent, attackIdx);
         dialog.render(true);
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