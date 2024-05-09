import TitanCheck from '~/check/Check.js';
import calculateCastingCheckResults from '~/check/types/casting-check/CastingCheckResults.js';

/**
 * Class for creating and calculating the result of a Casting Check.
 * @augments TitanCheck
 * @param   {CastingCheckParameters} parameters  Parameters for the Check.
 */
export default class CastingCheck extends TitanCheck {

   /**
    * Calculates the results of a Casting Check, based on the inputted parameters,
    * the dice rolled on the check, and the expertise that was applied.
    * This calls an external helper function specific to the check type,
    * so that re-calculation can be easily performed by external sources.
    * See {@link calculateCastingCheckResults}.
    * @param   {CheckDiceResults}         diceResults The sorted dice rolled for the check, after Expertise is applied.
    * @param   {CastingCheckParameters} parameters  The parameters of the check.
    * @returns {CastingCheckResults}                The final results of the check.
    * @protected
    */
   _calculateResults(diceResults, parameters) {
      return calculateCastingCheckResults(diceResults, parameters);
   }

   _getCheckType() {
      return 'castingCheck';
   }
}
