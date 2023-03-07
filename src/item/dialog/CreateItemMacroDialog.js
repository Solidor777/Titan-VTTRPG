import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import CreateItemMacroDialogShell from '~/item/dialog/CreateItemMacroDialogShell.svelte';
export default class CreateItemMacroDialog extends TJSDialog {
   constructor(item, slot, uuid) {
      super(
         {
            title: `${localize('createMacro')} (${item.name})`,
            content: {
               class: CreateItemMacroDialogShell,
               props: {
                  item: item,
                  slot: slot,
                  uuid: uuid
               },
            },
            zIndex: null,
            id: `create-macro-dialog-${item._id}`,
         },
         {
            width: 370,
            height: 280,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
