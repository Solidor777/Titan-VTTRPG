import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import EditAttackTraitsDialogShell from "./ArmorEditTraitsDialogShell.svelte";
export class ArmorEditTraitsDialog extends TJSDialog {
   constructor(document) {
      super(
         {
            title: `${game.i18n.localize(CONFIG.TITAN.local.editTraits)} (${document.name})`,
            content: {
               class: EditAttackTraitsDialogShell,
               props: {
                  document: document,
               },
            },
         },
         {
            width: 320,
            height: 135,
         }
      );
   }
}
