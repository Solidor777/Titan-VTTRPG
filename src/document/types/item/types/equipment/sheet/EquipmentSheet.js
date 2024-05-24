import TitanItemSheet from '~/document/types/item/sheet/ItemSheet.js';
import EquipmentSheetShell from '~/document/types/item/types/equipment/sheet/EquipmentSheetShell.svelte';
import createEquipmentSheetState from '~/document/types/item/types/equipment/sheet/EquipmentSheetState.js';

export default class TitanEquipmentSheet extends TitanItemSheet {
   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 700,
         height: 650,
         svelte: {
            props: {
               shell: EquipmentSheetShell
            }
         }
      });
   }


   _createReactiveState() {
      return createEquipmentSheetState();
   }
}