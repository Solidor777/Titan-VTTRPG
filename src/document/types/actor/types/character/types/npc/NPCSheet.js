import NPCSheetShell from '~/document/types/actor/types/character/types/npc/NPCSheetShell.svelte';
import TitanCharacterSheet from '~/document/types/actor/types/character/sheet/CharacterSheet.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * A Character Sheet class with functionality shared by all NPCs.
 * @extends {TitanCharacterSheet}
 */
export default class TitanNPCSheet extends TitanCharacterSheet {
   /**
    * Merges the NPC CSS class and Svelte shell into the options before delegating to the base character sheet.
    * @param {TitanActor} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-npc-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: NPCSheetShell
               },
            },
         }
      );

      // Initialize self object.
      super(sheetDocument, options);
   }
}
