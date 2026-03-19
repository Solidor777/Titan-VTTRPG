import { writable } from 'svelte/store';
import createCharacterSheetData from '~/document/types/actor/types/character/sheet/CharacterSheetData.js';

/**
 * @typedef {object} CharacterSheetState - The custom reactive store for managing a Character Sheet.
 * @property {import('svelte/store').Writable<CharacterSheetData>['set']} set
 * @property {import('svelte/store').Writable<CharacterSheetData>['update']} update
 * @property {import('svelte/store').Writable<CharacterSheetData>['subscribe']} subscribe
 * @property {Function} deleteItem - Removes an Item with the provided ID from the reactive state store.
 */

/**
 * Creates a reactive state store for a Character sheet.
 * @param {TitanActor} actor - The Actor this sheet belongs to.
 * @returns {CharacterSheetState} The newly created Character Sheet Store.
 */
export default function createCharacterSheetState(actor) {
   /** @type {import('svelte/store').Writable<CharacterSheetData>} */
   const { set, update, subscribe } = writable(createCharacterSheetData(actor));

   /**
    * Adds an Item to the reactive state store tracking.
    * @param {TitanItem} item - The Item to add.
    */
   function addItem(item) {
      update((data) => {
         switch (item.type) {
            case 'ability' : {
               data.tabs.abilities.isExpanded[item.id] = false;
               break;
            }
            case 'armor':
            case 'commodity':
            case 'equipment':
            case 'shield':
            case 'weapon': {
               data.tabs.inventory.isExpanded[item.id] = false;
               break;
            }
            case 'spell': {
               data.tabs.spells.isExpanded[item.id] = false;
               break;
            }
            default: {
               break;
            }
         }

         return data;
      });
   }

   /**
    * Removes an Item from the reactive state store tracking.
    * @param {TitanItem} item - The Item to remove.
    */
   function deleteItem(item) {
      update((data) => {
         switch (item.type) {
            case 'ability' : {
               delete data.tabs.abilities.isExpanded[item.id];
               break;
            }
            case 'armor':
            case 'commodity':
            case 'equipment':
            case 'shield':
            case 'weapon': {
               delete data.tabs.inventory.isExpanded[item.id];
               break;
            }
            case 'spell': {
               delete data.tabs.spells.isExpanded[item.id];
               break;
            }
            default: {
               break;
            }
         }

         return data;
      });
   }

   return {
      set,
      update,
      subscribe,
      addItem,
      deleteItem,
   };
}
