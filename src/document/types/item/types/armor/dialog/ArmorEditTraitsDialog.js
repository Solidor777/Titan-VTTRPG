import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import localize from '~/helpers/utility-functions/Localize.js';
import ArmorEditTrainsDialogShell from '~/document/types/item/types/armor/dialog/ArmorEditTraitsDialogShell.svelte';

export default class ArmorEditTraitsDialog extends TJSDialog {
   constructor(document) {
      super(
         {
            title: `${localize('editTraits')} (${document.name})`,
            content: {
               class: ArmorEditTrainsDialogShell,
               props: {
                  document: document,
               },
            },
            zIndex: null,
            id: `edit-armor-traits-dialog-${document._id}`,
         },
         {
            width: 320,
            height: 180,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan'],
         },
      );
   }
}
