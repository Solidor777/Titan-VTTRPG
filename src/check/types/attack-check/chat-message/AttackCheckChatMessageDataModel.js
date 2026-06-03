import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttackCheckChatMessage from '~/check/types/attack-check/chat-message/AttackCheckChatMessage.svelte';

/**
 * Data model for attack check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class AttackCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AttackCheckChatMessage;
   }
}
