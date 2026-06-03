import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Shared data model for all check chat message subtypes. Stores the typed parameters and results
 * produced by the check engine, the re-roll flag, and any attached rich-text messages.
 * @extends {TitanChatMessageDataModel}
 */
export default class CheckChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the document schema for check chat messages, excluding component schemas.
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         parameters: createObjectField(),
         results: createObjectField(),
         failuresReRolled: createBooleanField(false),
         message: createArrayField(createStringField()),
      };
   }
}
