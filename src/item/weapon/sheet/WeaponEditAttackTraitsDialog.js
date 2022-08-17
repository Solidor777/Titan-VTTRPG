import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import EditAttackTraitsDialogShell from "./WeaponEditAttackTraitsDialogShell.svelte";
export class WeaponEditAttackTraitsDialog extends TJSDialog {
   constructor(document, attackIdx) {
      super(
         {
            title: `${game.i18n.localize(CONFIG.TITAN.local.editAttackTraits)} (${document.name}: ${document.system.attack[attackIdx].name})`,
            content: {
               class: EditAttackTraitsDialogShell,
               props: {
                  attackIdx: attackIdx,
                  document: document,
               },
            },
         },
         {
            width: 320,
            height: 570,
         }
      );
   }
}
