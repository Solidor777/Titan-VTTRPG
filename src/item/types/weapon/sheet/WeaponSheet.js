import TitanItemSheet from '~/item/sheet/ItemSheet';
import WeaponEditAttackTraitsDialog from './WeaponEditAttackTraitsDialog';
import WeaponSheetShell from './WeaponSheetShell.svelte';
import createWeaponSheetState from './WeaponSheetState';

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

   async addAttack() {
      this.reactive.state.addAttack();
      return await this.reactive.document.weapon.addAttack();
   }

   async removeAttack(idx) {
      this.reactive.state.removeAttack(idx);
      return await this.reactive.document.weapon.removeAttack(idx);
   }

   async addCheck() {
      this.reactive.state.addCheck();
      return await this.reactive.document.typeComponent.addCheck();
   }

   async removeCheck(idx) {
      this.reactive.state.removeCheck(idx);
      return await this.reactive.document.typeComponent.removeCheck(idx);
   }

   // Opens the attack traits edit dialog
   editAttackTraits(attackIdx) {
      const dialog = new WeaponEditAttackTraitsDialog(this.reactive.document, attackIdx);
      dialog.render(true);
      return;
   }
}