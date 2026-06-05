import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createLongRestReportShape
   from '~/document/types/chat-message/report/types/long-rest/LongRestReportShape.js';
import LongRestReportChatMessage
   from '~/document/types/chat-message/report/types/long-rest/LongRestReportChatMessage.svelte';

/**
 * Data model for the long-rest report chat message. Its schema layers the long-rest-specific fields
 * (built from the shared long-rest report shape factory via `buildSchemaFromShape`) over the shared
 * report label fields, so the card reads `document.data.system.X` exactly as the producer wrote it.
 * @extends {ReportChatMessageDataModel}
 */
export default class LongRestReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the long-rest report, adding the long-rest-specific snapshot fields
    * to the shared report label schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createLongRestReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return LongRestReportChatMessage;
   }
}
