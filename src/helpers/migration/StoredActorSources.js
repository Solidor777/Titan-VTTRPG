import error from '~/helpers/utility-functions/Error.js';
import log from '~/helpers/utility-functions/Log.js';
import { isLegacyEffectItem } from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';

/**
 * A stored actor found by a walk, read from stored data only: a world actor's source, an unlinked token's stored
 * delta, or a world pack's server projection. Reading it loads no pack document and materializes no token actor.
 * @typedef {object} StoredActorSource
 * @property {string} location - Where the actor is stored: one of STORED_ACTOR_LOCATIONS.
 * @property {string} name - The actor's or token's name (a packed one prefixed with its pack and entry), for reports.
 * @property {object[]} items - The Item data the actor holds itself (an unlinked token: its delta's own).
 * @property {object[]} effects - The Active Effect data the actor holds itself (an unlinked token: its delta's own,
 * tombstones included).
 * @property {() => Promise<StoredActorTarget|null>} open - Opens the actor for writing: unlocks its pack, loads its
 * pack document, or materializes its token's actor as needed. Resolves null when nothing is left to write to.
 */

/**
 * A stored actor opened for writing. The readers return the live stored data (an Adventure's: its working copy), so
 * each step sees the steps before it.
 * @typedef {object} StoredActorTarget
 * @property {() => object[]} readItems - Reads the Item data the actor holds itself.
 * @property {() => object[]} readEffects - Reads the Active Effect data the actor holds itself, tombstones included.
 * @property {() => object[]} readHeldEffects - Reads the data of every Active Effect the actor has, an unlinked
 * token's inherited ones included.
 * @property {(data: object[]) => Promise<object[]>} createEffects - Creates Active Effects; resolves the created
 * effects' data (a creation a hook vetoed is absent).
 * @property {(updates: object[]) => Promise<object[]>} updateEffects - Updates Active Effects; resolves the updated
 * effects' data.
 * @property {(ids: string[]) => Promise<string[]>} deleteItems - Deletes Items; resolves the ids no longer stored.
 * @property {() => Promise<void>} stored - Resolves once the target's writes are stored; rejects when they were not.
 * A document's writes are stored as they are made; an Adventure's actors and scene tokens are stored by one write of
 * the Adventure's field when the walk leaves the Adventure, so their outcome is known only after that.
 */

/**
 * A failure the walk met outside the stored actors it yields: a world pack it could not read (its actors went
 * unchecked), or a pack whose lock it could not restore. The walk reports each one as it happens and records it, so
 * its consumer counts it (migrateStoredActors) or treats an unread pack as pending work (storedActorsNeedMigration).
 * @typedef {object} StoredActorWalkFailure
 * @property {string} subject - What failed, for the log: `pack "<label>"` or `the lock of pack "<label>"`.
 * @property {Error} error - What the walk caught.
 */

/**
 * A world pack's write access during one walk.
 * @typedef {object} PackWriteAccess
 * @property {() => Promise<void>} unlock - Unlocks the pack when it is locked, before a write.
 * @property {() => Promise<void>} restore - Locks the pack again when this walk tried to unlock it; a failure is
 * reported and recorded as a walk failure, never thrown, so it cannot mask an error from the pack's writes.
 */

/**
 * One content field (`actors` or `scenes`) of a packed Adventure during one walk over the Adventure. Its actors and
 * scene tokens are data, not documents, so their targets edit a working copy of the whole field, and the walk stores
 * the working copy in one `Adventure#update` when it leaves the Adventure. One write per field is required: core
 * validates every element of a replaced array field on each write (Foundry v14 `common/data/fields.mjs`
 * `ArrayField#_updateDiff`), and a legacy effect Item is an unregistered Item subtype, so a write of the field fails
 * while any actor in it still holds one; one write carries every actor's conversion at once. A write that still holds
 * a legacy Item (an actor whose conversion failed) fails whole, every actor it carried counts as failed, and its error
 * names the entries still holding one (describeLegacyHolders), the ones the GM must fix for the Adventure to migrate.
 * The working copy lives for one walk: the next walk copies the stored field again, so a write that was not stored
 * never reaches a later one.
 * @typedef {object} AdventureContent
 * @property {object[]} entries - The working copy of the field's data.
 * @property {() => void} markWritten - Records that a target changed the working copy.
 * @property {() => Promise<void>} stored - Resolves once the changed working copy is stored (at once when nothing
 * changed); rejects when it was not.
 * @property {() => Promise<void>} commit - Writes the changed working copy and settles `stored`; never throws.
 */

/**
 * Loads one content field of a packed Adventure on the first open of one of its actors or scene tokens.
 * @typedef {object} AdventureContentLoader
 * @property {() => Promise<AdventureContent|null>} load - Unlocks the pack and loads the Adventure on the first call;
 * resolves null when the Adventure is gone.
 * @property {() => Promise<void>} commit - Stores the field's changes when it was loaded; never throws.
 */

/**
 * Stored actors yielded in walk order, by a synchronous or an asynchronous generator.
 * @typedef {Iterable<StoredActorSource>|AsyncIterable<StoredActorSource>} StoredActorSourceIterable
 */

/**
 * Yields the stored actors in one projected record of a world pack.
 * @typedef {(pack: CompendiumCollection, record: object, access: PackWriteAccess) => StoredActorSourceIterable}
 * PackRecordWalker
 */

/**
 * Every location a stored actor lives in, in walk order: world actors before the unlinked tokens that inherit from
 * them, then the world packs. Only world-package packs are read: module and system packs belong to their packages.
 * `walkStoredActorSources` walks exactly these, in this order.
 * @type {readonly string[]}
 */
export const STORED_ACTOR_LOCATIONS = Object.freeze([
   'worldActor',
   'sceneToken',
   'actorPack',
   'scenePackToken',
   'adventureActor',
   'adventureSceneToken',
]);

/**
 * The fields each packed location reads from its pack's documents without loading them. The server projects a dotted
 * field of an embedded collection onto each embedded record and keeps an array value whole (Foundry v14
 * `dist/database/backend/server-backend.mjs` index projection, `common/utils/helpers.mjs` `filterObject`), and
 * expands a projected Scene token fully, its delta's items and effects included (`server-document.mjs`
 * `expandEmbedded`). An Adventure stores its actors and scenes inline (`SetField` of `EmbeddedDataField`, no embedded
 * collection), so they are read whole, and nothing narrows them: `filterObject` keeps an array whole, and only an
 * embedded collection is projected per record. Every Prompt- or Automatic-mode load of the active GM therefore reads
 * the full `actors` and `scenes` of every world Adventure pack whenever the scan reaches them, a clean world included,
 * and a migrating load reads them up to three times (the load's scan, `migrateWorld`'s scan, and the pass).
 * @type {Readonly<Record<string, string[]>>}
 */
export const PACK_PROJECTION_FIELDS = Object.freeze({
   actorPack: [
      '_id',
      'name',
      'items.type',
      'effects.type',
      'effects.statuses',
      'effects.system.rulesElement',
      'effects.flags.titan',
   ],
   adventureActor: [
      '_id',
      'name',
      'actors',
   ],
   adventureSceneToken: [
      '_id',
      'name',
      'scenes',
   ],
   scenePackToken: [
      '_id',
      'name',
      'tokens.name',
      'tokens.actorId',
      'tokens.actorLink',
      'tokens.delta',
   ],
});

/**
 * Reads a world pack's documents projected to the given fields, straight from the server: loads no document and
 * leaves the pack's own index alone. `CompendiumCollection#getIndex` is not used: it returns its cached index while
 * the fields are already indexed, and re-indexes a loaded document with `getProperty(source, field)`, which reads a
 * dotted field through an embedded array as undefined (Foundry v14 `compendium-collection.mjs` `indexDocument`), so a
 * second scan in the same session would read stale or emptied entries.
 * @param {CompendiumCollection} pack - The world pack.
 * @param {string[]} fields - The fields to project.
 * @returns {Promise<object[]>} The projected records.
 */
function readPackProjection(pack, fields) {
   /** @type {typeof foundry.abstract.Document} The pack's document class. */
   const documentClass = pack.documentClass;
   return documentClass.database.get(documentClass, {
      index: true,
      indexFields: [...fields],
      pack: pack.collection,
      query: {},
   }, game.user);
}

/**
 * Creates a world pack's write access for one walk: the pack is unlocked only before a write, so a walk that writes
 * nothing never touches its lock, and the lock is restored once the walk leaves the pack.
 * @param {CompendiumCollection} pack - The world pack.
 * @param {StoredActorWalkFailure[]} failures - Receives a failure to restore the lock.
 * @returns {PackWriteAccess} The unlock and restore calls of this walk over the pack.
 */
function createPackWriteAccess(pack, failures) {
   /** @type {boolean} Whether this walk tried to unlock the pack, so its lock must be restored. */
   let unlockTried = false;
   return {
      restore: async () => {
         if (!unlockTried) {
            return;
         }
         try {
            await pack.configure({ locked: true });
         }
         catch (err) {
            error(`Failed to restore the lock on pack "${pack.metadata.label}"; the pack is left unlocked.`, err);
            failures.push({
               error: err,
               subject: `the lock of pack "${pack.metadata.label}"`,
            });
         }
      },
      unlock: async () => {
         if (!pack.locked) {
            return;
         }
         unlockTried = true;
         await pack.configure({ locked: false });
         log(`Unlocked world pack "${pack.metadata.label}" to migrate it.`);
      },
   };
}

/**
 * Applies an update to stored Active Effect data the way the database applies the updates the migration writes: each
 * dotted path is set to a copy of its value, and `_del` (Foundry v14's ForcedDeletion operator) deletes the key.
 * @param {object} effect - The stored Active Effect data, changed in place.
 * @param {object} update - The update: `_id` and dotted paths.
 * @returns {void}
 */
function applyEffectUpdate(effect, update) {
   for (const [path, value] of Object.entries(update)) {
      if (path === '_id') {
         continue;
      }

      /** @type {string[]} The path's keys. */
      const keys = path.split('.');

      /** @type {string} The last key, which the value is written to. */
      const last = keys.pop();

      /** @type {object} The object holding the last key. */
      let parent = effect;
      for (const key of keys) {
         parent[key] ??= {};
         parent = parent[key];
      }
      if (value === _del) {
         delete parent[last];
      }
      else {
         parent[last] = structuredClone(value);
      }
   }
}

/**
 * Creates the write target of an actor document: a world actor, a packed actor, or an unlinked token's synthetic
 * actor, whose embedded writes Foundry routes to the token's delta. Its writes are stored as they are made: each
 * writer resolves what core stored, so `stored` resolves at once.
 * @param {TitanActor} actor - The document whose embedded Items and Active Effects are written.
 * @param {() => object} readSource - Reads the stored data the actor holds itself (`actor._source`, or an unlinked
 * token's `delta._source`).
 * @returns {StoredActorTarget} Readers of the stored data and writers through the document.
 */
function createDocumentTarget(actor, readSource) {
   return {
      createEffects: async (data) => (await actor.createEmbeddedDocuments('ActiveEffect', data))
         .map((effect) => effect.toObject()),
      deleteItems: async (ids) => {
         await actor.deleteEmbeddedDocuments('Item', ids);

         // An invalid Item (a legacy effect Item, whose subtype is unregistered) is deleted without being returned
         // (Foundry v14 client-backend.mjs #handleDeleteDocuments), so the deletion is read back from the stored items.
         /** @type {Set<string>} The ids of the Items still stored. */
         const stored = new Set((readSource().items ?? []).map((item) => item._id));
         return ids.filter((id) => !stored.has(id));
      },
      readEffects: () => readSource().effects ?? [],
      readHeldEffects: () => actor.effects.map((effect) => effect.toObject()),
      readItems: () => readSource().items ?? [],
      stored: async () => {},
      updateEffects: async (updates) => (await actor.updateEmbeddedDocuments('ActiveEffect', updates))
         .map((effect) => effect.toObject()),
   };
}

/**
 * Names the entries of an Adventure field's working copy that still hold a legacy effect Item, whose unregistered
 * subtype fails every write of the field (AdventureContent).
 * @param {object[]} entries - The working copy of the field's data.
 * @param {'actors'|'scenes'} field - The content field.
 * @returns {string} A sentence naming them (an actor by its name, a scene token by its scene's name and its own), or
 * an empty string when none does.
 */
function describeLegacyHolders(entries, field) {
   /** @type {string[]} The names of the entries holding a legacy effect Item. */
   const names = field === 'actors'
      ? entries.filter((actor) => (actor.items ?? []).some(isLegacyEffectItem)).map((actor) => actor.name)
      : entries.flatMap((scene) => (scene.tokens ?? [])
         .filter((token) => (token.delta?.items ?? []).some(isLegacyEffectItem))
         .map((token) => `${scene.name}: ${token.name}`));
   return names.length > 0
      ? ` Still holding a legacy effect Item: ${names.map((name) => `"${name}"`).join(', ')}.`
      : '';
}

/**
 * Creates one content field of a packed Adventure for one walk: a working copy of the field and the one write that
 * stores it (AdventureContent).
 * @param {Adventure} adventure - The packed Adventure.
 * @param {'actors'|'scenes'} field - Which Adventure array the working copy holds: its actors or its scenes.
 * @returns {AdventureContent} The field's working copy and its write.
 */
function createAdventureContent(adventure, field) {
   /** @type {boolean} Whether a target changed the working copy. */
   let written = false;

   /** @type {(err?: Error) => void} Settles `stored`: rejects it with the given error, or resolves it without one. */
   let settle;

   /** @type {Promise<void>} Settles once the commit ran: resolved when stored or unchanged, rejected if not stored. */
   const stored = new Promise((resolve, reject) => {
      settle = (err) => {
         if (err) {
            reject(err);
         }
         else {
            resolve();
         }
      };
   });

   // A walk whose consumer reads no outcome leaves a rejection unread; it is reported where it is read (the pass),
   // never as an unhandled rejection.
   stored.catch(() => {});

   /** @type {object[]} The working copy of the field's data. */
   const entries = structuredClone(adventure._source[field] ?? []);
   return {
      commit: async () => {
         if (!written) {
            settle();
            return;
         }

         /** @type {string} Names the entries still holding a legacy effect Item, which fail the write. */
         const holders = describeLegacyHolders(entries, field);

         /** @type {Adventure|undefined} The updated Adventure. */
         let updated;
         try {
            updated = await adventure.update({ [field]: entries });
         }
         catch (err) {
            settle(holders
               ? new Error(
                  `The write of the ${field} of Adventure "${adventure.name}" failed (${err.message}).${holders}`,
                  { cause: err },
               )
               : err);
            return;
         }

         // Core resolves undefined, without throwing, for a write it did not store: a failed validation dry run or a
         // `preUpdateAdventure` veto (Foundry v14 `client/data/client-backend.mjs` `#preUpdateDocumentArray`).
         if (!updated) {
            settle(new Error(`The write of the ${field} of Adventure "${adventure.name}" was not stored.${holders}`));
            return;
         }
         settle();
      },
      entries,
      markWritten: () => {
         written = true;
      },
      stored: () => stored,
   };
}

/**
 * Creates the write target of stored actor data that is not a document: an Adventure's actor, or the delta of an
 * Adventure scene's token. Each write edits the Adventure's working copy; the walk stores the working copy in one
 * write when it leaves the Adventure (AdventureContent), so the target's writes are stored, or not, together. A
 * created effect is built by `TitanActiveEffect.buildCreationSource`, so it stores what a created document stores. A
 * deleted Item is removed from the data, never replaced by an ActorDelta tombstone: an Adventure token's delta is
 * migrated from what it stores itself, and its base actor's own Items migrate where that actor is stored.
 * @param {object} holder - The working copy's data holding `items` and `effects`.
 * @param {AdventureContent} content - The Adventure field the working copy belongs to.
 * @returns {StoredActorTarget} Readers and writers of the working copy.
 */
function createSourceTarget(holder, content) {
   holder.items ??= [];
   holder.effects ??= [];
   return {
      createEffects: async (data) => {
         /** @type {typeof TitanActiveEffect} The Active Effect document class, which builds a created effect's data. */
         const effectClass = CONFIG.ActiveEffect.documentClass;

         /** @type {object[]} The created effects' data, each with a new id, as a created document stores it. */
         const created = data.map((entry) => effectClass.buildCreationSource({
            ...entry,
            _id: foundry.utils.randomID(),
         }));
         if (created.length > 0) {
            holder.effects.push(...created);
            content.markWritten();
         }
         return created;
      },
      deleteItems: async (ids) => {
         /** @type {string[]} The ids of the Items removed. */
         const deleted = holder.items.filter((item) => ids.includes(item._id)).map((item) => item._id);
         if (deleted.length > 0) {
            holder.items = holder.items.filter((item) => !ids.includes(item._id));
            content.markWritten();
         }
         return deleted;
      },
      readEffects: () => holder.effects,
      readHeldEffects: () => holder.effects.filter((effect) => !effect._tombstone),
      readItems: () => holder.items,
      stored: () => content.stored(),
      updateEffects: async (updates) => {
         /** @type {object[]} The updated effects' data. */
         const updated = [];
         for (const update of updates) {
            /** @type {object|undefined} The effect the update names. */
            const effect = holder.effects.find((entry) => entry._id === update._id);
            if (effect) {
               applyEffectUpdate(effect, update);
               updated.push(effect);
            }
         }
         if (updated.length > 0) {
            content.markWritten();
         }
         return updated;
      },
   };
}

/**
 * Creates the write target of a world or packed actor document.
 * @param {TitanActor} actor - The world or packed actor, which holds its stored data in `_source`.
 * @returns {StoredActorTarget} Readers of the actor's source and writers through the actor.
 */
function createActorTarget(actor) {
   return createDocumentTarget(actor, () => actor._source);
}

/**
 * Creates the write target of an unlinked token: its synthetic actor, holding the token's delta.
 * @param {TokenDocument} token - The unlinked token.
 * @returns {StoredActorTarget|null} The target, or null when the token has no actor (its base actor is gone).
 */
function createTokenTarget(token) {
   /** @type {TitanActor|null} The token's synthetic actor; reading it materializes the token's delta. */
   const actor = token.actor;
   return actor ? createDocumentTarget(actor, () => token.delta._source) : null;
}

/**
 * Creates the loader of one packed Adventure's content field for one walk: it loads the Adventure on the first open
 * of one of the field's actors or scene tokens, and stores the field's changes when the walk leaves the Adventure.
 * @param {CompendiumCollection} pack - The world Adventure pack holding the Adventure.
 * @param {string} id - The id of the Adventure within its pack.
 * @param {PackWriteAccess} access - The pack's write access.
 * @param {'actors'|'scenes'} field - The content field.
 * @returns {AdventureContentLoader} Loads the content, and stores its changes.
 */
function createAdventureLoader(pack, id, access, field) {
   /** @type {AdventureContent|null} The loaded content, once loaded. */
   let content = null;
   return {
      commit: async () => {
         await content?.commit();
      },
      load: async () => {
         if (!content) {
            await access.unlock();

            /** @type {Adventure|null} The packed Adventure. */
            const adventure = await pack.getDocument(id);
            if (!adventure) {
               return null;
            }
            content = createAdventureContent(adventure, field);
         }
         return content;
      },
   };
}

/**
 * Walks the world actors.
 * @returns {Generator<StoredActorSource>} A generator over the world actors.
 * @yields {StoredActorSource} The next world actor.
 */
function* walkWorldActors() {
   for (const actor of game.actors) {
      yield {
         effects: actor._source.effects ?? [],
         items: actor._source.items ?? [],
         location: 'worldActor',
         name: actor.name,
         open: async () => createActorTarget(actor),
      };
   }
}

/**
 * Walks the unlinked tokens on world scenes, from each token's stored delta. The effects and items a token inherits
 * from its base actor are the base actor's and migrate there, so a token never gains a copy of an inherited one. A
 * linked token's actor is its world actor, and a token whose base actor is gone has no actor to write to. A token's
 * actor is read only when its source is opened.
 * @returns {Generator<StoredActorSource>} A generator over the unlinked tokens.
 * @yields {StoredActorSource} The next unlinked token.
 */
function* walkSceneTokens() {
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (token.actorLink || !token.baseActor) {
            continue;
         }
         yield {
            effects: token._source.delta?.effects ?? [],
            items: token._source.delta?.items ?? [],
            location: 'sceneToken',
            name: token.name,
            open: async () => createTokenTarget(token),
         };
      }
   }
}

/**
 * Walks one projected record of a world Actor pack.
 * @type {PackRecordWalker}
 * @param {CompendiumCollection} pack - The world pack the record was projected from.
 * @param {object} record - The projected actor.
 * @param {PackWriteAccess} access - The pack's write access.
 * @returns {Generator<StoredActorSource>} A generator over the packed actor.
 * @yields {StoredActorSource} The packed actor.
 */
function* walkActorPackRecord(pack, record, access) {
   yield {
      effects: record.effects ?? [],
      items: record.items ?? [],
      location: 'actorPack',
      name: `${pack.metadata.label}: ${record.name}`,
      open: async () => {
         await access.unlock();

         /** @type {TitanActor|null} The packed actor. */
         const actor = await pack.getDocument(record._id);
         return actor ? createActorTarget(actor) : null;
      },
   };
}

/**
 * Walks the unlinked tokens of one projected record of a world Scene pack, from each token's stored delta. A token
 * without a base world actor has no synthetic actor to write through, and a linked token's actor is a world actor.
 * @param {CompendiumCollection} pack - The world pack the record was projected from.
 * @param {object} record - The projected scene.
 * @param {PackWriteAccess} access - The pack's write access.
 * @returns {Generator<StoredActorSource>} A generator over the scene's unlinked tokens.
 * @yields {StoredActorSource} The next unlinked token.
 */
function* walkScenePackRecord(pack, record, access) {
   for (const token of record.tokens ?? []) {
      if (token.actorLink || !game.actors.has(token.actorId)) {
         continue;
      }
      yield {
         effects: token.delta?.effects ?? [],
         items: token.delta?.items ?? [],
         location: 'scenePackToken',
         name: `${pack.metadata.label}: ${record.name}: ${token.name}`,
         open: async () => {
            await access.unlock();

            /** @type {Scene|null} The packed scene. */
            const scene = await pack.getDocument(record._id);

            /** @type {TokenDocument|undefined} The packed scene's document of the projected token. */
            const tokenDocument = scene?.tokens.get(token._id);
            return tokenDocument ? createTokenTarget(tokenDocument) : null;
         },
      };
   }
}

/**
 * Walks the actors of one projected record of a world Adventure pack, and stores their changes in one write of the
 * Adventure's `actors` once the walk leaves the record, also when the consumer stops early.
 * @param {CompendiumCollection} pack - The world pack the record was projected from.
 * @param {object} record - The projected Adventure.
 * @param {PackWriteAccess} access - The pack's write access.
 * @returns {AsyncGenerator<StoredActorSource>} A generator over the Adventure's actors.
 * @yields {StoredActorSource} The next actor.
 */
async function* walkAdventureActorRecord(pack, record, access) {
   /** @type {AdventureContentLoader} The Adventure's actors, loaded on the first open. */
   const actors = createAdventureLoader(pack, record._id, access, 'actors');
   try {
      for (const actor of record.actors ?? []) {
         yield {
            effects: actor.effects ?? [],
            items: actor.items ?? [],
            location: 'adventureActor',
            name: `${pack.metadata.label}: ${record.name}: ${actor.name}`,
            open: async () => {
               /** @type {AdventureContent|null} The Adventure's actors. */
               const content = await actors.load();

               /** @type {object|undefined} The actor's working copy. */
               const source = content?.entries.find((entry) => entry._id === actor._id);
               return source ? createSourceTarget(source, content) : null;
            },
         };
      }
   }
   finally {
      await actors.commit();
   }
}

/**
 * Walks the unlinked scene tokens of one projected record of a world Adventure pack, from each token's stored delta,
 * and stores their changes in one write of the Adventure's `scenes` once the walk leaves the record, also when the
 * consumer stops early.
 * @param {CompendiumCollection} pack - The world pack the record was projected from.
 * @param {object} record - The projected Adventure.
 * @param {PackWriteAccess} access - The pack's write access.
 * @returns {AsyncGenerator<StoredActorSource>} A generator over the Adventure's unlinked scene tokens.
 * @yields {StoredActorSource} The next unlinked token.
 */
async function* walkAdventureSceneRecord(pack, record, access) {
   /** @type {AdventureContentLoader} The Adventure's scenes, loaded on the first open. */
   const scenes = createAdventureLoader(pack, record._id, access, 'scenes');
   try {
      for (const scene of record.scenes ?? []) {
         for (const token of scene.tokens ?? []) {
            if (token.actorLink) {
               continue;
            }
            yield {
               effects: token.delta?.effects ?? [],
               items: token.delta?.items ?? [],
               location: 'adventureSceneToken',
               name: `${pack.metadata.label}: ${record.name}: ${scene.name}: ${token.name}`,
               open: async () => {
                  /** @type {AdventureContent|null} The Adventure's scenes. */
                  const content = await scenes.load();

                  /** @type {object|undefined} The token's delta in the working copy. */
                  const delta = content?.entries.find((entry) => entry._id === scene._id)?.tokens
                     ?.find((entry) => entry._id === token._id)?.delta;
                  return delta ? createSourceTarget(delta, content) : null;
               },
            };
         }
      }
   }
   finally {
      await scenes.commit();
   }
}

/**
 * Walks the world packs of one document type for one location. Each pack is read through its server projection; a
 * pack whose projection fails is reported and recorded as a walk failure, and the walk goes on. A pack one location
 * of this walk could not read is not read again by the next (an Adventure pack is walked for its actors and for its
 * scene tokens), so each unreadable pack is one failure. A pack a source unlocked to write is locked again once the
 * walk leaves it, also when the consumer stops early; an Adventure's field is stored before its pack is locked again.
 * @param {string} documentName - The packs' document type.
 * @param {string} location - The location walked, which names its projection fields.
 * @param {PackRecordWalker} walkRecord - Yields the stored actors in one record.
 * @param {StoredActorWalkFailure[]} failures - Receives the unreadable packs and the locks that cannot be restored.
 * @param {Set<string>} unreadablePacks - The collection ids of the packs this walk could not read; receives each new
 * one.
 * @returns {AsyncGenerator<StoredActorSource>} A generator over the location's stored actors.
 * @yields {StoredActorSource} The next stored actor.
 */
async function* walkWorldPacks(documentName, location, walkRecord, failures, unreadablePacks) {
   for (const pack of game.packs) {
      if (pack.metadata.packageType !== 'world' || pack.metadata.type !== documentName
         || unreadablePacks.has(pack.collection)) {
         continue;
      }

      /** @type {object[]} The pack's projected records. */
      let records;
      try {
         records = await readPackProjection(pack, PACK_PROJECTION_FIELDS[location]);
      }
      catch (err) {
         error(`Failed to read world pack "${pack.metadata.label}".`, err);
         unreadablePacks.add(pack.collection);
         failures.push({
            error: err,
            subject: `pack "${pack.metadata.label}"`,
         });
         continue;
      }

      /** @type {PackWriteAccess} The pack's write access for this walk. */
      const access = createPackWriteAccess(pack, failures);
      try {
         for (const record of records) {
            yield* walkRecord(pack, record, access);
         }
      }
      finally {
         await access.restore();
      }
   }
}

/**
 * Walks one location. A pack location's walk records its failures in `failures`, and skips and extends the walk's
 * `unreadablePacks` (the collection ids of the packs it could not read).
 * @typedef {(failures: StoredActorWalkFailure[], unreadablePacks: Set<string>) => StoredActorSourceIterable}
 * LocationWalk
 */

/**
 * The walk of each location.
 * @type {Readonly<Record<string, LocationWalk>>}
 */
const LOCATION_WALKS = Object.freeze({
   actorPack: (failures, unreadablePacks) => walkWorldPacks(
      'Actor',
      'actorPack',
      walkActorPackRecord,
      failures,
      unreadablePacks,
   ),
   adventureActor: (failures, unreadablePacks) => walkWorldPacks(
      'Adventure',
      'adventureActor',
      walkAdventureActorRecord,
      failures,
      unreadablePacks,
   ),
   adventureSceneToken: (failures, unreadablePacks) => walkWorldPacks(
      'Adventure',
      'adventureSceneToken',
      walkAdventureSceneRecord,
      failures,
      unreadablePacks,
   ),
   sceneToken: walkSceneTokens,
   scenePackToken: (failures, unreadablePacks) => walkWorldPacks(
      'Scene',
      'scenePackToken',
      walkScenePackRecord,
      failures,
      unreadablePacks,
   ),
   worldActor: walkWorldActors,
});

/**
 * Walks every stored actor, in STORED_ACTOR_LOCATIONS order: world actors, unlinked tokens on world scenes, actors in
 * world Actor packs, unlinked tokens in world Scene packs, and the actors and unlinked scene tokens in world Adventure
 * packs. The walk reads stored data only; a source's `open` does the loading and unlocking a write needs. A failure
 * outside the yielded actors (a world pack the walk cannot read, or a pack lock it cannot restore) is reported and
 * recorded in `failures`, and the walk goes on; a pack the walk cannot read is read and recorded once.
 * @param {StoredActorWalkFailure[]} [failures] - Receives the walk's failures, for its consumer to count.
 * @returns {AsyncGenerator<StoredActorSource>} A generator over every stored actor.
 * @yields {StoredActorSource} The next stored actor.
 */
export async function* walkStoredActorSources(failures = []) {
   /** @type {Set<string>} The collection ids of the world packs this walk could not read. */
   const unreadablePacks = new Set();
   for (const location of STORED_ACTOR_LOCATIONS) {
      yield* LOCATION_WALKS[location](failures, unreadablePacks);
   }
}
