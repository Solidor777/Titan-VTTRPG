import {writable} from 'svelte/store';
import itemSheetStateAddCheck from '~/document/types/item/sheet/ItemSheetStateAddCheck.js';
import itemSheetStateRemoveCheck from '~/document/types/item/sheet/ItemSheetStateRemoveCheck.js';

/**
 * Creates a reactive state store for a Spell sheet.
 * @returns {object} A reactive state store for a Spell sheet.
 */
export default function createSpellSheetState() {
   const {set, update, subscribe} = writable({
      activeTab: 'description',
      filter: {
         checks: '',
         customAspects: '',
         rulesElements: '',
         standardAspects: '',
      },
      isExpanded: {
         checks: [],
         customAspects: [],
         sidebar: {
            castingCheck: true,
            check: []
         }
      },
      scrollTop: {
         checks: 0,
         castingCheck: 0,
         customAspects: 0,
         description: 0,
         rulesElements: 0,
         sidebar: 0,
         standardAspects: 0,
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

   /**
    * Adds a Custom Aspect to the reactive application state.
    */
   function addCustomAspect() {
      update((state) => {
         state.isExpanded.customAspects.push(true);
         return state;
      });
   }

   /**
    * Removes the Custom Aspect the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Custom Aspect to remove.
    */
   function removeCustomAspect(idx) {
      update((state) => {
         state.isExpanded.customAspects.splice(idx, 1);
         return state;
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