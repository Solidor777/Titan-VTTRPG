import TitanItemSheet from '~/item/sheet/ItemSheet';
import AbilitySheetShell from './AbilitySheetShell.svelte';

export default class TitanAbilitySheet extends TitanItemSheet {
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
            class: AbilitySheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      const state = this.reactive.state;

      // Scroll State
      state.scrollTop = {
         sidebar: 0,
         checks: 0,
      };

      // Is Expanded State
      state.isExpanded = {
         checks: [],
      };

      // Active Tab
      state.activeTab = "description";
   }

   async addCheck() {
      this.reactive.state.isExpanded.checks.push(true);
      return await this.reactive.document.typeComponent.addCheck();
   }

   async removeCheck(idx) {
      await this.reactive.document.typeComponent.removeCheck(idx);
      return this.reactive.state.isExpanded.checks.splice(idx, 1);
   }
}