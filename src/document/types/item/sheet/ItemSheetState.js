import {writable} from 'svelte/store';
import itemSheetStateAddCheck from '~/document/types/item/sheet/ItemSheetStateAddCheck.js';
import itemSheetStateRemoveCheck from '~/document/types/item/sheet/ItemSheetStateRemoveCheck.js';

/**
 * Creates a reactive state store for an Item sheet.
 * @returns {object} A reactive state store for an Item sheet.
 */
export default function createItemSheetState() {
   const {set, update, subscribe} = writable({
      activeTab: 'description',
      filter: {
         checks: '',
         rulesElements: ''
      },
      isExpanded: {
         checks: [],
         sidebar: {
            check: []
         }
      },
      scrollTop: {
         checks: 0,
         description: 0,
         rulesElements: 0,
         sidebar: 0,
      },
   });

   /**
    * Adds a Check to the reactive application state.
    */
   function addCheck() {
      update((state) => itemSheetStateAddCheck(state));
   }

   /**
    * Removes the Check at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Check to remove.
    */
   function removeCheck(idx) {
      update((state) => itemSheetStateRemoveCheck(state, idx));
   }

   return {
      set,
      update,
      subscribe,
      addCheck,
      removeCheck,
   };
}