import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import EffectSheetShell from '~/document/types/item/types/effect/sheet/EffectSheetShell.svelte';

export default class TitanEffectSheet extends TitanItemSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 700,
         height: 650,
         svelte: {
            props: {
               shell: EffectSheetShell
            },
         }
      });
   }
}