import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import ResistanceCheckChatMessage from '~/check/types/resistance-check/chat-message/ResistanceCheckChatMessage.svelte';

/**
 * Data model for resistance check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class ResistanceCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ResistanceCheckChatMessage;
   }
}
