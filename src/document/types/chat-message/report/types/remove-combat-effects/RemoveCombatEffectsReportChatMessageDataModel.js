import ReportChatMessageDataModel from '~/document/types/chat-message/report/ReportChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createRemoveCombatEffectsReportShape
   from '~/document/types/chat-message/report/types/remove-combat-effects/RemoveCombatEffectsReportShape.js';
import RemoveCombatEffectsReportChatMessage
   from '~/document/types/chat-message/report/types/remove-combat-effects/RemoveCombatEffectsReportChatMessage.svelte';

/**
 * Data model for the remove-combat-effects report chat message. This report is header-only, so its
 * schema is just the shared report label fields; the shape factory spread is an empty no-op kept for
 * consistency with the other report leaves and to keep the schema's single source aligned with the
 * golden-master test.
 * @extends {ReportChatMessageDataModel}
 */
export default class RemoveCombatEffectsReportChatMessageDataModel extends ReportChatMessageDataModel {
   /**
    * Defines the document schema for the remove-combat-effects report. The shape factory is empty, so
    * this contributes only the shared report label schema from the family base.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createRemoveCombatEffectsReportShape()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return RemoveCombatEffectsReportChatMessage;
   }
}
