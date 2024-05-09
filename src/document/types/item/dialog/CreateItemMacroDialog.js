import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import localize from '~/helpers/utility-functions/Localize.js';
import CreateItemMacroDialogShell from '~/document/types/item/dialog/CreateItemMacroDialogShell.svelte';
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
