import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import SkillCheckDialogShell from "./SkillCheckDialogShell.svelte";
export class SkillCheckDialog extends TJSDialog {
  constructor(actor, options) {
    super(
      {
        title: `${game.i18n.localize(CONFIG.TITAN.local.skillCheck)} (${actor.name})`,
        content: {
          class: SkillCheckDialogShell,
          props: {
            options: options,
            actor: actor,
          },
        },
      },
      {
        width: 320,
        height: 350,
      }
    );
  }
}
