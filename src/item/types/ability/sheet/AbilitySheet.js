import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementSheetCompoment.js';

import TitanItemSheet from '~/item/sheet/ItemSheet';
import AbilitySheetShell from '~/item/types/ability/sheet/AbilitySheetShell.svelte';
import createAbilitySheetState from '~/item/types/ability/sheet/AbilitySheetState';

export default class TitanAbilitySheet extends TitanItemSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 650,
         height: 650,
         svelte: {
            class: AbilitySheetShell,
            target: document.body
         }
      });
   }

   // Import add rules element functions
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   constructor(object) {
      super(object);
      this.reactive.state = createAbilitySheetState();
   }
}