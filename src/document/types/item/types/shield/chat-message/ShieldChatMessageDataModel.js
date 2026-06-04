import ItemChatMessageDataModel from '~/document/types/item/chat-message/ItemChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createShieldSystemTemplate from '~/document/types/item/types/shield/ShieldSystemTemplate.js';
import ShieldChatMessage from '~/document/types/item/types/shield/chat-message/ShieldChatMessage.svelte';

/**
 * Data model for shield chat messages. Its schema mirrors the full Shield `system` shape (generated
 * from the shared Shield system template via `buildSchemaFromShape`) layered over the shared item
 * snapshot fields, so the card reads `document.data.system.X` exactly as the shield sheet does.
 * @extends {ItemChatMessageDataModel}
 */
export default class ShieldChatMessageDataModel extends ItemChatMessageDataModel {
   /**
    * Defines the document schema for shield chat messages, adding the shield-specific snapshot fields
    * to the shared item snapshot schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createShieldSystemTemplate()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ShieldChatMessage;
   }
}
