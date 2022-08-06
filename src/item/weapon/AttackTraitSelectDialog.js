import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import AttackTraitSelectDialogShell from "./AttackTraitSelectDialogShell.svelte";
export class AttackTraitSelectDialog extends TJSDialog {
  constructor(item, attackIdx) {
    super(
      {
        title: `${game.i18n.localize(CONFIG.TITAN.local.editAttackTraits)} (${item.name}:${item.system.attack[attackIdx].name})`,
        content: {
          class: AttackTraitSelectDialogShell,
          props: {
            attackIdx: attackIdx,
            item: item,
          },
        },
      },
      {
        width: 320,
        height: 275,
      }
    );
  }
}
