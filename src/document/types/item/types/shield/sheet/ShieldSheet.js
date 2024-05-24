import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import createShieldSheetState from '~/document/types/item/types/shield/sheet/ShieldSheetState.js';
import ShieldSheetShell from '~/document/types/item/types/shield/sheet/ShieldSheetShell.svelte';

export default class TitanShieldSheet extends TitanItemSheet {
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
               shell: ShieldSheetShell
            }
         }
      });
   }

   _createReactiveState() {
      return createShieldSheetState();
   }
}