import ItemChatMessageDataModel from '~/document/types/item/chat-message/ItemChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createSpellSystemTemplate from '~/document/types/item/types/spell/SpellSystemTemplate.js';
import SpellChatMessage from '~/document/types/item/types/spell/chat-message/SpellChatMessage.svelte';

/**
 * Data model for spell chat messages. Its schema mirrors the full Spell `system` shape (generated
 * from the shared Spell system template via `buildSchemaFromShape`) layered over the shared item
 * snapshot fields, so the card reads `document.data.system.X` exactly as the spell sheet does.
 * @extends {ItemChatMessageDataModel}
 */
export default class SpellChatMessageDataModel extends ItemChatMessageDataModel {
   /**
    * Defines the document schema for spell chat messages, adding the spell-specific snapshot fields
    * to the shared item snapshot schema.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createSpellSystemTemplate()),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return SpellChatMessage;
   }
}
