import { writable } from 'svelte/store';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import AttackCheckDialogShell from '~/check/types/attack-check/dialog/AttackCheckDialogShell.svelte';

/**
 * Dialog window for setting the Options of an Attack Check.
 * @extends {TitanDialog}
 */
export default class AttackCheckDialog extends TitanDialog {

   /**
    * Constructs the Attack Check dialog and seeds its reactive stores with the supplied options and parameters.
    * @param {AttackCheckOptions} checkOptions - The initial options for the check to be adjusted.
    * @param {AttackCheckParameters} checkParameters - The initial parameters
    * for the check, calculated from the options.
    * @param {TitanActor} actor - The Actor that will roll the check.
    */
   constructor(checkOptions, checkParameters, actor) {
      super({
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
         id: `titan-attack-check-dialog-${actor.id}`,
      });
   }

   /**
    * @override
    * @returns {string[]} Array of CSS classes to apply to the dialog element.
    * @protected
    */
   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-check-dialog', 'titan-attack-check-dialog');

      return retVal;
   }
}
