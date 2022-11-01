import { localize } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from 'uuid';
import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanWeapon extends TitanTypeComponent {

   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   async addAttack() {
      if (this.parent.isOwner) {
         // Create the new attack
         const newAttack = this.getAttackTemplate();

         // Add the attack and update the item
         const attack = this.parent.system.attack;
         attack.push(newAttack);
         await this.parent.update({
            system: {
               attack: attack,
            },
         });
      }

      return;
   }

   async removeAttack(idx) {
      if (this.parent.isOwner) {
         // Remove the attack and update the item
         let attack = this.parent.system.attack;
         attack.splice(idx, 1);

         // If we have no more attacks, ensure we have at least one
         // This will hand the update on its on
         if (attack.length <= 0) {
            this.addAttack();
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

   getAttackTemplate() {
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

   onCreate() {
      if (this.parent.system.attack.length === 0) {
         this.addAttack();
      }

      if (this.parent.img === 'icons/svg/item-bag.svg') {
         this.initializeImg();
      }
   }

   initializeImg() {
      this.parent.img = 'icons/svg/sword.svg';

      this.parent.update({
         img: this.parent.img
      });
   }
}