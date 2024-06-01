import calculateCheckResults from '~/check/CheckResults.js';

/**
 * Results of an item check.
 * @typedef {CheckResults} ItemCheckResults
 * @property {boolean} succeeded Whether the Check Succeeded.
 * @property {CheckDie[]} dice The sorted dice rolled for the check, after Expertise is applied.
 * @property {number} criticalFailures The number of Critical Failures rolled.
 * @property {number} criticalSuccesses The number of Critical Successes achieved.
 * @property {number} damage The amount of Damage inflicted.
 * @property {number} expertiseRemaining The Expertise remaining after being applied to the dice.
 * @property {number} extraSuccesses The number of Critical Successes achieved.
 * @property {number} healing The amount of Healing applied.
 * @property {number} successes The total number of Successes achieved.
 * @property {number} opposedCheckComplexity The Complexity of the Opposed check, if any.
 */

/**
 * Calculates the results of an item check, based on the inputted parameters,
 * the dice rolled on the check, and the expertise that was applied.
 * Calls the base version of this function.
 * See {@link calculateCheckResults}.
 * @param {CheckDiceResults} diceResults - The sorted dice rolled for the check, after Expertise is applied.
 * @param {ItemCheckParameters} parameters - Object containing the parameters of the check.
 * @returns {ItemCheckResults} The final results of the check.
 */
export default function calculateItemCheckResults(diceResults, parameters) {
   const baseResults = calculateCheckResults(diceResults, parameters);

   const results = {
      criticalFailures: baseResults.criticalFailures,
      criticalSuccesses: baseResults.criticalSuccesses,
      damage: 0,
      dice: baseResults.dice,
      expertiseRemaining: baseResults.expertiseRemaining,
      extraSuccesses: baseResults.extraSuccesses,
      healing: 0,
      opposedCheckComplexity: 0,
      succeeded: baseResults.succeeded,
      successes: baseResults.successes,
   };

   // If the check succeeded
   if (results.succeeded) {

      // If the check has damage or healing
      if (parameters.damage || parameters.healing) {

         // Calculate the damage
         if (parameters.damage) {
            results.damage = parameters.damage + parameters.damageMod;

            // Add extra successes if scaling
            if (parameters.scaling) {
               results.damage += results.extraSuccesses;
            }
         }

         // Calculate the healing
         if (parameters.healing) {
            results.healing = parameters.healing + parameters.healingMod;

            // Add extra successes if scaling
            if (parameters.scaling) {
               results.healing += results.extraSuccesses;
            }
         }
      }

      // If opposed check and extra successes, increase the complexity of the opposed check
      if (parameters.opposedCheck) {
         results.opposedCheckComplexity = 1 + results.extraSuccesses;
      }
   }

   return results;
}
