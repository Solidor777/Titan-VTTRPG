import { writable } from 'svelte/store';
import createTitanItemSheetData from '~/document/types/item/sheet/TitanItemSheetData.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';

/**
 * @typedef {import('svelte/store').Writable<TitanItemSheetData>} ItemSheetState A custom reactive store for managing
 * an Item Sheet.
 * @property {import('svelte/store').Writable<TitanItemSheetData>['set']} set - Replaces the entire stored state value.
 * @property {import('svelte/store').Writable<TitanItemSheetData>['update']} update - Mutates the stored state via an
 * updater callback.
 * @property {import('svelte/store').Writable<TitanItemSheetData>['subscribe']} subscribe - Registers a reactive
 * subscriber notified on every state change.
 * @property {() => void} postAddCheck - Updates the reactive state store in response to an Item Check being added.
 * @property {(idx: number) => void} preDeleteCheck - Updates the reactive state store in response to an Item Check
 * being deleted.
 * @property {(fromIdx: number, toIdx: number) => void} postMoveCheck - Reorders the per-check expansion arrays in
 * lockstep with an Item Check reorder.
 * @property {(atIdx: number) => void} postInsertCheck - Splices an expanded flag into the per-check expansion arrays
 * when a copied Item Check is inserted.
 * @property {() => {tabs: boolean[], sidebar: boolean[]}} snapshotCheckExpansion - Copies the per-check expansion
 * arrays of the Checks tab and the sidebar.
 * @property {(snapshot: {tabs: boolean[], sidebar: boolean[]}) => void} restoreCheckExpansion - Puts back the
 * expansion arrays copied by `snapshotCheckExpansion`.
 */

/**
 * Creates a reactive state store for an Item Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @param {typeof TitanItemSheetData} [overrideData] - Optional override data for initializing the store.
 * @returns {ItemSheetState} The newly created Item Sheet State.
 */
export default function createTitanItemSheetState(item, overrideData) {
   /** @type {import('svelte/store').Writable<TitanItemSheetData>} */
   const { set, update, subscribe } = writable(overrideData ?? createTitanItemSheetData(item));

   /**
    * Updates the reactive state store in response to an Item Check being added.
    */
   function postAddCheck() {
      update((data) => {
         data.tabs.checks.isExpanded.push(true);
         data.sidebar.checks.isExpanded.push(true);
         return data;
      });
   }

   /**
    * Updates the reactive state store in response to an Item Check being deleted.
    * @param {number} idx - The index of the Check about to be deleted.
    */
   function preDeleteCheck(idx) {
      update((data) => {
         data.tabs.checks.isExpanded.splice(idx, 1);
         data.sidebar.checks.isExpanded.splice(idx, 1);
         return data;
      });
   }

   /**
    * Reorders the per-check expansion arrays in lockstep with a check reorder so expansion state
    * tracks the moved row.
    * @param {number} fromIdx - The check's current index.
    * @param {number} toIdx - The insertion point to move it before.
    */
   function postMoveCheck(fromIdx, toIdx) {
      update((data) => {
         data.tabs.checks.isExpanded = moveArrayEntry(data.tabs.checks.isExpanded, fromIdx, toIdx);
         data.sidebar.checks.isExpanded = moveArrayEntry(data.sidebar.checks.isExpanded, fromIdx, toIdx);
         return data;
      });
   }

   /**
    * Splices a fresh expanded flag into both per-check expansion arrays when a copied check is
    * inserted, keeping them aligned with the check array.
    * @param {number} atIdx - The insertion point.
    */
   function postInsertCheck(atIdx) {
      update((data) => {
         data.tabs.checks.isExpanded.splice(atIdx, 0, true);
         data.sidebar.checks.isExpanded.splice(atIdx, 0, true);
         return data;
      });
   }

   /**
    * Copies the per-check expansion arrays so a check change that does not commit can be taken back.
    * @returns {{tabs: boolean[], sidebar: boolean[]}} The copied expansion arrays of the Checks tab and the sidebar.
    */
   function snapshotCheckExpansion() {
      /** @type {{tabs: boolean[], sidebar: boolean[]}} The copied arrays. */
      let snapshot;
      update((data) => {
         snapshot = {
            tabs: [...data.tabs.checks.isExpanded],
            sidebar: [...data.sidebar.checks.isExpanded],
         };
         return data;
      });
      return snapshot;
   }

   /**
    * Puts back the per-check expansion arrays copied by `snapshotCheckExpansion`.
    * @param {{tabs: boolean[], sidebar: boolean[]}} snapshot - The copied expansion arrays.
    */
   function restoreCheckExpansion(snapshot) {
      update((data) => {
         data.tabs.checks.isExpanded = [...snapshot.tabs];
         data.sidebar.checks.isExpanded = [...snapshot.sidebar];
         return data;
      });
   }

   return {
      set,
      update,
      subscribe,
      postAddCheck,
      preDeleteCheck,
      postMoveCheck,
      postInsertCheck,
      snapshotCheckExpansion,
      restoreCheckExpansion,
   };
}
