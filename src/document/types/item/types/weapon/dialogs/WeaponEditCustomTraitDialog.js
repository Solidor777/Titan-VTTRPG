import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import WeaponEditCustomTraitDialogShell from '~/document/types/item/types/weapon/dialogs/WeaponEditCustomTraitDialogShell.svelte';
export default class WeaponEditCustomTraitDialog extends TJSDialog {
   constructor(document, attackIdx, traitIdx) {
      super(
         {
            title: `${document.name}: ${document.system.attack[attackIdx].label}`,
            content: {
               class: WeaponEditCustomTraitDialogShell,
               props: {
                  attackIdx: attackIdx,
                  document: document,
                  traitIdx: traitIdx,
               },
            },
            zIndex: null,
            id: `edit-custom-traits-dialog-${document._id}`,
         },
         {
            width: 300,
            height: 300,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
