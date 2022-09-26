import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import EditAttackTraitsDialogShell from './ArmorEditTraitsDialogShell.svelte';
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
            // To do: Remove this once the tooltip action is in
            zIndex: null
         },
         {
            width: 320,
            height: 135,
         }
      );
   }
}
