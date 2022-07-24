import { SvelteDocumentSheet } from '../../DocumentSheet';
import ActorSheetShell from './ActorSheetShell.svelte';

export default class TitanActorSheet extends SvelteDocumentSheet {
  /**
   * Default Application options
   *
   * @returns {object} options - Application options.
   * @see https://foundryvtt.com/api/Application.html#options
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 500,
      height: 700,
      svelte: {
        class: ActorSheetShell,
        target: document.body
      }
    });
  }
}