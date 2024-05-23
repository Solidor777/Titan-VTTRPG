import getControlledTokens from "~/helpers/utility-functions/GetControlledTokens.js";

/**
 * Gets an array of Character Actors controlled by the current user.
 * @returns {TitanActor[]} Array of Character Actors controlled by the current user.
 */
export default function getControlledCharacters() {
   return getControlledTokens().filter((token) => token.actor?.system.isCharacter).map((token => token.actor));
}