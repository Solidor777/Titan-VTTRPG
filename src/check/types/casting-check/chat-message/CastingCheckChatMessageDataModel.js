import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttributeCheckChatMessageDataModel from
   '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import CastingCheckChatMessage from '~/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte';
import { createCastingCheckParametersShape } from '~/check/types/casting-check/CastingCheckParameters.js';
import { createCastingCheckResultsShape } from '~/check/types/casting-check/CastingCheckResults.js';

/**
 * Data model for casting check chat messages.
 * @extends {AttributeCheckChatMessageDataModel}
 */
export default class CastingCheckChatMessageDataModel extends AttributeCheckChatMessageDataModel {
   /**
    * Defines the document schema, adding the typed casting-check parameters and results.
    * @override
    * @returns {object} Map of schema field instances keyed by field name.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...CheckChatMessageDataModel._defineCheckDataSchema(
            createCastingCheckParametersShape(),
            createCastingCheckResultsShape(),
         ),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return CastingCheckChatMessage;
   }
}
