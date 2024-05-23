import getTargetedCharacters from "~/helpers/utility-functions/GetTargetedCharacters.js";
import getControlledTokens from "~/helpers/utility-functions/GetControlledTokens.js";

/**
 * Gets the best Character Actors for the current user to perform combat updates on.
 * If the user is a Player, filters from controlled Tokens, with their main Character as a fallback.
 * If the user is a GM, filters from targeted Tokens, with their controlled Tokens as a fallback.
 * @returns {TitanActor[]} Array of the best Character Actors for the current user to perform combat updates on.
 */
export default function getBestCharactersToUpdate() {
   // If the user is a gm, return targeted characters.
   if (game.user.isGM) {
      return getTargetedCharacters();
   }

   // Otherwise, get controlled tokens
   const retVal = [];
   const controlledTokens = getControlledTokens();

   // Filter for controlled characters
   for (const token of controlledTokens) {
      if (token.actor?.system.isCharacter) {
         retVal.push(token.actor);
      }
   }

   // Get the user's main character as a fallback
   if (retVal.length <= 0) {
      const userCharacter = game.user.character;
      if (userCharacter?.system.isCharacter) {
         retVal.push(userCharacter);
      }
   }

   return retVal;
}
