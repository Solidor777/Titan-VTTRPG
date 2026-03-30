import TitanItemSheet from '~/document/types/item/sheet/TitanItemSheet.js';
import WeaponSheetShell from '~/document/types/item/types/weapon/sheet/WeaponSheetShell.svelte';
import createWeaponSheetState from '~/document/types/item/types/weapon/sheet/WeaponSheetState.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Item Sheet class with functionality shared by all Weapon Items.
 * @extends TitanItemSheet
 * @param {TitanItem} sheetDocument - The Document this sheet is for.
 * @param {object} options - Options object.
 * @property {WeaponSheetState} applicationState - Reactive store for managing the state of the Spell Sheet.
 */
export default class TitanSpellSheet extends TitanItemSheet {
   /**
    * An Item Sheet class with functionality shared by all Weapon Items.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-weapon-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: WeaponSheetShell,
               },
            },
         }
      );

      // Initialize self object.
      super(sheetDocument, options);
   };

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-weapon-sheet');

      return retVal;
   }

   _createReactiveState() {
      return createWeaponSheetState();
   }

   /**
    * Adds an Attack to this sheet's application state.
    */
   addAttack() {
      this.applicationState.addAttack();
   }

   /**
    * Removes the Attack at the provided idx from this sheet's application state.
    * @param {number} idx - The idx of the attack to remove.
    */
   postDeleteAttack(idx) {
      this.applicationState.postDeleteAttack(idx);
   }
}
