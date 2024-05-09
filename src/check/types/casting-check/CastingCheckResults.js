import calculateCheckResults from '~/check/CheckResults.js';
/**
 * Data for a scaling aspect used in the check.
 * @typedef {object} ScalingAspect
 * @property   {boolean}   isDamage       Whether the aspect applies damage.
 * @property   {boolean}   isHealing      Whether the aspect applies healing.
 * @property   {number}    cost           The success cost for increasing the value of the aspect.
 * @property   {number}    currentValue   The current value of the aspect.
 * @property   {number}    initialValue   The initial value of the aspect.
 * @property  {string}    label          The display name for the aspect.
 */

/**
 * Results of a Casting Check.
 * @typedef    {object} CastingCheckResults
 * @augments   CheckResults
 * @property   {CheckDie[]}      dice                    The sorted dice rolled for the check, after having expertise
 *                                                       applied.
 * @property   {boolean}         succeeded               Whether the Check Succeeded.
 * @property   {number}          criticalFailures        The number of Critical Failures rolled.
 * @property   {number}          criticalSuccesses       The number of Critical Successes achieved.
 * @property   {number}          damage                  The amount of Damage inflicted.
 * @property   {number}          expertiseRemaining      The Expertise remaining after being applied to the dice.
 * @property   {number}          extraSuccesses          The number of Critical Successes achieved.
 * @property   {number}          extraSuccessesRemaining The remaining successes that have not yet been applied to
 *                                                       scaling aspects.
 * @property   {number}          successes               The total number of Successes achieved.
 * @property   {number}          healing                 The amount of Healing applied.
 * @property   {ScalingAspect[]} scalingAspect           The scaling aspects associated with the check.
 */

/**
 * Calculates the results of a Casting Check, based on the inputted parameters,
 * the dice rolled on the check, and the expertise that was applied.
 * Calls the base version of this function.
 * See {@link calculateCheckResults}
 * @param   {CheckDiceResults}         diceResults    The sorted dice rolled for the check, after Expertise is applied.
 * @param   {CastingCheckParameters}   parameters     The parameters of the check.
 * @returns {CastingCheckResults}                     The final results of the check.
 */
export default function calculateCastingCheckResults(diceResults, parameters) {
   const baseResults = calculateCheckResults(diceResults, parameters);

   const results = {
      aspect: [],
      criticalFailures: baseResults.criticalFailures,
      criticalSuccesses: baseResults.criticalSuccesses,
      damage: 0,
      dice: baseResults.dice,
      expertiseRemaining: baseResults.expertiseRemaining,
      extraSuccesses: baseResults.extraSuccesses,
      extraSuccessesRemaining: baseResults.extraSuccesses,
      healing: 0,
      scalingAspect: [],
      succeeded: baseResults.succeeded,
      successes: baseResults.successes,
   };

   // If the check succeeded
   if (results.succeeded) {

      // Update the base damage and healing
      results.damage = parameters.damage;
      results.healing = parameters.healing;

      // Duplicate the scaling aspects from the parameters so that they can be edited safely
      results.scalingAspect = foundry.utils.deepClone(parameters.scalingAspect).map((aspect) => {
         return {
            isDamage: aspect.isDamage,
            isHealing: aspect.isHealing,
            cost: aspect.cost,
            currentValue: aspect.initialValue,
            initialValue: aspect.initialValue,
            label: aspect.label,
         };
      });

      // If there is only one scaling aspect that can be increased,
      // then maximize that aspect
      const affordableAspects = results.scalingAspect.filter((aspect) => aspect.cost <= results.extraSuccesses);
      if (affordableAspects.length === 1) {

         // Get the highest amount by which we can increase the aspect
         const aspect = affordableAspects[0];
         const delta = Math.floor(results.extraSuccesses / aspect.cost);

         // Calculate the cost by multiplying the delta by the cost
         // This is to prevent us from spending fractional successes
         // or increasing the aspect by fractional amount
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

      // Add damage and healing mods if appropriate
      if (results.damage > 0) {
         results.damage += parameters.damageMod;
      }
      if (results.healing > 0) {
         results.healing += parameters.healingMod;
      }
   }

   return results;
}
