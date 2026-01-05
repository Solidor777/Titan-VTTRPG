import { writable } from 'svelte/store'
import itemSheetStateAddCheck from '~/document/types/item/sheet/ItemSheetStateAddCheck.js'
import itemSheetStateRemoveCheck from '~/document/types/item/sheet/ItemSheetStateRemoveCheck.js'

/**
 * @typedef {object} SpellSheetState - Reactive store for managing the state of a Spell Sheet.
 * @property {string} activeTab - The currently active sheet tab.
 * @property {object} filter - Object containing the current filters, arranged by sheet element.
 * @property {string} filter.checks - The current filter for the Checks tab.
 * @property {string} filter.customAspects - The current filter for the Custom Aspects tab.
 * @property {string} filter.rulesElements - The current filter for the Rules Elements tab.
 * @property {string} filter.standardAspects- The current filter for the Standard Aspects tab.
 * @property {object} isExpanded - Object containing the expanded state of the sheet, arranged by sheet element.
 * @property {bool[]} isExpanded.checks - Array of booleans representing whether an Item Check in the Checks tab is
 * expanded.
 * @property {bool[]} isExpanded.customAspects - Array of booleans representing whether a Custom Aspect in the Custom
 * Aspects tab is expanded.
 * @property {object} isExpanded.sidebar - Object containing the expanded state of the sidebar, arranged by sidebar
 * element.
 * @property {bool} isExpanded.sidebar.castingCheck- Whether the Casting Check in the sidebar is expanded.
 * @property {bool[]} isExpanded.sidebar.check - Array of booleans representing whether an Item Check in the sidebar is
 * expanded.
 * @property {object} scrollTop - Object containing the top of the scrollbar for each sheet element, arranged by
 * element.
 * @property {number} scrollTop.checks - The current top of the scrollbar for the Checks tab.
 * @property {number} scrollTop.castingCheck- The current top of the scrollbar for the Casting Check tab.
 * @property {number} scrollTop.customAspects - The current top of the scrollbar for the Custom Aspects tab.
 * @property {number} scrollTop.description - The current top of the scrollbar for the Description tab.
 * @property {number} scrollTop.rulesElements - The current top of the scrollbar for the Rules Elements tab.
 * @property {number} scrollTop.sidebar - The current top of the scrollbar for the sidebar.
 * @property {number} scrollTop.standardAspects - The current top of the scrollbar for the Standard Aspects tab.
 * @property {Function} addCheck - Adds an Item Check to the reactive application state.
 * @property {Function} removeCheck - Removes the Item Check at the provided idx from the reactive application state.
 * @property {Function} addCustomAspect - Adds a Custom Aspect to the reactive application state.
 * @property {Function} removeCustomAspect - Removes the Custom Aspect the provided idx from the reactive application
 * state.
 */

/**
 * Creates a reactive state store for a Spell sheet.
 * @returns {SpellSheetState} The newly created Spell Sheet State.
 */
export default function createSpellSheetState () {
   const { set, update, subscribe } = writable({
      activeTab: 'description',
      filter: {
         checks: '',
         customAspects: '',
         rulesElements: '',
         standardAspects: '',
      },
      isExpanded: {
         checks: [],
         customAspects: [],
         sidebar: {
            castingCheck: true,
            check: []
         }
      },
      scrollTop: {
         checks: 0,
         castingCheck: 0,
         customAspects: 0,
         description: 0,
         rulesElements: 0,
         sidebar: 0,
         standardAspects: 0,
      },
   })

   /**
    * Adds a Custom Aspect to the reactive application state.
    */
   function addCustomAspect () {
      update((state) => {
         state.isExpanded.customAspects.push(true)
         return state
      })
   }

   /**
    * Removes the Custom Aspect the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Custom Aspect to remove.
    */
   function removeCustomAspect (idx) {
      update((state) => {
         state.isExpanded.customAspects.splice(idx, 1)
         return state
      })
   }

   /**
    * Adds a Check to the reactive application state.
    */
   function addCheck () {
      update((state) => itemSheetStateAddCheck(state))
   }

   /**
    * Removes the Check at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Check to remove.
    */
   function removeCheck (idx) {
      update((state) => itemSheetStateRemoveCheck(state, idx))
   }

   return {
      set,
      update,
      subscribe,
      addCustomAspect,
      removeCustomAspect,
      addCheck,
      removeCheck,
   }
}
