import TitanCheck from "./Check.js";

export default class TitanAttributeCheck extends TitanCheck {
  _ensureValidConstruction(options) {
    if (!super._ensureValidConstruction(options)) {
      return false;
    }

    // Check if actor check data is valid
    if (!options?.actorRollData) {
      console.error(
        "TITAN | Attribute Check failed during construction. No provided Actor Check Data."
      );
      return false;
    }

    return true;
  }

  _initializeParameters(options) {
    const parameters = super._initializeParameters(options);

    // Initialize attribute parameters
    parameters.attribute = options.attribute ?? "body";

    return parameters;
  }

  _calculateDerivedData(options) {
    const actorRollData = options.actorRollData;

    // Get the attribute dice
    this.parameters.attributeDice =
      actorRollData.attribute[this.parameters.attribute].value;

    return;
  }

  _calculateTotalDiceAndExpertise() {
    // Calculate the total training dice
    // Add the training dice to the total dice
    this.parameters.totalDice =
      this.parameters.diceMod + this.parameters.attributeDice;
    this.parameters.totalExpertise = 0;

    return;
  }

  _getCheckType() {
    return "attributeCheck";
  }

  _getTypeLabel() {
    return `${game.i18n.localize(CONFIG.TITAN.local[this.parameters.attribute])} ${this.parameters.difficulty}:${this.parameters.complexity}`;
  }
}
