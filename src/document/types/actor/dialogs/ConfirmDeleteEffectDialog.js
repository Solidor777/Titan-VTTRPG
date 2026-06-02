import localize from '~/helpers/utility-functions/Localize.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';

/**
 * A confirmation dialog for deleting an Active Effect from the Actor.
 * @extends {ConfirmationDialog}
 */
export default class ConfirmDeleteEffectDialog extends ConfirmationDialog {

   /**
    * Configures the confirmation prompt and registers the callback that deletes the Effect from the Actor on confirm.
    * @param {TitanActor} actor - The Actor to delete the Effect from.
    * @param {TitanActiveEffect} effect - The Effect to delete from the Actor.
    */
   constructor(actor, effect) {
      super(
         localize('deleteEffect'),
         [
            actor.name,
            effect.name,
         ],
         localize('confirmDeleteEffect.desc'),
         localize('deleteEffect'),
         () => {
            if (this.actor) {
               this.actor.system.safeDeleteEffect(this.effectId);
            }
         },
      );

      this.actor = actor;
      this.effectId = effect.id;
   }
}
