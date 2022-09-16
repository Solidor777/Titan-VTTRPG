import TitanItemSheet from '~/item/sheet/ItemSheet';
import EffectSheetShell from './EffectSheetShell.svelte';
import createEffectSheetState from './EffectSheetState';
import { addRuleElement } from '~/rules-elements/RuleElement';

export default class TitanEffectSheet extends TitanItemSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 450,
         height: 450,
         svelte: {
            class: EffectSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createEffectSheetState();
   }

   async addRulesElement() {
      await addRuleElement(this.reactive.document);
   }
}