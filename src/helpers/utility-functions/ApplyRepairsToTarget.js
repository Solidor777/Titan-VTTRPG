import getCombatTargets from '~/helpers/utility-functions/GetCombatTargets.js';

/**
 * Applies repairs to the user's available combat targets.
 * @param {number}            repairs  Amount of repairs to apply.
 * @param {RepairsOptions?}   options  Options for applying the repairs.
 * @returns {Promise<void>}            Returns after the repairs have been applied.
 */
export default async function applyRepairsToTargets(repairs, options) {
   // Get targets
   const targets = getCombatTargets();

   // Apply repairs to each target
   for (const target of targets) {
      await target.system.applyRepairs(repairs, options);
   }
}
