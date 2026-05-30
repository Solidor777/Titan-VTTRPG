import AddCustomTraitDialog from '~/document/types/item/dialog/AddCustomTraitDialog.js';
import EditCustomTraitDialog from '~/document/types/item/dialog/EditCustomTraitDialog.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Extends the base ActiveEffect class to implement system-specific logic for Titan.
 * The 'effect' subtype carries Rules Elements, a custom duration, item-check templates, and custom traits via
 * its data model; conditions and other Active Effect subtypes are left untouched by all type-specific logic here.
 * @extends {foundry.documents.ActiveEffect}
 * @property {TitanActiveEffectDataModel} system - The typed system data model for this Active Effect.
 */
export default class TitanActiveEffect extends foundry.documents.ActiveEffect {

   /**
    * Enriches an HTML string using the v14 TextEditor implementation.
    * @param {string} html - The raw HTML to enrich.
    * @returns {Promise<string>} The enriched HTML, or an empty string if the input is empty.
    * @private
    */
   async _enrichDescription(html) {
      // Guard against empty content so we never store enriched markup for a blank description.
      if (!html) {
         return '';
      }

      return foundry.applications.ux.TextEditor.implementation.enrichHTML(html, {
         secrets: true,
      });
   }

   /**
    * Performs initialization logic before document creation.
    * For the 'effect' subtype, captures initial document data, forces the status icon to always display, and
    * seeds the Visual Active Effects description flag with the enriched native description.
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {User} user - The User requesting the document creation.
    * @returns {Promise<boolean|void>} A return value of false indicates the creation operation should be cancelled.
    * @override
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

         // Seed the Visual Active Effects description with the enriched native description.
         updateData.flags = {
            'visual-active-effects': {
               data: {
                  content: await this._enrichDescription(this.description),
               },
            },
         };

         this.updateSource(updateData);
      }

      return retVal;
   }

   /**
    * Performs initialization logic before a document update.
    * For the 'effect' subtype, keeps the Visual Active Effects description flag in sync whenever the native
    * description changes.
    * @param {object} changes - The differential data that is requested to be updated.
    * @param {object} options - Additional options which modify the update request.
    * @param {User} user - The User requesting the document update.
    * @returns {Promise<boolean|void>} A return value of false indicates the update operation should be cancelled.
    * @override
    * @protected
    */
   async _preUpdate(changes, options, user) {
      /** @type {boolean|void} - The result of the parent pre-update handler. */
      const retVal = await super._preUpdate(changes, options, user);
      if (retVal === false) {
         return false;
      }

      // Keep the Visual Active Effects description in sync when the native description changes for effects.
      if (this.type === 'effect' && typeof changes.description === 'string') {
         foundry.utils.setProperty(
            changes,
            'flags.visual-active-effects.data.content',
            await this._enrichDescription(changes.description),
         );
      }

      return retVal;
   }

   /**
    * Returns the roll data for this Active Effect, delegating to the data model.
    * @returns {object} The roll data.
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
         this.system.customTrait.splice(traitIdx, 1);
         await this.update({
            system: {
               customTrait: structuredClone(this.system.customTrait),
            },
         });
      }
   }

   /**
    * Creates a Chat Message containing this effect's data and sends it to chat.
    * Spreads the data model roll data flat onto the titan flags (matching the working item sendToChat shape) so the
    * shared item chat card and the item-check roll path both resolve check/customTrait at the flags root, then forces
    * the effect chat card via the 'effect' type flag and attaches the native description.
    * @returns {Promise<ChatMessage>} The newly created Chat Message.
    */
   async sendToChat() {
      /** @type {Actor|undefined} - The owning actor, used for the chat speaker when available. */
      const actor = this.parent?.documentName === 'Actor' ? this.parent : void 0;

      /** @type {object} - The titan flags payload, matching the flat item chat shape (check/customTrait at root). */
      const messageData = {
         ...this.getRollData(),
         type: 'effect',
         description: this.description,
      };

      // Create and post the message.
      return ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               user: game.user.id,
               speaker: actor?.getSpeaker() ?? ChatMessage.getSpeaker(),
               type: CONST.CHAT_MESSAGE_STYLES.OTHER,
               sound: CONFIG.sounds.notification,
               flags: {
                  titan: messageData,
               },
               classes: ['titan'],
            },
            game.settings.get('core', 'rollMode'),
         ),
      );
   }
}
