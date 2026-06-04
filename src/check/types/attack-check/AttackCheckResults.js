import calculateCheckResults, { createCheckResultsShape } from '~/check/CheckResults.js';

/**
 * Results of an Attack Check.
 * @typedef {CheckResults} AttackCheckResults
 * @property {boolean} succeeded - Whether the Check Succeeded.
 * @property {CheckDie[]} dice - The sorted dice rolled for the check, after Expertise is applied.
 * @property {number} criticalFailures - The number of Critical Failures rolled.
 * @property {number} criticalSuccesses - The number of Critical Successes achieved.
 * @property {number} damage - The amount of Damage inflicted.
 * @property {number} expertiseRemaining - The Expertise remaining after being applied to the dice.
 * @property {number} extraSuccesses - The number of extra Successes achieved beyond the Complexity.
 * @property {number} successes - The total number of Successes achieved.
 */

/**
 * Builds the zero-value shape of an Attack Check's results.
 * Extends the base check-results shape with the Attack Check's additional fields.
 * @returns {object} The attack check-results shape (zeroed).
 */
export function createAttackCheckResultsShape() {
   return {
      ...createCheckResultsShape(),
      damage: 0,
   };
}

/**
 * Calculates the results of an Attack Check, based on the inputted parameters,
 * the dice rolled on the check, and the expertise that was applied.
 * Calls the base version of this function.
 * See {@link calculateCheckResults}.
 * @param {CheckDiceResults} diceResults - The sorted dice rolled for the check, after Expertise is applied.
 * @param {AttackCheckParameters} parameters - Object containing the parameters of the check.
 * @returns {AttackCheckResults} The final results of the check.
 */
export default function calculateAttackCheckResults(diceResults, parameters) {
   const baseResults = calculateCheckResults(diceResults, parameters);

   const results = {
      ...createAttackCheckResultsShape(),
      criticalFailures: baseResults.criticalFailures,
      criticalSuccesses: baseResults.criticalSuccesses,
      damage: 0,
      dice: baseResults.dice,
      expertiseRemaining: baseResults.expertiseRemaining,
      extraSuccesses: baseResults.extraSuccesses,
      succeeded: baseResults.succeeded,
      successes: baseResults.successes,
   };

   // If the check succeeded.
   if (results.succeeded) {

      // Add damage to the attack.
      results.damage = parameters.damage + parameters.damageMod;

      // Add extra damage per extra success if appropriate.
      if (results.extraSuccesses && parameters.plusExtraSuccessDamage) {
         results.damage += results.extraSuccesses;
      }
   }

   return results;
}
