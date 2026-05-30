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
    * Creates a Chat Message containing this effect's data and sends it to chat.
    * Packages the data model roll data and native description under the 'system' key of the titan flags so the
    * effect chat components render the same card the legacy effect item produced.
    * @returns {Promise<ChatMessage>} The newly created Chat Message.
    */
   async sendToChat() {
      /** @type {Actor|undefined} - The owning actor, used for the chat speaker when available. */
      const actor = this.parent?.documentName === 'Actor' ? this.parent : void 0;

      /** @type {object} - The titan flags payload, matching the effect chat component's expected shape. */
      const messageData = {
         id: this.id,
         name: this.name,
         img: this.img,
         type: 'effect',
         system: {
            ...this.getRollData(),
            description: this.description,
         },
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
