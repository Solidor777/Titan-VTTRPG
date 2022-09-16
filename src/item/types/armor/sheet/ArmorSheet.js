import TitanItemSheet from '~/item/sheet/ItemSheet';
import ArmorEditTraitsDialog from './ArmorEditTraitsDialog';
import ArmorSheetShell from './ArmorSheetShell.svelte';

export default class TitanArmorSheet extends TitanItemSheet {
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
            class: ArmorSheetShell,
            target: document.body
         }
      });
   }

   editArmorTraits() {
      const dialog = new ArmorEditTraitsDialog(this.reactive.document);
      dialog.render(true);
      return;
   }
}