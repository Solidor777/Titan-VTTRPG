import TitanItemSheet from '~/item/sheet/ItemSheet.js';
import WeaponEditAttackTraitsDialog from './WeaponEditAttackTraitsDialog.js';
import WeaponSheetShell from './WeaponSheetShell.svelte';
import createWeaponSheetState from './WeaponSheetState.js';

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

   // Opens the attack traits edit dialog
   editAttackTraits(attackIdx) {
      const dialog = new WeaponEditAttackTraitsDialog(this.reactive.document, attackIdx);
      dialog.render(true);
      return;
   }

   async addAttack() {
      this.reactive.state.addAttack();
      return await this.reactive.document.weapon.addAttack();
   }

   async removeAttack(idx) {
      this.reactive.state.removeAttack(idx);
      return await this.reactive.document.weapon.removeAttack(idx);
   }

   async addRulesElement() {
      return await this.reactive.document.typeComponent.addRulesElement();
   }

   async removeRulesElement(idx) {
      return await this.reactive.document.typeComponent.removeRulesElement(idx);
   }
}