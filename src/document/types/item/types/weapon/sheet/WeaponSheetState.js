import createWeaponSheetData from '~/document/types/item/types/weapon/sheet/WeaponSheetData.js';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';

/**
 * @typedef {RulesElementItemSheetState} WeaponSheetState - A custom reactive store for managing a Weapon Sheet.
 * @property {Function} addAttack - Adds an Attack to the reactive application state.
 * @property {Function} removeAttack - Removes the Attack at the provided idx from the reactive application state.
 * @property {Function} addCheck - Adds a Check to the reactive application state.
 * @property {Function} removeCheck - Removes the Check at the provided idx from the reactive application state.
 */

/**
 * Creates a reactive state store for a Weapon Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @returns {WeaponSheetState} The newly created Weapon Sheet State.
 */
export default function createWeaponSheetState(item) {
   /** @type {import('svelte/store').Writable<WeaponSheetData>} */
   const {
            set,
            update,
            subscribe,
            addCheck,
            removeCheck
         } = createRulesElementItemSheetState(item, /** @type RulesElementItemSheetData */ createWeaponSheetData(item));

   /**
    * Adds an Attack to the reactive application state.
    */
   function addAttack() {
      update((data) => {
         data.tabs.attacks.isExpanded.push(true);
         data.sidebar.attacks.isExpanded.push(true);
         return data;
      });
   }

   /**
    * Removes the attack at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Attack to remove.
    */
   function removeAttack(idx) {
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
      removeAttack,
      addCheck,
      removeCheck
   };
}
