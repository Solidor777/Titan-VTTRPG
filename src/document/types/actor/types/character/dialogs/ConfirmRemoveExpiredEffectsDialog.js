import localize from '~/helpers/utility-functions/Localize.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';

/**
 * A confirmation dialog for confirming removing expired Effects from the Actor.
 * @extends {ConfirmationDialog}
 */
export default class ConfirmRemoveExpiredEffectsDialog extends ConfirmationDialog {
   /**
    * Configures the confirmation prompt and registers the callback that strips expired Effects from the Actor.
    * @param {TitanActor} actor - The Actor to remove expired Effects from.
    */
   constructor(actor) {
      super(
         localize('removeExpiredEffects'),
         [actor.name],
         localize('confirmRemoveExpiredEffects.desc'),
         localize('removeEffects'),
         () => {
            if (this.actor) {
               this.actor.system.removeExpiredEffects();
            }
         },
      );

      this.actor = actor;
   }
}
