import ConfirmationDialogShell from '~/helpers/dialogs/ConfirmationDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Generic class for creating a confirmation dialog.
 * @extends {TitanDialog}
 */
export default class ConfirmationDialog extends TitanDialog {
   /**
    * @param {string} title - The title for the Dialog.
    * @param {string[]} headers - Header lines to display at the top of the
    *    dialog.
    * @param {string} message - Message explaining the purpose of the dialog.
    * @param {string} confirmLabel - Label text for the confirmation button.
    * @param {Function} confirmationCallback - Callback function to execute on
    *    confirmation.
    * @param {object} [confirmationContext] - Optional context to bind to the
    *    callback function.
    */
   constructor(
      title,
      headers,
      message,
      confirmLabel,
      confirmationCallback,
      confirmationContext) {
      super({
         title: title,
         content: {
            class: ConfirmationDialogShell,
            props: {
               headers: headers,
               message: message,
               confirmLabel: confirmLabel,
            },
         },
         id: `titan-confirmation-dialog`,
      });

      // If we were provided with a callback context then bind the function to
      // the context
      if (confirmationContext) {
         this.confirmationCallback = confirmationCallback.bind(confirmationContext);
      }

      // Otherwise, simply cache the callback
      else {
         this.confirmationCallback = confirmationCallback;
      }
   }

   /**
    * @returns {string[]} Array of CSS classes to apply to the dialog element.
    * @protected
    * @override
    */
   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-confirmation-dialog');

      return retVal;
   }
}
