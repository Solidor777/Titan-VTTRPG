import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createTurnEndReportShape
   from '~/document/types/chat-message/report/types/turn-end/TurnEndReportShape.js';
import TurnEndReportChatMessage
   from '~/document/types/chat-message/report/types/turn-end/TurnEndReportChatMessage.svelte';

/**
 * Data model for the turn-end report chat message. Its schema layers the turn-end object fields (built
 * from the shared shape factory via `buildSchemaFromShape`) plus one explicit array field over the
 * shared report label fields, so the card reads `document.data.system.X` exactly as the producer wrote
 * it. The `message` array field is declared explicitly because Foundry's ObjectField cannot hold an
 * array. Turn end has no conditions snapshot (that is turn-start only).
 * @extends {ReportChatMessageDataModel}
 */
export default class TurnEndReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the turn-end report. Object fields come from the shape factory; the
    * `message` array field is explicit because `ObjectField` cannot hold an array. The producer assigns
    * `reportData.message = structuredClone(rulesElementsCache.turnMessage.turnEnd)`
    * (CharacterDataModel.js:5219-5221), which is the array of `element.message` HTML STRINGS pushed in
    * `_applyTurnMessageElements` (CharacterDataModel.js:1249) - so the `message` element is a StringField.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createTurnEndReportShape()),

         // Turn-end rich-text messages: each entry is an HTML string rendered by ChatMessageRichTextMessages.
         message: createArrayField(createStringField(), []),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return TurnEndReportChatMessage;
   }
}
