import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import localize from '~/helpers/utility-functions/Localize.js';
import capitalize from '~/helpers/utility-functions/Capitalize.js';
import assert from '~/helpers/utility-functions/Assert.js';
import error from '~/helpers/utility-functions/Error.js';

/**
 * @typedef {object} SpeakerData An object containing data on a Chat Message's speaker.
 * @property {string} [scene] - The Scene in which the speaker resides.
 * @property {string} [actor] - The ID of the speaker's actor.
 * @property {string} [alias] - The name of the speaker to display.
 * @property {string} [token] - The ID of the speaker's Token.
 */

/**
 * Whether a batch of embedded documents has to be written in two steps because the actor is an unlinked token's
 * synthetic actor whose token holds no delta yet. Workaround for a Foundry core defect: the server loses a create or a
 * delete of two or more embedded documents when the token's stored delta is null (read: the loop in `#e` of
 * `dist/database/backend/embedded-delta.mjs`, Foundry 14.364, hands the delta, not the token, to the batch write
 * parent when it handles the second document; measured in `test-pf2e`, which does not load TITAN). The first document
 * is written alone, which stores the delta in the token; the rest follows against the stored delta.
 * @param {TitanActor} actor - The actor the batch is for.
 * @param {number} count - The number of documents in the batch.
 * @returns {boolean} True when the first document has to be written alone.
 */
function needsDeltaFirst(actor, count) {
   return count > 1 && actor.isToken && !actor.token._source.delta;
}

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
    * Creates embedded documents. On an unlinked token's actor whose token holds no delta, the first document is
    * created alone so the delta is stored before the rest (see `needsDeltaFirst`).
    * @override
    * @param {string} embeddedName - The name of the embedded document type.
    * @param {object[]} [data] - The data of each document to create.
    * @param {object} [operation] - Parameters of the database creation workflow.
    * @returns {Promise<Document[]>} The created documents.
    */
   async createEmbeddedDocuments(embeddedName, data = [], operation = {}) {
      if (needsDeltaFirst(this, data.length)) {
         /** @type {Document[]} The first created document. */
         const first = await super.createEmbeddedDocuments(embeddedName, data.slice(0, 1), { ...operation });

         /** @type {Document[]} The rest of the created documents. */
         const rest = await super.createEmbeddedDocuments(embeddedName, data.slice(1), { ...operation });
         return [
            ...first,
            ...rest,
         ];
      }
      return super.createEmbeddedDocuments(embeddedName, data, operation);
   }

   /**
    * Deletes embedded documents. On an unlinked token's actor whose token holds no delta, the first document is
    * deleted alone so the delta is stored before the rest (see `needsDeltaFirst`).
    * @override
    * @param {string} embeddedName - The name of the embedded document type.
    * @param {string[]} ids - The ids of the documents to delete.
    * @param {object} [operation] - Parameters of the database deletion workflow.
    * @returns {Promise<Document[]>} The deleted documents.
    */
   async deleteEmbeddedDocuments(embeddedName, ids, operation = {}) {
      if (needsDeltaFirst(this, ids.length)) {
         /** @type {Document[]} The first deleted document. */
         const first = await super.deleteEmbeddedDocuments(embeddedName, ids.slice(0, 1), { ...operation });

         /** @type {Document[]} The rest of the deleted documents. */
         const rest = await super.deleteEmbeddedDocuments(embeddedName, ids.slice(1), { ...operation });
         return [
            ...first,
            ...rest,
         ];
      }
      return super.deleteEmbeddedDocuments(embeddedName, ids, operation);
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
    * Gets this actor's Combatant in the active combat (if any). Otherwise, returns undefined. The combatant is found
    * by actor identity: a token's synthetic actor is its own actor, not the base actor with the same id, and a
    * combatant of an unlinked token resolves to that token's synthetic actor. Core's `Combat#getCombatantByActor` is
    * deprecated since v14 and removed in v15, so it is not called.
    * @returns {Combatant | undefined} This Actor's combatant in the active combat.
    */
   getCombatant() {
      return game.combat?.combatants.find((combatant) => combatant.actor === this);
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
         if (!(itemData instanceof Array)) {
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
         if (!(activeEffectData instanceof Array)) {
            activeEffectData = [activeEffectData];
         }

         // Create the active effect or effects.
         return  /** @type ActiveEffect[] */ this.createEmbeddedDocuments(
            'ActiveEffect',
            activeEffectData,
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

            // The follow-up work of a confirmed delete runs in `_onDeleteDescendantDocuments`, for every delete.
            await item.safeDelete();
         }
      }
   }

   /**
    * Runs the follow-up work of Items that were deleted from this Actor, whoever deleted them and however (the sheet
    * rows, a macro, a module). Foundry calls this on every client; the sheet cleanup is local state, so every client
    * runs it, while the data cleanup writes to the Actor, so only the client of the User who deleted the Items runs it.
    * @override
    * @param {Document} parent - The direct parent of the deleted Documents.
    * @param {string} collection - The collection the Documents were deleted from.
    * @param {Document[]} documents - The deleted Documents.
    * @param {string[]} ids - The IDs of the deleted Documents.
    * @param {object} options - Options that modified the deletion.
    * @param {string} userId - The ID of the User who deleted the Documents.
    * @returns {void}
    * @protected
    */
   _onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
      super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
      if (parent !== this || collection !== 'items') {
         return;
      }

      // Every client drops its own sheet state; one failure does not stop the other cleanup.
      for (const item of documents) {
         try {
            this.sheet.postDeleteItem(item.id, item.type);
         }
         catch (failure) {
            error('Failed to update the sheet after deleting an Item.', failure);
         }
      }

      // Only the deleting client writes to the Actor.
      if (userId === game.user.id) {
         for (const item of documents) {
            Promise.resolve(this.system.postDeleteItem(item.id, item.type)).catch((failure) => {
               error('Failed to update the Actor after deleting an Item.', failure);
            });
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
