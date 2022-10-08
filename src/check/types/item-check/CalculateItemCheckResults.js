import calculateCheckResults from "~/check/types/attack-check/CalculateCheckResults";

export default function calculateItemCheckResults(inResults, parameters) {
   const results = calculateCheckResults(inResults, parameters);

   if (results.succeeded) {

      // If damage or healing
      if (this.parameters.isDamage || this.parameters.isHealing) {
         // Calculate stat
         let stat = this.parameters.initialValue;

         // Calculate scaling state 
         if (results.extraSuccesses && this.parameters.scaling) {
            stat += results.extraSuccesses;
         }

         // Set damage
         if (this.parameters.isDamage) {
            results.damage = stat + this.parameters.damageMod;
         }

         // Set healing
         if (this.parameters.isHealing) {
            results.healing = stat;
         }
      }

      // If resistance check, add it to the results
      if (this.parameters.resistanceCheck !== false) {
         switch (this.parameters.resistanceCheck) {
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
      if (this.parameters.opposedCheck && results.extraSuccesses) {
         this.parameters.opposedCheck.complexity += results.extraSuccesses;
      }
   }

   return results;
}