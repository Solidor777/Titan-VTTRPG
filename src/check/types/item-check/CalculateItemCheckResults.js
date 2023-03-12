import calculateCheckResults from "~/check/CalculateCheckResults";

export default function calculateItemCheckResults(inResults, parameters) {
   const results = calculateCheckResults(inResults, parameters);

   if (results.succeeded) {

      // If damage or healing
      if (parameters.isDamage || parameters.isHealing) {
         // Calculate stat
         let stat = parameters.initialValue;

         // Calculate scaling state 
         if (results.extraSuccesses && parameters.scaling) {
            stat += results.extraSuccesses;
         }

         // Set damage
         if (parameters.isDamage) {
            results.damage = stat + parameters.damageMod;
         }

         // Set healing
         if (parameters.isHealing) {
            results.healing = stat + parameters.healingMod;
         }
      }

      // If resistance check, add it to the results
      if (parameters.resistanceCheck !== false) {
         switch (parameters.resistanceCheck) {
            case 'reflexes': {
               results.reflexesCheck = true;
               break;
            }
            case 'resilience': {
               results.resilienceCheck = true;
               break;
            }
            case 'willpower': {
               results.willpowerCheck = true;
               break;
            }
            default: {
               break;
            }
         }
      }

      // If opposed check and extra successes, increase the complexity of the opposed check
      if (parameters.opposedCheck && results.extraSuccesses) {
         parameters.opposedCheck.complexity += results.extraSuccesses;
      }
   }

   return results;
}