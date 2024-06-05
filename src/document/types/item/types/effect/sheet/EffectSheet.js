import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import EffectSheetShell from '~/document/types/item/types/effect/sheet/EffectSheetShell.svelte';

/**
 * Sheet for a Titan Effect item.
 * @param {Document} document - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanEffectSheet extends TitanItemSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: EffectSheetShell
            },
         }
      });
   }

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-effect-sheet');

      return retVal;
   }
}