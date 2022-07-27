import TitanUtility from "../helpers/Utility.mjs";
import TitanAttributeCheck from "./AttributeCheck.js";

export default class TitanSkillCheck extends TitanAttributeCheck {
  _initializeParameters(inData) {
    const parameters = super._initializeParameters(inData);

    // Initialize skill parameters
    parameters.skill = inData.skill ?? "athletics";
    parameters.trainingMod = inData.trainingMod ?? 0;
    parameters.doubleTraining = inData.doubleTraining ?? false;

    return parameters;
  }

  _calculateDerivedData(inData) {
    super._calculateDerivedData(inData);
    const actorCheckData = inData.actorCheckData;

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

  // Creates a dialog for getting options for this skill check
  static async getOptionsFromDialog(initialOptions) {
    // Initialize dialog data
    const dialogData = {
      attribute: initialOptions?.attribute ?? "body",
      skill: initialOptions?.skill ?? "athletics",
      difficulty: initialOptions?.difficulty ?
        TitanUtility.clamp(initialOptions.difficulty, 2, 6) : 4,
      complexity: initialOptions?.complexity ?
        Math.max(checkOptions.complexity, 0) : 0,
      diceMod: initialOptions?.diceMod ?? 0,
      trainingMod: initialOptions?.trainingMod ?? 0,
      expertiseMod: initialOptions?.expertiseMod ?? 0,
      doubleExpertise: initialOptions?.doubleExpertise ?? false,
      maximizeSuccesses: initialOptions?.maximizeSuccesses ?? false,
      extraSuccessOnCritical: initialOptions?.extraSuccessOnCritical ?? false,
      extraFailureOnCritical: initialOptions?.extraFailureOnCritical ?? false,
      attributeOptions: {},
      skillOptions: {},
    };

    // Add each attribute as an option to the data
    for (let [k, v] of Object.entries(CONFIG.TITAN.attribute.option)) {
      dialogData.attributeOptions[k] = game.i18n.localize(v.label);
    }

    // Add each skill as an option to the data
    for (let [k, v] of Object.entries(CONFIG.TITAN.skill.option)) {
      dialogData.skillOptions[k] = game.i18n.localize(v.label);
    }
    // Add none as a skill option
    dialogData.skillOptions.none = game.i18n.localize(CONFIG.TITAN.none.label);

    // Create the html template
    const html = await renderTemplate(
      "systems/titan/templates/checks/SkillCheck.js-dialog.hbs",
      dialogData
    );

    // Proccesses the results of a skill check dialog
    function _processSkillCheckOptions(form) {
      return {
        attribute: form.attribute.value,
        skill: form.skill.value,
        difficulty: parseInt(form.difficulty.value),
        complexity: parseInt(form.complexity.value),
        diceMod: parseInt(form.diceMod.value),
        expertiseMod: parseInt(form.expertiseMod.value),
      };
    }

    // Create the dialog
    const checkOptions = await new Promise((resolve) => {
      const data = {
        title: game.i18n.localize(CONFIG.TITAN.check.label),
        content: html,
        buttons: {
          roll: {
            label: game.i18n.localize(CONFIG.TITAN.roll.label),
            callback: (event) =>
              resolve(_processSkillCheckOptions(event[0].querySelector("form"))),
          },
          cancel: {
            label: game.i18n.localize(CONFIG.TITAN.cancel.label),
            callback: () => resolve({ cancelled: true }),
          },
        },
        default: "roll",
        close: () => resolve({ cancelled: true }),
      };

      new Dialog(data, null).render(true);
    });

    // Validate the results if appropriate
    if (!checkOptions.cancelled) {
      // Validate difficulty
      checkOptions.difficulty = TitanUtility.clamp(
        checkOptions.difficulty,
        2,
        6
      );

      // Validate complexity
      checkOptions.complexity = Math.max(checkOptions.complexity, 0);
    }

    return checkOptions;
  }
}
