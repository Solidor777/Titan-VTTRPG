/**
 * Answers a user's request that the GM's client change one scaling aspect of a casting check card the user did not
 * author, because core lets only a message's author and a GM write it. Runs on the active GM's client only.
 * Constraints: the sender is the user the transport reports (see `SocketManager`), never a value from the request; the
 * sender must own the actor that spoke the message; the request names an aspect and a signed number of steps, and the
 * result is derived from the card as it is stored when the write runs (`writeScalingSteps`, queued behind this
 * client's other changes to the card), so a request cannot write anything
 * else and cannot revert another change.
 * @param {string} senderId - The ID of the user who asked, from the transport.
 * @param {string} messageId - The ID of the casting check message to change.
 * @param {number} index - The position of the scaling aspect to change.
 * @param {number} steps - The signed number of steps.
 * @returns {Promise<void>} Resolves once the change is written.
 * @throws {Error} The reason when the request is refused; the requester is shown it.
 */
export default async function onRelayChatMessageUpdate(senderId, messageId, index, steps) {
   /** @type {User|undefined} The user who asked. */
   const sender = game.users.get(senderId);

   /** @type {ChatMessage|undefined} The message to change. */
   const message = game.messages.get(messageId);
   if (!sender || message?.type !== 'castingCheck') {
      throw new Error('The request names no casting check card.');
   }

   /** @type {Actor|null} The actor that spoke the message. */
   const speaker = ChatMessage.getSpeakerActor(message.speaker);
   if (!speaker?.testUserPermission(sender, 'OWNER')) {
      throw new Error('You do not own the character that rolled this card.');
   }
   await message.writeScalingSteps(index, steps);
}
