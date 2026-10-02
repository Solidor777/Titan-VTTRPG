import CheckListMixin from '~/document/types/item/CheckListMixin.js';
import CustomTraitMixin from '~/document/types/item/CustomTraitMixin.js';
import getEffectCreationChanges from '~/helpers/utility-functions/GetEffectCreationChanges.js';

/**
 * Extends the base ActiveEffect class to implement system-specific logic for Titan.
 * The 'effect' subtype carries Rules Elements, a custom duration, item-check templates, and custom traits via
 * its data model; conditions and other Active Effect subtypes are left untouched by all type-specific logic here.
 * @property {TitanActiveEffectDataModel} system - The typed system data model for this Active Effect.
 * @extends {foundry.documents.ActiveEffect}
 */
export default class TitanActiveEffect extends CustomTraitMixin(CheckListMixin(foundry.documents.ActiveEffect)) {

   /**
    * Builds the source data an Active Effect created from the given data stores, for an effect written as data instead
    * of created as a document (the stored-actor migration writes an Adventure's actors and scene tokens as data, and
    * core's Adventure import runs no embedded `_preCreate`). The effect is constructed, so its schema cleans the data
    * as creation cleans it (a string `remaining` cast, a missing one defaulted), and then takes the creation changes
    * `_preCreate` applies (getEffectCreationChanges) and the `transfer: false` core's `_preCreate` stores for an
    * actor-owned effect (Foundry v14 `common/documents/active-effect.mjs` `_preCreate`). So the data path stores what
    * creation stores except `start`, which records a creation moment (world time, combat round) that inline data
    * lacks; core sets it when an Actor-owned effect is created (`client/documents/active-effect.mjs` `_preCreate`). The
    * initial-data capture of `_preCreate` (the owning actor's combat initiative) does not apply either: data written
    * inline has no actor.
    * @param {object} data - The Active Effect creation data, with its `_id`.
    * @returns {object} The source data the effect stores.
    */
   static buildCreationSource(data) {
      /** @type {TitanActiveEffect} The effect, constructed outside any collection. */
      const effect = new this(foundry.utils.deepClone(data));
      effect.updateSource({
         ...getEffectCreationChanges(effect),
         transfer: false,
      });
      return effect.toObject();
   }

   /**
    * Performs initialization logic before document creation.
    * For the 'effect' subtype, captures initial document data, then applies the creation changes
    * (getEffectCreationChanges): the status icon always shows, and a timed effect is disabled exactly when no time
    * remains.
    * @override
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {User} user - The User requesting the document creation.
    * @returns {Promise<boolean|void>} A return value of false indicates the creation operation should be cancelled.
    * @protected
    */
   async _preCreate(data, options, user) {
      /** @type {boolean|void} - The result of the parent pre-create handler. */
      const retVal = await super._preCreate(data, options, user);
      if (retVal === false) {
         return false;
      }

      // Type-specific initialization only applies to the 'effect' subtype.
      if (this.type === 'effect') {

         // Allow the data model to capture initial document data (e.g. combat initiative).
         if (typeof this.system.onPreCreate === 'function') {
            this.system.onPreCreate(data);
         }

         // The creation changes, read from the data as captured above.
         this.updateSource(getEffectCreationChanges(this));
      }

      return retVal;
   }

   /**
    * Performs initialization logic before a document update.
    * @override
    * @param {object} changes - The differential data that is requested to be updated.
    * @param {object} options - Additional options which modify the update request.
    * @param {User} user - The User requesting the document update.
    * @returns {Promise<boolean|void>} A return value of false indicates the update operation should be cancelled.
    * @protected
    */
   async _preUpdate(changes, options, user) {
      /** @type {boolean|void} - The result of the parent pre-update handler. */
      const retVal = await super._preUpdate(changes, options, user);
      if (retVal === false) {
         return false;
      }

      // Timed effects derive their active state from their duration: active while time remains.
      // The disabled flag stays a manual toggle for permanent effects only.
      if (this.type === 'effect') {
         /** @type {string} - The duration type this update results in. */
         const durationType =
            foundry.utils.getProperty(changes, 'system.duration.type') ?? this.system.duration.type;
         if (durationType !== 'permanent') {
            /** @type {number} - The remaining duration this update results in. */
            const remaining =
               foundry.utils.getProperty(changes, 'system.duration.remaining') ?? this.system.duration.remaining;
            changes.disabled = remaining <= 0;
         }
      }

      return retVal;
   }

   /**
    * Returns the roll data for this Active Effect, delegating to the data model.
    * @returns {object} Object of properties usable as substitution variables when evaluating roll formulas.
    */
   getRollData() {
      return this.system.getRollData();
   }

   /**
    * Builds the chat-message data for this effect's chat card. The chat subtype is ALWAYS 'effect'
    * (matching the legacy forced type flag; a condition's own subtype is not a registered chat
    * subtype), and the prepared roll-data snapshot becomes `message.system`; the document-level `id`
    * and `type` are dropped (the chat document carries its own `id`, and `type` is returned at the
    * top level to select the chat-message subtype). Pure and side-effect free so it is unit-testable
    * without `ChatMessage.create`.
    * @returns {object} The chat message data `{ type, system }`, where `type` selects the
    * chat-message subtype and `system` is the prepared effect snapshot plus `name` and `img`.
    */
   buildChatMessageData() {
      // The prepared roll data: the document-level id/name/img/type plus the prepared system fields.
      const rollData = this.getRollData();

      // Separate the document-level keys from the prepared system fields.
      const { id, type, name, img, ...systemData } = rollData;

      return {
         type: 'effect',
         system: {
            ...systemData,
            name,
            img,
         },
      };
   }

   /**
    * Creates a Chat Message containing this effect's data and sends it to chat as a first-class
    * chat-message subtype (`type` + `system`), preserving the speaker, style, sound, and roll mode.
    * @returns {Promise<ChatMessage>} The newly created Chat Message.
    */
   async sendToChat() {
      /** @type {Actor|undefined} - The owning actor, used for the chat speaker when available. */
      const actor = this.parent?.documentName === 'Actor' ? this.parent : void 0;

      // Build the typed chat-message payload (type + prepared system snapshot).
      const messageData = this.buildChatMessageData();

      // Create and post the message.
      return ChatMessage.create(
         ChatMessage.applyMode(
            {
               ...messageData,
               user: game.user.id,
               speaker: actor?.getSpeaker() ?? ChatMessage.getSpeaker(),
               style: CONST.CHAT_MESSAGE_STYLES.OTHER,
               sound: CONFIG.sounds.notification,
               classes: ['titan'],
            },
         ),
      );
   }
}
