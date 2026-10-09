import getTargetedTokens from '~/helpers/utility-functions/GetTargetedTokens.js';
import getControlledTokens from '~/helpers/utility-functions/GetControlledTokens.js';

/**
 * Gets the tokens of the Character Actors targeted by the current user, in target order. A GM who targets nothing
 * falls back to their controlled tokens, minus any the caller excludes; an explicit target is never excluded.
 * @param {Iterable<string>} [fallbackExcludedIds] - The ids of tokens the GM fallback skips (a roller's own tokens).
 * @returns {Token[]} The targeted (or, for a GM, controlled) tokens whose actors are Characters.
 */
export default function getTargetedCharacterTokens(fallbackExcludedIds = []) {
   /** @type {Token[]} The targeted tokens. */
   let tokens = getTargetedTokens();

   // A GM who targets nothing acts on their controlled tokens.
   if (tokens.length < 1 && game.user.isGM) {
      /** @type {Set<string>} The ids of the controlled tokens the fallback skips. */
      const excluded = new Set(fallbackExcludedIds);
      tokens = getControlledTokens().filter((token) => !excluded.has(token.id));
   }

   return tokens.filter((token) => token.actor?.system.isCharacter);
}
