import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { getSetting } from '~/helpers/Utility';
import WeaponAddCustomAttackTraitDialogShell from '~/item/types/weapon/dialogs/WeaponAddCustomAttackTraitDialogShell.svelte';
export default class WeaponAddCustomAttackTraitDialog extends TJSDialog {
   constructor(document, attackIdx) {
      super(
         {
            title: `${document.name}: ${document.system.attack[attackIdx].label}`,
            content: {
               class: WeaponAddCustomAttackTraitDialogShell,
               props: {
                  attackIdx: attackIdx,
                  document: document,
               },
            },
            zIndex: null,
            id: `add-custom-attack-trait-dialog-${document._id}`,
         },
         {
            width: 300,
            height: 300,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
