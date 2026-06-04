import ItemChatMessageDataModel from '~/document/types/item/chat-message/ItemChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createCommoditySystemTemplate from '~/document/types/item/types/commodity/CommoditySystemTemplate.js';
import CommodityChatMessage from '~/document/types/item/types/commodity/chat-message/CommodityChatMessage.svelte';

/**
 * Data model for commodity chat messages. Its schema mirrors the full Commodity `system` shape
 * (generated from the shared Commodity system template via `buildSchemaFromShape`) layered over the
 * shared item snapshot fields, so the card reads `document.data.system.X` exactly as the commodity
 * sheet does.
 * @extends {ItemChatMessageDataModel}
 */
export default class CommodityChatMessageDataModel extends ItemChatMessageDataModel {
   /**
    * Defines the document schema for commodity chat messages, adding the commodity-specific snapshot
    * fields to the shared item snapshot schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createCommoditySystemTemplate()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return CommodityChatMessage;
   }
}
