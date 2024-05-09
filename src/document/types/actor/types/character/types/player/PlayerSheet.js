import PlayerSheetShell from '~/document/types/actor/types/character/types/player/PlayerSheetShell.svelte';
import TitanCharacterSheet from '~/document/types/actor/types/character/sheet/CharacterSheet.js';
import createPlayerSheetState from '~/document/types/actor/types/character/types/player/PlayerSheetState.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';

export default class TitanPlayerSheet extends TitanCharacterSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 750,
         svelte: {
            props: {
               shell: PlayerSheetShell,
            },
         },
      });
   }

   _createReactiveState() {
      return createPlayerSheetState();
   }

   _getSheetClasses() {
      const retVal = ['titan', 'titan-document-sheet'];

      // Add dark mode class if dark mode enabled
      if (getSetting('darkModeSheets')) {
         retVal.push('titan-dark-mode');
      }

      return retVal;
   }
}
