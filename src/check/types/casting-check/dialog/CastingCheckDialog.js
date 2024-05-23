import { writable } from 'svelte/store';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import CastingCheckDialogShell from '~/check/types/casting-check/dialog/CastingCheckDialogShell.svelte';

/**
 * Creates a dialog window for setting the Options of a Casting Check.
 * @param {CastingCheckOptions} checkOptions - The initial options for the check to be adjusted.
 * @param {CastingCheckParameters} checkParameters - The initial parameters for the check,
 * calculated from the options.
 * @param {TitanActor} actor - The Actor that will roll the check.
 * @augments TitanDialog
 */
export default class CastingCheckDialog extends TitanDialog {

   /**
    * Creates a dialog window for setting the Options of a Casting Check.
    * @param {CastingCheckOptions} checkOptions - The initial options for the check to be adjusted.
    * @param {CastingCheckParameters} checkParameters - The initial parameters for the check,
    * calculated from the options.
    * @param {TitanActor} actor - The Actor that will roll the check.
    */
   constructor(checkOptions, checkParameters, actor) {
      super(
         {
            title: `${localize('castingCheck')} (${actor.name})`,
            content: {
               class: CheckDialogShell,
               props: {
                  shell: CastingCheckDialogShell,
                  actor: actor,
                  checkOptions: writable(checkOptions),
                  checkParameters: writable(checkParameters),
               },
            },
            id: `casting-check-dialog-${actor._id}-${generateUUID()}`,
         },
      );
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('check-dialog', 'casting-check-dialog');

      return retVal;
   }
}
