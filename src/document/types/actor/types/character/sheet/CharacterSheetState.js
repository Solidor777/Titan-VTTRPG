import { writable } from 'svelte/store';

/**
 * @typedef {writable<Object>} CharacterSheetState - Reactive store for managing the state of a Character Sheet.
 * @property {string} activeTab - The currently active sheet tab.
 * @property {object} filter - Object containing the current filters, arranged by sheet element.
 * @property {string} filter.abilities - The current filter for the Abilities tab.
 * @property {string} filter.inventory - The current filter for the Inventory tab.
 * @property {string} filter.skills - The current filter for the Skills tab.
 * @property {string} filter.spells - The current filter for the Spells tab.
 * @property {object} filterOptions - Object containing the state of the filter options, arranged by sheet element.
 * @property {object} filterOptions.abilities - Object containing the state of the filter options for the Abilities
 * tab.
 * @property {boolean} filterOptions.abilities.action - Whether to filter the Abilities tab for Action abilities.
 * @property {boolean} filterOptions.abilities.reaction - Whether to filter the Abilities tab for Reaction abilities.
 * @property {boolean} filterOptions.abilities.passive - Whether to filter the Abilities tab for Passive abilities.
 * @property {object} filterOptions.inventory - Object containing the state of the filter options for the Inventory
 * tab.
 * @property {boolean} filterOptions.inventory.armor - Whether to filter the Inventory Tab for Armor items.
 * @property {boolean} filterOptions.inventory.commodity - Whether to filter the Inventory Tab for Commodity items.
 * @property {boolean} filterOptions.inventory.equipment - Whether to filter the Inventory Tab for Equipment items.
 * @property {boolean} filterOptions.inventory.shield - Whether to filter the Inventory Tab for Shield items.
 * @property {boolean} filterOptions.inventory.weapon - Whether to filter the Inventory Tab for Weapon items.
 * @property {object} isExpanded - Object containing the expanded state of the sheet, arranged by sheet element.
 * @property {object} isExpanded.abilities - Object of Booleans representing whether an Ability in the Abilities tab is
 * expanded, arranged by Item ID.
 * @property {object} isExpanded.inventory - Object of booleans representing whether an item in the Inventory tab is
 * expanded, arranged by Item ID.
 * @property {object} isExpanded.spells - Object of booleans representing whether a Spell in the Spells tab is
 * expanded, arranged by Item ID.
 * @property {object} scrollTop - Object containing the top of the scrollbar for each sheet element, arranged by
 * element.
 * @property {number} scrollTop.abilities - The current top of the scrollbar for the Abilities tab.
 * @property {number} scrollTop.inventory - The current top of the scrollbar for the Inventory tab.
 * @property {number} scrollTop.notes - The current top of the scrollbar for the Notes tab.
 * @property {number} scrollTop.skills - The current top of the scrollbar for the Skills tab.
 * @property {number} scrollTop.spells - The current top of the scrollbar for the Spells tab.
 * @property {Function} deleteItem - Removes an Item with provided ID from the reactive state store.
 * state.
 */

/**
 * Creates a reactive state store for a Character sheet.
 * @returns {CharacterSheetState} A reactive state store for a Character sheet.
 */
export default function createCharacterSheetState() {
   const { set, update, subscribe } = writable({
      activeTab: 'skills',
      filter: {
         abilities: '',
         inventory: '',
         skills: '',
         spells: '',
      },
      filterOptions: {
         abilities: {
            action: false,
            reaction: false,
            passive: false,
         },
         inventory: {
            armor: false,
            commodity: false,
            equipment: false,
            shield: false,
            weapon: false,
         },
      },
      isExpanded: {
         abilities: {},
         inventory: {},
         spells: {},
      },
      scrollTop: {
         abilities: 0,
         inventory: 0,
         notes: 0,
         skills: 0,
         spells: 0,
      },
   });

   /**
    * Removes an Item with provided ID from the reactive state store.
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
