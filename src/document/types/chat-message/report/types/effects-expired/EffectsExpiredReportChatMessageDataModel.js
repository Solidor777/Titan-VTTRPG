import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEffectsExpiredReportShape
   from '~/document/types/chat-message/report/types/effects-expired/EffectsExpiredReportShape.js';
import EffectsExpiredReportChatMessage
   from '~/document/types/chat-message/report/types/effects-expired/EffectsExpiredReportChatMessage.svelte';

/**
 * Data model for the effects-expired report chat message. Its schema layers the effects-expired fields
 * (built from the shared shape factory via `buildSchemaFromShape`) over the shared report label fields,
 * so the card reads `document.data.system.X` exactly as the producer wrote it.
 * @extends {ReportChatMessageDataModel}
 */
export default class EffectsExpiredReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the effects-expired report, adding the expired-effects flag and
    * effects snapshot fields to the shared report label schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createEffectsExpiredReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return EffectsExpiredReportChatMessage;
   }
}
