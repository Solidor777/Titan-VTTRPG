import PlayerSheetShell from '~/document/types/actor/types/character/types/player/PlayerSheetShell.svelte';
import TitanCharacterSheet from '~/document/types/actor/types/character/sheet/CharacterSheet.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * A Character Sheet class with functionality shared by all Player Characters.
 * @extends {TitanCharacterSheet}
 */
export default class TitanPlayerSheet extends TitanCharacterSheet {
   /**
    * @param {TitanActor} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-player-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: PlayerSheetShell,
               },
            },
         }
      );

      // Initialize self object.
      super(sheetDocument, options);
   };
}
