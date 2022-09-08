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
         width: 700,
         height: 600,
         svelte: {
            class: AbilitySheetShell,
            target: document.body
         }
      });
   }
}