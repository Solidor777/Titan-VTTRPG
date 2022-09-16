import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import { localize } from "~/helpers/Utility.js";
import SkillCheckDialogShell from "./SkillCheckDialogShell.svelte";
export default class SkillCheckDialog extends TJSDialog {
  constructor(actor, options) {
    super(
      {
        title: `${localize("skillCheck")} (${actor.name})`,
        content: {
          class: SkillCheckDialogShell,
          props: {
            options: options,
            actor: actor,
          },
        },
      },
      {
        width: 350,
        height: 490,
      }
    );
  }
}
