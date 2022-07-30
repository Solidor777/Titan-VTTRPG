import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import ResistanceCheckDialogShell from "./ResistanceCheckDialogShell.svelte";
export class ResistanceCheckDialog extends TJSDialog {
  constructor(storeDoc, checkData) {
    super(
      {
        title: `${game.i18n.localize(CONFIG.TITAN.local.resistanceCheck)} (${storeDoc.name})`,
        content: {
          class: ResistanceCheckDialog,
          props: {
            storeDoc: storeDoc,
            checkData: checkData,
          },
        },
      },
      {
        width: 400,
        height: 300,
      }
    );
  }
}
