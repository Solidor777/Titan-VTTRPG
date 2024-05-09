/**
 * Results of a check in the Titan system.
 * @typedef {object} CheckResults
 * @property   {boolean}      succeeded            Whether the Check Succeeded.
 * @property   {CheckDie[]}   dice                 The sorted dice rolled for the check, after Expertise is applied.
 * @property   {number}       criticalFailures     The number of Critical Failures rolled.
 * @property   {number}       criticalSuccesses    The number of Critical Successes achieved.
 * @property   {number}       expertiseRemaining   The Expertise remaining after being applied to the dice.
 * @property   {number}       extraSuccesses       The number of Critical Successes achieved.
 * @property   {number}       successes            The total number of Successes achieved.
 */

/**
 * Calculates the results of a check in the Titan system, based on the inputted parameters,
 * the dice rolled on the check, and the expertise that was applied.
 * @param   {CheckDiceResults}   diceResults The sorted dice rolled for the check, after Expertise is applied.
 * @param   {CheckParameters}    parameters  The parameters of the check.
 * @returns {CheckResults}                   The final results of the check.
 */
export default function calculateCheckResults(diceResults, parameters) {
   // Initialize return value
   const retVal = {
      dice: diceResults.dice,
      expertiseRemaining: diceResults.expertiseRemaining,
      criticalSuccesses: 0,
      criticalFailures: 0,
      extraSuccesses: 0,
      succeeded: false,
      successes: 0,
   };

   // Calculate successes and failures
   for (let i = 0; i < retVal.dice.length; i++) {
      retVal.dice[i].success = false;

      // If this die was a critical success
      if (retVal.dice[i].final === 6) {

         // Increment the number of critical successes
         retVal.criticalSuccesses += 1;

         // Add to the number of successes
         // Add 2 successes if we gain an extra success on critical successes
         retVal.successes += parameters.extraSuccessOnCritical ? 2 : 1;

         // Note the die result
         retVal.dice[i].success = true;
         retVal.dice[i].criticalSuccess = true;
      }

      // If this dice was a normal success
      else if (retVal.dice[i].final >= parameters.difficulty) {

         // Increment the number of successes
         retVal.successes += 1;

         // Note the die result
         retVal.dice[i].success = true;
      }

      // If this die was a critical failure
      else if (retVal.dice[i].final === 1) {

         // Increment the number of critical failures
         retVal.criticalFailures += 1;

         // Note the die as a critical failure
         retVal.dice[i].criticalFailure = true;

         // Decrement the number of successes if we lose a success on critical failures
         if (parameters.extraFailureOnCritical) {
            retVal.successes -= 1;
         }
      }
   }

   // Calculate Whether the Check Succeeded. or not
   const complexity = parameters.complexity;
   if (complexity > 0) {

      // If successes >= 0 then the check was a success
      if (retVal.successes >= complexity) {
         retVal.succeeded = true;

         // If extra successes
         if (retVal.successes > complexity) {
            retVal.extraSuccesses = retVal.successes - complexity;
         }
      }
   }

   return retVal;
}
