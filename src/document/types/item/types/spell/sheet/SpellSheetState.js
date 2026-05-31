import createSpellSheetData from '~/document/types/item/types/spell/sheet/SpellSheetData.js';
import createTitanItemSheetState from '~/document/types/item/sheet/TitanItemSheetState.js';

/**
 * @typedef {ItemSheetState} SpellSheetState A custom reactive store for managing a Spell Sheet.
 * @property {() => void} addCustomAspect - Adds a Custom Aspect to the reactive application state.
 * @property {(idx: number) => void} removeCustomAspect - Removes the Custom Aspect at the provided index from the
 * reactive application state.
 */

/**
 * Creates a reactive state store for a Spell Sheet.
 * @param {TitanItem} item - The item we are creating the sheet state for.
 * @returns {SpellSheetState} The newly created Spell Sheet State.
 */
export default function createSpellSheetState(item) {
   /** @type {import('svelte/store').Writable<SpellSheetData>} */
   const {
            set,
            update,
            subscribe,
            postAddCheck,
            preDeleteCheck
         } = createTitanItemSheetState(item, createSpellSheetData(item));

   /**
    * Adds a Custom Aspect to the reactive application state.
    */
   function addCustomAspect() {
      update((data) => {
         data.tabs.customAspects.isExpanded.push(true);
         return data;
      });
   }

   /**
    * Removes the Custom Aspect at the provided index from the reactive application state.
    * @param {number} idx - The index of the Custom Aspect to remove.
    */
   function removeCustomAspect(idx) {
      update((data) => {
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
      postAddCheck,
      preDeleteCheck,
   };
}
