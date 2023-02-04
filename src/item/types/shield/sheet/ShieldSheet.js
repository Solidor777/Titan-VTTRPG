import TitanItemSheet from '~/item/sheet/ItemSheet';
import ShieldEditTraitsDialog from '~/item/types/shield/sheet/ShieldEditTraitsDialog';
import createShieldSheetState from '~/item/types/shield/sheet/ShieldSheetState.js';
import ShieldSheetShell from '~/item/types/shield/sheet/ShieldSheetShell.svelte';

export default class TitanShieldSheet extends TitanItemSheet {
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
            class: ShieldSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createShieldSheetState();
   }



   editShieldTraits() {
      if (this.reactive.document.isOwner) {
         const dialog = new ShieldEditTraitsDialog(this.reactive.document);
         dialog.render(true);
      }

      return;
   }
}