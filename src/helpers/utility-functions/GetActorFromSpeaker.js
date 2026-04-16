/**
 * Gets the actor from Chat Message Speaker.
 * @param {SpeakerData} speaker - The speaker to get the actor from.
 * @returns {Actor} The actor associated with the speaker.
 */
export default function getActorFromSpeaker(speaker) {
   const token = speaker.token ?
      canvas?.tokens?.placeables?.find((currentToken) => currentToken.id === speaker.token) :
      false;
   return token ? token.actor : game.actors.get(speaker.actor);
}
