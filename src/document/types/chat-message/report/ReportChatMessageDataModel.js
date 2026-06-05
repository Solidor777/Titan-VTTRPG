import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Shared base data model for every TITAN report chat message (damage, healing, rest, turn-start/end,
 * etc.). Holds the actor-label fields common to all reports; concrete report subtypes extend this and
 * add their own typed system fields built from a co-located shape factory.
 * @extends {TitanChatMessageDataModel}
 */
export default class ReportChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the document schema fields shared by all report chat messages, adding the actor label
    * metadata (name and image) every report card displays.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // The display name of the actor the report concerns.
      schema.actorName = createStringField('');

      // The display image of the actor the report concerns.
      schema.actorImg = createStringField('');

      return schema;
   }
}
