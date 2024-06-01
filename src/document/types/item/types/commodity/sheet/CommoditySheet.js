import TitanItemSheet from '~/document/types/item/sheet/ItemSheet.js';
import CommoditySheetShell from '~/document/types/item/types/commodity/sheet/CommoditySheetShell.svelte';

/**
 * Sheet for a Titan Commodity item.
 * @param {Document} document - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanCommoditySheet extends TitanItemSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: CommoditySheetShell
            },
         }
      });
   }
}