import { clamp } from '~/helpers/Utility.js';
import calculateCheckResults from '~/check/CalculateCheckResults.js';

export default class TitanCheck {
   // Constructor
   constructor(options) {
      // If the options are not already initialized
      if (!options?.initialized) {
         // Check if the provided data is valid
         this.isValid = this._ensureValidConstruction(options);
         if (!this.isValid) {
            return false;
         }

         // If so, initialize the data
         this.parameters = this._initializeParameters(options);
         this.parameters.initialized = true;
      }
      else {
         // Otherwise, simply copy the data
         this.parameters = options;
         this.isValid = true;
      }

      this.isEvaluated = false;
      return this;
   }

   // Ensure the provided input is valid
   _ensureValidConstruction() {
      return true;
   }

   // Initialize Parameters
   _initializeParameters(options) {
      const parameters = {
         difficulty: options?.difficulty ? clamp(options.difficulty, 2, 6) : 4,
         complexity: options?.complexity ? Math.max(0, options.complexity) : 0,
         diceMod: options?.diceMod ?? 0,
         expertiseMod: options?.expertiseMod ?? 0,
         doubleExpertise: options?.doubleExpertise ?? false,
         maximizeSuccesses: options?.maximizeSuccesses ?? false,
         extraSuccessOnCritical: options?.extraSuccessOnCritical ?? false,
         extraFailureOnCritical: options?.extraFailureOnCritical ?? false,
      };

      parameters.totalDice = parameters.diceMod;
      parameters.totalExpertise = parameters.expertiseMod * (parameters.doubleExpertise === true ? 2 : 1);

      return parameters;
   }

   // Evaluates the check result
   async evaluateCheck() {
      // Get the roll for the check
      this.roll = new Roll(`${this.parameters.totalDice}d6`);
      await this.roll.evaluate({ async: true });

      // Calculate the results of the check
      this.results = this._calculateResults(this._applyExpertise(this._getSortedDiceFromRoll(this.roll)), this.parameters);

      this.isEvaluated = true;
      return this.results;
   }

   // Gets a sorted array of dice
   _getSortedDiceFromRoll(roll) {
      // Sort the dice from largest to smallest
      return roll.terms[0].results.map((dice) => dice.result).sort((a, b) => b - a);
   }

   _applyExpertise(dice) {
      // Initialize dice and expertise
      const retVal = {
         dice: dice.map((die) => {
            return {
               expertiseApplied: 0,
               base: die,
               final: die
            };
         }),
         expertiseRemaining: this.parameters.totalExpertise ? this.parameters.totalExpertise : 0
      };

      if (retVal.expertiseRemaining > 0) {
         // Cache values for easy reference
         const extraSuccessOnCritical = this.parameters.extraSuccessOnCritical;
         const extraFailureOnCritical = this.parameters.extraFailureOnCritical;
         const difficulty = this.parameters.difficulty;

         // Apply expertise to dice that will be critical failures
         if (extraFailureOnCritical) {
            for (let i = 0; i < dice.length; i++) {
               if (retVal.dice[i].final === 1) {
                  retVal.expertiseRemaining -= 1;
                  retVal.dice[i].final = 2;
                  retVal.dice[i].expertiseApplied = 1;

                  // Abort early if we run out of expertise
                  if (1 > retVal.expertiseRemaining) {
                     break;
                  }
               }
            }
         }

         // Apply expertise to dice that could become successes
         for (let increment = 1; increment < 6; increment++) {
            // Abort early if we run out of expertise
            if (increment > retVal.expertiseRemaining) {
               break;
            }

            // Apply expertise to dice that are == the increment from being a success
            for (let i = 0; i < dice.length; i++) {
               if (
                  retVal.dice[i].final < difficulty &&
                  difficulty - retVal.dice[i].final === increment
               ) {
                  retVal.expertiseRemaining -= increment;
                  retVal.dice[i].final = difficulty;
                  retVal.dice[i].expertiseApplied += increment;

                  // Abort early if we run out of expertise
                  if (increment > retVal.expertiseRemaining) {
                     break;
                  }
               }
            }

            // Apply expertise to dice that are == the increment from being a critical success
            if (extraSuccessOnCritical) {
               for (let i = 0; i < dice.length; i++) {
                  if (
                     retVal.dice[i].final < 6 &&
                     6 - retVal.dice[i].final === increment
                  ) {
                     retVal.expertiseRemaining -= increment;
                     retVal.dice[i].final = 6;
                     retVal.dice[i].expertiseApplied += increment;

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

   // Calculates the result of the check
   _calculateResults(inResults, parameters) {
      return calculateCheckResults(inResults, parameters);
   }

   async sendToChat(options) {
      // Ensure the check is evaluated
      if (!this.isEvaluated) {
         await this.evaluateCheck();
      }

      // Create the context object
      const chatContext = {
         parameters: this.parameters,
         results: this.results,
         type: this._getCheckType(),
         isCheck: true,
         failuresReRolled: false
      };

      if (options.message) {
         chatContext.message = options.message;
      }

      const speaker = options?.speaker ?? null;
      const token = (speaker ? (speaker.token ? speaker.token : typeof (speaker.getActiveTokens) === 'function' ? speaker.getActiveTokens(false, true)[0] : null) : null);

      // Create and post the message
      this.chatMessage = await ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               user: options?.user ? options.user : game.user.id,
               speaker: speaker,
               token: token,
               roll: this.roll,
               type: CONST.CHAT_MESSAGE_TYPES.OTHER,
               sound: CONFIG.sounds.dice,
               flags: {
                  titan: chatContext
               }
            },
            options?.rollMode ?
               options.rollMode :
               game.settings.get('core', 'rollMode')
         )
      );

      return this.chatMessage;
   }

   _getCheckType() {
      return 'check';
   }
}
