import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEffectSystemTemplate from '~/document/types/active-effect/EffectSystemTemplate.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';
import EffectChatMessage from '~/document/types/active-effect/chat-message/EffectChatMessage.svelte';

/**
 * Data model for effect chat messages. Its schema mirrors the effect's prepared roll-data snapshot:
 * the effect `system` shape (generated from the shared `createEffectSystemTemplate()` via
 * `buildSchemaFromShape`, the same single source the live Active Effect data model builds from), the
 * rules-element fragment, the native description, and the label metadata the card needs that is NOT
 * part of the effect's `system` (the effect's `name` and `img`). The card reads
 * `document.data.system.X` exactly as the legacy card read the flags payload root.
 * @extends {TitanChatMessageDataModel}
 */
export default class EffectChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the document schema for effect chat messages: the shared effect system shape, the
    * rules-element fragment, the native description, and the snapshotted name and image.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape({
            ...createEffectSystemTemplate(),
            ...createRulesElementTemplate(),
            description: '',
            name: '',
            img: '',
         }),
      };
   }

   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return EffectChatMessage;
   }
}
