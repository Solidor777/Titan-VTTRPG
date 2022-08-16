import { SvelteDocumentSheet } from '~/documents/DocumentSheet';
import ArmorSheetShell from './ArmorSheetShell.svelte';

export default class TitanArmorSheet extends SvelteDocumentSheet {
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
            class: ArmorSheetShell,
            target: document.body
         }
      });
   }
}