import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
import localize from '~/helpers/utility-functions/Localize.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';
import {DICE_ICON, EXPERTISE_ICON, TRAINING_ICON} from '~/system/Icons.js';
import rollCheckDice from '~/helpers/utility-functions/RollCheckDice.js';

/**
 * Generates contextual options when right-clicking on a Chat Message in the Chat Log.
 * @param {Element} element - The Element that was clicked.
 * @param {object} options - Array of buttons contenting the contextual options.
 */
export default function onGetChatLogEntryContext(element, options) {
   // Get the settings for ato spending resolve
   const autoSpendResolveReRollFailures = getSetting('autoSpendResolveReRollFailures');
   const autoSpendResolveDoubleExpertise = getSetting('autoSpendResolveDoubleExpertise');
   const autoSpendResolveDoubleTraining = getSetting('autoSpendResolveDoubleTraining');

   // Re-roll Failures (Spend Resolve)
   const reRollFailureOptions = [
      {
         name: localize('reRollFailuresSpendResolve'),
         icon: `<i class="${DICE_ICON}"></i>`,
         condition: canReRollFailures,
         callback: (entry) => reRollFailures(entry, true),
      },
   ];

   // Re-roll Failures without spending resolve
   if (game.user.isGM || !autoSpendResolveReRollFailures) {
      reRollFailureOptions.unshift({
         name: localize('reRollFailures'),
         icon: `<i class="${DICE_ICON}"></i>`,
         condition: canReRollFailures,
         callback: (entry) => reRollFailures(entry, false),
      });
   }

   // Double Expertise (Spend Resolve)
   const doubleExpertiseOptions = [
      {
         name: localize('doubleExpertiseSpendResolve'),
         icon: `<i class="${EXPERTISE_ICON}"></i>`,
         condition: canDoubleExpertise,
         callback: (entry) => doubleExpertise(entry, true),
      },
   ];

   // Double Expertise without spending resolve
   if (game.user.isGM || !autoSpendResolveDoubleExpertise) {
      doubleExpertiseOptions.unshift({
         name: localize('doubleExpertise'),
         icon: `<i class="${EXPERTISE_ICON}"></i>`,
         condition: canDoubleExpertise,
         callback: (entry) => doubleExpertise(entry, false),
      });
   }

   // Double Training (Spend Resolve)
   const doubleTrainingOptions = [
      {
         name: localize('doubleTrainingSpendResolve'),
         icon: `<i class="${TRAINING_ICON}"></i>`,
         condition: canDoubleTraining,
         callback: (entry) => doubleTraining(entry, true),
      },
   ];

   // Double Training without spending resolve
   if (game.user.isGM || !autoSpendResolveDoubleTraining) {
      doubleTrainingOptions.push({
         name: localize('doubleTraining'),
         icon: `<i class="${TRAINING_ICON}"></i>`,
         condition: canDoubleTraining,
         callback: (entry) => doubleTraining(entry, false),
      });
   }

   options.push(...reRollFailureOptions);
   options.push(...doubleExpertiseOptions);
   options.push(...doubleTrainingOptions);
}

/**
 * Gets the Titan flags from the Entry for a Chat Message in the Chat Log.
 * @param {Element} element - The Entry for a Chat Message in the Chat Log.
 * @returns {object} The Titan flags from the Entry for a Chat Message in the Chat Log.
 */
function getTitanFlags(element) {
   // Get the message from the list item
   const message = game.messages.get(element.data('messageId'));

   // Check if this message is visible and the user owns the speaker
   if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {

      // Check if the message is a titan message
      const titanFlags = message?.flags?.titan;
      if (titanFlags) {
         return titanFlags;
      }
   }

   return false;
}

/**
 * Determines whether to display the Re-Roll Failures contextual option for a Chat Message in the Chat Log.
 * @param {Element} element - The Entry for a Chat Message in the Chat Log.
 * @returns {boolean} Whether to display the Re-Roll Failures contextual option for a Chat Message in the Chat Log.
 */
function canReRollFailures(element) {
   // Get the Titan Flags
   const titanFlags = getTitanFlags(element);
   if (titanFlags) {

      // If this is a check AND it has not re-rolled failures OR the current user is a GM
      if (isCheck(titanFlags.type) && (titanFlags.failuresReRolled === false || game.user.isGM)) {

         // Return true if the check has any failures.
         for (const die of titanFlags.results.dice) {
            if (die.base < titanFlags.parameters.difficulty) {
               return true;
            }
         }
      }
   }

   return false;
}

/**
 * Re-Rolls the failures for a Check belonging to a Chat Message Entry in the Chat Log.
 * @param {Element} element - The Entry for a Chat Message in the Chat Log.
 * @param {boolean} spendResolve - Whether the Speaker's Actor should spend 1 Resolve.
 */
async function reRollFailures(element, spendResolve) {
   // Get the successes and failure count
   const message = game.messages.get(element.data('messageId'));
   const titanFlags = message?.flags?.titan;
   let failureCount = 0;
   let expertiseToRefund = 0;
   const successes = titanFlags.results.dice.filter((die) => {
      if (die.base >= titanFlags.parameters.difficulty) {
         return true;
      }
      else {
         failureCount += 1;
         if (die.expertiseApplied) {
            expertiseToRefund += die.expertiseApplied;
         }
         return false;
      }
   });

   // If there are any failures
   if (failureCount > 0) {
      const rerolledDice = await rollCheckDice(failureCount);
      titanFlags.results.dice = successes.concat(rerolledDice);
      titanFlags.results.expertiseRemaining += expertiseToRefund;

      // Recalculate the check
      const newResults = recalculateCheckResults(titanFlags);

      // Update the message
      await message.update({
         flags: {
            titan: {
               results: newResults,
               failuresReRolled: true,
            },
         },
      });

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActorFromSpeaker(message.speaker);
         if (actor && actor.system.isCharacter) {
            await actor.system.spendResolve(1, {playSound: false});
         }
      }

      foundry.audio.AudioHelper.play({src: CONFIG.sounds.dice, loop: false}, true);
   }
}

/**
 * Determines whether to display the Double Training contextual option for a Chat Message in the Chat Log.
 * @param {Element} element - The Entry for a Chat Message in the Chat Log.
 * @returns {boolean} Whether to display the Double Training contextual option for a Chat Message in the Chat Log.
 */
function canDoubleTraining(element) {
   // Return true if the message is a check with Training that has not yet been doubled.
   const titanFlags = getTitanFlags(element);
   return (titanFlags &&
      isCheck(titanFlags.type) &&
      titanFlags.parameters.totalTrainingDice > 0 &&
      (titanFlags.parameters.doubleTraining === false));
}

/**
 * Doubles the Training for a Check belonging to a Chat Message Entry in the Chat Log.
 * @param {Element} element - The Entry for a Chat Message in the Chat Log.
 * @param {boolean} spendResolve - Whether the Speaker's Actor should spend 1 Resolve.
 */
async function doubleTraining(element, spendResolve) {
   // If expertise is not already doubled
   const message = game.messages.get(element.data('messageId'));
   const titanFlags = message?.flags?.titan;

   // Re roll dice equal to the number of falures
   if (titanFlags.parameters.doubleTraining === false && titanFlags.parameters.totalTrainingDice > 0) {
      titanFlags.parameters.doubleTraining = true;

      // Roll the new dice and update the message
      const newTrainingDice = await rollCheckDice(titanFlags.parameters.totalTrainingDice);
      titanFlags.results.dice =
         titanFlags.results.dice.concat(newTrainingDice);
      titanFlags.results.totalDice += titanFlags.parameters.totalTrainingDice;
      titanFlags.parameters.totalTrainingDice *= 2;
      await message.update({
         flags: {
            titan: titanFlags,
         },
      });

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActorFromSpeaker(message.speaker);
         if (actor && actor.system.isCharacter) {
            await actor.system.spendResolve(1, {playSound: false});
         }
      }

      foundry.audio.AudioHelper.play({src: CONFIG.sounds.dice, loop: false}, true);
   }
}

/**
 * Determines whether to display the Double Expertise contextual option for a Chat Message in the Chat Log.
 * @param {Element} element - The Entry for a Chat Message in the Chat Log.
 * @returns {boolean} Whether to display the Double Expertise contextual option for a Chat Message in the Chat Log.
 */
function canDoubleExpertise(element) {
   // Return true if the message is a check with Expertise that has not yet been doubled.
   const titanFlags = getTitanFlags(element);
   return (titanFlags &&
      isCheck(titanFlags.type) &&
      titanFlags.parameters.totalExpertise > 0 &&
      (titanFlags.parameters.doubleExpertise === false));
}

/**
 * Doubles the Expertise for a Check belonging to a Chat Message Entry in the Chat Log.
 * @param {Element} element - The Entry for a Chat Message in the Chat Log.
 * @param {boolean} spendResolve - Whether the Speaker's Actor should spend 1 Resolve.
 */
async function doubleExpertise(element, spendResolve) {
   // If expertise is not already doubled
   const message = game.messages.get(element.data('messageId'));
   const titanFlags = message?.flags?.titan;

   // Double the expertise
   if (titanFlags.parameters.doubleExpertise === false && titanFlags.parameters.totalExpertise > 0) {
      titanFlags.parameters.doubleExpertise = true;
      titanFlags.results.expertiseRemaining += titanFlags.parameters.totalExpertise;
      titanFlags.parameters.totalExpertise *= 2;

      // Update the message
      await message.update({
         flags: {
            titan: titanFlags,
         },
      });

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActorFromSpeaker(message.speaker);
         if (actor && actor.system.isCharacter) {
            await actor.system.spendResolve(1);
         }
      }
   }
}

/**
 * Returns whether the provided chat message type is a Check Chat Message.
 * @param {string} chatMessageType - The chat message type to check.
 * @returns {boolean} Whether the provided chat message type is a Check Chat Message.
 */
function isCheck(chatMessageType) {
   switch (chatMessageType) {
      case 'attackCheck':
      case 'attributeCheck':
      case 'resistanceCheck':
      case 'castingCheck':
      case 'itemCheck': {
         return true;
      }
      default: {
         return false;
      }
   }
}
