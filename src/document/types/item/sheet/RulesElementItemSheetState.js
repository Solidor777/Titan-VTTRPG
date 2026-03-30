import createRulesElementItemSheetData from '~/document/types/item/sheet/RulesElementItemSheetData.js';
import createTitanItemSheetState from '~/document/types/item/sheet/TitanItemSheetState.js';

/**
 * @typedef {ItemSheetState} RulesElementItemSheetState - A custom reactive store for managing an Item Sheet.
 */

/**
 * Creates a reactive state store for a Rules Element Item Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @param {RulesElementItemSheetData?} overrideData - Override for initializing the writable.
 * @returns {RulesElementItemSheetState} The newly created Rules Element Item Sheet State.
 */
export default function createRulesElementItemSheetState(item, overrideData) {
   /** @type {import('svelte/store').Writable<RulesElementItemSheetData>} */
   const { set, update, subscribe, postAddCheck, preDeleteCheck } = createTitanItemSheetState(
      item,
      overrideData ?? /**@type TitanItemSheetData */ createRulesElementItemSheetData(item)
   );

   return {
      set,
      update,
      subscribe,
      postAddCheck,
      preDeleteCheck,
   };
}
