import TitanItemSheet from '~/item/sheet/ItemSheet';
import ArmorEditTraitsDialog from './ArmorEditTraitsDialog';
import createArmorSheetState from './ArmorSheetState.js';
import ArmorSheetShell from './ArmorSheetShell.svelte';

export default class TitanArmorSheet extends TitanItemSheet {
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
            class: ArmorSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createArmorSheetState();
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

   editArmorTraits() {
      const dialog = new ArmorEditTraitsDialog(this.reactive.document);
      dialog.render(true);
      return;
   }
}