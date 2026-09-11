import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Shared base data model for every TITAN report chat message (damage, healing, rest, turn-start/end,
 * etc.). Holds the actor-label fields common to all reports; concrete report subtypes extend this and
 * add their own typed system fields built from a co-located shape factory.
 * @extends {TitanChatMessageDataModel}
 */
export default class ReportChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the document schema fields shared by all report chat messages, adding the actor label
    * metadata (name and image) every report card displays.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // The display name of the actor the report concerns.
      schema.actorName = createStringField('');

      // The display image of the actor the report concerns.
      schema.actorImg = createStringField('');

      return schema;
   }

   /**
    * Hoists legacy top-level resource snapshots (`stamina`, `wounds`, `resolve`) into the nested
    * `resource` object every report now snapshots resources under. INVARIANT: the legacy top-level keys
    * exist only on chat messages persisted before 2026-09-10; every report created since then already
    * writes `resource.*` directly, so this hoist is idempotent (a legacy key is only moved when no
    * nested value already occupies its slot) and needs no version gate.
    * @override
    * @param {object} source - The source data for the report chat message.
    * @returns {object} The migrated source data.
    */
   static migrateData(source) {
      for (const key of [
         'stamina',
         'wounds',
         'resolve'
      ]) {
         if (source[key] !== undefined) {
            source.resource ??= {};
            if (source.resource[key] === undefined) {
               source.resource[key] = source[key];
            }
            delete source[key];
         }
      }

      return super.migrateData(source);
   }
}
