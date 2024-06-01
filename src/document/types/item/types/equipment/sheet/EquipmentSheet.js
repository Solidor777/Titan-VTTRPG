import TitanItemSheet from '~/document/types/item/sheet/ItemSheet.js';
import EquipmentSheetShell from '~/document/types/item/types/equipment/sheet/EquipmentSheetShell.svelte';

/**
 * Sheet for a Titan Equipment item.
 * @param {Document} document - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanEquipmentSheet extends TitanItemSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: EquipmentSheetShell
            }
         }
      });
   }
}