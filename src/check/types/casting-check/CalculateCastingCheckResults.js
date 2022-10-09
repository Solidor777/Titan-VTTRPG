import calculateCheckResults from "~/check/CalculateCheckResults.js";

export default function calculateCastingCheckResults(inResults, parameters) {
   const results = calculateCheckResults(inResults, parameters);

   // Check if damage or healing is among the aspect
   if (results.succeeded) {

      // Initialize state data
      let scalingCount = 0;
      let scalingIdx = -1;
      results.extraSuccessesRemaining = results.extraSuccesses;
      results.aspect = foundry.utils.deepClone(parameters.aspect);

      // Adjust aspect results
      results.aspect.forEach((aspect, idx) => {
         // Damage
         if (aspect.isDamage) {
            results.damage = results.damage ? results.damage + aspect.initialValue : aspect.initialValue;
         }

         // Healing
         if (aspect.isHealing === true) {
            results.healing = results.healing ? results.healing + aspect.initialValue : aspect.initialValue;
         }

         // Current value
         aspect.currentValue = aspect.initialValue;

         // Scaling
         if (aspect.scaling) {
            scalingCount += 1;
            scalingIdx = idx;
         }

         // Resistance check
         if (aspect.resistanceCheck) {
            switch (aspect.resistanceCheck) {
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
      });

      // If there is only one scaling
      if (scalingCount === 1 &&
         results.extraSuccesses &&
         results.extraSuccesses >= results.aspect[scalingIdx].cost) {

         // Maximize the aspect
         const aspect = results.aspect[scalingIdx];
         const delta = Math.floor(results.extraSuccesses / aspect.cost);
         const cost = delta * aspect.cost;
         aspect.currentValue += delta;
         results.extraSuccessesRemaining -= cost;

         // Update damage
         if (aspect.isDamage) {
            results.damage += delta;
         }

         // Update healing
         if (aspect.isHealing) {
            results.healing += delta;
         }
      }

      // Adjust final damage
      if (results.damage) {
         results.damage += parameters.damageMod;
      }

      // Adjust final healing
      if (results.healing) {
         results.healing += parameters.healingMod;
      }
   }

   return results;
}