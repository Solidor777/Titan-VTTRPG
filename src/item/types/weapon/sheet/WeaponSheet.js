import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementSheetCompoment.js';
import TitanItemSheet from '~/item/sheet/ItemSheet.js';
import WeaponAddCustomTraitDialog from '~/item/types/weapon/sheet/WeaponAddCustomTraitDialog.js';
import WeaponEditAttackTraitsDialog from '~/item/types/weapon/sheet/WeaponEditAttackTraitsDialog.js';
import WeaponSheetShell from '~/item/types/weapon/sheet/WeaponSheetShell.svelte';
import createWeaponSheetState from '~/item/types/weapon/sheet/WeaponSheetState.js';

export default class TitanWeaponSheet extends TitanItemSheet {

   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 650,
         height: 650,
         svelte: {
            class: WeaponSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createWeaponSheetState();
   }

   // Import add rules element functions
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   // Opens the attack traits edit dialog
   editAttackTraits(attackIdx) {
      if (this.reactive.document.isOwner) {
         const dialog = new WeaponEditAttackTraitsDialog(this.reactive.document, attackIdx);
         dialog.render(true);
      }
      return;
   }

   // Opens the attack traits edit dialog
   addCustomTrait(attackIdx) {
      if (this.reactive.document.isOwner) {
         const dialog = new WeaponAddCustomTraitDialog(this.reactive.document, attackIdx);
         dialog.render(true);
      }
      return;
   }

   async addAttack() {
      if (this.reactive.document.isOwner) {
         this.reactive.state.addAttack();
         return await this.reactive.document.weapon.addAttack();
      }
   }

   async removeAttack(idx) {
      if (this.reactive.document.isOwner) {
         this.reactive.state.removeAttack(idx);
         return await this.reactive.document.weapon.removeAttack(idx);
      }
   }
}