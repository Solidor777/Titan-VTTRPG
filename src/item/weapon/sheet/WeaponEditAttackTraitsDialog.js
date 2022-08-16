import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import EditAttackTraitsDialogShell from "./WeaponEditAttackTraitsDialogShell.svelte";
export class WeaponEditAttackTraitsDialog extends TJSDialog {
  constructor(item, attackIdx) {
    super(
      {
        title: `${game.i18n.localize(CONFIG.TITAN.local.editAttackTraits)} (${item.name}:${item.system.attack[attackIdx].name})`,
        content: {
          class: EditAttackTraitsDialogShell,
          props: {
            attackIdx: attackIdx,
            item: item,
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
