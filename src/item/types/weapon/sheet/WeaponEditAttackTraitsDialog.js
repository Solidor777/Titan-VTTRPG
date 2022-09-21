import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import EditAttackTraitsDialogShell from './WeaponEditAttackTraitsDialogShell.svelte';
export default class WeaponEditAttackTraitsDialog extends TJSDialog {
   constructor(document, attackIdx) {
      super(
         {
            title: `${document.name}: ${document.system.attack[attackIdx].label}`,
            content: {
               class: EditAttackTraitsDialogShell,
               props: {
                  attackIdx: attackIdx,
                  document: document,

               },
            },
            // To do: Remove this once the tooltip action is in
            zIndex: null
         },
         {
            width: 320,
            height: 470,
         }
      );
   }
}
