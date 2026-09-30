import error from '~/helpers/utility-functions/Error.js';
import log from '~/helpers/utility-functions/Log.js';

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
 * A stored actor opened for writing. The readers return the live stored data, so each step sees the steps before it.
 * @typedef {object} StoredActorTarget
 * @property {() => object[]} readItems - Reads the Item data the actor holds itself.
 * @property {() => object[]} readEffects - Reads the Active Effect data the actor holds itself, tombstones included.
 * @property {() => object[]} readHeldEffects - Reads the data of every Active Effect the actor has, an unlinked
 * token's inherited ones included.
 * @property {(data: object[]) => Promise<object[]>} createEffects - Creates Active Effects; resolves the created
 * effects' data (a creation a hook vetoed is absent).
 * @property {(updates: object[]) => Promise<object[]>} updateEffects - Updates Active Effects; resolves the updated
 * effects' data.
 * @property {(ids: string[]) => Promise<string[]>} deleteEffects - Deletes Active Effects; resolves the deleted ids.
 * @property {(ids: string[]) => Promise<string[]>} deleteItems - Deletes Items; resolves the ids no longer stored.
 */

/**
 * A world pack's write access during one walk.
 * @typedef {object} PackWriteAccess
 * @property {() => Promise<void>} unlock - Unlocks the pack when it is locked, before a write.
 * @property {() => Promise<void>} restore - Locks the pack again when this walk tried to unlock it; a failure is
 * reported, never thrown, so it cannot mask an error from the pack's writes.
 */

/**
 * A packed Adventure's content during one walk: the Adventure, and a working copy of one content field.
 * @typedef {object} AdventureContent
 * @property {Adventure} adventure - The packed Adventure document.
 * @property {object[]} entries - The working copy of its `actors` or `scenes` data, which each write persists whole.
 */

/**
 * Yields the stored actors in one projected record of a world pack.
 * @typedef {(pack: CompendiumCollection, record: object, access: PackWriteAccess) => Iterable<StoredActorSource>}
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
 * collection), so they are read whole.
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
 * @returns {PackWriteAccess} The unlock and restore calls of this walk over the pack.
 */
function createPackWriteAccess(pack) {
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
 * actor, whose embedded writes Foundry routes to the token's delta.
 * @param {TitanActor} actor - The document whose embedded Items and Active Effects are written.
 * @param {() => object} readSource - Reads the stored data the actor holds itself (`actor._source`, or an unlinked
 * token's `delta._source`).
 * @returns {StoredActorTarget} Readers of the stored data and writers through the document.
 */
function createDocumentTarget(actor, readSource) {
   return {
      createEffects: async (data) => (await actor.createEmbeddedDocuments('ActiveEffect', data))
         .map((effect) => effect.toObject()),
      deleteEffects: async (ids) => (await actor.deleteEmbeddedDocuments('ActiveEffect', ids))
         .map((effect) => effect.id),
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
      updateEffects: async (updates) => (await actor.updateEmbeddedDocuments('ActiveEffect', updates))
         .map((effect) => effect.toObject()),
   };
}

/**
 * Creates the write target of stored actor data that is not a document (an Adventure's actor, or the delta of an
 * Adventure scene's token): each write edits the data in place and then persists it.
 * @param {object} holder - The stored data holding `items` and `effects` (a working copy the persist call writes).
 * @param {() => Promise<void>} persist - Writes the working copy back to its document.
 * @returns {StoredActorTarget} Readers and writers of the working copy.
 */
function createSourceTarget(holder, persist) {
   holder.items ??= [];
   holder.effects ??= [];
   return {
      createEffects: async (data) => {
         /** @type {object[]} The created effects' data, each with a new id. */
         const created = data.map((entry) => ({
            ...structuredClone(entry),
            _id: foundry.utils.randomID(),
         }));
         holder.effects.push(...created);
         await persist();
         return created;
      },
      deleteEffects: async (ids) => {
         /** @type {string[]} The ids of the effects removed. */
         const deleted = holder.effects.filter((effect) => ids.includes(effect._id)).map((effect) => effect._id);
         holder.effects = holder.effects.filter((effect) => !ids.includes(effect._id));
         await persist();
         return deleted;
      },
      deleteItems: async (ids) => {
         /** @type {string[]} The ids of the Items removed. */
         const deleted = holder.items.filter((item) => ids.includes(item._id)).map((item) => item._id);
         holder.items = holder.items.filter((item) => !ids.includes(item._id));
         await persist();
         return deleted;
      },
      readEffects: () => holder.effects,
      readHeldEffects: () => holder.effects.filter((effect) => !effect._tombstone),
      readItems: () => holder.items,
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
         await persist();
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
 * Creates the loader of one packed Adventure's content for one walk: it loads the Adventure on the first write and
 * holds a working copy of one content field. An Adventure's actors and scenes are data, not embedded documents, so a
 * write persists the whole field through `Adventure#update`.
 * @param {CompendiumCollection} pack - The world Adventure pack holding the Adventure.
 * @param {string} id - The id of the Adventure within its pack.
 * @param {PackWriteAccess} access - The pack's write access.
 * @param {'actors'|'scenes'} field - The content field.
 * @returns {() => Promise<AdventureContent|null>} Loads the content; resolves null when the Adventure is gone.
 */
function createAdventureLoader(pack, id, access, field) {
   /** @type {AdventureContent|null} The loaded content, once loaded. */
   let content = null;
   return async () => {
      if (!content) {
         await access.unlock();

         /** @type {Adventure|null} The packed Adventure. */
         const adventure = await pack.getDocument(id);
         if (!adventure) {
            return null;
         }
         content = {
            adventure,
            entries: structuredClone(adventure._source[field] ?? []),
         };
      }
      return content;
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
 * Walks the actors of one projected record of a world Adventure pack.
 * @param {CompendiumCollection} pack - The world pack the record was projected from.
 * @param {object} record - The projected Adventure.
 * @param {PackWriteAccess} access - The pack's write access.
 * @returns {Generator<StoredActorSource>} A generator over the Adventure's actors.
 * @yields {StoredActorSource} The next actor.
 */
function* walkAdventureActorRecord(pack, record, access) {
   /** @type {() => Promise<AdventureContent|null>} Loads the Adventure's actors. */
   const loadActors = createAdventureLoader(pack, record._id, access, 'actors');
   for (const actor of record.actors ?? []) {
      yield {
         effects: actor.effects ?? [],
         items: actor.items ?? [],
         location: 'adventureActor',
         name: `${pack.metadata.label}: ${record.name}: ${actor.name}`,
         open: async () => {
            /** @type {AdventureContent|null} The Adventure's actors. */
            const content = await loadActors();

            /** @type {object|undefined} The actor's working copy. */
            const source = content?.entries.find((entry) => entry._id === actor._id);
            return source
               ? createSourceTarget(source, () => content.adventure.update({ actors: content.entries }))
               : null;
         },
      };
   }
}

/**
 * Walks the unlinked scene tokens of one projected record of a world Adventure pack, from each token's stored delta.
 * @param {CompendiumCollection} pack - The world pack the record was projected from.
 * @param {object} record - The projected Adventure.
 * @param {PackWriteAccess} access - The pack's write access.
 * @returns {Generator<StoredActorSource>} A generator over the Adventure's unlinked scene tokens.
 * @yields {StoredActorSource} The next unlinked token.
 */
function* walkAdventureSceneRecord(pack, record, access) {
   /** @type {() => Promise<AdventureContent|null>} Loads the Adventure's scenes. */
   const loadScenes = createAdventureLoader(pack, record._id, access, 'scenes');
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
               const content = await loadScenes();

               /** @type {object|undefined} The token's delta in the working copy. */
               const delta = content?.entries.find((entry) => entry._id === scene._id)?.tokens
                  ?.find((entry) => entry._id === token._id)?.delta;
               return delta
                  ? createSourceTarget(delta, () => content.adventure.update({ scenes: content.entries }))
                  : null;
            },
         };
      }
   }
}

/**
 * Walks the world packs of one document type for one location. Each pack is read through its server projection; a
 * pack whose projection fails is reported and the walk goes on. A pack a source unlocked to write is locked again
 * once the walk leaves it, also when the consumer stops early.
 * @param {string} documentName - The packs' document type.
 * @param {string} location - The location walked, which names its projection fields.
 * @param {PackRecordWalker} walkRecord - Yields the stored actors in one record.
 * @returns {AsyncGenerator<StoredActorSource>} A generator over the location's stored actors.
 * @yields {StoredActorSource} The next stored actor.
 */
async function* walkWorldPacks(documentName, location, walkRecord) {
   for (const pack of game.packs) {
      if (pack.metadata.packageType !== 'world' || pack.metadata.type !== documentName) {
         continue;
      }

      /** @type {object[]} The pack's projected records. */
      let records;
      try {
         records = await readPackProjection(pack, PACK_PROJECTION_FIELDS[location]);
      }
      catch (err) {
         error(`Failed to read world pack "${pack.metadata.label}".`, err);
         continue;
      }

      /** @type {PackWriteAccess} The pack's write access for this walk. */
      const access = createPackWriteAccess(pack);
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
 * The walk of each location.
 * @type {Readonly<Record<string, () => (Iterable<StoredActorSource>|AsyncIterable<StoredActorSource>)>>}
 */
const LOCATION_WALKS = Object.freeze({
   actorPack: () => walkWorldPacks('Actor', 'actorPack', walkActorPackRecord),
   adventureActor: () => walkWorldPacks('Adventure', 'adventureActor', walkAdventureActorRecord),
   adventureSceneToken: () => walkWorldPacks('Adventure', 'adventureSceneToken', walkAdventureSceneRecord),
   sceneToken: walkSceneTokens,
   scenePackToken: () => walkWorldPacks('Scene', 'scenePackToken', walkScenePackRecord),
   worldActor: walkWorldActors,
});

/**
 * Walks every stored actor, in STORED_ACTOR_LOCATIONS order: world actors, unlinked tokens on world scenes, actors in
 * world Actor packs, unlinked tokens in world Scene packs, and the actors and unlinked scene tokens in world Adventure
 * packs. The walk reads stored data only; a source's `open` does the loading and unlocking a write needs.
 * @returns {AsyncGenerator<StoredActorSource>} A generator over every stored actor.
 * @yields {StoredActorSource} The next stored actor.
 */
export async function* walkStoredActorSources() {
   for (const location of STORED_ACTOR_LOCATIONS) {
      yield* LOCATION_WALKS[location]();
   }
}
