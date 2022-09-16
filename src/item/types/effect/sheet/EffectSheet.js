import TitanItemSheet from '~/item/sheet/ItemSheet';
import EffectSheetShell from './EffectSheetShell.svelte';

export default class TitanEffectSheet extends TitanItemSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 600,
         height: 500,
         svelte: {
            class: EffectSheetShell,
            target: document.body
         }
      });
   }
}