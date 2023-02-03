import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import CharacterSheetDeleteItemDialogShell from './CharacterSheetDeleteItemDialogShell.svelte';
export default class CharacterSheetDeleteItemDialog extends TJSDialog {
   constructor(sheet, itemName, itemId) {
      super(
         {
            title: `${localize('deleteItem')}`,
            content: {
               class: CharacterSheetDeleteItemDialogShell,
               props: {
                  sheet: sheet,
                  itemName: itemName,
                  itemId: itemId,
               },
            },
            zIndex: null,
            id: `dialog-${sheet.reactive.document.name}`,
         },
         {
            width: 250,
            height: 210,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
