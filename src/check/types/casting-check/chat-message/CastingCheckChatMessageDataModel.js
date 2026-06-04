import AttributeCheckChatMessageDataModel from
   '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import CastingCheckChatMessage from '~/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte';

/**
 * Data model for casting check chat messages.
 * @extends {AttributeCheckChatMessageDataModel}
 */
export default class CastingCheckChatMessageDataModel extends AttributeCheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return CastingCheckChatMessage;
   }
}
