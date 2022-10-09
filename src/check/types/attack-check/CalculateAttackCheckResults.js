import calculateCheckResults from "~/check/CalculateCheckResults.js";

export default function calculateAttackCheckResults(inResults, parameters) {
   const results = calculateCheckResults(inResults, parameters);
   results.damage = 0;

   // Add the damage to the results
   if (results.succeeded) {
      results.damage = parameters.attack.damage + parameters.damageMod + 1;

      // Add extra damage if appropriate
      if (results.extraSuccesses && parameters.attack.plusExtraSuccessDamage) {
         results.damage += results.extraSuccesses;
      }
   }

   return results;
}