import ItemChatMessageDataModel from '~/document/types/item/chat-message/ItemChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createWeaponSystemTemplate from '~/document/types/item/types/weapon/WeaponSystemTemplate.js';
import WeaponChatMessage from '~/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte';

/**
 * Data model for weapon chat messages. Its schema mirrors the full Weapon `system` shape (generated
 * from the shared Weapon system template via `buildSchemaFromShape`) layered over the shared item
 * snapshot fields, so the card reads `document.data.system.X` exactly as the weapon sheet does.
 * @extends {ItemChatMessageDataModel}
 */
export default class WeaponChatMessageDataModel extends ItemChatMessageDataModel {
   /**
    * Defines the document schema for weapon chat messages, adding the weapon-specific snapshot fields
    * to the shared item snapshot schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createWeaponSystemTemplate()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return WeaponChatMessage;
   }
}
