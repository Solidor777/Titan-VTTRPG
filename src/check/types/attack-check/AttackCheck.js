import TitanCheck from '~/check/Check.js';
import calculateAttackCheckResults from '~/check/types/attack-check/AttackCheckResults.js';

/**
 * Class for creating and calculating the result of an Attack Check.
 * @param {AttackCheckParameters} parameters - Parameters for the Check.
 * @augments TitanCheck
 */
export default class AttackCheck extends TitanCheck {

   /**
    * Applies expertise to the results of the dice roll, maximizing the number of successes achieved.
    * Makes a call to the parent function, but has some additional functionality for spending expertise to
    * maximize the benefits of attack traits.
    * @param {number[]} sortedDice - Results of the dice roll, sorted from largest to smallest.
    * @returns {CheckDiceResults} The dice results after Expertise is applied,
    * along with the expertise remaining.
    * @protected
    */
   _applyExpertise(sortedDice) {
      const retVal = super._applyExpertise(sortedDice);

      // If we have expertise remaining, and this attack would benefit from critical successes
      if (retVal.expertiseRemaining > 0 &&
         this.parameters.difficulty < 6 &&
         (this.parameters.cleave || this.parameters.rend)) {

         // Increase as many dice to 6 as possible
         for (let increment = 1; increment < 6; increment++) {

            // Abort early if we run out of expertise
            if (increment > retVal.expertiseRemaining) {
               break;
            }

            // Apply expertise to dice that are === the increment from being a critical success
            for (const die of retVal.dice) {
               if (die.final < 6 &&
                  6 - retVal.dice[i].final === increment
               ) {
                  retVal.expertiseRemaining -= increment;
                  die.final = 6;
                  die.expertiseApplied += increment;

                  // Abort early if we run out of expertise
                  if (increment > retVal.expertiseRemaining) {
                     break;
                  }
               }
            }
         }
      }

      return retVal;
   }

   /**
    * Calculates the results of an Attack Check, based on the inputted parameters,
    * the dice rolled on the check,and the expertise that was applied.
    * This calls an external helper function specific to the check type,
    * so that re-calculation can be easily performed by external sources.
    * See {@link calculateAttackCheckResults}.
    * @param {CheckDiceResults} diceResults - The sorted dice rolled for the check, after Expertise is applied.
    * @returns {AttackCheckResults} The final results of the check.
    * @protected
    */
   _calculateResults(diceResults) {
      return calculateAttackCheckResults(diceResults, this.parameters);
   }

   _getCheckType() {
      return 'attackCheck';
   }
}
