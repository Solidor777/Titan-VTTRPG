import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import localize from '~/helpers/utility-functions/Localize.js';
import capitalize from '~/helpers/utility-functions/Capitalize.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * @typedef {object} SpeakerData An object containing data on a Chat Message's speaker.
 * @property {string} [scene] - The Scene in which the speaker resides.
 * @property {string} [actor] - The ID of the speaker's actor.
 * @property {string} [alias] - The name of the speaker to display.
 * @property {string} [token] - The ID of the speaker's Token.
 */

/**
 * Extends the base Actor class to implement additional system-specific logic for Titan.
 * @property {TitanItem[]} items - A collection of embedded Item documents.
 * @property {TitanActorSheet} sheet - The Sheet that represents this Actor.
 * @extends {Actor}
 */
export default class TitanActor extends Actor {

   /**
    * Performs initialization logic before document creation.
    * @override
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {User} user - The User requesting the document creation.
    * @returns {Promise<boolean | void>} A return value of false indicates the creation operation should be canceled.
    * @protected
    */
   async _preCreate(data, options, user) {
      const retVal = await super._preCreate(data, options, user);
      if (retVal !== false) {

         // Initialize the document's UUID.
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

         // Update initial data if provided by the data model.
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
    * Gets this actor's Combatant in the active combat (if any). Otherwise, returns undefined.
    * @returns {Combatant | undefined} This Actor's combatant in the active combat.
    */
   getCombatant() {
      return game.combat?.getCombatantByActor(this.id);
   }

   /**
    * Adds an Item to the Actor, created from the item data.
    * @param {object[] | object} itemData - The Item data requested for creation.
    * @returns {Promise<Item[] | void>} The created or updated Item instances.
    */
   async addItem(itemData) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         // Ensure the item data is in an array.
         if (!itemData instanceof Array) {
            itemData = [itemData];
         }

         // Create the item or items.
         const retVal = /** @type {TitanItem[]} */ (await this.createEmbeddedDocuments('Item', itemData));

         // Notify the system and sheet of each added item.
         for (const item of retVal) {
            this.system.postAddItem(item);
            if (this.sheet) {
               this.sheet.postAddItem(item);
            }
         }

         return retVal;
      }
   }

   /**
    * Creates an item of the provided type, and adds it to the actor.
    * @param {string} type - The type of item to add.
    * @returns {Promise<Item[] | void>} The created Item instances.
    */
   async createItemFromType(type) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         // Get the desired name.
         let itemName = localize(`new${capitalize(type)}`);

         // Add a number suffix if a duplicate name already exists.
         const duplicateNames = this.items.filter((item) => item.name.includes(itemName));
         if (duplicateNames.length > 0) {
            itemName += ` (${duplicateNames.length})`;
         }

         return this.addItem([
            {
               name: itemName,
               type: type,
            },
         ]);
      }
   }

   /**
    * Adds an Active Effect to the Actor, created from the active effect data.
    * @param {object[] | object} activeEffectData - The Active Effect data requested for creation.
    * @returns {Promise<ActiveEffect[] | void>} The created or updated Active Effect instances.
    */
   async addActiveEffect(activeEffectData) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         // Ensure the active effect data is in an array.
         if (!activeEffectData instanceof Array) {
            activeEffectData = [activeEffectData];
         }

         // Create the active effect or effects.
         return  /** @type ActiveEffect[] */ this.createEmbeddedDocuments(
            'ActiveEffect',
            activeEffectData
         );

      }
   }

   /**
    * Deletes the item with the specified ID from the actor.
    * @param {string} id - The ID of the item to delete.
    * @returns {Promise<void>} Resolves after the item has been deleted.
    */
   async deleteItem(id) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         const item = this.items.get(id);
         if (assert(
               item !== undefined,
               'Item was not valid.',
               this.name,
               id,
            )
            && assert(
               !item.isMarkedForDeletion,
               'Item is already marked for deletion.',
               this.name,
               item.name,
            )) {

            // Execute pre-delete operations.
            this.system.preDeleteItem(item);
            this.sheet.preDeleteItem(item);

            // Cache the item type.
            const type = item.type;

            // Delete the item.
            if (await item.safeDelete() !== false) {

               // Execute post-delete operations.
               this.system.postDeleteItem(id, type);
               this.sheet.postDeleteItem(id, type);
            }
         }
      }
   }

   /**
    * Gets all items of the provided Type.
    * @param {string} type - The Type of Item to search for.
    * @returns {TitanItem[]} List of all Items of the provided type owned by this Actor.
    */
   getItemsOfType(type) {
      return /** @type TitanItem[] */ this.items.filter(item => item.type === type);
   }

   /**
    * Gets all items of the provided Types.
    * @param {string[]} types - The Types of Item to search for.
    * @returns {TitanItem[]} List of all Items of the provided types owned by this Actor.
    */
   getItemsOfTypes(types) {
      return /** @type TitanItem[] */ this.items.filter(item => types.includes(item.type));
   }
}
