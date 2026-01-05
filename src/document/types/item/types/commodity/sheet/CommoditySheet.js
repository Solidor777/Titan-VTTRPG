import TitanItemSheet from '~/document/types/item/sheet/ItemSheet.js'
import CommoditySheetShell from '~/document/types/item/types/commodity/sheet/CommoditySheetShell.svelte'
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js'

/**
 * An Item Sheet class with functionality shared by all Commodity Items.
 * @param {TitanItem} sheetDocument - The Document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanCommoditySheet extends TitanItemSheet {
   /**
    * An Item Sheet class with functionality shared by all Commodity Items.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor (sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-commodity-sheet']
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes

      // Add Svelte Shell
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: CommoditySheetShell,
               },
            },
         }
      )

      // Initialize object
      super(sheetDocument, options)
   };
}
