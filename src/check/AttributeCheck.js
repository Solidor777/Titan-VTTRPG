import TitanCheck from "./Check.js";

export default class TitanAttributeCheck extends TitanCheck {
  _ensureValidConstruction(inData) {
    if (!super._ensureValidConstruction(inData)) {
      return false;
    }

    // Check if actor check data is valid
    if (!inData?.actorCheckData) {
      console.error(
        "TITAN | Attribute Check failed during construction. No provided Actor Check Data."
      );
      return false;
    }

    return true;
  }

  _initializeParameters(inData) {
    const parameters = super._initializeParameters(inData);

    // Initialize attribute parameters
    parameters.attribute = inData.attribute ?? "body";

    return parameters;
  }

  _calculateDerivedData(inData) {
    super._calculateDerivedData(inData);
    const actorCheckData = inData.actorCheckData;

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
