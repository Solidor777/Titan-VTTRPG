import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import ItemMacroDialogShell from '~/item/dialog/ItemMacroDialogShell.svelte';
export default class ItemMacroDialog extends TJSDialog {
   constructor(item, slot, uuid) {
      super(
         {
            title: `${localize('createMacro')} (${item.name})`,
            content: {
               class: ItemMacroDialogShell,
               props: {
                  item: item,
                  slot: slot,
                  uuid: uuid
               },
            },
            zIndex: null,
            id: `dialog-${item.name}`,
         },
         {
            width: 370,
            height: 280,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
