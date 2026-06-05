import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createRendReportShape from '~/document/types/chat-message/report/types/rend/RendReportShape.js';
import RendReportChatMessage
   from '~/document/types/chat-message/report/types/rend/RendReportChatMessageShell.svelte';

/**
 * Data model for the rend report chat message. Its schema layers the rend-specific fields (built from
 * the shared rend report shape factory via `buildSchemaFromShape`) over the shared report label fields,
 * so the card reads `document.data.system.X` exactly as the producer wrote it.
 * @extends {ReportChatMessageDataModel}
 */
export default class RendReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the rend report, adding the rend-specific snapshot fields to the
    * shared report label schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createRendReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return RendReportChatMessage;
   }
}
