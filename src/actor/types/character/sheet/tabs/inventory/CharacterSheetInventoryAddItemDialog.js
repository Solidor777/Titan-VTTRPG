import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import CharacterSheetInventoryAddItemDialogShell from '~/actor/types/character/sheet/tabs/inventory/CharacterSheetInventoryAddItemDialogShell.svelte';
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
            id: `dialog-${actor.name}`,
         },
         {
            width: 150,
            height: 170,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
