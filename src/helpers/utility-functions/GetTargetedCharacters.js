import getTargetedCharacterTokens from '~/helpers/utility-functions/GetTargetedCharacterTokens.js';

/**
 * Gets the Character Actors targeted by the current user. A GM who targets nothing falls back to their controlled
 * tokens.
 * @returns {TitanActor[]} The actors of getTargetedCharacterTokens(), in target order.
 */
export default function getTargetedCharacters() {
   return getTargetedCharacterTokens().map((token) => token.actor);
}
