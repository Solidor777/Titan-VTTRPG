import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createRepairsReportShape from '~/document/types/chat-message/report/types/repairs/RepairsReportShape.js';
import RepairsReportChatMessage
   from '~/document/types/chat-message/report/types/repairs/RepairsReportChatMessageShell.svelte';

/**
 * Data model for the repairs report chat message. Its schema layers the repairs-specific fields (built
 * from the shared repairs report shape factory via `buildSchemaFromShape`) over the shared report label
 * fields, so the card reads `document.data.system.X` exactly as the producer wrote it.
 * @extends {ReportChatMessageDataModel}
 */
export default class RepairsReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the repairs report, adding the repairs-specific snapshot fields to
    * the shared report label schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createRepairsReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return RepairsReportChatMessage;
   }
}
