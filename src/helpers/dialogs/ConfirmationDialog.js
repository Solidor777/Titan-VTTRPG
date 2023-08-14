import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { getSetting } from '~/helpers/Utility.js';
import { Hashing } from '@typhonjs-fvtt/runtime/util';
import ConfirmationDialogShell from './ConfirmationDialogShell.svelte';
export default class ConfirmationDialog extends TJSDialog {
   constructor(title, headers, message, confirmLabel, width = 250, height = 210, confirmationCallback, confirmationContext) {
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
            id: `confirmaton-dialog-${Hashing.uuidv4()}`,
         },
         {
            width: width,
            height: height,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );

      if (typeof (confirmationCallback) === 'function') {
         if (confirmationContext) {
            this.confirmationCallback = confirmationCallback.bind(confirmationContext);
         }
         else {
            this.confirmationCallback = confirmationCallback;
         }
      }
   }

   confirmed() {
      return;
   }
}
