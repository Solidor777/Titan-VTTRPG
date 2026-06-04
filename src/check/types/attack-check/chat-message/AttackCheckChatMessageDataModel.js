import AttributeCheckChatMessageDataModel from
   '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import AttackCheckChatMessage from '~/check/types/attack-check/chat-message/AttackCheckChatMessage.svelte';

/**
 * Data model for attack check chat messages.
 * @extends {AttributeCheckChatMessageDataModel}
 */
export default class AttackCheckChatMessageDataModel extends AttributeCheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AttackCheckChatMessage;
   }
}
