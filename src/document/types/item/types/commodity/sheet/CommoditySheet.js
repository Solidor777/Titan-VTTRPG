import TitanItemSheet from '~/document/types/item/sheet/ItemSheet.js';
import CommoditySheetShell from '~/document/types/item/types/commodity/sheet/CommoditySheetShell.svelte';

export default class TitanCommoditySheet extends TitanItemSheet {
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
               shell: CommoditySheetShell
            },
         }
      });
   }
}