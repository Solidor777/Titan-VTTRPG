import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
import localize from '~/helpers/utility-functions/Localize.js';
import autoSpendResolveReRollFailures from '~/helpers/Settings/AutoSpendResolveReRollFailures.js';
import autoSpendResolveDoubleExpertise from '~/helpers/Settings/AutoSpendResolveDoubleExpertise.js';
import autoSpendResolveDoubleTraining from '~/helpers/Settings/AutoSpendResolveDoubleTraining.js';
import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults.js';
import { DICE_ICON, EXPERTISE_ICON, TRAINING_ICON } from '~/system/Icons.js';
import rollCheckDice from '~/helpers/utility-functions/RollCheckDice.js';

/**
 * Generates contextual options when right-clicking on a Chat Message in the Chat Log.
 * In Foundry v14 the hook signature is (application, menuItems); each ContextMenuEntry uses
 * `visible(li)` and `onClick(event, li)` where `li` is the target HTMLElement with dataset.messageId.
 * @param {ApplicationV2} _application - The ApplicationV2 instance the context menu belongs to.
 * @param {object[]} options - Array of ContextMenuEntry objects to be mutated.
 */
export default function onGetChatLogEntryContext(_application, options) {
   // Get the settings for auto spending resolve.
   const autoSpendResolveReRollFailuresEnabled = autoSpendResolveReRollFailures();
   const autoSpendResolveDoubleExpertiseEnabled = autoSpendResolveDoubleExpertise();
   const autoSpendResolveDoubleTrainingEnabled = autoSpendResolveDoubleTraining();

   // Re-roll Failures (Spend Resolve).
   const reRollFailureOptions = [
      {
         label: localize('reRollFailuresSpendResolve'),
         icon: `<i class="${DICE_ICON}"></i>`,
         visible: canReRollFailures,
         onClick: (_event, li) => reRollFailures(li, true),
      },
   ];

   // Re-roll Failures without spending resolve.
   if (game.user.isGM || !autoSpendResolveReRollFailuresEnabled) {
      reRollFailureOptions.unshift({
         label: localize('reRollFailures'),
         icon: `<i class="${DICE_ICON}"></i>`,
         visible: canReRollFailures,
         onClick: (_event, li) => reRollFailures(li, false),
      });
   }

   // Double Expertise (Spend Resolve).
   const doubleExpertiseOptions = [
      {
         label: localize('doubleExpertiseSpendResolve'),
         icon: `<i class="${EXPERTISE_ICON}"></i>`,
         visible: canDoubleExpertise,
         onClick: (_event, li) => doubleExpertise(li, true),
      },
   ];

   // Double Expertise without spending resolve.
   if (game.user.isGM || !autoSpendResolveDoubleExpertiseEnabled) {
      doubleExpertiseOptions.unshift({
         label: localize('doubleExpertise'),
         icon: `<i class="${EXPERTISE_ICON}"></i>`,
         visible: canDoubleExpertise,
         onClick: (_event, li) => doubleExpertise(li, false),
      });
   }

   // Double Training (Spend Resolve).
   const doubleTrainingOptions = [
      {
         label: localize('doubleTrainingSpendResolve'),
         icon: `<i class="${TRAINING_ICON}"></i>`,
         visible: canDoubleTraining,
         onClick: (_event, li) => doubleTraining(li, true),
      },
   ];

   // Double Training without spending resolve.
   if (game.user.isGM || !autoSpendResolveDoubleTrainingEnabled) {
      doubleTrainingOptions.push({
         label: localize('doubleTraining'),
         icon: `<i class="${TRAINING_ICON}"></i>`,
         visible: canDoubleTraining,
         onClick: (_event, li) => doubleTraining(li, false),
      });
   }

   options.push(...reRollFailureOptions);
   options.push(...doubleExpertiseOptions);
   options.push(...doubleTrainingOptions);
}

/**
 * Gets a plain check-data object ({ type, parameters, results, failuresReRolled, message }) for the
 * chat message under the given list item, or false when it is not an owned, visible check message.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @returns {object | false} The check data, or false.
 */
function getCheckData(li) {
   // Resolve the message via the v14 data-message-id attribute.
   const message = game.messages.get(li.closest('[data-message-id]')?.dataset.messageId);

   // Only owned, visible check messages expose these options.
   if (message?.isContentVisible
      && message.constructor.getSpeakerActor(message.speaker)?.isOwner
      && isCheck(message.type)
   ) {
      return { type: message.type, ...message.system.toObject() };
   }

   return false;
}

/**
 * Determines whether to display the Re-Roll Failures contextual option for a Chat Message in the Chat Log.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @returns {boolean} Whether to display the Re-Roll Failures contextual option for a Chat Message in the Chat Log.
 */
function canReRollFailures(li) {
   // Get the check data.
   const checkData = getCheckData(li);
   if (checkData) {

      // If this is a check AND it has not re-rolled failures OR the current.
      // user is a GM.
      if (isCheck(checkData.type) && (checkData.failuresReRolled === false || game.user.isGM)) {

         // Return true if the check has any failures.
         for (const die of checkData.results.dice) {
            if (die.base < checkData.parameters.difficulty) {
               return true;
            }
         }
      }
   }

   return false;
}

/**
 * Re-Rolls the failures for a Check belonging to a Chat Message Entry in the Chat Log.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @param {boolean} spendResolve - Whether the Speaker's Actor should spend 1 Resolve.
 */
async function reRollFailures(li, spendResolve) {
   // Get the successes and failure count.
   const message = game.messages.get(li.closest('[data-message-id]')?.dataset.messageId);
   const checkData = message.system.toObject();
   /** @type {number} */
   let failureCount = 0;
   /** @type {number} */
   let expertiseToRefund = 0;
   const successes = checkData.results.dice.filter((die) => {
      if (die.base >= checkData.parameters.difficulty) {
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

   // If there are any failures.
   if (failureCount > 0) {
      const rerolledDice = await rollCheckDice(failureCount);
      checkData.results.dice = successes.concat(rerolledDice);
      checkData.results.expertiseRemaining += expertiseToRefund;

      // Recalculate the check.
      const newResults = recalculateCheckResults(
         {
            type: message.type,
            parameters: checkData.parameters,
            results: checkData.results,
         },
      );

      // Update the message.
      await message.update({
         system: {
            results: newResults,
            failuresReRolled: true,
         },
      });

      // Spend resolve if appropriate.
      if (spendResolve) {
         const actor = getActorFromSpeaker(message.speaker);
         if (actor && actor.system.isCharacter) {
            await actor.system.spendResolve(1, { playSound: false });
         }
      }

      foundry.audio.AudioHelper.play(
         {
            src: CONFIG.sounds.dice,
            loop: false,
         },
         true,
      );
   }
}

/**
 * Determines whether to display the Double Training contextual option for a Chat Message in the Chat Log.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @returns {boolean} Whether to display the Double Training contextual option for a Chat Message in the Chat Log.
 */
function canDoubleTraining(li) {
   // Return true if the message is a check with Training that has not yet been.
   // doubled.
   const checkData = getCheckData(li);
   return (checkData &&
      isCheck(checkData.type) &&
      checkData.parameters.totalTrainingDice > 0 &&
      (checkData.parameters.doubleTraining === false));
}

/**
 * Doubles the Training for a Check belonging to a Chat Message Entry in the Chat Log.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @param {boolean} spendResolve - Whether the Speaker's Actor should spend 1 Resolve.
 */
async function doubleTraining(li, spendResolve) {
   // If expertise is not already doubled.
   const message = game.messages.get(li.closest('[data-message-id]')?.dataset.messageId);
   const checkData = message.system.toObject();

   // Re-roll dice equal to the number of failures.
   if (checkData.parameters.doubleTraining === false && checkData.parameters.totalTrainingDice > 0) {
      checkData.parameters.doubleTraining = true;

      // Roll the new dice and update the message.
      const newTrainingDice = await rollCheckDice(checkData.parameters.totalTrainingDice);
      checkData.results.dice =
         checkData.results.dice.concat(newTrainingDice);
      checkData.results.totalDice += checkData.parameters.totalTrainingDice;
      checkData.parameters.totalTrainingDice *= 2;
      await message.update({
         system: {
            parameters: checkData.parameters,
            results: checkData.results,
         },
      });

      // Spend resolve if appropriate.
      if (spendResolve) {
         const actor = getActorFromSpeaker(message.speaker);
         if (actor && actor.system.isCharacter) {
            await actor.system.spendResolve(1, { playSound: false });
         }
      }

      foundry.audio.AudioHelper.play(
         {
            src: CONFIG.sounds.dice,
            loop: false,
         },
         true,
      );
   }
}

/**
 * Determines whether to display the Double Expertise contextual option for a Chat Message in the Chat Log.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @returns {boolean} Whether to display the Double Expertise contextual option for a Chat Message in the Chat Log.
 */
function canDoubleExpertise(li) {
   // Return true if the message is a check with Expertise that has not yet been.
   // doubled.
   const checkData = getCheckData(li);
   return (checkData &&
      isCheck(checkData.type) &&
      checkData.parameters.totalExpertise > 0 &&
      (checkData.parameters.doubleExpertise === false));
}

/**
 * Doubles the Expertise for a Check belonging to a Chat Message Entry in the Chat Log.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @param {boolean} spendResolve - Whether the Speaker's Actor should spend 1 Resolve.
 */
async function doubleExpertise(li, spendResolve) {
   // If expertise is not already doubled.
   const message = game.messages.get(li.closest('[data-message-id]')?.dataset.messageId);
   const checkData = message.system.toObject();

   // Double the expertise.
   if (checkData.parameters.doubleExpertise === false && checkData.parameters.totalExpertise > 0) {
      checkData.parameters.doubleExpertise = true;
      checkData.results.expertiseRemaining += checkData.parameters.totalExpertise;
      checkData.parameters.totalExpertise *= 2;

      // Update the message.
      await message.update({
         system: {
            parameters: checkData.parameters,
            results: checkData.results,
         },
      });

      // Spend resolve if appropriate.
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
