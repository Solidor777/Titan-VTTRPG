import createWeaponSheetData from '~/document/types/item/types/weapon/sheet/WeaponSheetData.js';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';

/**
 * @typedef {RulesElementItemSheetState} WeaponSheetState - A custom reactive store for managing a Weapon Sheet.
 * @property {Function} postAddAttack - Updates the reactive state store in response to an Attack being added.
 * @property {Function} postDeleteAttack - Updates the reactive state store in response to an Attack being deleted.
 */

/**
 * Creates a reactive state store for a Weapon Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @returns {WeaponSheetState} - The newly created Weapon Sheet State.
 */
export default function createWeaponSheetState(item) {
   /** @type {import('svelte/store').Writable<WeaponSheetData>} */
   const {
            set,
            update,
            subscribe,
            postAddCheck,
            preDeleteCheck,
         } = createRulesElementItemSheetState(item, /** @type RulesElementItemSheetData */ createWeaponSheetData(item));

   /**
    * Updates the reactive state store in response to an Attack being added.
    */
   function addAttack() {
      update((data) => {
         data.tabs.attacks.isExpanded.push(true);
         data.sidebar.attacks.isExpanded.push(true);
         return data;
      });
   }

   /**
    * Updates the reactive state store in response to an Attack being deleted.
    * @param {number} idx - The idx of the Attack that is about to be deleted.
    */
   function postDeleteAttack(idx) {
      update((data) => {
         data.tabs.attacks.isExpanded.splice(idx, 1);
         data.sidebar.attacks.isExpanded.splice(idx, 1);
         return data;
      });
   }

   return {
      set,
      update,
      subscribe,
      addAttack,
      postDeleteAttack,
      postAddCheck,
      preDeleteCheck
   };
}
