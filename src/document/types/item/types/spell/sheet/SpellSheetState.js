import createSpellSheetData from '~/document/types/item/types/spell/sheet/SpellSheetData.js';
import createTitanItemSheetState from '~/document/types/item/sheet/TitanItemSheetState.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';

/**
 * @typedef {ItemSheetState} SpellSheetState A custom reactive store for managing a Spell Sheet.
 * @property {() => void} addCustomAspect - Adds a Custom Aspect to the reactive application state.
 * @property {(idx: number) => void} removeCustomAspect - Removes the Custom Aspect at the provided index from the
 * reactive application state.
 * @property {(fromIdx: number, toIdx: number) => void} postMoveCustomAspect - Reorders the per-aspect expansion array
 * in lockstep with a Custom Aspect reorder.
 * @property {(atIdx: number) => void} postInsertCustomAspect - Splices an expanded flag into the per-aspect expansion
 * array when a copied Custom Aspect is inserted.
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

   /**
    * Reorders the per-aspect expansion array in lockstep with a Custom Aspect reorder so expansion
    * state tracks the moved row.
    * @param {number} fromIdx - The aspect's current index.
    * @param {number} toIdx - The insertion point to move it before.
    */
   function postMoveCustomAspect(fromIdx, toIdx) {
      update((data) => {
         data.tabs.customAspects.isExpanded = moveArrayEntry(data.tabs.customAspects.isExpanded, fromIdx, toIdx);
         return data;
      });
   }

   /**
    * Splices a fresh expanded flag into the per-aspect expansion array when a copied aspect is
    * inserted, keeping it aligned with the custom-aspect array.
    * @param {number} atIdx - The insertion point.
    */
   function postInsertCustomAspect(atIdx) {
      update((data) => {
         data.tabs.customAspects.isExpanded.splice(atIdx, 0, true);
         return data;
      });
   }

   return {
      set,
      update,
      subscribe,
      addCustomAspect,
      removeCustomAspect,
      postMoveCustomAspect,
      postInsertCustomAspect,
      postAddCheck,
      preDeleteCheck,
   };
}
