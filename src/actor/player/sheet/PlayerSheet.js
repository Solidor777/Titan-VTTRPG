import { SvelteDocumentSheet } from '../../../documents/DocumentSheet';
import PlayerSheetShell from './PlayerSheetShell.svelte';

export default class TitanPlayerSheet extends SvelteDocumentSheet {
  /**
   * Default Application options
   *
   * @returns {object} options - Application options.
   * @see https://foundryvtt.com/api/Application.html#options
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 750,
      height: 880,
      svelte: {
        class: PlayerSheetShell,
        target: document.body
      }
    });
  }
}