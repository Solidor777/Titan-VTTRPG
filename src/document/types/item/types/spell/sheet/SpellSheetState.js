/**
 * @typedef {ItemSheetState} SpellSheetState - A custom reactive store for managing a Spell Sheet.
 * @property {Function} addCustomAspect - Adds a Custom Aspect to the reactive application state.
 * @property {Function} removeCustomAspect - Removes the Custom Aspect at the provided idx from the reactive
 *    application state.
 * @property {Function} addCheck - Adds a Check to the reactive application state.
 * @property {Function} removeCheck - Removes the Check at the provided idx from the reactive application state.
 */

import createSpellSheetData from '~/document/types/item/types/spell/sheet/SpellSheetData.js';
import createTitanItemSheetState from '~/document/types/item/sheet/TitanItemSheetState.js';

/**
 * Creates a reactive state store for a spell Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @returns {SpellSheetState} The newly created Spell Sheet State.
 */
export default function createSpellSheetState(item) {
   /** @type {import('svelte/store').Writable<WeaponSheetData>} */
   const {
            set,
            update,
            subscribe,
            addCheck,
            removeCheck
         } = createTitanItemSheetState(item, /** @type ItemSheetData */ createSpellSheetData(item));

   /**
    * Adds a Custom Aspect to the reactive application state.
    */
   function addCustomAspect() {
      update((data) => {
         // Updated to use the new tab-based structure
         data.tabs.customAspects.isExpanded.push(true);
         return data;
      });
   }

   /**
    * Removes the Custom Aspect at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Custom Aspect to remove.
    */
   function removeCustomAspect(idx) {
      update((data) => {
         // Updated to use the new tab-based structure
         data.tabs.customAspects.isExpanded.splice(idx, 1);
         return data;
      });
   }

   return {
      set,
      update,
      subscribe,
      addCustomAspect,
      removeCustomAspect,
      addCheck,
      removeCheck,
   };
}
