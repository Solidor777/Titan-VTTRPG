import createWeaponSheetData from '~/document/types/item/types/weapon/sheet/WeaponSheetData.js';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';

/**
 * @typedef {RulesElementItemSheetState} WeaponSheetState A custom reactive store for managing a Weapon Sheet.
 * @property {() => void} addAttack - Updates the reactive state store in response to an Attack being added.
 * @property {(idx: number) => void} postDeleteAttack - Updates the reactive state store in response to an Attack being
 * deleted.
 * @property {(fromIdx: number, toIdx: number) => void} postMoveAttack - Reorders the per-attack expansion arrays in
 * lockstep with an Attack reorder.
 * @property {(atIdx: number) => void} postInsertAttack - Splices an expanded flag into the per-attack expansion arrays
 * when a copied Attack is inserted.
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
            postAddCheck,
            preDeleteCheck,
            postMoveCheck,
            postInsertCheck,
         } = createRulesElementItemSheetState(item, createWeaponSheetData(item));

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
    * @param {number} idx - The index of the Attack about to be deleted.
    */
   function postDeleteAttack(idx) {
      update((data) => {
         data.tabs.attacks.isExpanded.splice(idx, 1);
         data.sidebar.attacks.isExpanded.splice(idx, 1);
         return data;
      });
   }

   /**
    * Reorders the per-attack expansion arrays in lockstep with an Attack reorder so expansion state
    * tracks the moved row.
    * @param {number} fromIdx - The attack's current index.
    * @param {number} toIdx - The insertion point to move it before.
    */
   function postMoveAttack(fromIdx, toIdx) {
      update((data) => {
         data.tabs.attacks.isExpanded = moveArrayEntry(data.tabs.attacks.isExpanded, fromIdx, toIdx);
         data.sidebar.attacks.isExpanded = moveArrayEntry(data.sidebar.attacks.isExpanded, fromIdx, toIdx);
         return data;
      });
   }

   /**
    * Splices a fresh expanded flag into both per-attack expansion arrays when a copied attack is
    * inserted, keeping them aligned with the attack array.
    * @param {number} atIdx - The insertion point.
    */
   function postInsertAttack(atIdx) {
      update((data) => {
         data.tabs.attacks.isExpanded.splice(atIdx, 0, true);
         data.sidebar.attacks.isExpanded.splice(atIdx, 0, true);
         return data;
      });
   }

   return {
      set,
      update,
      subscribe,
      addAttack,
      postDeleteAttack,
      postMoveAttack,
      postInsertAttack,
      postAddCheck,
      preDeleteCheck,
      postMoveCheck,
      postInsertCheck,
   };
}
