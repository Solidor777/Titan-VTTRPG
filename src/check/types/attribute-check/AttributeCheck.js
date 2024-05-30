import TitanCheck from '~/check/Check.js';
import calculateAttributeCheckResults from '~/check/types/attribute-check/AttributeCheckResults.js';

/**
 * Class for creating and calculating the result of an Attribute Check.
 * @param {AttributeCheckParameters} parameters - Parameters for the Check.
 * @augments TitanCheck
 */
export default class AttributeCheck extends TitanCheck {
   /**
    * Calculates the results of an Attribute Check, based on the inputted parameters,
    * the dice rolled on the check,and the expertise that was applied.
    * This calls an external helper function specific to the check type,
    * so that re-calculation can be easily performed by external sources.
    * See {@link calculateAttributeCheckResults}.
    * @param {CheckDiceResults} diceResults - The sorted dice rolled for the check, after Expertise is applied.
    * @returns {AttributeCheckResults} The final results of the check.
    * @protected
    */
   _calculateResults(diceResults) {
      return calculateAttributeCheckResults(diceResults, this.parameters);
   }

   _getCheckType() {
      return 'attributeCheck';
   }
}
