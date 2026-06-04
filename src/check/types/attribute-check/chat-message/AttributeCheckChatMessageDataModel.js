import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttributeCheckChatMessage from '~/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte';
import { createAttributeCheckParametersShape } from '~/check/types/attribute-check/AttributeCheckParameters.js';
import { createAttributeCheckResultsShape } from '~/check/types/attribute-check/AttributeCheckResults.js';

/**
 * Data model for attribute check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class AttributeCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * Defines the document schema, adding the typed attribute-check parameters and results.
    * @override
    * @returns {object} Map of schema field instances keyed by field name.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...CheckChatMessageDataModel._defineCheckDataSchema(
            createAttributeCheckParametersShape(),
            createAttributeCheckResultsShape(),
         ),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AttributeCheckChatMessage;
   }
}
