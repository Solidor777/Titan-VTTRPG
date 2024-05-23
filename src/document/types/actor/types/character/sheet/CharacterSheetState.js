import {writable} from 'svelte/store';

/**
 * Creates a writable object for storing the state of a Character Sheet.
 * @returns {object} Writable object for storing the state of a Character Sheet.
 */
export default function createCharacterSheetState() {
   const {set, update, subscribe} = writable({
      scrollTop: {
         abilities: 0,
         actions: 0,
         inventory: 0,
         skills: 0,
         spells: 0
      },
      isExpanded: {
         actions: {},
         abilities: {},
         inventory: {},
         spells: {},
      },
      filter: {
         abilities: '',
         actions: '',
         inventory: '',
         skills: '',
         spells: ''
      },
      filterOptions: {
         abilities: {
            action: false,
            reaction: false,
            passive: false
         }
      },
      activeTab: 'skills'
   });

   /**
    * Remove an item from the Character Sheet state.
    * @param {string} itemId - The ID of the Item to remove.
    */
   function deleteItem(itemId) {
      update((state) => {
         // Delete the item from the actions tab
         if (state.isExpanded.actions[itemId]) {
            delete state.isExpanded.actions[itemId];
         }

         // Delete the item from the inventory tab
         if (state.isExpanded.inventory[itemId]) {
            delete state.isExpanded.inventory[itemId];
         }

         // Delete the item from the spells tab
         if (state.isExpanded.spells[itemId]) {
            delete state.isExpanded.spells[itemId];
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