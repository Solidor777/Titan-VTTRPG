import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import EditAttackTraitsDialogShell from '~/item/types/armor/ArmorEditTraitsDialogShell.svelte';
export default class ArmorEditTraitsDialog extends TJSDialog {
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
            id: `dialog-${document.name}`,
         },
         {
            width: 320,
            height: 180,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
