/**
 * Gets an array of Tokens controlled by the current user.
 * @returns {Token[]} - Array of Tokens controlled by the current user.
 */
export default function getControlledTokens() {
   return Array.from(canvas.tokens.controlled);
}