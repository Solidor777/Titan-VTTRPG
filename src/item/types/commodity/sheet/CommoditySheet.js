import TitanItemSheet from '~/item/sheet/ItemSheet.js';
import CommoditySheetShell from '~/item/types/commodity/sheet/CommoditySheetShell.svelte';
import createCommoditySheetState from '~/item/types/commodity/sheet/CommoditySheetState.js';

export default class TitanCommoditySheet extends TitanItemSheet {
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
            class: CommoditySheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createCommoditySheetState();
   }
}