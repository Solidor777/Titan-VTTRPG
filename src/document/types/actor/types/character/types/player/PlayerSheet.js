import PlayerSheetShell from '~/document/types/actor/types/character/types/player/PlayerSheetShell.svelte';
import TitanCharacterSheet from '~/document/types/actor/types/character/sheet/CharacterSheet.js';
import mergeArrays from "~/helpers/utility-functions/MergeArrays.js";

/**
 * A Character Sheet class with functionality shared by all Player Characters.
 * @param {Document} sheetDocument - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanPlayerSheet extends TitanCharacterSheet {
   /**
    * A Character Sheet class with functionality shared by all Player Characters.
    * @param {Document} sheetDocument - The document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-character-sheet'];
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

      // Initialize object
      super(sheetDocument, options);
   };

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-player-sheet');

      return retVal;
   }
}
