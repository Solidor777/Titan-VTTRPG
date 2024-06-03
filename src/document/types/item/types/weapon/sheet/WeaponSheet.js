import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import TitanItemSheet from '~/document/types/item/sheet/ItemSheet.js';
import WeaponSheetShell from '~/document/types/item/types/weapon/sheet/WeaponSheetShell.svelte';
import createWeaponSheetState from '~/document/types/item/types/weapon/sheet/WeaponSheetState.js';

export default class TitanWeaponSheet extends TitanItemSheet {

   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         svelte: {
            props: {
               shell: WeaponSheetShell
            }
         }
      });
   }

   _createReactiveState() {
      return createWeaponSheetState(isHTMLBlank(this.document.system.attackNotes) ? 'itemDescription' : 'attackNotes');
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
   removeAttack(idx) {
      this.applicationState.removeAttack(idx);
   }
}