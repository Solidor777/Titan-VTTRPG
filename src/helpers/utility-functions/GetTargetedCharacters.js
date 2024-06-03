import getTargetedTokens from '~/helpers/utility-functions/GetTargetedTokens.js';
import getControlledTokens from '~/helpers/utility-functions/GetControlledTokens.js';

/**
 * Gets an array of Character Actors targeted by the current user.
 * If the user is Player, filters from targeted tokens.
 * If the user is GM, and no tokens are targeted, filters from controlled tokens.
 * @returns {TitanActor[]} Array of actors targeted by the current user.
 */
export default function getTargetedCharacters() {
   const retVal = [];

   // Get the targeted tokens.
   let targetedTokens = getTargetedTokens();

   // If there are no targeted, and the current user is a GM, get the controlled tokens.
   if (targetedTokens.length < 1 && game.user.isGM) {
      targetedTokens = getControlledTokens();
   }

   // Filter for Character actors.
   for (const target of targetedTokens) {
      if (target.actor?.system.isCharacter) {
         retVal.push(target.actor);
      }
   }

   return retVal;
}
