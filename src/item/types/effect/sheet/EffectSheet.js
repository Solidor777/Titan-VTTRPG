import TitanItemSheet from '~/item/sheet/ItemSheet';
import EffectSheetShell from '~/item/types/effect/sheet/EffectSheetShell.svelte';
import createEffectSheetState from '~/item/types/effect/sheet/EffectSheetState';
export default class TitanEffectSheet extends TitanItemSheet {
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
            class: EffectSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createEffectSheetState();
   }
}