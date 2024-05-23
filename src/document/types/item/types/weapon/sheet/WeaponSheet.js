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
         width: 650,
         height: 650,
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

   addAttack() {
      this.applicationState.addAttack();
   }

   removeAttack(idx) {
      this.applicationState.removeAttack(idx);
   }
}