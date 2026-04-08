import { writable } from 'svelte/store';
import createTitanItemSheetData from '~/document/types/item/sheet/TitanItemSheetData.js';

/**
 * @typedef {import('svelte/store').Writable<TitanItemSheetData>} ItemSheetState - A custom reactive store for managing
 *    an Item Sheet.
 * @extends {import('svelte/store').Writable<TitanItemSheetData>}
 * @property {import('svelte/store').Writable<TitanItemSheetData>['set']} set
 * @property {import('svelte/store').Writable<TitanItemSheetData>['update']} update
 * @property {import('svelte/store').Writable<TitanItemSheetData>['subscribe']} subscribe
 * @property {Function} postAddCheck - Updates the reactive state store in response to an Item Check being added.
 * @property {Function} preDeleteCheck - Updates the reactive state store in response to an Item Check being deleted.
 *    state.
 */

/**
 * Creates a reactive state store for an Item Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @param {TitanItemSheetData} [overrideData] - Option override data for initializing the writable.
 * @returns {ItemSheetState} - The newly created Item Sheet State.
 */
export default function createTitanItemSheetState(item, overrideData) {
   /** @type {import('svelte/store').Writable<ItemSheetData>} */
   const { set, update, subscribe } = writable(overrideData ?? createTitanItemSheetData(item));

   /**
    * Updates the reactive state store in response to an Item Check being added.
    */
   function postAddCheck() {
      update((data) => {
         data.checks.isExpanded.push(true);
         data.sidebar.checks.isExpanded.push(true);
         return data;
      });
   }

   /**
    * Updates the reactive state store in response to an Item Check being deleted.
    * @param {number} idx - The idx of the Check about to be deleted.
    */
   function preDeleteCheck(idx) {
      update((data) => {
         data.checks.isExpanded.splice(idx, 1);
         data.sidebar.checks.isExpanded.splice(idx, 1);
         return data;
      });
   }

   return {
      set,
      update,
      subscribe,
      postAddCheck,
      preDeleteCheck,
   };
}
