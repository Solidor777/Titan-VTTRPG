import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import { localize } from "~/helpers/Utility.js";
import ResistanceCheckDialogShell from "./ResistanceCheckDialogShell.svelte";
export default class ResistanceCheckDialog extends TJSDialog {
  constructor(actor, options) {
    super(
      {
        title: `${localize("resistanceCheck")} (${actor.name})`,
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
        height: 295,
      }
    );
  }
}
