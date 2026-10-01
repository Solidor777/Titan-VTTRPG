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
 * @property {object[]} inheritedEffects - The Active Effect data an unlinked token inherits from its base actor and
 * does not override (inheritedEntriesOf); none for any other actor, and none for an Adventure token whose base actor
 * neither the Adventure nor the world holds, or for an orphaned token.
 * @property {(() => Promise<StoredActorTarget|null>)|null} open - Opens the actor for writing: unlocks its pack, loads
 * its pack document, or materializes its token's actor as needed. Resolves null when nothing is left to write to. Null
 * for an orphaned token, which the migration never opens.
 * @property {OrphanedToken|null} orphan - Names an orphaned token, which the migration reports and never writes; null
 * for every other stored actor.
 */

/**
 * An orphaned token: an unlinked token on a world scene or in a world Scene pack whose base actor is gone
 * (walkSceneTokens gives the reasons the migration never writes one). Its source carries the data its own delta
 * stores, so the scan finds its pending work and the pass reports it as a failure, named for the GM to delete.
 * @typedef {object} OrphanedToken
 * @property {string} token - The token's name.
 * @property {string} scene - The name of the token's scene.
 * @property {string|null} pack - The label of the world Scene pack holding the scene; null for a world scene.
 */

/**
 * A stored actor opened for writing. The readers return the live stored data (an Adventure's: its working copy), so
 * each step sees the steps before it.
 * @typedef {object} StoredActorTarget
 * @property {() => object[]} readItems - Reads the Item data the actor holds itself.
 * @property {() => object[]} readEffects - Reads the Active Effect data the actor holds itself, tombstones included.
 * @property {() => object[]} readInheritedEffects - Reads the Active Effect data an unlinked token inherits from its
 * base actor and does not override (inheritedEntriesOf); none for any other actor.
 * @property {(data: object[]) => Promise<object[]>} createEffects - Creates Active Effects, each keeping the `_id` its
 * data gives (core's `keepId`); resolves the created effects' data (a creation a hook vetoed is absent).
 * @property {(updates: object[]) => Promise<object[]>} updateEffects - Updates Active Effects; resolves the updated
 * effects' data.
 * @property {(ids: string[]) => Promise<string[]>} deleteEffects - Deletes Active Effects the actor shows; an inherited
 * one is hidden by an ActorDelta tombstone, as core deletes it from a synthetic actor. Resolves the ids no longer
 * shown.
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
 * @property {Adventure} adventure - The packed Adventure, whose stored `actors` hold its scene tokens' base actors.
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
 * and a migrating load reads them up to three times (the load's scan, `migrateWorld`'s scan, and the pass). The
 * scene-token location reads `actors` again with `scenes`: an unlinked scene token inherits its base actor's effects,
 * and the Adventure may hold that actor (readAdventureBaseSource).
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
      'actors',
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
 * Selects the entries of a base actor's embedded collection that an unlinked token inherits: each base entry whose id
 * the token's delta does not hold. A delta entry, a tombstone included, replaces the base entry with its id, exactly as
 * core builds a synthetic actor (Foundry v14 `common/documents/actor-delta.mjs` `#mergeEmbeddedCollection`).
 * @param {object[]} deltaEntries - The delta's stored entries of the collection, tombstones included.
 * @param {object[]} baseEntries - The base actor's stored entries of the collection.
 * @returns {object[]} The base entries the token shows through its delta.
 */
function inheritedEntriesOf(deltaEntries, baseEntries) {
   /** @type {Set<string>} The ids the delta holds, its tombstones included. */
   const deltaIds = new Set(deltaEntries.map((entry) => entry._id));
   return baseEntries.filter((entry) => !deltaIds.has(entry._id));
}

/**
 * Deletes entries from stored embedded data the way core deletes them from an ActorDelta's collection (Foundry v14
 * `common/abstract/embedded-collection-delta.mjs` `_delete`): the entry the data holds itself is removed, and when the
 * base actor's collection holds an entry with the id, a tombstone (`{_id, _tombstone: true}`) takes its place so the
 * base entry stays hidden. Data without a base actor (an Adventure's actor) only loses the entry. Only an entry the
 * data shows is deleted: one it holds itself, or one it inherits.
 * @param {object[]} entries - The stored entries of the collection, changed in place, tombstones included.
 * @param {string[]} ids - The ids to delete.
 * @param {Set<string>} baseIds - The ids of the entries the base actor's collection holds (readBaseIds); empty without
 * a base actor.
 * @returns {string[]} The ids deleted.
 */
function deleteFromData(entries, ids, baseIds) {
   /** @type {string[]} The ids deleted. */
   const deleted = [];
   for (const id of ids) {
      /** @type {number} The index of the entry the data holds with the id, or -1. */
      const index = entries.findIndex((entry) => entry._id === id);

      /** @type {boolean} Whether the data shows an entry with the id: its own, or an inherited one. */
      const shown = index >= 0 ? !entries[index]._tombstone : baseIds.has(id);
      if (!shown) {
         continue;
      }
      if (index >= 0) {
         entries.splice(index, 1);
      }
      if (baseIds.has(id)) {
         entries.push({
            _id: id,
            _tombstone: true,
         });
      }
      deleted.push(id);
   }
   return deleted;
}

/**
 * Creates the write target of an actor document: a world actor, a packed actor, or an unlinked token's synthetic
 * actor, whose embedded writes core routes to the token's ActorDelta (Foundry v14 `client/data/client-backend.mjs`
 * `#adjustActorDeltaRequest`). Its writes are stored as they are made: each writer resolves what core stored, so
 * `stored` resolves at once. Created effects keep their ids (`keepId`): a converted effect takes its legacy Item's id,
 * the identity core relates a token's delta to its base actor by. A deletion of an inherited effect is core's own: on
 * a synthetic actor core stores an ActorDelta tombstone for it (`common/abstract/embedded-collection-delta.mjs`
 * `_delete`). A deletion is read back from `readSource`: core splices a deleted invalid Item from the client source
 * itself (`client/data/client-backend.mjs` `#handleDeleteDocuments`), and on a synthetic actor a tombstone takes the
 * place of a deleted entry whose id the base actor holds too, which reads as deleted.
 * @param {TitanActor} actor - The document whose embedded Items and Active Effects are written.
 * @param {() => object} readSource - Reads the stored data the actor holds itself (`actor._source`, or an unlinked
 * token's `delta._source`).
 * @param {() => object|null} [readBaseSource] - Reads an unlinked token's base actor's stored data; null for any other
 * actor.
 * @returns {StoredActorTarget} Readers of the stored data and writers through the document.
 */
function createDocumentTarget(actor, readSource, readBaseSource = () => null) {
   /**
    * Reads the Active Effect data the actor inherits and does not override.
    * @returns {object[]} The inherited effects' data.
    */
   const readInheritedEffects = () => inheritedEntriesOf(readSource().effects ?? [], readBaseSource()?.effects ?? []);
   return {
      createEffects: async (data) => (await actor.createEmbeddedDocuments('ActiveEffect', data, { keepId: true }))
         .map((effect) => effect.toObject()),
      deleteEffects: async (ids) => {
         await actor.deleteEmbeddedDocuments('ActiveEffect', ids);

         // The deletion is read back from the stored data, as for Items: an effect no longer shown is deleted.
         /** @type {Set<string>} The ids of the effects the actor still shows. */
         const shown = new Set([
            ...(readSource().effects ?? []).filter((effect) => !effect._tombstone).map((effect) => effect._id),
            ...readInheritedEffects().map((effect) => effect._id),
         ]);
         return ids.filter((id) => !shown.has(id));
      },
      deleteItems: async (ids) => {
         await actor.deleteEmbeddedDocuments('Item', ids);

         // An invalid Item (a legacy effect Item, whose subtype is unregistered) is deleted without being returned
         // (Foundry v14 client-backend.mjs #handleDeleteDocuments), so the deletion is read back from the stored items.
         /** @type {Set<string>} The ids of the Items still stored. */
         const stored = new Set((readSource().items ?? []).filter((item) => !item._tombstone).map((item) => item._id));
         return ids.filter((id) => !stored.has(id));
      },
      readEffects: () => readSource().effects ?? [],
      readInheritedEffects,
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
      adventure,
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
 * Adventure scene's token. Each write edits the Adventure's working copy; the walk stores the working copy in one write
 * when it leaves the Adventure (AdventureContent), so the target's writes are stored, or not, together. The writes
 * follow core's ActorDelta rules. A created effect is built by `TitanActiveEffect.buildCreationSource`, so it stores
 * what a created document stores, and keeps the `_id` its data gives (core's `keepId`; a new id only when it gives
 * none); it replaces a tombstone with its id, and an id the token already shows is refused, as the server refuses one
 * its parent collection holds (Foundry v14 `dist/database/backend/server-backend.mjs` `_createDocuments`). A deletion
 * removes the entry the data holds and, when the token's base actor holds the id, leaves a tombstone (deleteFromData):
 * what core stores for a world token's deletion, read back after a reload (a tombstone over a valid base Item, none for
 * an Item the base actor lacks; live with a raw-data token, pending real-path re-run). A legacy effect Item of the base
 * actor takes no tombstone: its subtype is unregistered, so it is an invalid document, which core never holds in a base
 * collection (`common/abstract/embedded-collection.mjs` `_initializeDocument`), and core's client deletion tombstones
 * only an id its base collection holds (`common/abstract/embedded-collection-delta.mjs` `_delete`). That case follows
 * core's client deletion; its stored outcome is not measured, because the server refuses a legacy Item, so none can be
 * seeded. A base entry invalid for any other reason is not detected, and its id still takes a tombstone.
 * @param {object} holder - The working copy's data holding `items` and `effects`.
 * @param {AdventureContent} content - The Adventure field the working copy belongs to.
 * @param {() => object|null} [readBaseSource] - Reads an Adventure token's base actor's stored data
 * (readAdventureBaseSource); null for an Adventure's actor, and for a token without a base actor.
 * @returns {StoredActorTarget} Readers and writers of the working copy.
 */
function createSourceTarget(holder, content, readBaseSource = () => null) {
   holder.items ??= [];
   holder.effects ??= [];

   /**
    * Reads the Active Effect data the token inherits and does not override.
    * @returns {object[]} The inherited effects' data.
    */
   const readInheritedEffects = () => inheritedEntriesOf(holder.effects, readBaseSource()?.effects ?? []);

   /**
    * Reads the ids of the entries the base actor's collection holds: its stored entries of the collection, except its
    * legacy effect Items, which are invalid documents core keeps out of a collection.
    * @param {'effects'|'items'} collection - Which embedded collection: `effects` or `items`.
    * @returns {Set<string>} The ids; empty without a base actor.
    */
   const readBaseIds = (collection) => new Set((readBaseSource()?.[collection] ?? [])
      .filter((entry) => collection !== 'items' || !isLegacyEffectItem(entry))
      .map((entry) => entry._id));
   return {
      createEffects: async (data) => {
         /** @type {typeof TitanActiveEffect} The Active Effect document class, which builds a created effect's data. */
         const effectClass = CONFIG.ActiveEffect.documentClass;

         /** @type {object[]} The created effects' data, each keeping its id, as a created document stores it. */
         const created = data.map((entry) => effectClass.buildCreationSource({
            ...entry,
            _id: entry._id ?? foundry.utils.randomID(),
         }));

         /** @type {Set<string>} The ids of the effects the token inherits. */
         const inheritedIds = new Set(readInheritedEffects().map((effect) => effect._id));
         for (const effect of created) {
            /** @type {number} The index of the entry the data holds with the effect's id, or -1. */
            const index = holder.effects.findIndex((entry) => entry._id === effect._id);
            if ((index >= 0 && !holder.effects[index]._tombstone) || inheritedIds.has(effect._id)) {
               throw new Error(`The _id [${effect._id}] already exists within the parent collection.`);
            }
         }
         for (const effect of created) {
            /** @type {number} The index of the tombstone with the effect's id, or -1. */
            const index = holder.effects.findIndex((entry) => entry._id === effect._id);
            if (index >= 0) {
               holder.effects.splice(index, 1, effect);
            }
            else {
               holder.effects.push(effect);
            }
         }
         if (created.length > 0) {
            content.markWritten();
         }
         return created;
      },
      deleteEffects: async (ids) => {
         /** @type {string[]} The ids of the effects deleted. */
         const deleted = deleteFromData(holder.effects, ids, readBaseIds('effects'));
         if (deleted.length > 0) {
            content.markWritten();
         }
         return deleted;
      },
      deleteItems: async (ids) => {
         /** @type {string[]} The ids of the Items deleted. */
         const deleted = deleteFromData(holder.items, ids, readBaseIds('items'));
         if (deleted.length > 0) {
            content.markWritten();
         }
         return deleted;
      },
      readEffects: () => holder.effects,
      readInheritedEffects,
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
 * Reads the stored data of an Adventure scene token's base actor: the Adventure's actor with the token's actor id, else
 * the world actor with it. Core's Adventure import keeps each document's id and replaces the world document with the
 * same id (Foundry v14 `client/documents/adventure.mjs` `prepareImport`, `importContent`), and a token's base actor is
 * the world actor with its actor id (`client/documents/token.mjs` `baseActor`), so after import the base is the
 * Adventure's actor when the Adventure holds one.
 * @param {object[]} actors - The Adventure's stored actors: a projected record's, or the stored Adventure's.
 * @param {string|null|undefined} actorId - The token's actor id.
 * @returns {object|null} The base actor's stored data; null when the token has no base actor.
 */
function readAdventureBaseSource(actors, actorId) {
   if (!actorId) {
      return null;
   }
   return actors.find((actor) => actor._id === actorId) ?? game.actors.get(actorId)?._source ?? null;
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
 * Creates the write target of an unlinked token: its synthetic actor, holding the token's delta, whose inherited
 * effects are read from the base actor's stored data (`TokenDocument#baseActor`); core routes its embedded writes to
 * the token's ActorDelta (Foundry v14 `client/data/client-backend.mjs` `#adjustActorDeltaRequest`).
 * @param {TokenDocument} token - The unlinked token.
 * @returns {StoredActorTarget|null} The target, or null when the token has no actor (its base actor was deleted
 * since the scan; the walk never opens a token already orphaned, walkSceneTokens).
 */
function createTokenTarget(token) {
   /** @type {TitanActor|null} The token's synthetic actor; reading it materializes the token's delta. */
   const actor = token.actor;
   return actor
      ? createDocumentTarget(actor, () => token.delta._source, () => token.baseActor?._source ?? null)
      : null;
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
         inheritedEffects: [],
         items: actor._source.items ?? [],
         location: 'worldActor',
         name: actor.name,
         open: async () => createActorTarget(actor),
         orphan: null,
      };
   }
}

/**
 * Builds the source of an orphaned token (OrphanedToken) from its stored delta: it inherits nothing, since its base
 * actor is gone, and it cannot be opened.
 * @param {string} location - The token's location: `sceneToken` or `scenePackToken`.
 * @param {string} name - The token's name for reports, as the walk names a token in its location.
 * @param {object|null|undefined} delta - The token's stored delta.
 * @param {OrphanedToken} orphan - The token's names.
 * @returns {StoredActorSource} The token's source.
 */
function createOrphanSource(location, name, delta, orphan) {
   return {
      effects: delta?.effects ?? [],
      inheritedEffects: [],
      items: delta?.items ?? [],
      location,
      name,
      open: null,
      orphan,
   };
}

/**
 * Walks the unlinked tokens on world scenes, from each token's stored delta and its base actor's stored effects. The
 * legacy Items a token inherits from its base actor are the base actor's and convert there; the token converts the ones
 * its delta holds itself, and hides an inherited conversion of an Item its delta overrides or removed
 * (convertStoredActor). A linked token's actor is its world actor. A token's actor is read only when its source is
 * opened.
 *
 * An orphaned token (an unlinked token whose base actor is gone) is yielded from its own stored delta with no way to
 * open it (createOrphanSource): the migration never writes to it, so the scan reports its pending work (a legacy
 * effect Item or a stale condition in its own delta), and the pass counts it as a failure and names its scene and the
 * token, telling the GM to delete the token. The scan reads stored data on every Prompt or Automatic load, so the GM
 * sees the migration prompt or the reported failure on every load until the token is deleted. The token is never
 * written, a token holding only a stale condition included, because:
 * - it has no actor in the game (`TokenDocument#actor` is null);
 * - deleting the token is the remedy;
 * - Foundry v14 core cannot create or delete entries in its delta, which the conversion needs, and the condition
 * sync's removal of a key inside an entry through a parent update has not been measured;
 * - the scan runs on every load, so a token left unwritten keeps being reported.
 *
 * The core evidence. Measured live with raw-data tokens, pending real-path re-run, on a world-scene and a Scene-pack
 * token, with a second GM connected and a reload read-back: a Token or Scene update that adds an entry to the delta
 * fails the client's dry run in `EmbeddedCollectionDelta#_prepareDeltaUpdate`
 * (`common/abstract/embedded-collection-delta.mjs:201`: no base collection) and stores nothing; one that drops an
 * entry from the array, or deletes it with an update operator, stores nothing; and one that updates an entry the delta
 * already holds is stored, its tombstones kept. Measured live with a raw-data token, pending real-path re-run, on the
 * Scene-pack token only: an embedded create on the delta (`token.delta.createEmbeddedDocuments`) throws on the
 * client. Read in core, not run: the throw site, `TokenDocument#_onRelatedUpdate` (`client/documents/token.mjs:3809`),
 * which reads `this.actor.tokenActiveEffectChanges` while the token's actor is null, and which the world-scene token's
 * embedded create and every embedded update and delete reach too. Inferred, not read back: the throw comes after the
 * server write.
 * @returns {Generator<StoredActorSource>} A generator over the unlinked tokens.
 * @yields {StoredActorSource} The next unlinked token.
 */
function* walkSceneTokens() {
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (token.actorLink) {
            continue;
         }
         if (!token.baseActor) {
            yield createOrphanSource('sceneToken', token.name, token._source.delta, {
               pack: null,
               scene: scene.name,
               token: token.name,
            });
            continue;
         }
         yield {
            effects: token._source.delta?.effects ?? [],
            inheritedEffects: inheritedEntriesOf(
               token._source.delta?.effects ?? [],
               token.baseActor._source.effects ?? [],
            ),
            items: token._source.delta?.items ?? [],
            location: 'sceneToken',
            name: token.name,
            open: async () => createTokenTarget(token),
            orphan: null,
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
      inheritedEffects: [],
      items: record.items ?? [],
      location: 'actorPack',
      name: `${pack.metadata.label}: ${record.name}`,
      open: async () => {
         await access.unlock();

         /** @type {TitanActor|null} The packed actor. */
         const actor = await pack.getDocument(record._id);
         return actor ? createActorTarget(actor) : null;
      },
      orphan: null,
   };
}

/**
 * Walks the unlinked tokens of one projected record of a world Scene pack, from each token's stored delta and its
 * base world actor's stored effects (createTokenTarget). A linked token's actor is a world actor. A token without a
 * base world actor (an orphaned token) is yielded from its own stored delta with no way to open it, as on a world
 * scene (walkSceneTokens gives the reasons): the migration never unlocks its pack or loads its scene for it.
 * @param {CompendiumCollection} pack - The world pack the record was projected from.
 * @param {object} record - The projected scene.
 * @param {PackWriteAccess} access - The pack's write access.
 * @returns {Generator<StoredActorSource>} A generator over the scene's unlinked tokens.
 * @yields {StoredActorSource} The next unlinked token.
 */
function* walkScenePackRecord(pack, record, access) {
   for (const token of record.tokens ?? []) {
      if (token.actorLink) {
         continue;
      }

      /** @type {string} The token's name for reports. */
      const name = `${pack.metadata.label}: ${record.name}: ${token.name}`;
      if (!game.actors.has(token.actorId)) {
         yield createOrphanSource('scenePackToken', name, token.delta, {
            pack: pack.metadata.label,
            scene: record.name,
            token: token.name,
         });
         continue;
      }
      yield {
         effects: token.delta?.effects ?? [],
         inheritedEffects: inheritedEntriesOf(
            token.delta?.effects ?? [],
            game.actors.get(token.actorId)._source.effects ?? [],
         ),
         items: token.delta?.items ?? [],
         location: 'scenePackToken',
         name,
         open: async () => {
            await access.unlock();

            /** @type {Scene|null} The packed scene. */
            const scene = await pack.getDocument(record._id);

            /** @type {TokenDocument|undefined} The packed scene's document of the projected token. */
            const tokenDocument = scene?.tokens.get(token._id);
            return tokenDocument ? createTokenTarget(tokenDocument) : null;
         },
         orphan: null,
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
            inheritedEffects: [],
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
            orphan: null,
         };
      }
   }
   finally {
      await actors.commit();
   }
}

/**
 * Walks the unlinked scene tokens of one projected record of a world Adventure pack, from each token's stored delta
 * and its base actor's stored effects (readAdventureBaseSource), and stores their changes in one write of the
 * Adventure's `scenes` once the walk leaves the record, also when the consumer stops early. The record's `actors` are
 * projected after the Adventure's actors were walked and stored (STORED_ACTOR_LOCATIONS order), so they hold the base
 * actors' conversions of this walk. A token whose actor id names no actor is walked like any other, inheriting
 * nothing: an Adventure's scene tokens are inline data written with the whole `scenes` field (createSourceTarget),
 * never as token documents, so the core limitation that keeps the migration from writing an orphaned token on a world
 * scene or in a Scene pack (walkSceneTokens) does not apply (live with a raw-data token, pending real-path re-run: one
 * `adventure.update({ scenes })` that removed an Item from such a token's delta, updated one effect, and added another
 * was stored, with no client error).
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
               inheritedEffects: inheritedEntriesOf(
                  token.delta?.effects ?? [],
                  readAdventureBaseSource(record.actors ?? [], token.actorId)?.effects ?? [],
               ),
               items: token.delta?.items ?? [],
               location: 'adventureSceneToken',
               name: `${pack.metadata.label}: ${record.name}: ${scene.name}: ${token.name}`,
               open: async () => {
                  /** @type {AdventureContent|null} The Adventure's scenes. */
                  const content = await scenes.load();

                  /** @type {object|undefined} The token's delta in the working copy. */
                  const delta = content?.entries.find((entry) => entry._id === scene._id)?.tokens
                     ?.find((entry) => entry._id === token._id)?.delta;
                  if (!delta) {
                     return null;
                  }
                  return createSourceTarget(
                     delta,
                     content,
                     () => readAdventureBaseSource(content.adventure._source.actors ?? [], token.actorId),
                  );
               },
               orphan: null,
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
 * packs. An orphaned token on a world scene or in a world Scene pack is yielded with no `open` (OrphanedToken). The
 * walk reads stored data only; a source's `open` does the loading and unlocking a write needs. A failure
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
