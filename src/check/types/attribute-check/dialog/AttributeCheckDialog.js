import {writable} from 'svelte/store';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import AttributeCheckDialogShell from '~/check/types/attribute-check/dialog/AttributeCheckDialogShell.svelte';

/**
 * Creates a dialog window for setting the Options of an Attribute Check.
 * @param {AttributeCheckOptions} checkOptions - The initial options for the check to be adjusted.
 * @param {AttributeCheckParameters} checkParameters - The initial parameters for the check,
 * calculated from the options.
 * @param {TitanActor} actor - The Actor that will roll the check.
 * @augments TitanDialog
 */
export default class AttributeCheckDialog extends TitanDialog {

   /**
    * Creates a dialog window for setting the Options of an Attribute Check.
    * @param {AttributeCheckOptions} checkOptions - The initial options for the check to be adjusted.
    * @param {AttributeCheckParameters} checkParameters - The initial parameters for the check,
    * calculated from the options.
    * @param {TitanActor} actor - The Actor that will roll the check.
    * @augments TitanDialog
    */
   constructor(checkOptions, checkParameters, actor) {
      super({
         title: `${localize('attributeCheck')} (${actor.name})`,
         content: {
            class: CheckDialogShell,
            props: {
               shell: AttributeCheckDialogShell,
               actor: actor,
               checkOptions: writable(checkOptions),
               checkParameters: writable(checkParameters),
            },
         },
         id: `titan-attribute-check-dialog-${actor._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-check-dialog', 'titan-attribute-check-dialog');

      return retVal;
   }
}
