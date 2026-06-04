import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttributeCheckChatMessageDataModel from
   '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import AttackCheckChatMessage from '~/check/types/attack-check/chat-message/AttackCheckChatMessage.svelte';
import { createAttackCheckParametersShape } from '~/check/types/attack-check/AttackCheckParameters.js';
import { createAttackCheckResultsShape } from '~/check/types/attack-check/AttackCheckResults.js';

/**
 * Data model for attack check chat messages.
 * @extends {AttributeCheckChatMessageDataModel}
 */
export default class AttackCheckChatMessageDataModel extends AttributeCheckChatMessageDataModel {
   /**
    * Defines the document schema, adding the typed attack-check parameters and results.
    * @override
    * @returns {object} Map of schema field instances keyed by field name.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...CheckChatMessageDataModel._defineCheckDataSchema(
            createAttackCheckParametersShape(),
            createAttackCheckResultsShape(),
         ),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AttackCheckChatMessage;
   }
}
