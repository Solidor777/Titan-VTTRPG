import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createTurnStartReportShape
   from '~/document/types/chat-message/report/types/turn-start/TurnStartReportShape.js';
import TurnStartReportChatMessage
   from '~/document/types/chat-message/report/types/turn-start/TurnStartReportChatMessage.svelte';

/**
 * Data model for the turn-start report chat message. Its schema layers the turn-start object fields
 * (built from the shared shape factory via `buildSchemaFromShape`) plus two explicit array fields over
 * the shared report label fields, so the card reads `document.data.system.X` exactly as the producer
 * wrote it. The array fields are declared explicitly because Foundry's ObjectField cannot hold an array.
 * @extends {ReportChatMessageDataModel}
 */
export default class TurnStartReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the turn-start report. Object fields come from the shape factory;
    * the `message` and `conditions` array fields are explicit because `ObjectField` cannot hold an array.
    * The producer assigns `reportData.message = structuredClone(rulesElementsCache.turnMessage.turnStart)`
    * (CharacterDataModel.js:5101-5103), which is the array of `element.message` HTML STRINGS pushed in
    * `_applyTurnMessageElements` (CharacterDataModel.js:1249) - so the `message` element is a StringField.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createTurnStartReportShape()),

         // Turn-start rich-text messages: each entry is an HTML string rendered by ChatMessageRichTextMessages.
         message: createArrayField(createStringField(), []),

         // Active conditions snapshot: each entry is a `{ label, img, description }` object.
         conditions: createArrayField(createObjectField(), []),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return TurnStartReportChatMessage;
   }
}
