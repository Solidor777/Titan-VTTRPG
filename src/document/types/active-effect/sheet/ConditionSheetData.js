/**
 * @typedef {object} ConditionSheetData Data representing the state of a Condition Active Effect sheet.
 * @property {object} tabs - State for the sheet Tabs.
 * @property {string} tabs.activeTab - The currently active sheet tab.
 * @property {object} tabs.description - State for the Description tab.
 * @property {number} tabs.description.scrollTop - The current top of the scrollbar for the Description tab.
 * @property {object} tabs.rulesElements - State for the Rules Elements tab.
 * @property {string} tabs.rulesElements.filter - The current filter text for the Rules Elements tab.
 * @property {number} tabs.rulesElements.scrollTop - The current top of the scrollbar for the Rules Elements tab.
 */

/**
 * Initializes the data for a Condition Active Effect sheet. A condition has no checks, so the data holds no per-check
 * state and no sidebar state.
 * @param {TitanActiveEffect} condition - The condition this sheet belongs to.
 * @returns {ConditionSheetData} The newly created Condition Sheet Data.
 */
export default function createConditionSheetData(condition) {
   return {
      tabs: {
         activeTab: 'description',
         description: {
            scrollTop: 0,
         },
         rulesElements: {
            filter: '',
            scrollTop: 0,
         },
      },
   };
}
