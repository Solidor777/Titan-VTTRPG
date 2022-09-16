import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import AttackCheckDialogShell from "./AttackCheckDialogShell.svelte";
export class AttackCheckDialog extends TJSDialog {
   constructor(actor, options) {
      super(
         {
            title: `${game.i18n.localize(CONFIG.TITAN.local.attackCheck)} (${actor.name})`,
            content: {
               class: AttackCheckDialogShell,
               props: {
                  options: options,
                  actor: actor,
               },
            },
         },
         {
            width: 350,
            height: 555,
         }
      );
   }
}
