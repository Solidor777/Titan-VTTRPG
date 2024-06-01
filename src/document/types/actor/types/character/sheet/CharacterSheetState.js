import {writable} from 'svelte/store';

/**
 * Creates a reactive state store for a Character sheet.
 * @returns {object} A reactive state store for a Character sheet.
 */
export default function createCharacterSheetState() {
   const {set, update, subscribe} = writable({
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

   /**
    * Removes an Item from the reactive state store.
    * @param {string} itemId - The ID of the item to remove.
    */
   function deleteItem(itemId) {
      update((state) => {
         // Remove the item from the inventory tab.
         if (state.isExpanded.inventory[itemId] === false || state.isExpanded.inventory[itemId] === true) {
            delete state.isExpanded.inventory[itemId];
         }

         // Remove the item from the abilities tab.
         if (state.isExpanded.abilities[itemId] === false || state.isExpanded.abilities[itemId] === true) {
            delete state.isExpanded.abilities[itemId];
         }

         // Remove the item from the spells tab.
         if (state.isExpanded.spells[itemId] === false || state.isExpanded.spells[itemId] === true) {
            delete state.isExpanded.spells[itemId];
         }

         return state;
      });
   }

   return {
      set,
      update,
      subscribe,
      deleteItem,
   };
}