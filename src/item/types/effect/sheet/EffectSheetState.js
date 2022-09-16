
import { writable } from 'svelte/store';

export default function createEffectSheetState() {
   const { set, update, subscribe } = writable({
      activeTab: "description"
   });


   return {
      set,
      update,
      subscribe,
   };
}