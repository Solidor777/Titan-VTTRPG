import calculateCheckResults from "~/check/CalculateCheckResults";
import calculateAttackCheckResults from "~/check/types/attack-check/CalculateAttackCheckResults";
import calculateCastingCheckResults from "~/check/types/casting-check/CalculateCastingCheckResults";
import calculateItemCheckResults from "~/check/types/item-check/CalculateItemCheckResults";

export default function recalculateCheckResults(check) {
   // Initialize results
   let results = {
      dice: check.results.dice,
      expertiseRemaining: check.results.expertiseRemaining
   };

   // Switch depending on check type
   switch (check.type) {
      case "attackCheck": {
         return calculateAttackCheckResults(results, check.parameters);
      }
      case "castingCheck": {
         return calculateCastingCheckResults(results, check.parameters);
      }
      case "itemCheck": {
         return calculateItemCheckResults(results, check.parameters);
      }
      default: {
         return calculateCheckResults(results, check.parameters);
      }
   }
}