import TitanItemSheet from '~/item/sheet/ItemSheet.js';
import EquipmentSheetShell from './EquipmentSheetShell.svelte';
import createEquipmentSheetState from './EquipmentSheetState.js';

export default class TitanEquipmentSheet extends TitanItemSheet {
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
            class: EquipmentSheetShell,
            target: document.body
         }
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createEquipmentSheetState();
   }

   async addRulesElement() {
      return await this.reactive.document.typeComponent.addRulesElement();
   }

   async removeRulesElement(idx) {
      return await this.reactive.document.typeComponent.removeRulesElement(idx);
   }
}