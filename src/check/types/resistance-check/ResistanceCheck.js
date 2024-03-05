import TitanCheck from '~/check/Check.js';
import calculateResistanceCheckResults from '~/check/types/resistance-check/CalculateResistanceCheckResults';

export default class TitanResistanceCheck extends TitanCheck {
   _ensureValidConstruction(inData) {
      if (!super._ensureValidConstruction(inData)) {
         return false;
      }

      // Check if actor check data is valid
      if (!inData?.actorRollData) {
         console.error('TITAN | Resistance Check failed during construction. No provided Actor Check Data.');
         console.trace();

         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      const parameters = super._initializeParameters(options);

      // Initialize resistance parameters
      parameters.resistance = options.resistance ?? 'reflexes';

      // Get the resistance value
      parameters.resistanceDice = options.actorRollData.resistance[parameters.resistance].value;

      // Add the training dice to the total dice
      parameters.totalDice += parameters.resistanceDice;

      // Initialize damage to reduce
      parameters.damageToReduce = options.damageToReduce ?? 0;

      return parameters;
   }

   _calculateResults(inResults, parameters) {
      return calculateResistanceCheckResults(inResults, parameters);
   }

   _getCheckType() {
      return 'resistanceCheck';
   }
}
