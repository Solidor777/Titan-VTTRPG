import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import CharacterSheetInventoryAddItemDialogShell from './CharacterSheetInventoryAddItemDialogShell.svelte';
export default class CharacterSheetInventoryAddItemDialog extends TJSDialog {
   constructor(sheet) {
      super(
         {
            title: `${localize('addNewItem')}`,
            content: {
               class: CharacterSheetInventoryAddItemDialogShell,
               props: {
                  sheet: sheet,
               },
            },
            // To do: Remove this once the tooltip action is in
            zIndex: null
         },
         {
            width: 150,
            height: 170,
         }
      );
   }
}
