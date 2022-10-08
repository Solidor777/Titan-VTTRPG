import calculateCheckResults from "~/check/types/attack-check/CalculateCheckResults";

export default function calculateAttackCheckResults(inResults, parameters) {
   const results = calculateCheckResults(inResults, parameters);

   // Add the damage to the results
   if (results.succeeded) {
      results.damage = this.parameters.attack.damage + this.parameters.damageMod + 1;

      // Add extra damage if appropriate
      if (results.extraSuccesses && this.parameters.attack.plusExtraSuccessDamage) {
         results.damage += results.extraSuccesses;
      }
   }

   return results;
}