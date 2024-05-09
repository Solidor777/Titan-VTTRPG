import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import localize from '~/helpers/utility-functions/Localize.js';
import CharacterSheetInventoryAddItemDialogShell from '~/document/types/actor/types/character/sheet/tabs/inventory/CharacterSheetInventoryAddItemDialogShell.svelte';
export default class CharacterSheetInventoryAddItemDialog extends TJSDialog {
   constructor(actor) {
      super(
         {
            title: `${localize('addNewItem')}`,
            content: {
               class: CharacterSheetInventoryAddItemDialogShell,
               props: {
                  actor: actor,
               },
            },
            zIndex: null,
            id: `add-inventory-item-dialog-${actor._id}`,
         },
         {
            width: 150,
            height: 170,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
