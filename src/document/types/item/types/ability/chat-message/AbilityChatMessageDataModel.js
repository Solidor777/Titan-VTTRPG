import ItemChatMessageDataModel from '~/document/types/item/chat-message/ItemChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createAbilitySystemTemplate from '~/document/types/item/types/ability/AbilitySystemTemplate.js';
import AbilityChatMessage from '~/document/types/item/types/ability/chat-message/AbilityChatMesssage.svelte';

/**
 * Data model for ability chat messages. Its schema mirrors the full Ability `system` shape (generated
 * from the shared Ability system template via `buildSchemaFromShape`) layered over the shared item
 * snapshot fields, so the card reads `document.data.system.X` exactly as the ability sheet does.
 * @extends {ItemChatMessageDataModel}
 */
export default class AbilityChatMessageDataModel extends ItemChatMessageDataModel {
   /**
    * Defines the document schema for ability chat messages, adding the ability-specific snapshot
    * fields to the shared item snapshot schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createAbilitySystemTemplate()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AbilityChatMessage;
   }
}
