import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import ShieldSheetShell from '~/document/types/item/types/shield/sheet/ShieldSheetShell.svelte';

export default class TitanShieldSheet extends TitanItemSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: ShieldSheetShell
            }
         }
      });
   }
}