import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import WeaponAddCustomTraitDialogShell from './WeaponAddCustomTraitDialogShell.svelte';
export default class WeaponAddCustomTraitDialog extends TJSDialog {
   constructor(document, attackIdx) {
      super(
         {
            title: `${document.name}: ${document.system.attack[attackIdx].label}`,
            content: {
               class: WeaponAddCustomTraitDialogShell,
               props: {
                  attackIdx: attackIdx,
                  document: document,

               },
            },
            zIndex: null,
            id: `dialog-${document.name}`,
            classes: ['titan'],
         },
         {
            width: 300,
            height: 300,
         },
      );
   }
}
