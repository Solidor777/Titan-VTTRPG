import getBestUserTargets from "~/helpers/utility-functions/GetBestUserTargets.js";

/**
 * Applies damage to the user's available combat targets.
 * @param {number}               damage   Amount of damage to apply to the Character.
 * @param {DamageOptions|null}   options  Options for applying the damage.
 * @returns {Promise<void>}               Returns after the damage has been applied.
 */
export default async function applyDamageToTargets(
   damage,
   options,
) {
   // Get targets
   const targets = getBestUserTargets();

   // Apply damage to each target
   for (const target of targets) {
      await target.system.applyDamage(damage, options);
   }
}
