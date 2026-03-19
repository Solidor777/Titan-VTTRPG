import createRulesElementItemSheetData from '~/document/types/item/sheet/RulesElementItemSheetData.js';
import createItemSheetState from '~/document/types/item/sheet/ItemSheetState.js';

/**
 * @typedef {ItemSheetState} RulesElementItemSheetState - A custom reactive store for managing an Item Sheet.
 * @extends {ItemSheetState}
 */

/**
 * Creates a reactive state store for a Rules Element Item Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @param {RulesElementItemSheetData} [overrideData] - Override for initializing the writable.
 * @returns {RulesElementItemSheetState} The newly created Rules Element Item Sheet State.
 */
export default function createRulesElementItemSheetState(item, overrideData) {
   /** @type {import('svelte/store').Writable<RulesElementItemSheetData>} */
   const { set, update, subscribe, addCheck, removeCheck } = createItemSheetState(
      item,
      overrideData ?? /** @type ItemSheetData */ createRulesElementItemSheetData(item)
   );

   return {
      set,
      update,
      subscribe,
      addCheck,
      removeCheck,
   };
}
