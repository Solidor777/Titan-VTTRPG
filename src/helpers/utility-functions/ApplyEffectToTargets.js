import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Applies (copies) an ActiveEffect onto the current user's best targets that they own. Targets are
 * resolved via getBestCharactersToUpdate and filtered to those the user owns; a notification reports
 * the outcome.
 * @param {ActiveEffect} effect - The source ActiveEffect to copy.
 * @returns {Promise<void>} Returns after the effect has been applied to all owned targets.
 */
export default async function applyEffectToTargets(effect) {
   /** @type {TitanActor[]} The owned best characters to apply the effect to. */
   const targets = getBestCharactersToUpdate().filter((actor) => actor.isOwner);

   // Warn and bail when there is nothing to apply to.
   if (targets.length <= 0) {
      ui.notifications.warn(localize('effectTrayNoTargets'));
      return;
   }

   /** @type {object} The plain-object representation of the source effect. */
   const effectData = effect.toObject();

   // Copy the effect onto each owned target in turn.
   for (const target of targets) {
      await target.createEmbeddedDocuments('ActiveEffect', [effectData]);
   }

   // Report the outcome with the effect name and target count.
   ui.notifications.info(game.i18n.format('LOCAL.effectTrayApplied.text', {
      name: effect.name,
      count: targets.length,
   }));
}
