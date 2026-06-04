import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttributeCheckChatMessageDataModel from
   '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import ItemCheckChatMessage from '~/check/types/item-check/chat-message/ItemCheckChatMessage.svelte';
import { createItemCheckParametersShape } from '~/check/types/item-check/ItemCheckParameters.js';
import { createItemCheckResultsShape } from '~/check/types/item-check/ItemCheckResults.js';

/**
 * Data model for item check chat messages.
 * @extends {AttributeCheckChatMessageDataModel}
 */
export default class ItemCheckChatMessageDataModel extends AttributeCheckChatMessageDataModel {
   /**
    * Defines the document schema, adding the typed item-check parameters and results.
    * @override
    * @returns {object} Map of schema field instances keyed by field name.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...CheckChatMessageDataModel._defineCheckDataSchema(
            createItemCheckParametersShape(),
            createItemCheckResultsShape(),
         ),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ItemCheckChatMessage;
   }
}
