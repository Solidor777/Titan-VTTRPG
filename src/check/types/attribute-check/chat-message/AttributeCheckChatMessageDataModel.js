import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttributeCheckChatMessage from '~/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte';

/**
 * Data model for attribute check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class AttributeCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AttributeCheckChatMessage;
   }
}
