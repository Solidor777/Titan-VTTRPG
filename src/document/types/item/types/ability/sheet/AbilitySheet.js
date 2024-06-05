import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import AbilitySheetShell from '~/document/types/item/types/ability/sheet/AbilitySheetShell.svelte';

/**
 * Sheet for a Titan Ability item.
 * @param {Document} document - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanAbilitySheet extends TitanItemSheet {

   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: AbilitySheetShell,
            },
         }
      });
   }

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-ability-sheet');

      return retVal;
   }
}