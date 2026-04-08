import createTitanItemSheetData from '~/document/types/item/sheet/TitanItemSheetData.js';

/**
 * @typedef {TitanItemSheetData} SpellSheetData - Data representing the state of a Spell Sheet.
 * @property {object} sidebar.castingCheck - State for the Casting Check sidebar section.
 * @property {boolean} sidebar.castingCheck.isExpanded - Whether the Casting Check in the sidebar is expanded.
 * @property {object} tabs.castingCheck - State for the Casting Check tab.
 * @property {number} tabs.castingCheck.scrollTop - The current top of the scrollbar for the Casting Check tab.
 * @property {object} tabs.customAspects - State for the Custom Aspects tab.
 * @property {string} tabs.customAspects.filter - The current filter text for the Custom Aspects tab.
 * @property {boolean[]} tabs.customAspects.isExpanded - Array of booleans representing whether a Custom Aspect in the
 *    Custom Aspects tab is expanded.
 * @property {number} tabs.customAspects.scrollTop - The current top of the scrollbar for the Custom Aspects tab.
 * @property {object} tabs.standardAspects - State for the Standard Aspects tab.
 * @property {string} tabs.standardAspects.filter - The current filter text for the Standard Aspects tab.
 * @property {number} tabs.standardAspects.scrollTop - The current top of the scrollbar for the Standard Aspects tab.
 */

/**
 * Initializes the data for a Spell Sheet.
 * @param {TitanItem} item - The Item this sheet belongs to.
 * @returns {SpellSheetData} - The newly created Spell Sheet Data.
 */
export default function createSpellSheetData(item) {
   /** @type {SpellSheetData} Return data. */
   const retVal = createTitanItemSheetData(item);
   retVal.sidebar.castingCheck = { isExpanded: true };
   retVal.tabs.castingCheck = {
      scrollTop: 0
   };
   retVal.tabs.customAspects = {
      filter: '',
      isExpanded: [],
      scrollTop: 0
   };
   retVal.tabs.standardAspects = {
      filter: '',
      scrollTop: 0
   };

   // Initialize expanded state for custom aspects.
   for (let idx = 0; idx < item.system.customAspect.length; idx++) {
      retVal.tabs.customAspects.isExpanded.push(true);
   }

   return retVal;
}
