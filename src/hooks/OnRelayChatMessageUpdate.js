import warn from '~/helpers/utility-functions/Warn.js';

/**
 * Called when a user who does not hold a chat message asks for a change to its system data. Only the active GM's client
 * acts: it writes the change when the sender owns the actor that spoke the message, because core lets only a message's
 * author and a GM write it. Constraint: the sender's `TitanChatMessage#update` emits this hook; the change is limited
 * to the message's `system` data so that a relayed request can never edit the speaker, the whisper list or the rolls.
 * @param {string} senderId - The ID of the user who asked for the change.
 * @param {string} messageId - The ID of the chat message to change.
 * @param {object} changes - The requested update; only its `system` entry is applied.
 * @returns {Promise<void>} Resolves once the change is written or refused.
 */
export default async function onRelayChatMessageUpdate(senderId, messageId, changes) {
   // One client answers the request: the active GM's.
   if (!game.users.activeGM?.isSelf) {
      return;
   }

   /** @type {User|undefined} The user who asked. */
   const sender = game.users.get(senderId);

   /** @type {ChatMessage|undefined} The message to change. */
   const message = game.messages.get(messageId);

   /** @type {Actor|null} The actor that spoke the message. */
   const speaker = ChatMessage.getSpeakerActor(message?.speaker);
   if (!sender || !message || !speaker?.testUserPermission(sender, 'OWNER') || !changes?.system) {
      warn('A chat message change was refused: the sender does not own the actor that spoke the message.', senderId);
      return;
   }
   await message.update({ system: changes.system });
}
