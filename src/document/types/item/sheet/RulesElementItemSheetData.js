import createTitanItemSheetData from '~/document/types/item/sheet/TitanItemSheetData.js';

/**
 * @typedef {TitanItemSheetData} RulesElementItemSheetData - Data representing the state of a Rules Element
 *    Item Sheet.
 * @property {object} tabs.rulesElements - State for the Rules Elements tab.
 * @property {string} tabs.rulesElements.filter - The current filter text for the Rules Elements tab.
 * @property {number} tabs.rulesElements.scrollTop - The current top of the scrollbar for the Rules Elements tab.
 */

/**
 * Initializes the data for a Rules Element Item Sheet.
 * @param {TitanItem} item - The Item this sheet belongs to.
 * @returns {RulesElementItemSheetData} - The newly created a Rules Element Item Sheet Data.
 */
export default function createRulesElementItemSheetData(item) {
   /** @type {RulesElementItemSheetData} Return data. */
   const retVal = createTitanItemSheetData(item);
   retVal.tabs.rulesElements = {
      filter: '',
      scrollTop: 0,
   };

   return retVal;
}
