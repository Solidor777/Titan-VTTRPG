import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementSheetCompoment.js';
import TitanItemSheet from '~/item/sheet/ItemSheet';
import ArmorEditTraitsDialog from './ArmorEditTraitsDialog';
import createArmorSheetState from './ArmorSheetState.js';
import ArmorSheetShell from './ArmorSheetShell.svelte';

export default class TitanArmorSheet extends TitanItemSheet {
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
            class: ArmorSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createArmorSheetState();
   }

   // Import add rules element functions
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);


   editArmorTraits() {
      const dialog = new ArmorEditTraitsDialog(this.reactive.document);
      dialog.render(true);
      return;
   }
}