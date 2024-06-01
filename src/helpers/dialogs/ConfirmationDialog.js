import ConfirmationDialogShell from '~/helpers/dialogs/ConfirmationDialogShell.svelte';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Generic class for creating a confirmation dialog.
 * @param {string} title - Dialog title.
 * @param {string[]} headers - Header lines.
 * @param {string} message - Message explaining the dialog.
 * @param {string} confirmLabel - Label for the confirmation button.
 * @param {Function} confirmationCallback - Callback function.
 * @param {object?} confirmationContext - Optional context to bind for the callback function.
 * @augments TitanDialog
 */
export default class ConfirmationDialog extends TitanDialog {
   /**
    * Generic class for creating a confirmation dialog.
    * @param {string} title - Dialog title.
    * @param {string[]} headers - Header lines.
    * @param {string} message - Message explaining the dialog.
    * @param {string} confirmLabel - Label for the confirmation button.
    * @param {Function} confirmationCallback - Callback function.
    * @param {object?} confirmationContext - Optional context to bind for the callback function.
    */
   constructor(
      title,
      headers,
      message,
      confirmLabel,
      confirmationCallback,
      confirmationContext) {
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
            id: `titan-confirmation-dialog-${generateUUID()}`,
         },
      );

      // If we were provided with a callback context then bind the function to the context
      if (confirmationContext) {
         this.confirmationCallback = confirmationCallback.bind(confirmationContext);
      }

      // Otherwise, simply cache the callback
      else {
         this.confirmationCallback = confirmationCallback;
      }
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-confirmation-dialog');

      return retVal;
   }
}
