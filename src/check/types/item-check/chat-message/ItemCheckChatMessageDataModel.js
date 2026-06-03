import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import ItemCheckChatMessage from '~/check/types/item-check/chat-message/ItemCheckChatMessage.svelte';

/**
 * Data model for item check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class ItemCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ItemCheckChatMessage;
   }
}
