import TitanItemSheet from '~/document/types/item/sheet/TitanItemSheet.js';
import EffectSheetShell from '~/document/types/item/types/effect/sheet/EffectSheetShell.svelte';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Item Sheet class with functionality shared by all Effect Items.
 * @extends {TitanItemSheet}
 */
export default class TitanEffectSheet extends TitanItemSheet {
   /**
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-effect-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: EffectSheetShell,
               },
            },
         }
      );

      // Initialize self object.
      super(sheetDocument, options);
   };
}
