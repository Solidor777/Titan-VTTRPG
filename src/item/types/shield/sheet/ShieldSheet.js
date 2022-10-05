import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementSheetCompoment.js';
import TitanItemSheet from '~/item/sheet/ItemSheet.js';
import ShieldSheetShell from './ShieldSheetShell.svelte';
import createShieldSheetState from './ShieldSheetState.js';

export default class TitanShieldSheet extends TitanItemSheet {

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
            class: ShieldSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createShieldSheetState();
   }

   // Import add rules element functions
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);
}