import NPCSheetShell from '~/actor/types/npc/NPCSheetShell.svelte';
import TitanCharacterSheet from '~/actor/types/character/sheet/CharacterSheet.js';
import createNPCSheetState from '~/actor/types/npc/NPCSheetState';

export default class TitanNPCSheet extends TitanCharacterSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 750,
         height: 810,
         svelte: {
            class: NPCSheetShell,
            target: document.body
         },
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createNPCSheetState();
   }
}