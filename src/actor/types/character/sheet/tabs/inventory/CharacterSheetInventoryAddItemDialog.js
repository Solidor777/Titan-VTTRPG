import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import CharacterSheetInventoryAddItemDialogShell from './CharacterSheetInventoryAddItemDialogShell.svelte';
export default class CharacterSheetInventoryAddItemDialog extends TJSDialog {
   constructor(sheet, options = {}) {
      super(
         {
            title: `${localize('addNewItem')}`,
            content: {
               class: CharacterSheetInventoryAddItemDialogShell,
               props: {
                  sheet: sheet,
               },
            },
            zIndex: null,
            id: `dialog-${sheet.reactive.document.name}`,
            classes: ['titan'],
         },
         {
            width: 150,
            height: 170,
         },
         options
      );
   }
}
