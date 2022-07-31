import { TJSDialog } from "@typhonjs-fvtt/runtime/svelte/application";
import ResistanceCheckDialogShell from "./ResistanceCheckDialogShell.svelte";
export class ResistanceCheckDialog extends TJSDialog {
  constructor(storeDoc, inData) {
    super(
      {
        title: `${game.i18n.localize(CONFIG.TITAN.local.resistanceCheck)} (${storeDoc.name})`,
        content: {
          class: ResistanceCheckDialogShell,
          props: {
            storeDoc: storeDoc,
            inData: inData,
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
