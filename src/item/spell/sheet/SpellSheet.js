import TitanItemSheet from '~/item/sheet/ItemSheet';
import SpellSheetShell from './SpellSheetShell.svelte';

export default class TitanSpellSheet extends TitanItemSheet {
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
            class: SpellSheetShell,
            target: document.body
         }
      });
   }
}