import { writable } from 'svelte/store';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import ItemCheckDialogShell from '~/check/types/item-check/dialog/ItemCheckDialogShell.svelte';

/**
 * Dialog window for setting the Options of an Item Check.
 * @extends {TitanDialog}
 */
export default class ItemCheckDialog extends TitanDialog {

   /**
    * @param {ItemCheckOptions} checkOptions - The initial options for the check to be adjusted.
    * @param {ItemCheckParameters} checkParameters - The initial parameters for the check calculated from the options.
    * @param {TitanActor} actor - The Actor that will roll the check.
    */
   constructor(checkOptions, checkParameters, actor) {
      super({
         title: `${localize('itemCheck')} (${actor.name})`,
         content: {
            class: CheckDialogShell,
            props: {
               shell: ItemCheckDialogShell,
               actor: actor,
               checkOptions: writable(checkOptions),
               checkParameters: writable(checkParameters),
            },
         },
         id: `titan-item-check-dialog-${actor.id}`,
      });
   }

   /**
    * @returns {string[]} Array of CSS classes to apply to the dialog element.
    * @protected
    * @override
    */
   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-check-dialog', 'titan-item-check-dialog');

      return retVal;
   }
}
