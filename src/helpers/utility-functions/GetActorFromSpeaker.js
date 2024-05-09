/**
 * Gets a speaker's actor from their token ID.
 * If the token ID is invalid, gets an actor from the actors directory using the actor ID.
 * Used when we need to retrieve the speaker of a chat card, and prefer selecting actor's on the current map.
 * @param {string}   tokenId  The ID of the speaker token.
 * @param {string}   actorId  The ID of the speaker actor.
 * @returns {Actor}           The actor associated with the speaker.
 */
export default function getActorFromSpeaker(tokenId, actorId) {
   const token = canvas?.tokens?.placeables?.find((currentToken) => currentToken.id === tokenId);
   return token ? token.actor : game.actors.get(actorId);
}
