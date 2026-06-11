import AddCustomTraitDialog from '~/document/types/item/dialog/AddCustomTraitDialog.js';
import EditCustomTraitDialog from '~/document/types/item/dialog/EditCustomTraitDialog.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Extends the base ActiveEffect class to implement system-specific logic for Titan.
 * The 'effect' subtype carries Rules Elements, a custom duration, item-check templates, and custom traits via
 * its data model; conditions and other Active Effect subtypes are left untouched by all type-specific logic here.
 * @property {TitanActiveEffectDataModel} system - The typed system data model for this Active Effect.
 * @extends {foundry.documents.ActiveEffect}
 */
export default class TitanActiveEffect extends foundry.documents.ActiveEffect {

   /**
    * Performs initialization logic before document creation.
    * For the 'effect' subtype, captures initial document data and forces the status icon to always display.
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

         /** @type {object} - The pre-create source updates to apply in a single pass. */
         const updateData = {};

         // Force the status icon to always display for effects.
         if (this.showIcon !== CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS) {
            updateData.showIcon = CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS;
         }

         this.updateSource(updateData);
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
    * Adds a new Check to this Active Effect.
    * @returns {Promise<void>}
    */
   async addCheck() {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         this.system.check.push(createItemCheckTemplate());
         await this.update({
            system: {
               check: structuredClone(this.system.check),
            },
         });

         // Notify the sheet of the added check.
         if (this.sheet) {
            this.sheet.postAddCheck();
         }
      }
   }

   /**
    * Removes a Check from this Active Effect.
    * @param {number} idx - The index of the Check in this Active Effect's Checks array.
    * @returns {Promise<void>}
    */
   async deleteCheck(idx) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         // Notify the sheet before deletion.
         if (this.sheet) {
            this.sheet.preDeleteCheck(idx);
         }

         this.system.check.splice(idx, 1);
         await this.update({
            system: {
               check: structuredClone(this.system.check),
            },
         });
      }
   }

   /**
    * Creates a dialog for adding a new Custom Trait to this Active Effect.
    * @returns {void}
    */
   addCustomTrait() {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         /** @type {AddCustomTraitDialog} - The dialog used to add a new Custom Trait to this Active Effect. */
         const dialog = new AddCustomTraitDialog(this);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for editing an existing Custom Trait belonging to this Active Effect.
    * @param {number} traitIdx - The index of the Custom Trait in this Active Effect's Custom Traits array.
    * @returns {void}
    */
   editCustomTrait(traitIdx) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         /** @type {EditCustomTraitDialog} - The dialog used to edit an existing Custom Trait on this Active Effect. */
         const dialog = new EditCustomTraitDialog(
            this,
            traitIdx,
         );
         dialog.render(true);
      }
   }

   /**
    * Removes a Custom Trait from this Active Effect.
    * @param {number} traitIdx - The index of the Custom Trait in this Active Effect's Custom Traits array.
    * @returns {Promise<void>}
    */
   async deleteCustomTrait(traitIdx) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         /** @type {object[]} A fresh array with the targeted Custom Trait removed. */
         const next = this.system.customTrait.filter((trait, idx) => idx !== traitIdx);

         await this.update({
            system: {
               customTrait: next,
            },
         });
      }
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
