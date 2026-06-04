import ItemChatMessageDataModel from '~/document/types/item/chat-message/ItemChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createArmorSystemTemplate from '~/document/types/item/types/armor/ArmorSystemTemplate.js';
import ArmorChatMessage from '~/document/types/item/types/armor/chat-message/ArmorChatMessage.svelte';

/**
 * Data model for armor chat messages. Its schema mirrors the full Armor `system` shape (generated
 * from the shared Armor system template via `buildSchemaFromShape`) layered over the shared item
 * snapshot fields, so the card reads `document.data.system.X` exactly as the armor sheet does.
 * @extends {ItemChatMessageDataModel}
 */
export default class ArmorChatMessageDataModel extends ItemChatMessageDataModel {
   /**
    * Defines the document schema for armor chat messages, adding the armor-specific snapshot fields
    * to the shared item snapshot schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createArmorSystemTemplate()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ArmorChatMessage;
   }
}
