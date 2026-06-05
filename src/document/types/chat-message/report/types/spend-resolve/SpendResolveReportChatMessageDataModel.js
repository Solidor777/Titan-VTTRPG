import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createSpendResolveReportShape
   from '~/document/types/chat-message/report/types/spend-resolve/SpendResolveReportShape.js';
import SpendResolveReportChatMessage
   from '~/document/types/chat-message/report/types/spend-resolve/SpendResolveReportChatMessageShell.svelte';

/**
 * Data model for the spend-resolve report chat message. Its schema layers the spend-resolve-specific
 * fields (built from the shared spend-resolve report shape factory via `buildSchemaFromShape`) over the
 * shared report label fields, so the card reads `document.data.system.X` exactly as the producer wrote it.
 * @extends {ReportChatMessageDataModel}
 */
export default class SpendResolveReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the spend-resolve report, adding the spend-resolve-specific snapshot
    * fields to the shared report label schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createSpendResolveReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return SpendResolveReportChatMessage;
   }
}
