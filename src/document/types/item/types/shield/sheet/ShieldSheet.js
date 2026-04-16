import TitanItemSheet from '~/document/types/item/sheet/TitanItemSheet.js';
import ShieldSheetShell from '~/document/types/item/types/shield/sheet/ShieldSheetShell.svelte';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Item Sheet class with functionality shared by all Shield Items.
 * @param {TitanItem} sheetDocument - The Document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanShieldSheet extends TitanItemSheet {
   /**
    * An Item Sheet class with functionality shared by all Shield Items.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-shield-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: ShieldSheetShell,
               },
            },
         }
      );

      // Initialize self object.
      super(sheetDocument, options);
   };
}
