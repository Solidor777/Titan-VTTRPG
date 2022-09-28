
import { writable } from 'svelte/store';

export default function createAbilitySheetState() {
   const { set, update, subscribe } = writable({
      isExpanded: {
         checks: [],
         sidebar: {
            check: []
         }
      },
      scrollTop: {
         sidebar: 0,
         checks: 0,
         rulesElements: 0,
      },
      filter: {
         attacks: "",
         checks: "",
         rulesElements: ""
      },
      activeTab: 'description'
   });

   function addCheck() {
      update((state) => {
         state.isExpanded.checks.push(true);
         state.isExpanded.sidebar.check.push(true);
         return state;
      });
   }

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