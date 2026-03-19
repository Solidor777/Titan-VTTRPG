/**
 * @typedef {ItemSheetData} RulesElementItemSheetData - Data representing the state of a Rules Element Item Sheet.
 * @extends {ItemSheetData}
 * @property {object} tabs.rulesElements - State for the Rules Elements tab.
 * @property {string} tabs.rulesElements.filter - The current filter text for the Rules Elements tab.
 * @property {number} tabs.rulesElements.scrollTop - The current top of the scrollbar for the Rules Elements tab.
 */

import createItemSheetData from '~/document/types/item/sheet/ItemSheetData.js';

/**
 * Initializes data for a Rules Element Item Sheet.
 * @param {TitanItem} item - The Item this sheet belongs to.
 * @returns {RulesElementItemSheetData} The newly created a Rules Element Item Sheet Data.
 */
export default function createRulesElementItemSheetData(item) {
   // Initialize return data.
   const retVal = createItemSheetData(item);
   retVal.tabs.rules = {
      filter: '',
      scrollTop: 0,
   };

   return retVal;
}
