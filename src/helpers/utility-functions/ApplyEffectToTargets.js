import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Applies (copies) an ActiveEffect onto the current user's best targets that they own. Targets are
 * resolved via getBestCharactersToUpdate and filtered to those the user owns; a notification reports how many
 * accepted it (an immune target's refusal notifies separately).
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

   // Copy the effect onto each owned target in turn; a target immune to it refuses the copy.
   /** @type {number} The targets the effect was applied to. */
   let applied = 0;
   for (const target of targets) {
      /** @type {ActiveEffect[]} The created copy, or nothing when refused. */
      const created = await target.createEmbeddedDocuments('ActiveEffect', [effectData]);
      applied += created.length;
   }

   // Report the outcome with the effect name and the number of targets that accepted it.
   if (applied > 0) {
      ui.notifications.info(game.i18n.format('LOCAL.effectTrayApplied.text', {
         name: effect.name,
         count: applied,
      }));
   }
}
