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
      skills: 0,
      actions: 0,
      inventory: 0,
      spells: 0
   };
}