
import { writable } from 'svelte/store';

export default function createSpellSheetState() {
   const { set, update, subscribe } = writable({
      activeTab: 'description',
      isExpanded: {
         customAspects: []
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
      }
   });

   function addCustomAspect() {
      update((state) => {
         state.isExpanded.customAspects.push(true);
         return state;
      });
   }

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
      removeCustomAspect
   };
}