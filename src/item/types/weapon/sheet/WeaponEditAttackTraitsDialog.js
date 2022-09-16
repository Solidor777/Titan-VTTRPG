import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import { localize } from "~/helpers/Utility.js";
import EditAttackTraitsDialogShell from "./WeaponEditAttackTraitsDialogShell.svelte";
export default class WeaponEditAttackTraitsDialog extends TJSDialog {
   constructor(document, attackIdx) {
      super(
         {
            title: `${"editAttackTraits"} (${document.name}: ${document.system.attack[attackIdx].name})`,
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
