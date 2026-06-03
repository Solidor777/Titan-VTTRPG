import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import CastingCheckChatMessage from '~/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte';

/**
 * Data model for casting check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class CastingCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return CastingCheckChatMessage;
   }
}
