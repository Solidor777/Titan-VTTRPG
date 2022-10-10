// Calculates the result of the check
export default function calculateCheckResults(inResults, parameters) {
   const results = inResults;

   // Cache values for easy reference
   const extraSuccessOnCritical = parameters.extraSuccessOnCritical;
   const extraFailureOnCritical = parameters.extraFailureOnCritical;
   const difficulty = parameters.difficulty;
   results.successes = 0;
   results.extraSuccesses = 0;
   results.succeeded = false;

   // Calculate failures and successes
   for (let i = 0; i < results.dice.length; i++) {
      results.dice[i].success = false;
      // If this dice was a crit success
      if (results.dice[i].final === 6) {
         // Log the log the critical succcess
         results.criticalSuccesses += 1;
         results.successes += extraSuccessOnCritical ? 2 : 1;
         results.dice[i].success = true;
         results.dice[i].criticalSuccess = true;
      }

      // If this dice was a success
      else if (results.dice[i].final >= difficulty) {
         results.successes += 1;
         results.dice[i].success = true;
      }

      // If this dice was a critical failure
      else if (results.dice[i].final === 1) {
         results.dice[i].criticalFailure = true;
         if (extraFailureOnCritical) {
            results.successes -= 1;
         }
      }
   }

   // Calculate whether the check succeeded or not
   const complexity = parameters.complexity;
   if (complexity > 0) {
      // If succeeeded
      if (results.successes >= complexity) {
         results.succeeded = true;

         // If extra successes
         if (results.successes > complexity) {
            results.extraSuccesses = results.successes - complexity;
         }
      }
   }
   return results;
}