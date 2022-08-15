import TitanUtility from "../helpers/Utility.js";

export default class TitanCheck {
  // Constructor
  constructor(options) {
    // Check if the provided data is valid
    this.isValid = this._ensureValidConstruction(options);
    if (!this.isValid) {
      return this;
    }

    // Initialize state variables
    this.isEvaluated = false;

    // Initialize the parameters
    this.parameters = this._initializeParameters(options);

    // Calculate the check data
    this._calculateDerivedData(options);

    // Calculate the final data
    this._calculateTotalDiceAndExpertise();

    return this;
  }

  // Ensure the provided input is valid
  _ensureValidConstruction(options) {
    return true;
  }

  // Initialize Parameters
  _initializeParameters(options) {
    const parameters = {
      difficulty: options.difficulty ?
        TitanUtility.clamp(options.difficulty, 2, 6) : 4,
      complexity: options.complexity ? Math.max(0, options.complexity) : 0,
      diceMod: options.diceMod ?? 0,
      maximizeSuccesses: options.maximizeSuccesses ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
    };

    return parameters;
  }

  // Use the check data to calculate the check data
  _calculateDerivedData(options) {
    return;
  }

  // Calculate the final total dice and expertise
  _calculateTotalDiceAndExpertise() {
    this.parameters.totalDice = this.parameters.diceMod;
    this.parameters.totalExpertise = 0;

    return;
  }

  // Evaluates the check result
  async evaluateCheck() {
    // Get the roll for the check
    this.roll = new Roll(`${this.parameters.totalDice}d6`);
    await this.roll.evaluate({ async: true });

    // Calculate the results of the check
    this.results = this._calculateResults();
    this.isEvaluated = true;

    return this.results;
  }

  // Calculates the result of the check
  _calculateResults() {
    const results = {
      dice: [],
      criticalFailures: 0,
      criticalSuccesses: 0,
      successes: 0,
      expertiseRemaining: this.parameters.totalExpertise ? this.parameters.totalExpertise : 0
    };

    // Sort the dice from the check from largest to smallist
    let sortedDice = this._getSortedDiceFromRoll();
    const numDice = sortedDice.length;

    // Initialize the base and final result of the die
    const difficulty = this.parameters.difficulty;
    for (let i = 0; i < sortedDice.length; i++) {
      results.dice[i] = {
        base: sortedDice[i],
        final: sortedDice[i],
      };
    }

    // Apply expertise depending on parameters
    const extraSuccessOnCritical = this.parameters.extraSuccessOnCritical;
    const extraFailureOnCritical = this.parameters.extraFailureOnCritical;

    // Apply expertise to dice that will be critical failures
    if (extraFailureOnCritical) {
      for (let i = 0; i < numDice; i++) {
        if (results.dice[i].final === 1) {
          results.expertiseRemaining -= 1;
          results.dice[i].final = 2;
          results.dice[i].expertiseApplied = 1;

          // Abort early if we run out of expertise
          if (1 > results.expertiseRemaining) {
            break;
          }
        }
      }
    }

    // Apply expertise to dice that could become successes
    for (let increment = 1; increment < 6; increment++) {
      // Abort early if we run out of expertise
      if (increment > results.expertiseRemaining) {
        break;
      }

      // Apply expertise to dice that are == the increment from being a success
      for (let i = 0; i < numDice; i++) {
        if (
          results.dice[i].final < difficulty &&
          difficulty - results.dice[i].final === increment
        ) {
          results.expertiseRemaining -= increment;
          results.dice[i].final = difficulty;
          results.dice[i].expertiseApplied = results.dice[i].expertiseApplied ?
            results.dice[i].expertiseApplied + increment : increment;

          // Abort early if we run out of expertise
          if (increment > results.expertiseRemaining) {
            break;
          }
        }
      }

      // Apply expertise to dice that are == the increment from being a critical success
      if (extraSuccessOnCritical) {
        for (let i = 0; i < numDice; i++) {
          if (
            results.dice[i].final < 6 &&
            6 - results.dice[i].final === increment
          ) {
            results.expertiseRemaining -= increment;
            results.dice[i].final = 6;
            results.dice[i].expertiseApplied = results.dice[i].expertiseApplied ?
              results.dice[i].expertiseApplied + increment : increment;

            // Abort early if we run out of expertise
            if (increment > results.expertiseRemaining) {
              break;
            }
          }
        }
      }
    }

    // Calculate failures and successes
    for (let i = 0; i < numDice; i++) {
      // If this dice was a crit success
      if (results.dice[i].final === 6) {
        // Log the log the critical succcess
        results.criticalSuccesses += 1;
        results.successes += extraSuccessOnCritical ? 2 : 1;
        results.dice[i].success = true;
        results.dice[i].criticalSuccess = true;
      }

      // If this dice was a success
      else if (results.dice[i].final >= difficulty) {
        results.successes += 1;
        results.dice[i].success = true;
      }

      // If this dice was a critical failure
      else if (results.dice[i].final === 1) {
        results.dice[i].criticalFailure = true;
        if (extraFailureOnCritical) {
          results.successes -= 1;
        }
      }
    }

    // Calculate whether the check succeeded or not
    const complexity = this.parameters.complexity;
    if (complexity > 0) {
      // If succeeeded
      if (results.successes >= complexity) {
        results.succeeded = true;

        // If extra successes
        if (results.successes > complexity) {
          results.extraSuccesses = results.successes - complexity;
        }
      }
      // If failed
      else {
        results.failed = true;
      }
    }
    return results;
  }

  // Gets a sorted array of dice
  _getSortedDiceFromRoll() {
    let sortedDice = [];

    // Add each dice result to the return value
    const results = this.roll.terms[0].results;
    for (let i = 0; i < results.length; i++) {
      sortedDice.push(results[i].result);
    }

    // Sort the dice from largest to smallest
    sortedDice.sort((a, b) => b - a);

    return sortedDice;
  }

  async sendToChat(options) {
    // Ensure the check is evaluated
    if (!this.evaluated) {
      await this.evaluateCheck();
    }

    // Create the context object
    const chatContext = this._getChatContext(options);

    // Create and post the message
    this.chatMessage = await ChatMessage.create(
      ChatMessage.applyRollMode(
        {
          user: options?.user ? options.user : game.user.id,
          speaker: options?.speaker ? options.speaker : null,
          roll: this.roll,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          sound: CONFIG.sounds.dice,
          flags: {
            titan: {
              data: { chatContext: chatContext }
            }
          }
        },
        options?.rollMode ?
          options.rollMode :
          game.settings.get("core", "rollMode")
      )
    );

    return this.chatMessage;
  }

  _getChatContext(options) {
    // Create the context object
    const chatContext = {
      label: options?.label ? options.label : this._getTypeLabel(),
      parameters: this.parameters,
      results: this.results,
      type: this._getCheckType(),
    };
    if (options?.label) {
      chatContext.typeLabel = this._getTypeLabel();
    }

    return chatContext;
  }

  _getCheckType() {
    return "check";
  }

  _getTypeLabel() {
    return `${game.i18n.localize(CONFIG.TITAN.local.check)} ${this.parameters.difficulty}:${this.parameters.complexity}`;
  }
}
