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
      const state = this.reactive.state;
      state.isExpanded.checks.push(true);
      this.reactive.state = state;
      return await this.reactive.document.typeComponent.addCheck();
   }

   async removeCheck(idx) {
      const state = this.reactive.state;
      state.isExpanded.checks.splice(idx, 1);
      this.reactive.state = state;
      await this.reactive.document.typeComponent.removeCheck(idx);
   }
}