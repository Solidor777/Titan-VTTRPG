import { localize } from '~/helpers/Utility.js';
import recalculateCheckResults from '../check/chat-message/RecalculateCheckResults';

async function reRollCheckFailures(li) {
   // Get the successes and failure count
   const message = game.messages.get(li.data("messageId"));
   const chatContext = message.getFlag('titan', 'chatContext');
   let failureCount = 0;
   let expertiseToRefund = 0;
   const successes = chatContext.results.dice.filter((die) => {
      if (die.success) {
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

      message.update({
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
}

export function registerChatContextOptions(html, options) {
   // Check if this message should have check controls
   let canUseCheckControls = (li) => {
      const message = game.messages.get(li.data("messageId"));
      if (message?.isContentVisible && message.constructor.getSpeakerActor(message.speaker)?.isOwner) {
         const chatContext = message.getFlag('titan', 'chatContext');
         return chatContext.isCheck = true;
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
   );
}