
import { writable } from 'svelte/store';

export default function createAbilitySheetState() {
   const { set, update, subscribe } = writable({
      scrollTop: {
         sidebar: 0,
         checks: 0,
      },
      isExpanded: {
         checks: []
      },
      activeTab: 'description'
   });

   function addCheck() {
      update((state) => {
         state.isExpanded.checks.push(true);
         return state;
      });
   }

   function removeCheck(idx) {
      update((state) => {
         state.isExpanded.checks.splice(idx, 1);
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