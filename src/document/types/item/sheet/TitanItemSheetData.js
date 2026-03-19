/**
 * @typedef {object} TitanItemSheetData - Data representing the state of an Item Sheet.
 * @property {object} sidebar - State for the persistent sidebar.
 * @property {object} sidebar.checks - State for the Checks sidebar section.
 * @property {boolean[]} sidebar.checks.isExpanded - Array of booleans representing whether an Item Check in the
 *    sidebar is expanded.
 * @property {number} sidebar.scrollTop - The current top of the scrollbar for the sidebar.
 * @property {object} tabs - State for the sheet Tabs.
 * @property {string} tabs.activeTab - The currently active sheet tab.
 * @property {object} tabs.description - State for the Description tab.
 * @property {number} tabs.description.scrollTop - The current top of the scrollbar for the Description tab.
 * @property {object} tabs.checks - State for the Checks tab.
 * @property {string} tabs.checks.filter - The current filter text for the Checks tab.
 * @property {boolean[]} tabs.checks.isExpanded - Array of booleans representing whether an Item Check in the Checks
 *    tab is expanded.
 * @property {number} tabs.checks.scrollTop - The current top of the scrollbar for the Checks tab.
 */

/**
 * Initializes the data for an Item Sheet.
 * @param {TitanItem} item - The Item this sheet belongs to.
 * @returns {TitanItemSheetData} The newly created Item Sheet Data.
 */
export default function createTitanItemSheetData(item) {
   // Initialize return data.
   const retVal = {
      sidebar: {
         checks: {
            isExpanded: [],
         },
         scrollTop: 0
      },
      tabs: {
         activeTab: 'description',
         description: {
            scrollTop: 0,
         },
         checks: {
            filter: '',
            isExpanded: [],
            scrollTop: 0,
         },
      }
   };

   // Initialize expanded state for checks.
   for (let idx = 0; idx < item.system.check.length; idx++) {
      retVal.sidebar.checks.isExpanded.push(true);
      retVal.tabs.checks.isExpanded.push(true);
   }

   return retVal;
}
