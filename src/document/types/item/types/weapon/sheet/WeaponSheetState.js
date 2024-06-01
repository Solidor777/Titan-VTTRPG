import {writable} from 'svelte/store';
import itemSheetStateAddCheck from '~/document/types/item/sheet/ItemSheetStateAddCheck.js';
import itemSheetStateRemoveCheck from '~/document/types/item/sheet/ItemSheetStateRemoveCheck.js';

/**
 * Creates a reactive state store for a Weapon sheet.
 * @param {string} activeDescriptionTab - Which description tab should be active to start.
 * @returns {object} A reactive state store for a Weapon sheet.
 */
export default function createWeaponSheetState(activeDescriptionTab) {
   const {set, update, subscribe} = writable({
      activeTab: 'description',
      activeDescriptionTab: activeDescriptionTab,
      isExpanded: {
         attacks: [],
         checks: [],
         sidebar: {
            attack: [],
            check: [],
         },
      },
      scrollTop: {
         attacks: 0,
         checks: 0,
         description: 0,
         rulesElements: 0,
         sidebar: 0,
      },
      filter: {
         attacks: '',
         checks: '',
         rulesElements: ''
      }
   });

   /**
    * Adds a Check to the reactive application state.
    */
   function addCheck() {
      update((state) => itemSheetStateAddCheck(state));
   }

   /**
    * Removes the Check at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Check to remove.
    */
   function removeCheck(idx) {
      update((state) => itemSheetStateRemoveCheck(state, idx));
   }

   /**
    * Adds an Attack to the reactive application state.
    */
   function addAttack() {
      update((state) => {
         state.isExpanded.attacks.push(true);
         state.isExpanded.sidebar.attack.push(true);
         return state;
      });
   }

   /**
    * Removes the attack at the provided idx from the reactive application state.
    * @param {number} idx - The idx of the Attack to remove.
    */
   function removeAttack(idx) {
      update((state) => {
         state.isExpanded.attacks.splice(idx, 1);
         state.isExpanded.sidebar.attack.splice(idx, 1);
         return state;
      });
   }

   return {
      set,
      update,
      subscribe,
      addAttack,
      removeAttack,
      addCheck,
      removeCheck
   };
}