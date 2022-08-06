import { SvelteDocumentSheet } from '~/documents/DocumentSheet';
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
         width: 600,
         height: 450,
         svelte: {
            class: WeaponSheetShell,
            target: document.body
         }
      });
   }
}