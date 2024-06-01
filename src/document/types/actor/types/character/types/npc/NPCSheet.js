import NPCSheetShell from '~/document/types/actor/types/character/types/npc/NPCSheetShell.svelte';
import TitanCharacterSheet from '~/document/types/actor/types/character/sheet/CharacterSheet.js';

export default class TitanNPCSheet extends TitanCharacterSheet {

   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: NPCSheetShell,
            },
         },
      });
   }

   // Add the npc sheet class
   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-npc-sheet');

      return retVal;
   }
}
