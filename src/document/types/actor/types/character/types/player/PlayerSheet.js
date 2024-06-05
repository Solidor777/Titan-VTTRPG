import PlayerSheetShell from '~/document/types/actor/types/character/types/player/PlayerSheetShell.svelte';
import TitanCharacterSheet from '~/document/types/actor/types/character/sheet/CharacterSheet.js';

export default class TitanPlayerSheet extends TitanCharacterSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: PlayerSheetShell,
            },
         },
      });
   }

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-player-sheet');

      return retVal;
   }
}
