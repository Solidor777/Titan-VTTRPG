
import { writable } from 'svelte/store';

export default function createSpellSheetState() {
   const { set, update, subscribe } = writable({
      activeTab: 'description',
      isExpanded: {
         checks: [],
         customAspects: [],
         sidebar: {
            check: []
         }
      },
      scrollTop: {
         sidebar: 0,
         description: 0,
         standardAspects: 0,
         customAspects: 0,
         castingCheck: 0,
      },
      filter: {
         standardAspects: "",
         customAspects: "",
         checks: ""
      }
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

   function addCustomAspect() {
      update((state) => {
         state.isExpanded.customAspect.push(true);
         return state;
      });
   }

   function removeCustomAspect(idx) {
      update((state) => {
         state.isExpanded.customAspect.splice(idx, 1);
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