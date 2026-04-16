import TitanItemSheet from '~/document/types/item/sheet/TitanItemSheet.js';
import EquipmentSheetShell from '~/document/types/item/types/equipment/sheet/EquipmentSheetShell.svelte';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Item Sheet class with functionality shared by all Equipment Items.
 * @param {TitanItem} sheetDocument - The Document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanEquipmentSheet extends TitanItemSheet {
   /**
    * An Item Sheet class with functionality shared by all Equipment Items.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-equipment-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: EquipmentSheetShell,
               },
            },
         }
      );

      // Initialize self object.
      super(sheetDocument, options);
   };
}
