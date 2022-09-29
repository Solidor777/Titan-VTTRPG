import TitanItemSheet from '~/item/sheet/ItemSheet';
import EffectSheetShell from './EffectSheetShell.svelte';
import createEffectSheetState from './EffectSheetState';
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

   async addRulesElement() {
      return await this.reactive.document.typeComponent.addRulesElement();
   }

   async removeRulesElement(idx) {
      return await this.reactive.document.typeComponent.removeRulesElement(idx);
   }
}