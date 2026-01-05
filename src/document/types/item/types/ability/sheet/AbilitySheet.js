import TitanItemSheet from '~/document/types/item/sheet/ItemSheet'
import AbilitySheetShell from '~/document/types/item/types/ability/sheet/AbilitySheetShell.svelte'
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js'

/**
 * An Item Sheet class with functionality shared by all Ability Items.
 * @param {TitanItem} sheetDocument - The Document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanAbilitySheet extends TitanItemSheet {
   /**
    * An Item Sheet class with functionality shared by all Ability Items.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor (sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-ability-sheet']
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes

      // Add Svelte Shell
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: AbilitySheetShell,
               },
            },
         }
      )

      // Initialize object
      super(sheetDocument, options)
   };
}
