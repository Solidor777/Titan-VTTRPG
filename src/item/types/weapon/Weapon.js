import { localize } from '~/helpers/Utility.js';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanWeapon extends TitanTypeComponent {

   async addAttack() {
      // Create the new attack
      const newAttack = this.getAttackTemplate();

      // Add the attack and update the item
      let attack = this.parent.system.attack;
      attack.push(newAttack);
      await this.parent.update({
         system: {
            attack: attack,
         },
      });

      return;
   }

   async removeAttack(idx) {
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

         return;
      }
   }

   getAttackTemplate() {
      return {
         name: localize('attack'),
         type: 'melee',
         range: 1,
         attribute: 'body',
         skill: 'meleeWeapons',
         damage: 1,
         plusSuccessDamage: true,
         traits: [],
      };
   }
}