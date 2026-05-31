import TitanItemSheet from '~/document/types/item/sheet/TitanItemSheet.js';
import WeaponSheetShell from '~/document/types/item/types/weapon/sheet/WeaponSheetShell.svelte';
import createWeaponSheetState from '~/document/types/item/types/weapon/sheet/WeaponSheetState.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Item Sheet class with functionality shared by all Weapon Items.
 * @property {WeaponSheetState} applicationState - Reactive store for managing the state of the Weapon Sheet.
 * @extends {TitanItemSheet}
 */
export default class TitanWeaponSheet extends TitanItemSheet {
   /**
    * Merges the Weapon sheet CSS class and Svelte shell into the options before delegating to the base Item sheet.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-weapon-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: WeaponSheetShell,
               },
            },
         }
      );

      super(sheetDocument, options);
   }

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @override
    * @returns {typeof WeaponSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return createWeaponSheetState(/** @type {TitanItem} */ this.document);
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
