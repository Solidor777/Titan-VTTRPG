import calculateCheckResults from '~/check/CheckResults.js';
/**
 * Results of an Attack Check.
 * @typedef {object} AttackCheckResults
 * @augments   CheckResults
 * @property   {boolean}      succeeded            Whether the Check Succeeded.
 * @property   {CheckDie[]}   dice                 The sorted dice rolled for the check, after Expertise is applied.
 * @property   {number}       criticalFailures     The number of Critical Failures rolled.
 * @property   {number}       criticalSuccesses    The number of Critical Successes achieved.
 * @property   {number}       damage               The amount of Damage inflicted.
 * @property   {number}       expertiseRemaining   The Expertise remaining after being applied to the dice.
 * @property   {number}       extraSuccesses       The number of Critical Successes achieved.
 * @property   {number}       successes           The total number of Successes achieved.
 */

/**
 * Calculates the results of an Attack Check, based on the inputted parameters,
 * the dice rolled on the check, and the expertise that was applied.
 * Calls the base version of this function.
 * See {@link calculateCheckResults}
 * @param   {CheckDiceResults}      diceResults    The sorted dice rolled for the check, after Expertise is applied.
 * @param   {AttackCheckParameters} parameters     The parameters of the check.
 * @returns {AttackCheckResults}                   The final results of the check.
 */
export default function calculateAttackCheckResults(diceResults, parameters) {
   const baseResults = calculateCheckResults(diceResults, parameters);

   const results = {
      criticalFailures: baseResults.criticalFailures,
      criticalSuccesses: baseResults.criticalSuccesses,
      damage: 0,
      dice: baseResults.dice,
      expertiseRemaining: baseResults.expertiseRemaining,
      extraSuccesses: baseResults.extraSuccesses,
      succeeded: baseResults.succeeded,
      successes: baseResults.successes,
   };

   // If the check succeeded
   if (results.succeeded) {

      // Add damage to the attack
      results.damage = parameters.damage + parameters.damageMod;

      // Add extra damage per extra success if appropriate
      if (results.extraSuccesses && parameters.plusExtraSuccessDamage) {
         results.damage += results.extraSuccesses;
      }
   }

   return results;
}
