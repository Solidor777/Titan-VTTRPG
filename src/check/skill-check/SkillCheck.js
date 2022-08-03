import TitanUtility from "../../helpers/Utility.js";
import TitanAttributeCheck from "../AttributeCheck.js";

export default class TitanSkillCheck extends TitanAttributeCheck {
  _initializeParameters(options) {
    const parameters = super._initializeParameters(options);

    // Initialize skill parameters
    parameters.skill = options.skill ?? "athletics";
    parameters.trainingMod = options.trainingMod ?? 0;
    parameters.doubleTraining = options.doubleTraining ?? false;
    parameters.expertiseMod = options.expertiseMod ?? 0;
    parameters.doubleExpertise ?? false;

    return parameters;
  }

  _calculateDerivedData(options) {
    super._calculateDerivedData(options);
    const actorCheckData = options.actorCheckData;

    // Get the skill training and expertise values
    const skill = actorCheckData.skill[this.parameters.skill];
    this.parameters.skillTrainingDice = skill.training.value;
    this.parameters.skillExpertise = skill.expertise.value;

    return;
  }

  _calculateTotalDiceAndExpertise() {
    // Calculate the total training dice
    let totalTrainingDice =
      this.parameters.skillTrainingDice + this.parameters.trainingMod;
    if (this.parameters.doubleTraining) {
      totalTrainingDice *= 2;
    }

    // Add the training dice to the total dice
    this.parameters.totalDice =
      this.parameters.diceMod +
      this.parameters.attributeDice +
      totalTrainingDice;


    // Calculcate the total expertise
    let totalExpertise =
      this.parameters.skillExpertise + this.parameters.expertiseMod;
    if (this.parameters.doubleExpertise) {
      totalExpertise *= 2;
    }
    this.parameters.totalExpertise = totalExpertise;

    return;
  }

  _getCheckType() {
    return "skillCheck";
  }

  _getTypeLabel() {
    return `${game.i18n.localize(CONFIG.TITAN.local[this.parameters.attribute])} (${game.i18n.localize(CONFIG.TITAN.local[this.parameters.skill])}) ${this.parameters.difficulty}:${this.parameters.complexity}`;
  }
}
