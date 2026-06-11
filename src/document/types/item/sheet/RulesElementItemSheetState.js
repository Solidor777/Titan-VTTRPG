import createRulesElementItemSheetData from '~/document/types/item/sheet/RulesElementItemSheetData.js';
import createTitanItemSheetState from '~/document/types/item/sheet/TitanItemSheetState.js';

/**
 * @typedef {ItemSheetState} RulesElementItemSheetState A custom reactive store for managing a Rules Element Item Sheet.
 */

/**
 * Creates a reactive state store for a Rules Element Item Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @param {typeof RulesElementItemSheetData} [overrideData] - Optional override data for initializing the store.
 * @returns {RulesElementItemSheetState} The newly created Rules Element Item Sheet State.
 */
export default function createRulesElementItemSheetState(item, overrideData) {
   /** @type {import('svelte/store').Writable<RulesElementItemSheetData>} */
   const { set, update, subscribe, postAddCheck, preDeleteCheck, postMoveCheck, postInsertCheck } =
      createTitanItemSheetState(item, overrideData ?? createRulesElementItemSheetData(item));

   return {
      set,
      update,
      subscribe,
      postAddCheck,
      preDeleteCheck,
      postMoveCheck,
      postInsertCheck,
   };
}
