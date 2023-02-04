import TitanItemSheet from '~/item/sheet/ItemSheet';
import SpellSheetShell from '~/item/types/spell/sheet/SpellSheetShell.svelte';
import createSpellSheetState from '~/item/types/spell/sheet/SpellSheetState';

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

   constructor(object) {
      super(object);
      this.reactive.state = createSpellSheetState();
   }

   addCustomAspect() {
      this.reactive.state.addCustomAspect();

      return;
   }

   async removeCustomAspect(idx) {
      this.reactive.state.removeCustomAspect(idx);

      return;
   }
}