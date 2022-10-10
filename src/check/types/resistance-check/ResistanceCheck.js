import TitanCheck from '~/check/Check.js';

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

   _initializeParameters(inData) {
      const parameters = super._initializeParameters(inData);

      // Initialize resistance parameters
      parameters.resistance = inData.resistance ?? 'reflexes';

      // Get the resistance value
      parameters.resistanceDice = inData.actorRollData.resistance[parameters.resistance].value;

      // Add the training dice to the total dice
      parameters.totalDice += parameters.resistanceDice;

      return parameters;
   }

   _getCheckType() {
      return 'resistanceCheck';
   }
}
