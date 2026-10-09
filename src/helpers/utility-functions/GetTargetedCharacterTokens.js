import getTargetedTokens from '~/helpers/utility-functions/GetTargetedTokens.js';
import getControlledTokens from '~/helpers/utility-functions/GetControlledTokens.js';

/**
 * Gets the tokens of the Character Actors targeted by the current user, in target order. A GM who targets nothing
 * falls back to their controlled tokens.
 * @returns {Token[]} The targeted (or, for a GM, controlled) tokens whose actors are Characters.
 */
export default function getTargetedCharacterTokens() {
   /** @type {Token[]} The targeted tokens. */
   let tokens = getTargetedTokens();

   // A GM who targets nothing acts on their controlled tokens.
   if (tokens.length < 1 && game.user.isGM) {
      tokens = getControlledTokens();
   }

   return tokens.filter((token) => token.actor?.system.isCharacter);
}
