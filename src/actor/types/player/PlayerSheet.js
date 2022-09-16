import PlayerSheetShell from './PlayerSheetShell.svelte';
import TitanActorSheet from '~/actor/sheet/ActorSheet';

export default class TitanPlayerSheet extends TitanActorSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 750,
         height: 835,
         svelte: {
            class: PlayerSheetShell,
            target: document.body
         }
      });
   }
}