
import { writable } from 'svelte/store';

export default function createWeaponSheetState() {
   const { set, update, subscribe } = writable({
      activeTab: 'description',
      isExpanded: {
         attack: []
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
         state.isExpanded.attack.push(true);
         return state;
      });
   }

   function removeAttack(idx) {
      update((state) => {
         state.isExpanded.attack.splice(idx, 1);
         if (state.isExpanded.attack.length === 0) {
            state.isExpanded.attack.push(true);
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