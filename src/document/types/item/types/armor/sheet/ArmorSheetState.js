
import { writable } from 'svelte/store';

/**
 *
 */
export default function createArmorSheetState() {
   const { set, update, subscribe } = writable({
      activeTab: 'description',
      isExpanded: {
         checks: [],
         sidebar: {
            attack: [],
            check: [],
         },
      },
      scrollTop: {
         sidebar: 0,
         description: 0,
         checks: 0,
         rulesElements: 0,
      },
      filter: {
         checks: "",
         rulesElements: ""
      }
   });

   /**
    *
    */
   function addCheck() {
      update((state) => {
         state.isExpanded.checks.push(true);
         state.isExpanded.sidebar.check.push(true);
         return state;
      });
   }

   /**
    * @param idx
    */
   function removeCheck(idx) {
      update((state) => {
         state.isExpanded.checks.splice(idx, 1);
         state.isExpanded.sidebar.check.splice(idx, 1);
         return state;
      });
   }

   return {
      set,
      update,
      subscribe,
      addCheck,
      removeCheck
   };
}