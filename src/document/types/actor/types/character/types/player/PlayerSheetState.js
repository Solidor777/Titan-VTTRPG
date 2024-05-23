
import { writable } from 'svelte/store';

/**
 *
 */
export default function createPlayerSheetState() {
   const { set, update, subscribe, unsubscribe } = writable({
      scrollTop: {
         abilities: 0,
         inventory: 0,
         skills: 0,
         spells: 0,
         notes: 0
      },
      isExpanded: {
         abilities: {},
         inventory: {},
         spells: {},
      },
      filter: {
         abilities: '',
         inventory: '',
         skills: '',
         spells: ''
      },
      filterOptions: {
         inventory: {
            weapon: false,
            armor: false,
            shield: false,
            equipment: false,
            commodity: false,
         },
         abilities: {
            action: false,
            reaction: false,
            passive: false
         }
      },
      activeTab: 'skills'
   });

   // Remove an item
   /**
    * @param id
    */
   function deleteItem(id) {
      update((state) => {
         if (state.isExpanded.inventory[id] === false || state.isExpanded.inventory[id] === true) {
            delete state.isExpanded.inventory[id];
         }

         if (state.isExpanded.abilities[id] === false || state.isExpanded.abilities[id] === true) {
            delete state.isExpanded.abilities[id];
         }

         if (state.isExpanded.spells[id] === false || state.isExpanded.spells[id] === true) {
            delete state.isExpanded.spells[id];
         }


         return state;
      });
   }

   return {
      set,
      update,
      subscribe,
      deleteItem,
      unsubscribe
   };
}