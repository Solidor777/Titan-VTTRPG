import { localize } from '~/helpers/Utility.js';
import calculateCheckResults from "~/check/CalculateCheckResults.js";

export default function calculateCastingCheckResults(inResults, parameters) {
   const results = calculateCheckResults(inResults, parameters);
   results.damage = 0;
   results.healing = 0;
   results.extraSuccessesRemaining = results.extraSuccesses;

   // Check if damage or healing is among the aspect
   if (results.succeeded) {

      // Initialize state data
      results.scalingAspect = [];
      results.aspect = foundry.utils.deepClone(parameters.aspect);
      results.aspect.forEach((aspect) => {
         aspect.label = localize(aspect.label);
      });
      results.aspect = results.aspect.concat(foundry.utils.deepClone(parameters.customAspect));

      // Adjust aspect results
      results.aspect.forEach((aspect) => {
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
            results.scalingAspect.push(aspect);
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

      // If there is only one scaling aspect we can afford
      const affordableAspects = results.scalingAspect.filter((aspect) => aspect.cost <= results.extraSuccesses);
      if (affordableAspects.length === 1) {

         // Maximize the aspect
         const aspect = affordableAspects[0];
         const delta = Math.floor(results.extraSuccesses / aspect.cost);
         const cost = delta * aspect.cost;
         aspect.currentValue += (delta * Math.max(aspect.initialValue, 1));
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