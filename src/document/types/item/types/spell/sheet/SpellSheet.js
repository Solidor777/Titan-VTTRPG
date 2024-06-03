import TitanItemSheet from '~/document/types/item/sheet/ItemSheet';
import SpellSheetShell from '~/document/types/item/types/spell/sheet/SpellSheetShell.svelte';
import createSpellSheetState from '~/document/types/item/types/spell/sheet/SpellSheetState';

export default class TitanSpellSheet extends TitanItemSheet {
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
               shell: SpellSheetShell
            }
         }
      });
   }

   _createReactiveState() {
      return createSpellSheetState();
   }

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-spell-sheet');

      return retVal;
   }

   /**
    * Adds a Custom Aspect to this sheet's application state.
    */
   addCustomAspect() {
      this.applicationState.addCustomAspect();
   }


   /**
    * Removes the Custom Aspect at the provided idx from this sheet's application state.
    * @param {number} idx - The idx of the aspect to remove.
    */
   async removeCustomAspect(idx) {
      this.applicationState.removeCustomAspect(idx);
   }
}