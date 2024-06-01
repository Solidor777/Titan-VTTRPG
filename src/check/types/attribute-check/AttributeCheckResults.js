import calculateCheckResults from '~/check/CheckResults.js';

/**
 * Results of an Attribute Check.
 * @typedef {CheckResults} AttributeCheckResults
 * @property {boolean} succeeded Whether the Check Succeeded.
 * @property {CheckDie[]} dice The sorted dice rolled for the check, after Expertise is applied.
 * @property {number} criticalFailures The number of Critical Failures rolled.
 * @property {number} criticalSuccesses The number of Critical Successes achieved.
 * @property {number} damageTaken Damage taken, if any.
 * @property {number} expertiseRemaining The Expertise remaining after being applied to the dice.
 * @property {number} extraSuccesses The number of Critical Successes achieved.
 * @property {number} successes The total number of Successes achieved.
 */

/**
 * Calculates the results of an Attribute Check, based on the inputted parameters,
 * the dice rolled on the check, and the expertise that was applied.
 * Calls the base version of this function.
 * See {@link calculateCheckResults}.
 * @param {CheckDiceResults} diceResults - The sorted dice rolled for the check, after Expertise is applied.
 * @param {AttributeCheckParameters} parameters - Object containing the parameters of the check.
 * @returns {AttributeCheckResults} The final results of the check.
 */
export default function calculateAttributeCheckResults(diceResults, parameters) {
   const baseResults = calculateCheckResults(diceResults, parameters);

   return {
      criticalFailures: baseResults.criticalFailures,
      criticalSuccesses: baseResults.criticalSuccesses,
      damageTaken: parameters.damageToReduce && !baseResults.succeeded ?
         parameters.damageToReduce - baseResults.successes :
         0,
      dice: baseResults.dice,
      expertiseRemaining: baseResults.expertiseRemaining,
      extraSuccesses: baseResults.extraSuccesses,
      succeeded: baseResults.succeeded,
      successes: baseResults.successes,
   };
}
