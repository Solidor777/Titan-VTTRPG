import PlayerSheetShell from '~/actor/types/player/PlayerSheetShell.svelte';
import TitanCharacterSheet from '~/actor/types/character/sheet/CharacterSheet.js';
import createPlayerSheetState from '~/actor/types/player/PlayerSheetState';

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
         height: 845,
         svelte: {
            class: PlayerSheetShell,
            target: document.body
         },
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createPlayerSheetState();
   }
}