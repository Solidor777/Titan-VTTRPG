import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import AbilitySheetShell from '~/document/types/item/types/ability/sheet/AbilitySheetShell.svelte';
import createAbilitySheetState from '~/document/types/item/types/ability/sheet/AbilitySheetState';

export default class TitanAbilitySheet extends TitanItemSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 700,
         height: 650,
         svelte: {
            props: {
               shell: AbilitySheetShell,
            },
         }
      });
   }

   _createReactiveState() {
      return createAbilitySheetState();
   }
}