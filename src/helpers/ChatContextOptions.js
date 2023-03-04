import { localize, getActor } from '~/helpers/Utility.js';
import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';

async function reRollCheckFailures(li, spendResolve) {
   // Get the successes and failure count
   const message = game.messages.get(li.data("messageId"));
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

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActor(message.speaker.actor, message.speaker.token);
         if (actor) {
            const character = actor.character;
            if (character) {
               character.spendResolve(1, true, true);
            }
         }
      }
   }

   return;
}

async function doubleExpertise(li, spendResolve) {
   // If expertise is not already doubled
   const message = game.messages.get(li.data("messageId"));
   const chatContext = message?.flags?.titan;

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

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActor(message.speaker.actor, message.speaker.token);
         if (actor) {
            const character = actor.character;
            if (character) {
               character.spendResolve(1, true, true);
            }
         }
      }
   }

   return;
}

async function doubleTraining(li, spendResolve) {
   // If expertise is not already doubled
   const message = game.messages.get(li.data("messageId"));
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

      // Spend resolve if appropriate
      if (spendResolve) {
         const actor = getActor(message.speaker.actor, message.speaker.token);
         if (actor) {
            const character = actor.character;
            if (character) {
               character.spendResolve(1, true, true);
            }
         }
      }
   }

   return;
}

export function registerChatContextOptions(html, options) {
   // Check if this message should have check controls
   let canUseCheckControls = (li) => {
      const message = game.messages.get(li.data("messageId"));
      if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {
         const chatContext = message?.flags?.titan;
         return chatContext?.isCheck === true && chatContext.failuresReRolled === false;
      }

      return false;
   };

   let canDoubleExpertise = (li) => {
      const message = game.messages.get(li.data("messageId"));
      if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {
         const chatContext = message?.flags?.titan;
         return chatContext?.isCheck === true &&
            chatContext.parameters.doubleExpertise === false &&
            chatContext.parameters.totalExpertise > 0;
      }

      return false;
   };

   let canDoubleTraining = (li) => {
      const message = game.messages.get(li.data("messageId"));
      if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {
         const chatContext = message?.flags?.titan;
         return chatContext?.isCheck === true &&
            chatContext.parameters.doubleTraining === false &&
            chatContext.parameters.totalTrainingDice > 0;
      }

      return false;
   };

   const autoSpendResolveReRollFailures = getSetting('autoSpendResolveReRollFailures');
   const autoSpendResolveDoubleExpertise = getSetting('autoSpendResolveDoubleExpertise');
   const autoSpendResolveDoubleTraining = getSetting('autoSpendResolveDoubleTraining');

   // Re-roll Failures (Spend Resolve)
   const reRollFailureOptions = [
      {
         name: localize("reRollFailuresSpendResolve"),
         icon: '<i class="fas fa-dice"></i>',
         condition: canUseCheckControls,
         callback: (li) => reRollCheckFailures(li, true)
      },
   ];

   // Re-roll Failures
   if (game.user.isGM || !autoSpendResolveReRollFailures) {
      reRollFailureOptions.unshift({
         name: localize("reRollFailures"),
         icon: '<i class="fas fa-dice"></i>',
         condition: canUseCheckControls,
         callback: (li) => reRollCheckFailures(li, false)
      });
   }

   // Double Expertise (Spend Resolve)
   const doubleExpertiseOptions = [
      {
         name: localize("doubleExpertiseSpendResolve"),
         icon: '<i class="fas fa-graduation-cap"></i>',
         condition: canDoubleExpertise,
         callback: (li) => doubleExpertise(li, true)
      },
   ];

   // Double Expertise
   if (game.user.isGM || !autoSpendResolveDoubleExpertise) {
      doubleExpertiseOptions.unshift({
         name: localize("doubleExpertise"),
         icon: '<i class="fas fa-graduation-cap"></i>',
         condition: canDoubleExpertise,
         callback: (li) => doubleExpertise(li, false)
      });
   }

   // Double Training (Spend Resolve)
   const doubleTrainingOptions = [
      {
         name: localize("doubleTrainingSpendResolve"),
         icon: '<i class="fas fa-dumbbell"></i>',
         condition: canDoubleTraining,
         callback: (li) => doubleTraining(li, true)
      },
   ];

   // Double Training
   if (game.user.isGM || !autoSpendResolveDoubleTraining) {
      doubleTrainingOptions.push({
         name: localize("doubleTraining"),
         icon: '<i class="fas fa-dumbbell"></i>',
         condition: canDoubleTraining,
         callback: (li) => doubleTraining(li, false)
      });
   }

   options.push(...reRollFailureOptions);
   options.push(...doubleExpertiseOptions);
   options.push(...doubleTrainingOptions);
}