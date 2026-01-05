import { writable } from 'svelte/store'
import itemSheetStateAddCheck from '~/document/types/item/sheet/ItemSheetStateAddCheck.js'
import itemSheetStateRemoveCheck from '~/document/types/item/sheet/ItemSheetStateRemoveCheck.js'

/**
 * @typedef {object} ItemSheetState - Reactive store for managing the state of an Item Sheet.
 * @property {string} activeTab - The currently active sheet tab.
 * @property {object} filter - Object containing the current filters, arranged by sheet element.
 * @property {string} filter.checks - The current filter for the Checks tab.
 * @property {string} filter.rulesElements - The current filter for the Rules Elements tab.
 * @property {object} isExpanded - Object containing the expanded state of the sheet, arranged by sheet element.
 * @property {bool[]} isExpanded.check - Array of booleans representing whether an Item Check in the Checks tab is
 * expanded.
 * @property {object} isExpanded.sidebar - Object containing the expanded state of the sidebar, arranged by sidebar
 * element.
 * @property {bool[]} isExpanded.sidebar.checks - Array of booleans representing whether an Item Check in the sidebar
 * is expanded.
 * @property {object} scrollTop - Object containing the top of the scrollbar for each sheet element, arranged by
 * element.
 * @property {number} scrollTop.checks - The current top of the scrollbar for the Checks tab.
 * @property {number} scrollTop.description - The current top of the scrollbar for the Description tab.
 * @property {number} scrollTop.rulesElements - The current top of the scrollbar for the Rules Elements tab.
 * @property {number} scrollTop.sidebar - The current top of the scrollbar for the sidebar.
 * @property {Function} addCheck - Adds an Item Check to the reactive application state.
 * @property {Function} removeCheck - Removes the Item Check at the provided idx from the reactive application state.
 */

/**
 * Creates a reactive state store for an Item sheet.
 * @returns {ItemSheetState} The newly created Item Sheet State.
 */
export default function createItemSheetState () {
   const { set, update, subscribe } = writable({
      activeTab: 'description',
      filter: {
         checks: '',
         rulesElements: ''
      },
      isExpanded: {
         checks: [],
         sidebar: {
            check: []
         }
      },
      scrollTop: {
         checks: 0,
         description: 0,
         rulesElements: 0,
         sidebar: 0,
      },
   })

   /**
    * Adds an Item Check to the reactive application state.
    */
   function addCheck () {
      update((state) => itemSheetStateAddCheck(state))
   }

   /**
    * Removes the Item Check at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Check to remove.
    */
   function removeCheck (idx) {
      update((state) => itemSheetStateRemoveCheck(state, idx))
   }

   return {
      set,
      update,
      subscribe,
      addCheck,
      removeCheck,
   }
}
