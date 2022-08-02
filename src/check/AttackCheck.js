import TitanUtility from "../helpers/Utility.js";
import TitanSkillCheck from "./skill-check/SkillCheck.js";

export default class TitanAttackCheck extends TitanSkillCheck {
  _ensureValidConstruction(options) {
    if (!super._ensureValidConstruction(options)) {
      return false;
    }

    // Check if the weapon is valid
    const weaponCheckData = options.weaponCheckData;
    if (!weaponCheckData) {
      console.log(
        `TITAN | Attack Check failed during construction. Invalid Data. ${options}`
      );
      return false;
    }

    // Check if the attack is valid
    const checkAttack = weaponCheckData.attack[options.attackIdx];
    if (!checkAttack) {
      console.log(
        `TITAN | Attack Check failed during construction. Attack IDX. ${options}`
      );
      return false;
    }

    return true;
  }

  _initializeParameters(options) {
    const parameters = {
      attribute: options.attribute ?? false,
      skill: options.skill ?? false,
      type: options.type ?? false,
      targetDefense: options.targetDefense ?? false,
      attackerMelee: options.attackerMelee ?? false,
      attackerAccuracy: options.attackerAccuracy ?? false,
      difficulty: options.difficulty ?? false,
      complexity: 1,
      diceMod: options.diceMod ?? 0,
      trainingMod: options.trainingMod ?? 0,
      expertiseMod: options.expertiseMod ?? 0,
      damageMod: options.damageMod ?? 0,
      doubleExpertise: options.doubleExpertise ?? false,
      maximizeSuccesses: options.maximizeSuccesses ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
      weaponName:
        options.weaponName ??
        game.i18n.localize(CONFIG.TITAN.weapon.unarmed.label),
      multiAttack: options.multiAttack ?? null,
    };

    return parameters;
  }

  _calculateDerivedData(options) {
    // Get the weapon reference
    const actorCheckData = options.actorCheckData;
    const weaponCheckData = options.weaponCheckData;
    const targetCheckData = options.targetCheckData;
    const checkAttack = weaponCheckData.attack[options.attackIdx];

    // Get the attack description
    if (weaponCheckData.attackDescription) {
      this.parameters.attackDescription = weaponCheckData.attackDescription;
    }

    // Get the skill
    if (!this.parameters.skill) {
      this.parameters.skill = checkAttack.skill;
    }

    // Get the attribute
    if (!this.parameters.attribute) {
      this.parameters.attribute = checkAttack.attribute;
    }

    // Get the actor data
    super._calculateDerivedData(options);

    // Cache the attack info
    this.parameters.attack = checkAttack;

    // Get the skill training and expertise value
    const skill = actorCheckData.skill[this.parameters.skill];
    this.parameters.skillTrainingDice = skill.training.value;
    this.parameters.skillExpertise = skill.expertise.value;

    // Get the attack type
    if (!this.parameters.type) {
      this.parameters.type = checkAttack.type;
    }

    // Calculate ratings
    if (!this.parameters.attackerMelee) {
      this.parameters.attackerMelee = actorCheckData.rating.melee.value;
    }
    if (!this.parameters.attackerAccuracy) {
      this.parameters.attackerAccuracy = actorCheckData.rating.accuracy.value;
    }
    if (!this.parameters.targetDefense && targetCheckData) {
      this.parameters.targetDefense = targetCheckData.rating.defense.value;
    }

    // Calculate the difficulty if difficulty was not provided
    if (!this.parameters.difficulty) {
      // If the target is valid
      if (this.parameters.targetDefense !== false) {
        // Calculate the attacker rating
        const attackerRating =
          this.parameters.type === "melee" ?
            this.parameters.attackerMelee :
            this.parameters.attackerAccuracy;

        // Difficulty = 4 + defense rating - attacker rating
        this.parameters.difficulty = TitanUtility.clamp(
          this.parameters.targetDefense - attackerRating + 4,
          2,
          6
        );
      }
      else {
        this.parameters.difficulty = 4;
      }
    }

    // Calculate whether this is a multi-attack
    if (this.parameters.multiAttack === null) {
      this.parameters.multiAttack = weaponCheckData.multiAttack;
    }

    // Calculate whether this is a dual attack
    if (this.parameters.multiAttack) {
      const traits = checkAttack.traits;
      for (let idx = 0; idx < traits.length; idx++) {
        if (traits[idx].name === "dualAttack") {
          this.parameters.dualAttack = true;
          break;
        }
      }
    }

    return;
  }

  _calculateTotalDiceAndExpertise(checkData) {
    // Calculate the final total dice and expertise
    super._calculateTotalDiceAndExpertise(checkData);

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

    // Adjust the dice and expertise if this is a multi-attack
    if (this.parameters.multiAttack) {
      // Round the total dice up if this is a dual attack
      // Otherwise, round down
      this.parameters.totalDice = this.parameters.dualAttack ?
        Math.ceil(this.parameters.totalDice / 2) :
        Math.floor(this.parameters.totalDice / 2);

      // Round the expertise down
      this.parameters.totalExpertise = Math.floor(
        this.parameters.totalExpertise / 2
      );
    }

    return;
  }

  _calculateResults() {
    const results = super._calculateResults();
    // Add the damage to the results
    if (results.succeeded) {
      results.damage =
        this.parameters.attack.damage + this.parameters.damageMod;

      // Add extra damage if appropriate
      if (results.extraSuccesses && this.parameters.attack.plusSuccessDamage) {
        results.damage += results.extraSuccesses;
      }
    }

    return results;
  }

  // Creates a dialog for getting options for this skill check
  static async getOptionsFromDialog(initialOptions) {
    // Initialize dialog data
    const dialogData = {
      attribute: initialOptions?.attribute ?? "body",
      skill: initialOptions?.skill ?? "athletics",
      difficulty: initialOptions?.difficulty ?
        TitanUtility.clamp(initialOptions.difficulty, 2, 6) :
        4,
      complexity: initialOptions?.complexity ?
        Math.max(checkOptions.complexity, 0) :
        0,
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
    // Add default as an attribute option
    dialogData.skillOptions.default = game.i18n.localize(
      CONFIG.TITAN.default.label
    );

    // Add each skill as an option to the data
    for (let [k, v] of Object.entries(CONFIG.TITAN.skill.option)) {
      dialogData.skillOptions[k] = game.i18n.localize(v.label);
    }
    // Add default as a skill option
    dialogData.skillOptions.default = game.i18n.localize(
      CONFIG.TITAN.default.label
    );

    // Create the html template
    const html = await renderTemplate(
      "systems/titan/templates/checks/attack-check-dialog.hbs",
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

  _getChatTemplate() {
    return "systems/titan/templates/checks/attack-check-chat-message.hbs";
  }
}
