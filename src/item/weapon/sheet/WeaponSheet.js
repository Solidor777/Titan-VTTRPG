import { SvelteDocumentSheet } from '~/documents/DocumentSheet';
import { WeaponEditAttackTraitsDialog } from "./WeaponEditAttackTraitsDialog.js";
import WeaponSheetShell from './WeaponSheetShell.svelte';

export default class TitanWeaponSheet extends SvelteDocumentSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 680,
         height: 690,
         svelte: {
            class: WeaponSheetShell,
            target: document.body
         }
      });
   }

   // Is collapsed object
   isExpanded = {
      desc: {
         attack: []
      },
      attacks: {
         attack: []
      },
   };

   activeTab = "description";

   // Handles deleting an attack
   async deleteAttack(key) {
      if (this.isExpanded.desc.attack.length === 1) {
         this.isExpanded.desc.attack[0] = false;
      }
      else {
         this.isExpanded.desc.attack.splice(key, 1);
      }
      await this.reactive.document.weapon.deleteAttack(key);
      return;
   }

   // Handles adding an attack
   async addAttack() {
      await this.reactive.document.weapon.addAttack();
      return;
   }

   // Opens the attack traits edit dialog
   editAttackTraits(attackIdx) {
      const dialog = new WeaponEditAttackTraitsDialog(this.reactive.document, attackIdx);
      dialog.render(true);
      return;
   }
}