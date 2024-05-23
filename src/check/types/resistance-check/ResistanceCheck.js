import TitanCheck from '~/check/Check.js';
import calculateResistanceCheckResults from '~/check/types/resistance-check/ResistanceCheckResults.js';

/**
 * Class for creating and calculating the result of a Resistance Check.
 * @param {ResistanceCheckParameters} parameters - Parameters for the Check.
 * @augments TitanCheck
 */
export default class ResistanceCheck extends TitanCheck {
   /**
    * Calculates the results of a Resistance Check, based on the inputted parameters,
    * the dice rolled on the check,and the expertise that was applied.
    * This calls an external helper function specific to the check type,
    * so that re-calculation can be easily performed by external sources.
    * See {@link calculateResistanceCheckResults}.
    * @param {CheckDiceResults} diceResults - The sorted dice rolled for the check, after Expertise is applied.
    * @param {ResistanceCheckParameters} parameters - Object containing the parameters of the check.
    * @returns {ResistanceCheckResults} The final results of the check.
    * @protected
    */
   _calculateResults(diceResults, parameters) {
      return calculateResistanceCheckResults(diceResults, parameters);
   }

   _getCheckType() {
      return 'resistanceCheck';
   }
}
