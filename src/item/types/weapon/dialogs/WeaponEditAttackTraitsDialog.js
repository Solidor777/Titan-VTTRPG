import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { getSetting } from '~/helpers/Utility';
import WeaponEditAttackTraitsDialogShell from '~/item/types/weapon/dialogs/WeaponEditAttackTraitsDialogShell.svelte';
export default class WeaponEditAttackTraitsDialog extends TJSDialog {
   constructor(document, attackIdx) {
      super(
         {
            title: `${document.name}: ${document.system.attack[attackIdx].label}`,
            content: {
               class: WeaponEditAttackTraitsDialogShell,
               props: {
                  attackIdx: attackIdx,
                  document: document,

               },
            },
            zIndex: null,
            id: `dialog-${document.name}`,
         },
         {
            width: 320,
            height: 470,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
