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
            zIndex: null,
            id: `dialog-${sheet.reactive.document.name}`,
         },
         {
            width: 150,
            height: 170,
            classes: game.settings.get('titan', 'darkModeSheets') === true ? ['titan', 'dark-mode'] : ['titan']
         },
      );
   }
}
