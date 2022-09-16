import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import CastingCheckDialogShell from "./CastingCheckDialogShell.svelte";
export default class CastingCheckDialog extends TJSDialog {
   constructor(actor, options) {
      super(
         {
            title: `${game.i18n.localize("LOCAL.castingCheck.label")} (${actor.name})`,
            content: {
               class: CastingCheckDialogShell,
               props: {
                  options: options,
                  actor: actor,
               },
            },
         },
         {
            width: 350,
            height: 520,
         }
      );
   }
}
