import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createTurnStartRevertReportShape
   from '~/document/types/chat-message/report/types/turn-start-revert/TurnStartRevertReportShape.js';
import TurnStartRevertReportChatMessage
   from '~/document/types/chat-message/report/types/turn-start-revert/TurnStartRevertReportChatMessage.svelte';

/**
 * Data model for the turn-start-revert report chat message. Its schema layers the turn-start-revert
 * fields (built from the shared shape factory via `buildSchemaFromShape`) over the shared report label
 * fields, so the card reads `document.data.system.X` exactly as the producer wrote it.
 * @extends {ReportChatMessageDataModel}
 */
export default class TurnStartRevertReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the turn-start-revert report, adding the revert-specific snapshot
    * fields to the shared report label schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createTurnStartRevertReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return TurnStartRevertReportChatMessage;
   }
}
