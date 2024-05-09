import getCombatTargets from '~/helpers/utility-functions/GetCombatTargets.js';

/**
 * Applies damage to the user's available combat targets.
 * @param {number}            healing  Amount of healing to apply to the Character.
 * @param {HealingOptions?}   options  Options for applying the healing.
 * @returns {Promise<void>}            Returns after the healing has been applied.
 */
export default async function applyHealingToTargets(
   healing,
   options,
) {
   // Get targets
   const targets = getCombatTargets();

   // Apply healing to each target
   for (const target of targets) {
      await target.system.applyHealing(healing, options);
   }
}
