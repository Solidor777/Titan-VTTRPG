import calculateCheckResults from '~/check/CheckResults.js';

/**
 * Options for a check in the Titan system.
 * @typedef {object} CheckOptions
 * @property {boolean?} doubleExpertise Whether to double the Expertise to apply.
 * @property {boolean?} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean?} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {number?} complexity The minimum number of Successes needed.
 * @property {number?} diceMod Modifier for the number of Dice being rolled.
 * @property {number?} difficulty The minimum roll on a die to achieve a Success.
 * @property {number?} expertiseMod Modifier for the amount of Expertise to be applied.
 */

/**
 * Base parameters of a check in the Titan system.
 * @typedef {object} CheckParameters
 * @property {boolean} doubleExpertise Whether to double the Expertise to apply.
 * @property {boolean} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {number} complexity The minimum number of Successes needed.
 * @property {number} diceMod Modifier for the number of Dice being rolled.
 * @property {number} difficulty The minimum roll on a die to achieve a Success.
 * @property {number} expertiseMod Modifier for the amount of Expertise to be applied.
 * @property {number} totalDice The total number of dice to be rolled.
 * @property {number} totalExpertise The total amount of expertise to apply.
 */

/**
 * A check die that has been processed by applying expertise.
 * @typedef {object} CheckDie
 * @property {number} base The base number that was rolled on the dice.
 * @property {number} expertiseApplied The amount of expertise that was applied to the die.
 * @property {number} final The final number after applying expertise to the base result.
 */

/**
 * The sorted dice rolled for the check, after Expertise is applied.
 * @typedef {object} CheckDiceResults
 * @property {CheckDie[]} dice Array of dice objects that has been processed by applying expertise.
 * @property {number} expertiseRemaining The Expertise remaining after being applied to the dice.
 */


/**
 * Base class for a creating and evaluating check in the Titan system.
 * @param {CheckParameters} parameters - Parameters for the Check.
 */
export default class TitanCheck {
   constructor(parameters = {}) {
      this.parameters = parameters;

      // Initialize evaluated to false
      this.isEvaluated = false;

      return this;
   }

   /**
    * Runs evaluation for the check.
    */
   async evaluateCheck() {
      // Get the roll for the check
      this.roll = new Roll(`${this.parameters.totalDice}d6`);
      await this.roll.evaluate({async: true});

      // Calculate the results of the check
      this.results = this._calculateResults(
         this._applyExpertise(
            this._getSortedDiceFromRoll(this.roll)),
         this.parameters);

      // Update the state and returns the results
      this.isEvaluated = true;
   }

   /**
    * Gets the base number results of a roll, sorted from largest to smallest.
    * @param {Roll} roll - The evaluated roll to check.
    * @returns {number[]} Array of roll results, sorted from largest to smallest.
    * @protected
    */
   _getSortedDiceFromRoll(roll) {
      // Sort the dice from largest to smallest
      return roll.terms[0].results.map((dice) => dice.result).sort((a, b) => b - a);
   }

   /**
    * Applies expertise to the results of the dice roll, maximizing the number of successes achieved.
    * @param {number[]} sortedDice - Results of the dice roll, sorted from largest to smallest.
    * @returns {CheckDiceResults} The dice results after Expertise is applied,
    * along with the expertise remaining.
    * @protected
    */
   _applyExpertise(sortedDice) {
      // Initialize object with array of dice results and the expertise remaining
      const retVal = {
         dice: sortedDice.map((die) => {
            return {
               expertiseApplied: 0,
               base: die,
               final: die,
            };
         }),
         expertiseRemaining: this.parameters.totalExpertise ?? 0,
      };

      // If there is any expertise to apply
      if (retVal.expertiseRemaining > 0) {
         // Cache values for easy reference
         const extraSuccessOnCritical = this.parameters.extraSuccessOnCritical;
         const extraFailureOnCritical = this.parameters.extraFailureOnCritical;
         const difficulty = this.parameters.difficulty;

         // If using critical failures,
         // apply expertise to prevent critical failures
         if (extraFailureOnCritical) {
            for (const die of retVal.dice) {
               if (die.final === 1) {
                  retVal.expertiseRemaining -= 1;
                  die.final = 2;
                  die.expertiseApplied = 1;

                  // Abort early if we run out of expertise
                  if (1 > retVal.expertiseRemaining) {
                     break;
                  }
               }
            }
         }

         // Iterate over each die, and apply expertise in successively greater increments
         // in order to achieve the highest number of successes
         for (let increment = 1; increment < 6; increment++) {

            // Abort operation if we run out of expertise
            if (increment > retVal.expertiseRemaining) {
               break;
            }

            // Apply expertise to dice that are === the increment from being a success
            for (const die of retVal.dice) {
               if (die.final < difficulty &&
                  difficulty - die.final === increment
               ) {
                  retVal.expertiseRemaining -= increment;
                  die.final = difficulty;
                  die.expertiseApplied += increment;

                  // Abort operation if we run out of expertise
                  if (increment > retVal.expertiseRemaining) {
                     break;
                  }
               }
            }

            // If using critical successes,
            // apply expertise to dice that are == the increment from being a critical success
            if (extraSuccessOnCritical) {
               for (const die of retVal.dice) {
                  if (die.final < 6 &&
                     6 - retVal.dice[i].final === increment
                  ) {
                     retVal.expertiseRemaining -= increment;
                     die.final = 6;
                     die.expertiseApplied += increment;

                     // Abort early if we run out of expertise
                     if (increment > retVal.expertiseRemaining) {
                        break;
                     }
                  }
               }
            }
         }
      }

      return retVal;
   }

   /**
    * Calculates the results of a check in the Titan system, based on the inputted parameters,
    * the dice rolled on the check,and the expertise that was applied.
    * This calls an external helper function specific to the check type,
    * so that re-calculation can be easily performed by external sources.
    * See {@link calculateCheckResults}.
    * @param {CheckDiceResults} diceResults - The sorted dice rolled for the check, after Expertise is applied.
    * @param {CheckParameters} parameters - Object containing the parameters of the check.
    * @returns {CheckResults} The final results of the check.
    * @protected
    */
   _calculateResults(diceResults, parameters) {
      return calculateCheckResults(diceResults, parameters);
   }

   /**
    * Sends the results of the check to chat.
    * Waits for the check to evaluate if it has not already been evaluated.
    * @param {object?} options - Options for the chat message.
    * @param {string[]?} options.message - Messages to attach to the check.
    * @param {object?} options.speaker - The speaker for the chat message.
    * @returns {Promise<ChatMessage>} The newly created Chat Message.
    */
   async sendToChat(options) {
      // Ensure the check is evaluated
      if (!this.isEvaluated) {
         await this.evaluateCheck();
      }

      // Create the context object
      const messageData = {
         parameters: this.parameters,
         results: this.results,
         type: this._getCheckType(),
         failuresReRolled: false,
      };

      // Add the messages if appropriate
      if (options.message) {
         messageData.message = options.message;
      }

      // Create and post the message
      return ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               user: game.user.id,
               speaker: options?.speaker ?? ChatMessage.getSpeaker(),
               rolls: [this.roll],
               type: CONST.CHAT_MESSAGE_TYPES.OTHER,
               sound: CONFIG.sounds.dice,
               flags: {
                  titan: messageData,
               },
               classes: ['titan'],
            },
            game.settings.get('core', 'rollMode'),
         ),
      );
   }

   /**
    * Overridable function for getting the specific check type.
    * @returns {string} String containing the Check type.
    * @protected
    */
   _getCheckType() {
      return 'check';
   }
}
