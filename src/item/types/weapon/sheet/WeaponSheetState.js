
import { writable } from 'svelte/store';

export default function createWeaponSheetState() {
   const { set, update, subscribe } = writable({
      activeTab: 'description',
      isExpanded: {
         attacks: [],
         sidebar: {
            attack: []
         }
      },
      scrollTop: {
         sidebar: 0,
         description: 0,
         attacks: 0,
         checks: 0,
         rulesElements: 0,
      }
   });

   function addAttack() {
      update((state) => {
         state.isExpanded.attacks.push(true);
         state.isExpanded.sidebar.attack.push(true);
         return state;
      });
   }

   function removeAttack(idx) {
      update((state) => {
         state.isExpanded.attacks.splice(idx, 1);
         state.isExpanded.sidebar.attack.splice(idx, 1);
         if (state.isExpanded.attacks.length === 0) {
            state.isExpanded.attacks.push(true);
            state.isExpanded.sidebar.attack.push(true);
         }
         return state;
      });
   }

   return {
      set,
      update,
      subscribe,
      addAttack,
      removeAttack
   };
}