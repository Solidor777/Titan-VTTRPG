import localize from '~/helpers/utility-functions/Localize.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';

/**
 * Creates a confirmation dialog for confirming removing expired Effects from the Actor.
 * @augments ConfirmationDialog
 * @param {TitanActor}  actor The Actor to remove expired Effects from.
 */
export default class ConfirmRemoveExpiredEffectsDialog extends ConfirmationDialog {
   /**
    * Creates a confirmation dialog for confirming removing expired Effects from the Actor.
    * @param {TitanActor}  actor The Actor to remove expired Effects from.
    */
   constructor(actor, callback) {
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

   async onConfirmed() {

   }
}
