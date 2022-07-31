import TitanCheck from "./Check.js";

export default class TitanAttributeCheck extends TitanCheck {
  _ensureValidConstruction(options) {
    if (!super._ensureValidConstruction(options)) {
      return false;
    }

    // Check if actor check data is valid
    if (!options?.actorCheckData) {
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
    super._calculateDerivedData(options);
    const actorCheckData = options.actorCheckData;

    // Get the attribute dice
    this.parameters.attributeDice =
      actorCheckData.attribute[this.parameters.attribute].value;

    return;
  }

  _calculateTotalDiceAndExpertise() {
    // Calculate the total training dice
    // Add the training dice to the total dice
    this.parameters.totalDice =
      this.parameters.diceMod + this.parameters.attributeDice;

    // Calculcate the total expertise
    let totalExpertise = this.parameters.expertiseMod;
    if (this.parameters.doubleExpertise) {
      totalExpertise *= 2;
    }
    this.parameters.totalExpertise = totalExpertise;

    return;
  }
}
