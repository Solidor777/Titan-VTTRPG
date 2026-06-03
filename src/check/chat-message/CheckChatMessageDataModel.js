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
    * Defines the document schema for check chat messages, adding parameters, results,
    * the re-roll flag, and an attached message array.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();
      schema.parameters = createObjectField();
      schema.results = createObjectField();
      schema.failuresReRolled = createBooleanField(false);
      schema.message = createArrayField(createStringField());
      return schema;
   }
}
