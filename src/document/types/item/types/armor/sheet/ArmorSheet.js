import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import ArmorSheetShell from '~/document/types/item/types/armor/sheet/ArmorSheetShell.svelte';

/**
 * Sheet for a Titan Armor item.
 * @param {Document} document - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanArmorSheet extends TitanItemSheet {
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
               shell: ArmorSheetShell
            },
         }
      });
   }
}