import { localize } from '~/helpers/Utility.js';
import recalculateCheckResults from '../check/chat-message/RecalculateCheckResults';

async function reRollCheckFailures(li) {
   // Get the successes and failure count
   const message = game.messages.get(li.data("messageId"));
   const chatContext = message.getFlag('titan', 'chatContext');
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
            final: die
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
               chatContext: {
                  results: newResults,
                  failuresReRolled: true
               },
            },
         },
      });
   }

   return;
}

async function doubleExpertise(li) {
   // If expertise is not already doubled
   const message = game.messages.get(li.data("messageId"));
   const chatContext = message.getFlag('titan', 'chatContext');

   // Re roll dice equal to the number of falures
   if (chatContext.parameters.doubleExpertise === false && chatContext.parameters.totalExpertise > 0) {
      chatContext.parameters.doubleExpertise = true;
      chatContext.results.expertiseRemaining += chatContext.parameters.totalExpertise;
      chatContext.parameters.totalExpertise *= 2;

      // Update the message
      await message.update({
         flags: {
            titan: {
               chatContext: chatContext
            },
         },
      });
   }

   return;
}

async function doubleTraining(li) {
   // If expertise is not already doubled
   const message = game.messages.get(li.data("messageId"));
   const chatContext = message.getFlag('titan', 'chatContext');

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
            final: die
         };
      }));

      // Update the message
      chatContext.results.totalDice += chatContext.parameters.totalTrainingDice;
      chatContext.parameters.totalTrainingDice *= 2;
      chatContext.results.dice = newDiceResults;
      await message.update({
         flags: {
            titan: {
               chatContext: chatContext
            },
         },
      });
   }

   return;
}

export function registerChatContextOptions(html, options) {
   // Check if this message should have check controls
   let canUseCheckControls = (li) => {
      const message = game.messages.get(li.data("messageId"));
      if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {
         const chatContext = message.getFlag('titan', 'chatContext');
         return chatContext.isCheck = true && chatContext.failuresReRolled === false;
      }

      return false;
   };

   let canDoubleExpertise = (li) => {
      const message = game.messages.get(li.data("messageId"));
      if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {
         const chatContext = message.getFlag('titan', 'chatContext');
         return chatContext.isCheck = true &&
            chatContext.parameters.doubleExpertise === false &&
            chatContext.parameters.totalExpertise > 0;
      }

      return false;
   };

   let canDoubleTraining = (li) => {
      const message = game.messages.get(li.data("messageId"));
      if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {
         const chatContext = message.getFlag('titan', 'chatContext');
         return chatContext.isCheck = true &&
            chatContext.parameters.doubleTraining === false &&
            chatContext.parameters.totalTrainingDice > 0;
      }

      return false;
   };


   options.push(
      {
         name: localize("reRollFailures"),
         icon: '<i class="fas fa-dice"></i>',
         condition: canUseCheckControls,
         callback: (li) => reRollCheckFailures(li)
      },
      {
         name: localize("doubleExpertise"),
         icon: '<i class="fas fa-graduation-cap"></i>',
         condition: canDoubleExpertise,
         callback: (li) => doubleExpertise(li)
      },
      {
         name: localize("doubleTraining"),
         icon: '<i class="fas fa-dumbbell"></i>',
         condition: canDoubleTraining,
         callback: (li) => doubleTraining(li)
      },
   );
}