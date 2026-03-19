import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import createRulesElementItemSheetData from '~/document/types/item/sheet/RulesElementItemSheetData.js';

/**
 * @typedef {RulesElementItemSheetData} WeaponSheetData - Data representing the state of a Weapon Sheet.
 * @extends {RulesElementItemSheetData}
 * @property {object} sidebar.attacks - State for the Attacks sidebar section.
 * @property {boolean[]} sidebar.attacks.isExpanded - Array of booleans representing whether an Attack in the sidebar.
 * @property {object} tabs.attacks - State for the Attacks tab.
 * @property {string} tabs.attacks.filter - The current filter text for the Attacks tab.
 * @property {boolean[]} tabs.attacks.isExpanded - Array of booleans representing whether an Attack in the Attacks tab
 *    is expanded.
 * @property {number} tabs.attacks.scrollTop - The current top of the scrollbar for the Attacks tab.
 * @property {string} tabs.description.activeDescriptionTab - Which sub-tab in the description should be active.
 */

/**
 * Initializes the data for a Weapon Sheet.
 * @param {TitanItem} item - The Item this sheet belongs to.
 * @returns {WeaponSheetData} The newly created Weapon Sheet Data.
 */
export default function createWeaponSheetData(item) {
   /** @type {WeaponSheetData} Return Data. */
   const retVal = createRulesElementItemSheetData(item);

   retVal.sidebar.attacks = {
      isExpanded: [],
   };

   retVal.tabs.attacks = {
      isExpanded: [],
      scrollTop: 0,
      filter: '',
   };

   // Set description tab based on whether this weapon has any attack notes.
   // FIX: Changed 'this.document' to 'item'
   retVal.tabs.description.activeDescriptionTab =
      isHTMLBlank(item.system.attackNotes) ? 'itemDescription' : 'attackNotes';

   // Initialize expanded state for attacks.
   for (let idx = 0; idx < item.system.attack.length; idx++) {
      retVal.sidebar.attacks.isExpanded.push(true);
      retVal.tabs.attacks.isExpanded.push(true);
   }

   return retVal;
}
