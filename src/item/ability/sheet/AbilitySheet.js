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

   // Scroll State
   scrollTop = {
      sidebar: 0,
      checks: 0,
   };

   // Is Expanded state
   isExpanded = {
      checks: [],
   };

   async addCheck() {
      this.isExpanded.checks.push(true);
      return await this.reactive.document.typeComponent.addCheck();
   }

   async removeCheck(idx) {
      this.isExpanded.checks.splice(idx, 1);
      await this.reactive.document.typeComponent.removeCheck(idx);
   }
}