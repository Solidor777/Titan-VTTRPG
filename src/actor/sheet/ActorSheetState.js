
import { writable } from 'svelte/store';

export default function createActorSheetState() {
   const { set, update, subscribe } = writable({
      scrollTop: {
         skills: 0,
         actions: 0,
         inventory: 0,
         spells: 0
      },
      isExpanded: {
         inventory: {},
         actions: {},
         spells: {},
      },
      activeTab: "skills"
   });

   // Remove an item
   function deleteItem(id) {
      update((state) => {
         if (state.isExpanded.actions[id]) {
            delete state.isExpanded.actions[id];
         }

         if (state.isExpanded.inventory[id]) {
            delete state.isExpanded.inventory[id];
         }

         if (state.isExpanded.spells[id]) {
            delete state.isExpanded.spells[id];
         }
         return state;
      });
   }

   return {
      set,
      update,
      subscribe,
      deleteItem
   };
}