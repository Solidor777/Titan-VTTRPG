import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
import localize from '~/helpers/utility-functions/Localize.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';
import { DICE_ICON, EXPERTISE_ICON, TRAINING_ICON } from '~/system/Icons.js';

/**
 * @param html
 * @param options
 */
export default function onGetChatLogEntryContext(html, options) {
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
         callback: (li) => reRollCheckFailures(li, true),
      },
   ];

   // Re-roll Failures without spending resolve
   if (game.user.isGM || !autoSpendResolveReRollFailures) {
      reRollFailureOptions.unshift({
         name: localize('reRollFailures'),
         icon: `<i class="${DICE_ICON}"></i>`,
         condition: canReRollFailures,
         callback: (li) => reRollCheckFailures(li, false),
      });
   }

   // Double Expertise (Spend Resolve)
   const doubleExpertiseOptions = [
      {
         name: localize('doubleExpertiseSpendResolve'),
         icon: `<i class="${EXPERTISE_ICON}"></i>`,
         condition: canDoubleExpertise,
         callback: (li) => doubleExpertise(li, true),
      },
   ];

   // Double Expertise without spending resolve
   if (game.user.isGM || !autoSpendResolveDoubleExpertise) {
      doubleExpertiseOptions.unshift({
         name: localize('doubleExpertise'),
         icon: `<i class="${EXPERTISE_ICON}"></i>`,
         condition: canDoubleExpertise,
         callback: (li) => doubleExpertise(li, false),
      });
   }

   // Double Training (Spend Resolve)
   const doubleTrainingOptions = [
      {
         name: localize('doubleTrainingSpendResolve'),
         icon: `<i class="${TRAINING_ICON}"></i>`,
         condition: canDoubleTraining,
         callback: (li) => doubleTraining(li, true),
      },
   ];

   // Double Training without spending resolve
   if (game.user.isGM || !autoSpendResolveDoubleTraining) {
      doubleTrainingOptions.push({
         name: localize('doubleTraining'),
         icon: `<i class="${TRAINING_ICON}"></i>`,
         condition: canDoubleTraining,
         callback: (li) => doubleTraining(li, false),
      });
   }

   options.push(...reRollFailureOptions);
   options.push(...doubleExpertiseOptions);
   options.push(...doubleTrainingOptions);
}

/**
 * @param li
 */
function getChatContext(li) {
   // Get the message from the list item
   const message = game.messages.get(li.data('messageId'));

   // Check if this message is visible and the user owns the speaker
   if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {

      // Check if the message is a titan message
      const chatContext = message?.flags?.titan;
      if (chatContext) {
         return chatContext;
      }
   }

   return false;
}

/**
 * @param li
 */
function canReRollFailures(li) {
   // Get chat contextt
   const chatContext = getChatContext(li);
   if (chatContext) {
      // If this is a check that has not re-rolled failures
      if (isCheck(chatContext.type) && (chatContext.failuresReRolled === false || game.user.isGM)) {

         // Check if the check has any failures
         let retVal = false;
         for (const die of chatContext.results.dice) {
            if (die.base < chatContext.parameters.difficulty) {
               retVal = true;
               break;
            }
         }

         return retVal;
      }
   }

   return false;
}

/**
 * @param li
 */
function canDoubleExpertise(li) {
   // Get chat context
   const chatContext = getChatContext(li);
   if (chatContext) {

      // Check if this is a check with expertise that has not yet been doubled
      return isCheck(chatContext.type) &&
         chatContext.parameters.totalExpertise > 0 &&
         (chatContext.parameters.doubleExpertise === false || game.user.isGM);
   }

   return false;
}

/**
 * @param li
 */
function canDoubleTraining(li) {
   // Get chat context
   const chatContext = getChatContext(li);
   if (chatContext) {

      // Check if this is a check with training that has not yet been doubled
      return isCheck(chatContext.type) &&
         chatContext.parameters.totalTrainingDice > 0 &&
         (chatContext.parameters.doubleTraining === false || game.user.isGM);
   }

   return false;
}

/**
 * @param li
 * @param spendResolve
 */
async function reRollCheckFailures(li, spendResolve) {
   // Get the successes and failure count
   const message = game.messages.get(li.data('messageId'));
   const chatContext = message?.flags?.titan;
   let failureCount = 0;
   let expertiseToRefund = 0;
   const successes = chatContext.results.dice.filter((die) => {
      if (die.base >= chatContext.parameters.difficulty) {
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
      // Re roll dice equal to the number of falures
      const roll = new Roll(`${failureCount}d6`);
      await roll.evaluate({ async: true });
      const reRolledDice = roll.terms[0].results.map((dice) => dice.result).sort((a, b) => b - a);
      const newDice = successes.concat(reRolledDice.map((die) => {
         return {
            expertiseApplied: 0,
            base: die,
            final: die,
         };
      }));
      chatContext.results.dice = newDice;
      chatContext.results.expertiseRemaining += expertiseToRefund;

      // Recalculate the check
      const newResults = recalculateCheckResults(chatContext);

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
         const actor = getActorFromSpeaker(message.speaker.token, message.speaker.actor);
         if (actor && actor.system.isCharacter) {
            actor.system.spendResolve(1);
         }
      }
   }
}

/**
 * @param li
 * @param spendResolve
 */
async function doubleExpertise(li, spendResolve) {
   // If expertise is not already doubled
   const message = game.messages.get(li.data('messageId'));
   const chatContext = message?.flags?.titan;

   // Double the expertise
   if (chatContext.parameters.doubleExpertise === false && chatContext.parameters.totalExpertise > 0) {
      chatContext.parameters.doubleExpertise = true;
      chatContext.results.expertiseRemaining += chatContext.parameters.totalExpertise;
      chatContext.parameters.totalExpertise *= 2;

      // Update the message
      await message.update({
         flags: {
            titan: chatContext,
         },
      });

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActorFromSpeaker(message.speaker.token, message.speaker.actor);
         if (actor && actor.system.isCharacter) {
            actor.system.spendResolve(1);
         }
      }
   }
}

/**
 * @param li
 * @param spendResolve
 */
async function doubleTraining(li, spendResolve) {
   // If expertise is not already doubled
   const message = game.messages.get(li.data('messageId'));
   const chatContext = message?.flags?.titan;

   // Re roll dice equal to the number of falures
   if (chatContext.parameters.doubleTraining === false && chatContext.parameters.totalTrainingDice > 0) {
      chatContext.parameters.doubleTraining = true;

      // Roll the new dice
      const roll = new Roll(`${chatContext.parameters.totalTrainingDice}d6`);
      await roll.evaluate({ async: true });
      const newDice = roll.terms[0].results.map((dice) => dice.result).sort((a, b) => b - a);
      const newDiceResults = chatContext.results.dice.concat(newDice.map((die) => {
         return {
            expertiseApplied: 0,
            base: die,
            final: die,
         };
      }));

      // Update the message
      chatContext.results.totalDice += chatContext.parameters.totalTrainingDice;
      chatContext.parameters.totalTrainingDice *= 2;
      chatContext.results.dice = newDiceResults;
      await message.update({
         flags: {
            titan: chatContext,
         },
      });

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActorFromSpeaker(message.speaker.token, message.speaker.actor);
         if (actor && actor.system.isCharacter) {
            actor.spendResolve(1);
         }
      }
   }
}

/**
 * @param chatMessageType
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
