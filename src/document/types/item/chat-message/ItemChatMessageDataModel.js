import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Shared data model for all item chat message subtypes. Stores a snapshot of the source item's
 * `system` data so chat cards read `document.data.system.X` exactly as the item sheet reads
 * `item.system.X` (path parity). The schema for the common item fields is generated from the shared
 * `createItemSystemTemplate()` shape via `buildSchemaFromShape`, guaranteeing the chat schema mirrors
 * the item data model's shared base fields. Adds the label metadata the card needs that is NOT part of
 * `item.system` (the item's `name` and `img`); the message's `id` and `type` come from the chat
 * document itself. Concrete subtypes extend this and add their type-specific snapshot fields.
 * @extends {TitanChatMessageDataModel}
 */
export default class ItemChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the document schema for item chat messages, adding the shared item-system snapshot fields
    * (built from the shared shape template) plus the item's name and image label metadata.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Shared item-system snapshot fields, generated from the canonical base shape template.
      Object.assign(schema, buildSchemaFromShape(createItemSystemTemplate()));

      // Label metadata not present in item.system: the snapshotted item name and image.
      schema.name = createStringField();
      schema.img = createStringField();

      return schema;
   }
}
