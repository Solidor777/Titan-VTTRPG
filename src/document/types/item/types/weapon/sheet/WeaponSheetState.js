
import { writable } from 'svelte/store';

/**
 * @param activeDescriptionTab
 */
export default function createWeaponSheetState(activeDescriptionTab) {
   const { set, update, subscribe } = writable({
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
         sidebar: 0,
         description: 0,
         attacks: 0,
         checks: 0,
         rulesElements: 0,
      },
      filter: {
         attacks: "",
         checks: "",
         rulesElements: ""
      }
   });

   /**
    *
    */
   function addAttack() {
      update((state) => {
         state.isExpanded.attacks.push(true);
         state.isExpanded.sidebar.attack.push(true);
         return state;
      });
   }

   /**
    * @param idx
    */
   function removeAttack(idx) {
      update((state) => {
         state.isExpanded.attacks.splice(idx, 1);
         state.isExpanded.sidebar.attack.splice(idx, 1);
         return state;
      });
   }

   /**
    *
    */
   function addCheck() {
      update((state) => {
         state.isExpanded.checks.push(true);
         state.isExpanded.sidebar.check.push(true);
         return state;
      });
   }

   /**
    * @param idx
    */
   function removeCheck(idx) {
      update((state) => {
         state.isExpanded.checks.splice(idx, 1);
         state.isExpanded.sidebar.check.splice(idx, 1);
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