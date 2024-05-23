import { writable } from 'svelte/store';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import ResistanceCheckDialogShell from '~/check/types/resistance-check/dialog/ResistanceCheckDialogShell.svelte';

/**
 * @param {ResistanceCheckOptions} checkOptions - The initial options for the check to be adjusted.
 * @param {ResistanceCheckParameters} checkParameters - The initial parameters for the check,
 * calculated from the options.
 * @param {TitanActor} actor - The Actor that will roll the check.
 * @augments TitanDialog
 * Creates a dialog window for setting the Options of a Resistance Check.
 */
export default class ResistanceCheckDialog extends TitanDialog {

   /**
    * Creates a dialog window for setting the Options of a Resistance Check.
    * @param {ResistanceCheckOptions} checkOptions - The initial options for the check to be adjusted.
    * @param {ResistanceCheckParameters} checkParameters - The initial parameters for the check,
    * calculated from the options.
    * @param {TitanActor} actor - The Actor that will roll the check.
    */
   constructor(checkOptions, checkParameters, actor) {
      super(
         {
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
            id: `resistance-check-dialog-${actor._id}-${generateUUID()}`,
         },
      );
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('check-dialog', 'resistance-check-dialog');

      return retVal;
   }
}
