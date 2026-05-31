import { writable } from 'svelte/store';
import createCharacterSheetData from '~/document/types/actor/types/character/sheet/CharacterSheetData.js';

/**
 * @typedef {import('svelte/store').Writable<CharacterSheetData>} CharacterSheetState The custom reactive store for
 * managing a Character Sheet.
 * @property {import('svelte/store').Writable<CharacterSheetData>['set']} set - Replaces the entire stored state value.
 * @property {import('svelte/store').Writable<CharacterSheetData>['update']} update - Mutates the stored state via an
 * updater callback.
 * @property {import('svelte/store').Writable<CharacterSheetData>['subscribe']} subscribe - Registers a reactive
 * subscriber notified on every state change.
 * @property {(item: TitanItem) => void} postAddItem - Updates the reactive state store in response to an Item being
 * added.
 * @property {(item: TitanItem) => void} preDeleteItem - Updates the reactive state store in response to an Item being
 * deleted.
 */

/**
 * Creates a reactive state store for a Character Sheet.
 * @param {TitanActor} actor - The Actor this sheet belongs to.
 * @returns {CharacterSheetState} The newly created Character Sheet State.
 */
export default function createCharacterSheetState(actor) {
   /** @type {import('svelte/store').Writable<CharacterSheetData>} */
   const { set, update, subscribe } = writable(createCharacterSheetData(actor));

   /**
    * Updates the reactive state store in response to an Item being added.
    * @param {TitanItem} item - The Item that was added.
    */
   function postAddItem(item) {
      update((data) => {
         switch (item.type) {
            case 'ability': {
               data.tabs.abilities.isExpanded[item._id] = false;
               break;
            }
            case 'armor':
            case 'commodity':
            case 'equipment':
            case 'shield':
            case 'weapon': {
               data.tabs.inventory.isExpanded[item._id] = false;
               break;
            }
            case 'spell': {
               data.tabs.spells.isExpanded[item._id] = false;
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
    * Updates the reactive state store in response to an Item being deleted.
    * @param {TitanItem} item - The Item about to be deleted.
    */
   function preDeleteItem(item) {
      update((data) => {
         switch (item.type) {
            case 'ability': {
               delete data.tabs.abilities.isExpanded[item._id];
               break;
            }
            case 'armor':
            case 'commodity':
            case 'equipment':
            case 'shield':
            case 'weapon': {
               delete data.tabs.inventory.isExpanded[item._id];
               break;
            }
            case 'spell': {
               delete data.tabs.spells.isExpanded[item._id];
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
      postAddItem,
      preDeleteItem,
   };
}
