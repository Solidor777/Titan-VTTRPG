import { writable } from 'svelte/store';
import createItemSheetData from '~/document/types/item/sheet/ItemSheetData.js';

/**
 * @typedef {import('svelte/store').Writable<ItemSheetData>} ItemSheetState - A custom reactive store for managing an
 *    Item Sheet.
 * @extends {import('svelte/store').Writable<ItemSheetData>}
 * @property {import('svelte/store').Writable<ItemSheetData>['set']} set
 * @property {import('svelte/store').Writable<ItemSheetData>['update']} update
 * @property {import('svelte/store').Writable<ItemSheetData>['subscribe']} subscribe
 * @property {Function} addCheck - Adds an Item Check to the reactive application state.
 * @property {Function} removeCheck - Removes the Item Check at the provided idx from the reactive application state.
 */

/**
 * Creates a reactive state store for an Item Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @param {ItemSheetData} [overrideData] - Option override data for initializing the writable.
 * @returns {ItemSheetState} The newly created Item Sheet State.
 */
export default function createItemSheetState(item, overrideData) {
   /** @type {import('svelte/store').Writable<ItemSheetData>} */
   const { set, update, subscribe } = writable(overrideData ?? createItemSheetData(item));

   /**
    * Adds an Item Check to the reactive application state.
    */
   function addCheck() {
      update((state) => {
         state.checks.isExpanded.push(true);
         state.sidebar.checks.isExpanded.push(true);
         return state;
      });
   }

   /**
    * Removes the Item Check at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Check to remove.
    */
   function removeCheck(idx) {
      update((state) => {
         state.checks.isExpanded.splice(idx, 1);
         state.sidebar.checks.isExpanded.splice(idx, 1);
         return state;
      });
   }

   return {
      set,
      update,
      subscribe,
      addCheck,
      removeCheck,
   };
}
