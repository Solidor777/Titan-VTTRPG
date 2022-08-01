import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import { TJSDocument } from "@typhonjs-fvtt/runtime/svelte/store";
import ResistanceCheckDialogShell from "./ResistanceCheckDialogShell.svelte";
export class ResistanceCheckDialog extends TJSDialog {
  constructor(actor, options) {
    super(
      {
        title: `${game.i18n.localize(CONFIG.TITAN.local.resistanceCheck)} (${actor.name})`,
        content: {
          class: ResistanceCheckDialogShell,
          props: {
            options: options,
            actor: actor,
          },
        },
      },
      {
        width: 320,
        height: 300,
      }
    );
  }
}
