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
         width: 650,
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

   addCustomAspect() {
      this.applicationState.addCustomAspect();

      return;
   }

   async removeCustomAspect(idx) {
      this.applicationState.removeCustomAspect(idx);

      return;
   }
}