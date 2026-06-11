import TitanDialog from '~/helpers/dialogs/Dialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import HudAmountDialogShell from '~/ui/player-hud/elements/action-menu/HudAmountDialogShell.svelte';

/**
 * Amount-confirmation dialog for the HUD's apply damage / healing / rend / repairs actions.
 * @class HudAmountDialog
 * @extends TitanDialog
 */
export default class HudAmountDialog extends TitanDialog {
   /**
    * Builds the dialog.
    * @param {string} titleKey - Localization key for the title and confirm label.
    * @param {Function} onConfirm - Receives the entered integer amount on confirmation.
    */
   constructor(titleKey, onConfirm) {
      super({
         title: localize(titleKey),
         content: {
            class: HudAmountDialogShell,
            props: {
               confirmLabel: localize(titleKey),
               onConfirm: onConfirm,
            },
         },
         id: 'titan-hud-amount-dialog',
      });
   }
}
