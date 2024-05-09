import { writable } from 'svelte/store';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import AttackCheckDialogShell from '~/check/types/attack-check/dialog/AttackCheckDialogShell.svelte';

/**
 * Creates a dialog window for setting the Options of an Attack Check.
 * @augments TitanDialog
 * @param {AttackCheckOptions}      checkOptions     The initial options for the check to be adjusted.
 * @param {AttackCheckParameters}   checkParameters  The initial parameters for the check,
 *                                                   calculated from the options.
 * @param {TitanActor}              actor         The Actor that will roll the check.
 */
export default class AttackCheckDialog extends TitanDialog {

   /**
    * Creates a dialog window for setting the Options of an Attack Check.
    * @param {AttackCheckOptions}      checkOptions     The initial options for the check to be adjusted.
    * @param {AttackCheckParameters}   checkParameters  The initial parameters for the check,
    *                                                   calculated from the options.
    * @param {TitanActor}              actor         The Actor that will roll the check.
    */
   constructor(checkOptions, checkParameters, actor) {
      super(
         {
            title: `${localize('attackCheck')} (${actor.name})`,
            content: {
               class: CheckDialogShell,
               props: {
                  shell: AttackCheckDialogShell,
                  actor: actor,
                  checkOptions: writable(checkOptions),
                  checkParameters: writable(checkParameters),
               },
            },
            id: `attack-check-dialog-${actor._id}-${generateUUID()}`,
         },
      );
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('check-dialog', 'attack-check-dialog');

      return retVal;
   }
}
