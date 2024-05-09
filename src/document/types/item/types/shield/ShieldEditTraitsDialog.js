import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import localize from '~/helpers/utility-functions/Localize.js';
import EditAttackTraitsDialogShell from '~/document/types/item/types/shield/ShieldEditTraitsDialogShell.svelte';
export default class ShieldEditTraitsDialog extends TJSDialog {
   constructor(document) {
      super(
         {
            title: `${localize('editTraits')} (${document.name})`,
            content: {
               class: EditAttackTraitsDialogShell,
               props: {
                  document: document,
               },
            },
            zIndex: null,
            id: `edit-shield-traits-dialog-${document._id}`,
         },
         {
            width: 320,
            height: 135,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
