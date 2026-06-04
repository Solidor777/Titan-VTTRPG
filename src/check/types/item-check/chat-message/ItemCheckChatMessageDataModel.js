import AttributeCheckChatMessageDataModel from
   '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import ItemCheckChatMessage from '~/check/types/item-check/chat-message/ItemCheckChatMessage.svelte';

/**
 * Data model for item check chat messages.
 * @extends {AttributeCheckChatMessageDataModel}
 */
export default class ItemCheckChatMessageDataModel extends AttributeCheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ItemCheckChatMessage;
   }
}
