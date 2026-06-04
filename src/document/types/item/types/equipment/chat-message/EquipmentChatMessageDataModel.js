import ItemChatMessageDataModel from '~/document/types/item/chat-message/ItemChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEquipmentSystemTemplate from '~/document/types/item/types/equipment/EquipmentSystemTemplate.js';
import EquipmentChatMessage from '~/document/types/item/types/equipment/chat-message/EquipmentChatMessage.svelte';

/**
 * Data model for equipment chat messages. Its schema mirrors the full Equipment `system` shape
 * (generated from the shared Equipment system template via `buildSchemaFromShape`) layered over the
 * shared item snapshot fields, so the card reads `document.data.system.X` exactly as the equipment
 * sheet does.
 * @extends {ItemChatMessageDataModel}
 */
export default class EquipmentChatMessageDataModel extends ItemChatMessageDataModel {
   /**
    * Defines the document schema for equipment chat messages, adding the equipment-specific snapshot
    * fields to the shared item snapshot schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createEquipmentSystemTemplate()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return EquipmentChatMessage;
   }
}
