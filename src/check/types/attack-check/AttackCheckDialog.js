import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import { localize } from "~/helpers/Utility.js";
import AttackCheckDialogShell from "./AttackCheckDialogShell.svelte";
export default class AttackCheckDialog extends TJSDialog {
   constructor(actor, options) {
      super(
         {
            title: `${localize("attackCheck")} (${actor.name})`,
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
