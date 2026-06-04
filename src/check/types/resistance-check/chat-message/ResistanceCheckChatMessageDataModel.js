import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import ResistanceCheckChatMessage from '~/check/types/resistance-check/chat-message/ResistanceCheckChatMessage.svelte';
import { createResistanceCheckParametersShape } from '~/check/types/resistance-check/ResistanceCheckParameters.js';
import { createResistanceCheckResultsShape } from '~/check/types/resistance-check/ResistanceCheckResults.js';

/**
 * Data model for resistance check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class ResistanceCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * Defines the document schema, adding the typed resistance-check parameters and results.
    * @override
    * @returns {object} Map of schema field instances keyed by field name.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...CheckChatMessageDataModel._defineCheckDataSchema(
            createResistanceCheckParametersShape(),
            createResistanceCheckResultsShape(),
         ),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ResistanceCheckChatMessage;
   }
}
