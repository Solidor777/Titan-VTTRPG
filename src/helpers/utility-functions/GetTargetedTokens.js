/**
 * Gets an array of Tokens targeted by the current user.
 * @returns {Token[]} Array of Tokens targeted by the current user.
 */
export default function getTargetedTokens() {
   return Array.from(game.user.targets);
}