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
 * Whether a batch of embedded documents has to be written one document first because the actor is an unlinked token's
 * synthetic actor whose token holds no delta yet. Workaround for a Foundry core defect: the server loses a create or a
 * delete of two or more embedded documents when the token's stored delta is null (read: the walk in `#e` of
 * `dist/database/backend/embedded-delta.mjs`, Foundry 14.364, returns the outermost ancestor it adopted for the
 * document; for the second document that is the delta, which replaces the token as the write parent of the batch, so
 * the token record that has to hold the delta is not written; the loss is measured in `test-pf2e`, which does not load
 * TITAN, for deletes of Items). Writing one document alone stores the delta; the rest follows against the stored delta.
 * The guard reads client state (`token._source.delta`): core replaces it with the server's data on every load and sets
 * it only after the server accepted a first write below the token (read: `TokenDocument#relinkActorDelta`, called from
 * the descendant events that run after the server's reply, `client/documents/token.mjs`). It differs from the server
 * only after a batch written around these overrides (a class-level call such as
 * `Item.createDocuments(data, { parent })` that the server lost); no TITAN code makes one. A server read before every
 * batch would cost a round trip for no other case.
 * @param {TitanActor} actor - The actor the batch is for.
 * @param {number} count - The number of documents in the batch.
 * @returns {boolean} True when one document has to be written alone first.
 */
function needsDeltaFirst(actor, count) {
   return count > 1 && actor.isToken && !actor.token._source.delta;
}

/**
 * Writes a batch of documents, one document at a time while `needsDeltaFirst` holds and the rest in one call. The guard
 * is tested again after every single write: a document that a listener vetoed or that failed validation is dropped
 * before the request (read: `#preCreateDocumentArray` and `#preDeleteDocumentArray`, `client/data/client-backend.mjs`),
 * so it stores no delta and the next document has to go alone as well. The writes are separate server operations: when
 * a later one is rejected, the documents of the earlier ones stay written, where core rejects the whole batch.
 * @param {TitanActor} actor - The actor the batch is for.
 * @param {object[] | string[]} items - The data (create) or the ids (delete) of the batch.
 * @param {(items: object[] | string[], operation: object) => Promise<Document[]>} write - One core write of the items.
 * @param {object} operation - The caller's operation parameters.
 * @returns {Promise<Document[]>} The documents the writes returned, in order.
 */
async function writeInSteps(actor, items, write, operation) {
   if (!needsDeltaFirst(actor, items.length)) {
      return write(items, operation);
   }

   /** @type {Document[]} The documents the writes returned. */
   const written = [];

   /** @type {object[] | string[]} The items not written yet. */
   let rest = items;
   while (needsDeltaFirst(actor, rest.length)) {
      // Core writes `parent`, `pack` and the items onto the operation it receives, so each write takes a copy.
      written.push(...await write(rest.slice(0, 1), { ...operation }));
      rest = rest.slice(1);
   }
   written.push(...await write(rest, { ...operation }));
   return written;
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
    * created alone so the delta is stored before the rest (see `needsDeltaFirst` and `writeInSteps`). Not atomic in
    * that case: when the rest is rejected by the server (for example a kept id that already exists), the first
    * document stays created, where core creates none.
    * @override
    * @param {string} embeddedName - The name of the embedded document type.
    * @param {object[]} [data] - The data of each document to create.
    * @param {object} [operation] - Parameters of the database creation workflow.
    * @returns {Promise<Document[]>} The created documents.
    */
   async createEmbeddedDocuments(embeddedName, data = [], operation = {}) {
      return writeInSteps(
         this,
         data,
         (step, stepOperation) => super.createEmbeddedDocuments(embeddedName, step, stepOperation),
         operation,
      );
   }

   /**
    * Deletes embedded documents. On an unlinked token's actor whose token holds no delta, the first document is
    * deleted alone so the delta is stored before the rest (see `needsDeltaFirst` and `writeInSteps`). A `deleteAll`
    * operation is resolved to the ids of the whole embedded collection first, as core resolves it. An id the
    * collection does not hold rejects the whole batch before the first write, as in core. A server rejection of the
    * rest after the first write leaves the first document deleted, where core deletes none.
    * @override
    * @param {string} embeddedName - The name of the embedded document type.
    * @param {string[]} ids - The ids of the documents to delete.
    * @param {object} [operation] - Parameters of the database deletion workflow.
    * @returns {Promise<Document[]>} The deleted documents.
    */
   async deleteEmbeddedDocuments(embeddedName, ids, operation = {}) {
      /** @type {Collection} The embedded collection (core's own validation of the name). */
      const collection = this.getEmbeddedCollection(embeddedName);

      /** @type {string[]} The ids the operation deletes. */
      const targets = operation.deleteAll ? Array.from(collection.keys()) : ids;
      if (!needsDeltaFirst(this, targets.length)) {
         return super.deleteEmbeddedDocuments(embeddedName, ids, operation);
      }
      for (const id of targets) {
         collection.get(id, {
            strict: true,
            invalid: true,
         });
      }
      return writeInSteps(
         this,
         targets,
         (step, stepOperation) => super.deleteEmbeddedDocuments(embeddedName, step, stepOperation),
         {
            ...operation,
            deleteAll: false,
         },
      );
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
