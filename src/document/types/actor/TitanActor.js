import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * @typedef {object} SpeakerData An object containing data on a Chat Message's speaker.
 * @property {string} [scene] The Scene in which the speaker resides.
 * @property {string} [actor] The ID of the speaker's actor.
 * @property {string} [alias] The name of the speaker to display.
 * @property {string} [token] The ID of the speaker's Token.
 */

/**
 * Extends the base Actor class to implement additional system-specific logic for Titan.
 * @extends {BaseActor}
 * @property {TitanItem[]} items - A collection of embedded Item documents.
 */
export default class TitanActor extends Actor {

   // noinspection JSUnusedGlobalSymbols
   /**
    * Performs initialization logic before document creation.
    * @override
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {User} user - The User requesting the document creation.
    * @returns {Promise<boolean|void>} A return value of false indicates the creation operation should be canceled.
    * @protected
    */
   async _preCreate(data, options, user) {
      const retVal = await super._preCreate(data, options, user);
      if (retVal !== false) {

         // Initialize the document's uuid
         const uuid = this.flags?.titan?.uuid;
         if (!uuid) {
            const initialData = {
               flags: {
                  titan: {
                     uuid: generateUUID(),
                  },
               },
            };

            this.updateSource(initialData);
         }

         // Update initial data if provided by the data model
         if (retVal !== false && typeof this.system.onPreCreate === 'function') {
            this.system.onPreCreate(data);
         }
      }

      return retVal;
   }

   /**
    * Prepares an object containing the data relevant to performing checks.
    * @override
    * @returns {object} Object containing the relevant data.
    */
   getRollData() {
      return this.system.getRollData();
   }

   /**
    * A helper to get a speaker from this actor.
    * @returns {SpeakerData} The identified speaker data.
    */
   getSpeaker() {
      return ChatMessage.getSpeaker({
         actor: this,
         token: this.token,
      });
   }

   /**
    * Gets this actor's Combatant in the active combat (if any).
    * Otherwise, returns undefined.
    * @returns {Combatant|undefined} This Character's combatant in combat.
    */
   getCombatant() {
      return game.combat?.getCombatantByActor(this.id);
   }

   /**
    * Adds an Item to the Actor, created from the item data.
    * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
    * @param {object[]|object} itemData - The Item data requested for creation.
    * @returns {Promise<Item[]|void>} The created or updated Item instances.
    */
   async addItem(itemData) {
      if (game.titan.assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         // Ensure the item data is in an array
         itemData = itemData instanceof Array ? itemData : [itemData];

         // Create the item or items.
         const retVal = /** @type Item[] */ await this.createEmbeddedDocuments('Item', itemData);

         // Broadcast downstream functions
         for (const item of retVal) {
            this.system.postAddItem(item);
            if (this._sheet) {
               this.sheet.postAddItem(item);
            }
         }

         return retVal;
      }
   }

   /** Deletes the item with the specified ID from the actor.
    * @param {string} id - The ID of the item to delete.
    * @returns {Promise<void>} Returns after the item has been deleted.
    * */
   async deleteItem(id) {
      if (game.titan.assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         const item = this.items.get(id);
         if (game.titan.assert(item !== undefined, '' +
               'Item was not valid.',
               this.name, id)
            && game.titan.assert(!item.isMarkedForDeletion,
               'Item is already marked for deletion.', this.name, item.name)) {

            // Execute pre-delete operations.
            this.system.preDeleteItem(item);
            this.sheet.preDeleteItem(item);

            // Cache the item type.
            const type = item.type;

            // Delete the item.
            if (await item.safeDelete() !== false) {

               // Execute post delete operations.
               this.system.postDeleteItem(id, type);
               this.sheet.postDeleteItem(id, type);
            }
         }
      }
   }

   /**
    * Gets all items of the provided Type.
    * @param {string} type - The Type of Item to search for.
    * @returns {TitanItem[]} - List of all Items of the provided type owned by this Actor.
    */
   getItemsOfType(type) {
      return /** @type TitanItem[] */ this.items.filter(item => item.type === type);
   }

   /**
    * Gets all items of the provided Types.
    * @param {string[]} types - The Types of Item to search for.
    * @returns {TitanItem[]} - List of all Items of the provided type owned by this Actor.
    */
   getItemsOfTypes(types) {
      return /** @type TitanItem[] */ this.items.filter(item => types.includes(item.type));
   }
}
