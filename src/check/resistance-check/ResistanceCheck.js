import TitanCheck from "../Check.js";
import TitanUtility from "../../helpers/Utility.mjs";

export default class TitanResistanceCheck extends TitanCheck {
  _ensureValidConstruction(inData) {
    if (!super._ensureValidConstruction(inData)) {
      return false;
    }

    // Check if actor check data is valid
    if (!inData?.actorCheckData) {
      console.error(
        "TITAN | Resistance Check failed during construction. No provided Actor Check Data."
      );
      return false;
    }

    return true;
  }

  _initializeParameters(inData) {
    const parameters = super._initializeParameters(inData);

    // Initialize resistance parameters
    parameters.resistance = inData.resistance ?? "reflex";

    return parameters;
  }

  _calculateDerivedData(inData) {
    super._calculateDerivedData(inData);
    const actorCheckData = inData.actorCheckData;

    // Get the resistance value
    this.parameters.resistanceDice =
      actorCheckData.resistance[this.parameters.resistance].value;

    return;
  }

  _calculateTotalDiceAndExpertise() {
    // Add the training dice to the total dice
    this.parameters.totalDice =
      this.parameters.diceMod + this.parameters.resistanceDice;
    this.parameters.totalExpertise = this.parameters.doubleExpertise ?
      this.parameters.expertiseMod * 2 :
      this.parameters.expertiseMod;

    return;
  }

  static async getOptionsFromDialog(initialOptions) {
    const dialogData = {
      resistance: initialOptions?.resistance ?? "reflex",
      difficulty: initialOptions?.difficulty ?
        TitanUtility.clamp(initialOptions.difficulty, 2, 6) : 4,
      complexity: initialOptions?.complexity ?
        Math.max(checkOptions.complexity, 0) : 0,
      diceMod: initialOptions?.diceMod ?? 0,
      expertiseMod: initialOptions?.expertiseMod ?? 0,
      doubleExpertise: initialOptions?.doubleExpertise ?? false,
      maximizeSuccesses: initialOptions?.maximizeSuccesses ?? false,
      extraSuccessOnCritical: initialOptions?.extraSuccessOnCritical ?? false,
      extraFailureOnCritical: initialOptions?.extraFailureOnCritical ?? false,
      resistanceOptions: {},
    };

    // Add each resistance as an option to the data
    for (let [k, v] of Object.entries(CONFIG.TITAN.resistance.option)) {
      dialogData.resistanceOptions[k] = game.i18n.localize(v.label);
    }

    // Create the html template
    const html = await renderTemplate(
      "systems/titan/templates/checks/ResistanceCheck-dialog.hbs",
      dialogData
    );

    // Process check dialog results
    function _processResistanceCheckOptions(form) {
      return {
        resistance: form.resistance.value,
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
              resolve(
                _processResistanceCheckOptions(event[0].querySelector("form"))
              ),
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

  _getCheckType() {
    return "resistanceCheck";
  }

  _getTypeLabel() {
    return `${game.i18n.localize(CONFIG.TITAN.local[this.parameters.resistance])} (${this.parameters.difficulty}:${this.parameters.complexity})`;
  }
}
