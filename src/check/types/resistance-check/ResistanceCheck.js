import { localize } from '~/helpers/Utility.js';
import TitanCheck from '~/check/Check.js';

export default class TitanResistanceCheck extends TitanCheck {
  _ensureValidConstruction(inData) {
    if (!super._ensureValidConstruction(inData)) {
      return false;
    }

    // Check if actor check data is valid
    if (!inData?.actorRollData) {
      console.error(
        'TITAN | Resistance Check failed during construction. No provided Actor Check Data.'
      );
      return false;
    }

    return true;
  }

  _initializeParameters(inData) {
    const parameters = super._initializeParameters(inData);

    // Initialize resistance parameters
    parameters.resistance = inData.resistance ?? 'reflex';

    return parameters;
  }

  _calculateDerivedData(inData) {
    super._calculateDerivedData(inData);
    const actorRollData = inData.actorRollData;

    // Get the resistance value
    this.parameters.resistanceDice =
      actorRollData.resistance[this.parameters.resistance].value;

    return;
  }

  _calculateTotalDiceAndExpertise() {
    // Add the training dice to the total dice
    this.parameters.totalDice =
      this.parameters.diceMod + this.parameters.resistanceDice;
    this.parameters.totalExpertise = 0;

    return;
  }

  _getCheckType() {
    return 'resistanceCheck';
  }

  _getTypeLabel() {
    return `${localize(`${this.parameters.resistance}`)} ${this.parameters.difficulty}:${this.parameters.complexity}`;
  }
}
