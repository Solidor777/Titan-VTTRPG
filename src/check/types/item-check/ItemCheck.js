import calculateItemCheckResults from '~/check/types/item-check/ItemCheckResults.js';
import TitanCheck from '~/check/Check.js';

/**
 * Class for creating and calculating the result of an item check.
 * @augments TitanCheck
 * @param   {ItemCheckParameters} parameters  Parameters for the Check.
 */
export default class ItemCheck extends TitanCheck {
   /**
    * Calculates the results of an Attribute Check, based on the inputted parameters,
    * the dice rolled on the check,and the expertise that was applied.
    * This calls an external helper function specific to the check type,
    * so that re-calculation can be easily performed by external sources.
    * See {@link calculateItemCheckResults}.
    * @param   {CheckDiceResults}    diceResults The sorted dice rolled for the check, after Expertise is applied.
    * @param   {ItemCheckParameters} parameters  The parameters of the check.
    * @returns {ItemCheckResults}                The final results of the check.
    * @protected
    */
   _calculateResults(diceResults, parameters) {
      return calculateItemCheckResults(diceResults, parameters);
   }

   _getCheckType() {
      return 'itemCheck';
   }
}
