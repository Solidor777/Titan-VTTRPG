import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { getSetting } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from "uuid";
import ConfirmationDialogShell from './ConfirmationDialogShell.svelte';
export default class ConfirmationDialog extends TJSDialog {
   constructor(title, headers, message, confirmLabel, width = 250, height = 210) {
      super(
         {
            title: title,
            content: {
               class: ConfirmationDialogShell,
               props: {
                  headers: headers,
                  message: message,
                  confirmLabel: confirmLabel,
               },
            },
            zIndex: null,
            id: `confirmaton-dialog-${uuidv4()}`,
         },
         {
            width: width,
            height: height,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }

   confirmed() {
      return;
   }
}
