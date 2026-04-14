import { writable } from 'svelte/store';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import ResistanceCheckDialogShell from '~/check/types/resistance-check/dialog/ResistanceCheckDialogShell.svelte';

/**
 * Dialog window for setting the Options of a Resistance Check.
 * @extends {TitanDialog}
 */
export default class ResistanceCheckDialog extends TitanDialog {

   /**
    * @param {ResistanceCheckOptions} checkOptions - The initial options for the check to be adjusted.
    * @param {ResistanceCheckParameters} checkParameters - The initial parameters for the check,
    * calculated from the options.
    * @param {TitanActor} actor - The Actor that will roll the check.
    */
   constructor(checkOptions, checkParameters, actor) {
      super({
         title: `${localize('resistanceCheck')} (${actor.name})`,
         content: {
            class: CheckDialogShell,
            props: {
               shell: ResistanceCheckDialogShell,
               actor: actor,
               checkOptions: writable(checkOptions),
               checkParameters: writable(checkParameters),
            },
         },
         id: `titan-resistance-check-dialog-${actor.id}`,
      });
   }

   /**
    * @returns {string[]} Array of CSS classes to apply to the dialog element.
    * @protected
    * @override
    */
   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-check-dialog', 'titan-resistance-check-dialog');

      return retVal;
   }
}
