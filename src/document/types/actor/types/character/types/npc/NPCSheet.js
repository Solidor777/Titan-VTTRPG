import NPCSheetShell from '~/document/types/actor/types/character/types/npc/NPCSheetShell.svelte';
import TitanCharacterSheet from '~/document/types/actor/types/character/sheet/CharacterSheet.js';
import mergeArrays from "~/helpers/utility-functions/MergeArrays.js";

/**
 * A Character Sheet class with functionality shared by all NPCs.
 * @param {Document} sheetDocument - The Document this sheet is for..
 * @param {object} options - Options object.
 */
export default class TitanNPCSheet extends TitanCharacterSheet {
   /**
    * A Character Sheet class with functionality shared by all NPCs.
    * @param {Document} sheetDocument - The Document this sheet is for..
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-npc-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: NPCSheetShell
               },
            },
         }
      );

      // Initialize object
      super(sheetDocument, options);
   }
}
