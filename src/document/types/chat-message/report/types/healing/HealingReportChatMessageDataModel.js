import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createHealingReportShape from '~/document/types/chat-message/report/types/healing/HealingReportShape.js';
import HealingReportChatMessage
   from '~/document/types/chat-message/report/types/healing/HealingReportChatMessageShell.svelte';

/**
 * Data model for the healing report chat message. Its schema layers the healing-specific fields (built
 * from the shared healing report shape factory via `buildSchemaFromShape`) over the shared report label
 * fields, so the card reads `document.data.system.X` exactly as the producer wrote it.
 * @extends {ReportChatMessageDataModel}
 */
export default class HealingReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the healing report, adding the healing-specific snapshot fields to
    * the shared report label schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createHealingReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return HealingReportChatMessage;
   }
}
