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
 * @property {(idx: number) => (CheckExpansionEntry|undefined)} preDeleteCheck - Updates the reactive state store in
 * response to an Item Check being deleted. Returns the removed expansion flags, or undefined when no check is at the
 * index.
 * @property {(fromIdx: number, toIdx: number) => void} postMoveCheck - Reorders the per-check expansion arrays in
 * lockstep with an Item Check reorder.
 * @property {(atIdx: number) => void} postInsertCheck - Splices an expanded flag into the per-check expansion arrays
 * when a copied Item Check is inserted.
 * @property {(idx: number, removed: CheckExpansionEntry) => void} undoDeleteCheck - Puts back the expansion flags
 * `preDeleteCheck` removed, for a delete that did not commit.
 * @property {(fromIdx: number, toIdx: number) => void} undoMoveCheck - Moves the expansion flags back, for a reorder
 * that did not commit; takes the arguments of the `postMoveCheck` it takes back.
 * @property {(atIdx: number) => void} undoInsertCheck - Removes the expansion flags `postInsertCheck` added, for an
 * insert that did not commit.
 */

/**
 * @typedef {object} CheckExpansionEntry The expansion flags of one check.
 * @property {boolean} tabs - Whether the check is expanded in the Checks tab.
 * @property {boolean} sidebar - Whether the check is expanded in the sidebar.
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
    * @returns {CheckExpansionEntry|undefined} The removed expansion flags, or undefined when no check is at the index.
    */
   function preDeleteCheck(idx) {
      /** @type {CheckExpansionEntry|undefined} The flags taken out of the arrays. */
      let removed;
      update((data) => {
         if (idx >= 0 && idx < data.tabs.checks.isExpanded.length) {
            removed = {
               tabs: data.tabs.checks.isExpanded[idx],
               sidebar: data.sidebar.checks.isExpanded[idx],
            };
            data.tabs.checks.isExpanded.splice(idx, 1);
            data.sidebar.checks.isExpanded.splice(idx, 1);
         }
         return data;
      });
      return removed;
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

   // The three undo methods reverse one entry of the arrays, so an expansion toggle made while the update was in
   // flight stays. Constraint: copying a snapshot of the arrays back would overwrite that toggle.

   /**
    * Puts back the expansion flags `preDeleteCheck` removed.
    * @param {number} idx - The index the flags were removed from.
    * @param {CheckExpansionEntry} removed - The flags `preDeleteCheck` returned.
    */
   function undoDeleteCheck(idx, removed) {
      update((data) => {
         data.tabs.checks.isExpanded.splice(idx, 0, removed.tabs);
         data.sidebar.checks.isExpanded.splice(idx, 0, removed.sidebar);
         return data;
      });
   }

   /**
    * Moves the expansion flags back after a reorder that did not commit. The moved flag sits at the index the
    * reorder's insertion point resolved to; the inverse insertion point is the original index, shifted past the moved
    * flag when it lies after it (`moveArrayEntry` semantics).
    * @param {number} fromIdx - The `fromIdx` of the `postMoveCheck` to take back.
    * @param {number} toIdx - The `toIdx` of the `postMoveCheck` to take back.
    */
   function undoMoveCheck(fromIdx, toIdx) {
      /** @type {number} The index the moved flag sits at after the reorder. */
      const movedIdx = toIdx > fromIdx ? toIdx - 1 : toIdx;

      /** @type {number} The insertion point that returns the flag to `fromIdx`. */
      const backTo = fromIdx > movedIdx ? fromIdx + 1 : fromIdx;
      update((data) => {
         data.tabs.checks.isExpanded = moveArrayEntry(data.tabs.checks.isExpanded, movedIdx, backTo);
         data.sidebar.checks.isExpanded = moveArrayEntry(data.sidebar.checks.isExpanded, movedIdx, backTo);
         return data;
      });
   }

   /**
    * Removes the expansion flags `postInsertCheck` added.
    * @param {number} atIdx - The insertion point of the `postInsertCheck` to take back.
    */
   function undoInsertCheck(atIdx) {
      update((data) => {
         data.tabs.checks.isExpanded.splice(atIdx, 1);
         data.sidebar.checks.isExpanded.splice(atIdx, 1);
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
      undoDeleteCheck,
      undoMoveCheck,
      undoInsertCheck,
   };
}
