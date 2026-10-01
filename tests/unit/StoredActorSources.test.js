import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

vi.mock('~/helpers/utility-functions/Log.js', () => ({ default: vi.fn() }));

import log from '~/helpers/utility-functions/Log.js';
import {
   PACK_PROJECTION_FIELDS,
   STORED_ACTOR_LOCATIONS,
   walkStoredActorSources,
} from '~/helpers/migration/StoredActorSources.js';
import {
   migrateStoredActors,
   storedActorsNeedMigration,
} from '~/helpers/migration/MigrateStoredActors.js';

/**
 * Stands in for Foundry's `_del` (the client's global ForcedDeletion operator instance).
 * @type {object}
 */
const FORCED_DELETION = Object.freeze({ forcedDeletion: true });

/** @type {object} A stored condition effect, as a stored actor holds it. */
const EFFECT = {
   _id: 'effect0',
   flags: {},
   statuses: ['blinded'],
   system: {
      rulesElement: [],
   },
   type: 'condition',
};

/** @type {object} A stored legacy effect Item. */
const ITEM = {
   _id: 'item0',
   name: 'Legacy Effect',
   type: 'effect',
};

/** @type {string[]} Messages recorded by the ui.notifications.error stand-in. */
const uiErrors = [];

/**
 * A Foundry-like collection: a Map keyed by document id that iterates and maps its documents.
 * @extends {Map}
 */
class FakeCollection extends Map {
   /**
    * Builds the collection.
    * @param {object[]} [documents] - The documents, each with an `id`.
    */
   constructor(documents = []) {
      super(documents.map((document) => [
         document.id,
         document,
      ]));
   }

   /**
    * Iterates the documents.
    * @returns {Iterator<object>} The documents.
    */
   [Symbol.iterator]() {
      return this.values();
   }

   /**
    * Maps the documents.
    * @param {Function} transform - The mapping function.
    * @returns {Array} The mapped values.
    */
   map(transform) {
      return [...this.values()].map(transform);
   }
}

/**
 * Builds a fake actor document whose embedded writes are spies. Deleting an Item resolves no document, as deleting an
 * invalid (legacy) Item does in Foundry, while its stored data is removed.
 * @param {object} data - The fake's contents.
 * @param {string} data.id - The id the fake's `id` returns.
 * @param {string} data.name - The name the fake's `name` returns.
 * @param {object[]} [data.effects] - The stored Active Effect data; each becomes an effect document too.
 * @param {object[]} [data.items] - The stored Item data.
 * @returns {object} A fake with `_source`, an `effects` collection, and spied embedded writes.
 */
function makeFakeActor({ effects = [], id, items = [], name }) {
   /** @type {object} The fake actor, referenced by its own spies. */
   const actor = {
      _source: {
         effects: structuredClone(effects),
         items: structuredClone(items),
      },
      createEmbeddedDocuments: vi.fn(async (embeddedName, data) => data.map((entry, index) => ({
         toObject: () => ({
            ...entry,
            _id: `created${index}`,
         }),
      }))),
      deleteEmbeddedDocuments: vi.fn(async (embeddedName, ids) => {
         actor._source.items = actor._source.items.filter((entry) => !ids.includes(entry._id));
         return [];
      }),
      effects: new FakeCollection(effects.map((effect) => ({
         id: effect._id,
         toObject: () => structuredClone(effect),
      }))),
      id,
      name,
      updateEmbeddedDocuments: vi.fn(async (embeddedName, updates) => updates.map((update) => ({
         toObject: () => update,
      }))),
   };
   return actor;
}

/**
 * Builds a fake unlinked token whose `actor` reads are recorded (a read materializes a lazy synthetic actor).
 * @param {object} data - The fake's contents.
 * @param {string} data.id - The id the fake token's `id` returns.
 * @param {string} data.name - The name the fake token's `name` returns.
 * @param {boolean} [data.actorLink] - Whether the token is linked.
 * @param {object|null} data.baseActor - The base world actor.
 * @param {object} [data.delta] - The token's stored delta.
 * @param {object[]} [data.heldEffects] - The effect data its synthetic actor has, inherited ones included.
 * @returns {{actor: object, actorRead: Function, token: object}} The token, its actor, and the read spy.
 */
function makeFakeToken({ actorLink = false, baseActor, delta, heldEffects = [], id, name }) {
   /** @type {object} The token's synthetic actor. */
   const actor = makeFakeActor({
      effects: heldEffects,
      id: `${id}Actor`,
      name,
   });

   /** @type {Function} Records each read of `token.actor`. */
   const actorRead = vi.fn(() => actor);
   return {
      actor,
      actorRead,
      token: {
         _source: {
            delta,
         },
         actorLink,
         baseActor,
         delta: {
            _source: delta,
         },
         id,
         name,

         /**
          * The token's actor, read through the spy.
          * @returns {object|null} The fake synthetic actor.
          */
         get actor() {
            return actorRead();
         },
      },
   };
}

/**
 * Builds a fake world pack whose server projection returns the given records; its calls are recorded in order.
 * @param {object} data - The fake's contents.
 * @param {string} data.label - The pack label (its collection is `world.<label>`).
 * @param {string} data.type - The pack's document type.
 * @param {object[]} [data.records] - The projected records.
 * @param {object} [data.documents] - The documents `getDocument` resolves, by id.
 * @param {boolean} [data.locked] - The initial lock state.
 * @param {string} [data.packageType] - The owning package type.
 * @returns {object} The fake pack; `calls` lists its calls in order.
 */
function makeFakePack({ documents = {}, label, locked = true, packageType = 'world', records = [], type }) {
   /** @type {string[]} The pack's calls, in order. */
   const calls = [];

   /** @type {object} The pack's document class, whose database projection is a spy. */
   const documentClass = {
      database: {
         get: vi.fn(async (cls, operation) => {
            calls.push(`project ${operation.indexFields.join(',')}`);
            return structuredClone(records);
         }),
      },
   };

   /** @type {object} The fake pack, referenced by its own spies. */
   const pack = {
      calls,
      collection: `world.${label}`,
      configure: vi.fn(async ({ locked: nextLocked }) => {
         calls.push(`configure locked=${nextLocked}`);
         pack.locked = nextLocked;
      }),
      documentClass,
      getDocument: vi.fn(async (id) => {
         calls.push(`getDocument ${id}`);
         return documents[id] ?? null;
      }),
      locked,
      metadata: {
         label,
         packageType,
         type,
      },
   };
   return pack;
}

/**
 * The default actors of a fake Adventure: one actor holding a condition effect that is stale and stores a description.
 * @returns {object[]} The actors' data.
 */
function makeAdventureActors() {
   return [
      {
         _id: 'adventureActor',
         effects: [
            {
               ...structuredClone(EFFECT),
               _id: 'adventureEffect',
               flags: {
                  titan: {
                     description: 'stale stored text',
                  },
               },
            },
         ],
         items: [],
         name: 'Adventure Actor',
      },
   ];
}

/**
 * The default scenes of a fake Adventure: one scene with an unlinked token whose delta holds a stale condition effect,
 * and a linked token.
 * @returns {object[]} The scenes' data.
 */
function makeAdventureScenes() {
   return [
      {
         _id: 'adventureScene',
         name: 'Adventure Scene',
         tokens: [
            {
               _id: 'adventureToken',
               actorLink: false,
               delta: {
                  effects: [structuredClone(EFFECT)],
                  items: [],
               },
               name: 'Adventure Token',
            },
            {
               _id: 'adventureLinked',
               actorLink: true,
               name: 'Adventure Linked',
            },
         ],
      },
   ];
}

/**
 * Builds a fake packed Adventure whose updates are recorded as snapshots. An update resolves the Adventure, as core
 * resolves a stored write; a test makes one resolve undefined (not stored) or reject.
 * @param {object} [content] - The actors and scenes the Adventure stores inline.
 * @param {object[]} [content.actors] - Its actors' data (makeAdventureActors by default).
 * @param {object[]} [content.scenes] - Its scenes' data (makeAdventureScenes by default).
 * @returns {object} The fake Adventure; `updates` lists each update's data.
 */
function makeFakeAdventure({ actors = makeAdventureActors(), scenes = makeAdventureScenes() } = {}) {
   /** @type {object[]} Snapshots of each update's data. */
   const updates = [];

   /** @type {object} The fake Adventure, referenced by its own update spy. */
   const adventure = {
      _source: {
         _id: 'adventure0',
         actors,
         name: 'Adventure',
         scenes,
      },
      name: 'Adventure',
      update: vi.fn(async (data) => {
         updates.push(structuredClone(data));
         return adventure;
      }),
      updates,
   };
   return adventure;
}

/**
 * Builds a world holding one stored actor in every location, plus linked and orphaned tokens and a module pack the
 * walk must skip, and installs it as `game`.
 * @returns {object} The world's fakes.
 */
function makeWorld() {
   /** @type {object} A world actor holding a condition effect and a legacy Item. */
   const worldActor = makeFakeActor({
      effects: [EFFECT],
      id: 'actor0',
      items: [ITEM],
      name: 'World Actor',
   });

   /** @type {object} The unlinked world token. */
   const worldToken = makeFakeToken({
      baseActor: worldActor,
      delta: {
         effects: [EFFECT],
         items: [],
      },
      heldEffects: [EFFECT],
      id: 'worldToken',
      name: 'World Token',
   });

   /** @type {object} The document of the world Actor pack's one actor. */
   const packedActor = makeFakeActor({
      effects: [EFFECT],
      id: 'packedActor',
      name: 'Packed Actor',
   });

   /** @type {object} The unlinked token of the packed scene. */
   const packedToken = makeFakeToken({
      baseActor: worldActor,
      delta: {
         effects: [EFFECT],
         items: [],
      },
      id: 'packedToken',
      name: 'Packed Token',
   });

   /** @type {object} The packed Adventure. */
   const adventure = makeFakeAdventure();

   /** @type {Record<string, object>} The world's packs. */
   const packs = {
      actor: makeFakePack({
         documents: { packedActor },
         label: 'Actors',
         records: [
            {
               _id: 'packedActor',
               effects: [EFFECT],
               items: [],
               name: 'Packed Actor',
            },
         ],
         type: 'Actor',
      }),
      adventure: makeFakePack({
         documents: { adventure0: adventure },
         label: 'Adventures',
         records: [structuredClone(adventure._source)],
         type: 'Adventure',
      }),
      module: makeFakePack({
         label: 'Module Actors',
         packageType: 'module',
         records: [
            {
               _id: 'moduleActor',
               effects: [EFFECT],
               items: [],
               name: 'Module Actor',
            },
         ],
         type: 'Actor',
      }),
      scene: makeFakePack({
         documents: {
            packedScene: {
               tokens: new FakeCollection([packedToken.token]),
            },
         },
         label: 'Scenes',
         records: [
            {
               _id: 'packedScene',
               name: 'Packed Scene',
               tokens: [
                  {
                     _id: 'packedToken',
                     actorId: 'actor0',
                     actorLink: false,
                     delta: {
                        effects: [EFFECT],
                        items: [],
                     },
                     name: 'Packed Token',
                  },
                  {
                     _id: 'packedLinked',
                     actorId: 'actor0',
                     actorLink: true,
                     name: 'Packed Linked',
                  },
                  {
                     _id: 'packedOrphan',
                     actorId: 'goneActor',
                     actorLink: false,
                     delta: {
                        effects: [EFFECT],
                        items: [],
                     },
                     name: 'Packed Orphan',
                  },
               ],
            },
         ],
         type: 'Scene',
      }),
   };
   globalThis.game = {
      actors: new FakeCollection([worldActor]),
      packs: [
         packs.module,
         packs.actor,
         packs.scene,
         packs.adventure,
      ],
      scenes: [
         {
            tokens: [
               worldToken.token,
               makeFakeToken({
                  actorLink: true,
                  baseActor: worldActor,
                  delta: {
                     effects: [EFFECT],
                     items: [],
                  },
                  id: 'linkedToken',
                  name: 'Linked Token',
               }).token,
               makeFakeToken({
                  baseActor: null,
                  delta: {
                     effects: [EFFECT],
                     items: [],
                  },
                  id: 'orphanToken',
                  name: 'Orphan Token',
               }).token,
            ],
         },
      ],
      user: { id: 'gm0' },
   };
   return {
      adventure,
      packedActor,
      packedToken,
      packs,
      worldActor,
      worldToken,
   };
}

/**
 * Installs a world whose only stored actors are in one locked world Adventure pack.
 * @param {object} adventure - The fake Adventure.
 * @returns {object} The fake Adventure pack.
 */
function installAdventureWorld(adventure) {
   /** @type {object} The world Adventure pack holding the Adventure. */
   const pack = makeFakePack({
      documents: {
         [adventure._source._id]: adventure,
      },
      label: 'Adventures',
      records: [structuredClone(adventure._source)],
      type: 'Adventure',
   });
   globalThis.game = {
      actors: new FakeCollection(),
      packs: [pack],
      scenes: [],
      user: { id: 'gm0' },
   };
   return pack;
}

/**
 * Walks every stored actor, opening each source the predicate picks and running the given writes on its target while
 * the walk is on its pack.
 * @param {(source: object) => boolean} [pick] - Picks the sources to open.
 * @param {(target: object|null, source: object) => Promise<void>} [write] - Writes to an opened target.
 * @returns {Promise<object[]>} The walked sources; an opened one carries its `target`.
 */
async function walkAll(pick = () => false, write = async () => {}) {
   /** @type {object[]} The walked sources. */
   const sources = [];
   for await (const source of walkStoredActorSources()) {
      sources.push(source);
      if (pick(source)) {
         source.target = await source.open();
         await write(source.target, source);
      }
   }
   return sources;
}

beforeAll(() => {
   globalThis._del = FORCED_DELETION;
});

afterAll(() => {
   delete globalThis._del;
});

beforeEach(() => {
   globalThis.ui = {
      notifications: {
         error: (message) => {
            uiErrors.push(message);
         },
      },
   };
   // Stand-in for the Active Effect document class: builds a created effect's data, marked so a test sees it was built.
   globalThis.CONFIG = {
      ActiveEffect: {
         documentClass: {
            buildCreationSource: vi.fn((data) => ({
               ...structuredClone(data),
               built: true,
            })),
         },
      },
   };
   vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
   uiErrors.length = 0;
   delete globalThis.ui;
   delete globalThis.CONFIG;
   delete globalThis.game;
   vi.restoreAllMocks();
   vi.clearAllMocks();
});

describe('walkStoredActorSources', () => {
   it('lists every location a stored actor lives in, in walk order', () => {
      expect(STORED_ACTOR_LOCATIONS).toEqual([
         'worldActor',
         'sceneToken',
         'actorPack',
         'scenePackToken',
         'adventureActor',
         'adventureSceneToken',
      ]);
   });

   it('walks one stored actor per location in that order, skipping linked and orphaned tokens and module packs',
      async () => {
         makeWorld();

         /** @type {object[]} The walked sources. */
         const sources = await walkAll();
         expect(sources.map((source) => source.location)).toEqual(STORED_ACTOR_LOCATIONS);
         expect(sources.map((source) => source.name)).toEqual([
            'World Actor',
            'World Token',
            'Actors: Packed Actor',
            'Scenes: Packed Scene: Packed Token',
            'Adventures: Adventure: Adventure Actor',
            'Adventures: Adventure: Adventure Scene: Adventure Token',
         ]);
      });

   it('skips an unlinked token whose base actor is gone, on a world scene and in a Scene pack', async () => {
      const { packs } = makeWorld();

      // Presence first: the world holds an orphaned token on its scene and one in its Scene pack.
      expect(game.scenes[0].tokens.some((token) => token.name === 'Orphan Token' && !token.baseActor)).toBe(true);
      expect((await packs.scene.documentClass.database.get(packs.scene.documentClass, {
         indexFields: [],
      }))[0].tokens.some((token) => token.name === 'Packed Orphan' && !game.actors.has(token.actorId))).toBe(true);

      /** @type {string[]} The walked sources' names. */
      const names = (await walkAll()).map((source) => source.name);
      expect(names).not.toContain('Orphan Token');
      expect(names).not.toContain('Scenes: Packed Scene: Packed Orphan');
   });

   it('walks an Adventure scene token whose actor id names no actor, and writes it as data', async () => {
      /** @type {object} An Adventure whose scene token's actor id names no actor, in the Adventure or the world. */
      const adventure = makeFakeAdventure({
         scenes: [
            {
               _id: 'adventureScene',
               name: 'Adventure Scene',
               tokens: [
                  {
                     _id: 'orphanToken',
                     actorId: 'goneActor',
                     actorLink: false,
                     delta: {
                        effects: [structuredClone(EFFECT)],
                        items: [],
                     },
                     name: 'Orphan Token',
                  },
               ],
            },
         ],
      });
      installAdventureWorld(adventure);

      /** @type {object[]} The walked sources. */
      const sources = await walkAll((source) => source.location === 'adventureSceneToken', async (target) => {
         expect(await target.updateEffects([
            {
               _id: 'effect0',
               'system.rulesElement': [{ operation: 'flatModifier' }],
            },
         ])).toHaveLength(1);
      });
      expect(sources.filter((source) => source.location === 'adventureSceneToken').map((source) => source.name))
         .toEqual(['Adventures: Adventure: Adventure Scene: Orphan Token']);
      expect(adventure.updates[0].scenes[0].tokens[0].delta.effects[0].system.rulesElement)
         .toEqual([{ operation: 'flatModifier' }]);
   });

   it('reads stored data only: each pack through its server projection, a token through its stored delta',
      async () => {
         const { packs, worldToken } = makeWorld();

         /** @type {object[]} The walked sources. */
         const sources = await walkAll();
         expect(sources[1].effects).toBe(worldToken.token._source.delta.effects);
         expect(worldToken.actorRead).not.toHaveBeenCalled();
         expect(packs.actor.calls).toEqual([`project ${PACK_PROJECTION_FIELDS.actorPack.join(',')}`]);
         expect(packs.scene.calls).toEqual([`project ${PACK_PROJECTION_FIELDS.scenePackToken.join(',')}`]);
         expect(packs.adventure.calls).toEqual([
            `project ${PACK_PROJECTION_FIELDS.adventureActor.join(',')}`,
            `project ${PACK_PROJECTION_FIELDS.adventureSceneToken.join(',')}`,
         ]);
         expect(packs.module.calls).toEqual([]);
         expect(packs.actor.documentClass.database.get).toHaveBeenCalledWith(packs.actor.documentClass, {
            index: true,
            indexFields: PACK_PROJECTION_FIELDS.actorPack,
            pack: 'world.Actors',
            query: {},
         }, game.user);
      });

   it('unlocks a locked pack to open an entry and restores the lock once the walk leaves the pack', async () => {
      const { packs } = makeWorld();
      await walkAll((source) => source.location === 'actorPack');
      expect(packs.actor.calls).toEqual([
         `project ${PACK_PROJECTION_FIELDS.actorPack.join(',')}`,
         'configure locked=false',
         'getDocument packedActor',
         'configure locked=true',
      ]);
      expect(log).toHaveBeenCalledWith('Unlocked world pack "Actors" to migrate it.');
   });

   it('never touches the lock of a pack that is not locked', async () => {
      const { packs } = makeWorld();
      packs.actor.locked = false;
      await walkAll((source) => source.location === 'actorPack');
      expect(packs.actor.calls).toEqual([
         `project ${PACK_PROJECTION_FIELDS.actorPack.join(',')}`,
         'getDocument packedActor',
      ]);
   });

   it('restores the lock after a failed unlock', async () => {
      const { packs } = makeWorld();
      packs.actor.configure.mockImplementationOnce(async () => {
         packs.actor.calls.push('configure locked=false');
         throw new Error('unlock failed');
      });

      /** @type {Error|undefined} The error opening the packed entry raised. */
      let openError;
      for await (const source of walkStoredActorSources()) {
         if (source.location === 'actorPack') {
            openError = await source.open().catch((err) => err);
         }
      }
      expect(openError?.message).toBe('unlock failed');
      expect(packs.actor.calls).toEqual([
         `project ${PACK_PROJECTION_FIELDS.actorPack.join(',')}`,
         'configure locked=false',
         'configure locked=true',
      ]);
   });

   it('reports and records a failed lock restore without throwing', async () => {
      const { packs } = makeWorld();
      packs.actor.configure.mockImplementation(async ({ locked }) => {
         if (locked) {
            throw new Error('re-lock failed');
         }
         packs.actor.locked = locked;
      });

      /** @type {object[]} The walk's failures. */
      const failures = [];
      for await (const source of walkStoredActorSources(failures)) {
         if (source.location === 'actorPack') {
            await source.open();
         }
      }
      expect(uiErrors.some((message) => message.includes('Failed to restore the lock on pack "Actors"'))).toBe(true);
      expect(failures).toEqual([
         {
            error: new Error('re-lock failed'),
            subject: 'the lock of pack "Actors"',
         },
      ]);
   });

   it('reports and records a pack whose projection fails, and walks on', async () => {
      const { packs } = makeWorld();
      packs.actor.documentClass.database.get.mockRejectedValueOnce(new Error('projection failed'));

      /** @type {object[]} The walk's failures. */
      const failures = [];

      /** @type {string[]} The walked locations. */
      const locations = [];
      for await (const source of walkStoredActorSources(failures)) {
         locations.push(source.location);
      }
      expect(locations).toEqual(STORED_ACTOR_LOCATIONS.filter((location) => location !== 'actorPack'));
      expect(uiErrors.some((message) => message.includes('Failed to read world pack "Actors"'))).toBe(true);
      expect(failures).toEqual([
         {
            error: new Error('projection failed'),
            subject: 'pack "Actors"',
         },
      ]);
   });

   it('reads an unreadable Adventure pack once per walk and records it as one failure', async () => {
      /** @type {object} The world Adventure pack, whose projection fails. */
      const pack = installAdventureWorld(makeFakeAdventure());
      pack.documentClass.database.get.mockRejectedValue(new Error('projection failed'));

      /** @type {object[]} The walk's failures. */
      const failures = [];

      /** @type {string[]} The walked sources' names. */
      const names = [];
      for await (const source of walkStoredActorSources(failures)) {
         names.push(source.name);
      }
      expect(names).toEqual([]);
      expect(pack.documentClass.database.get).toHaveBeenCalledTimes(1);
      expect(failures).toEqual([
         {
            error: new Error('projection failed'),
            subject: 'pack "Adventures"',
         },
      ]);
   });

   it('restores a pack\'s lock when the consumer stops early', async () => {
      const { packs } = makeWorld();
      for await (const source of walkStoredActorSources()) {
         if (source.location === 'actorPack') {
            await source.open();
            break;
         }
      }
      expect(packs.actor.calls.at(-1)).toBe('configure locked=true');
   });

   it('resolves no target for a pack entry or a token actor gone since the scan', async () => {
      const { packs, worldToken } = makeWorld();
      packs.actor.getDocument.mockResolvedValueOnce(null);
      worldToken.actorRead.mockReturnValueOnce(null);

      /** @type {object[]} The walked sources. */
      const sources = await walkAll((source) => [
         'actorPack',
         'sceneToken',
      ].includes(source.location));
      expect(sources.find((source) => source.location === 'actorPack').target).toBeNull();
      expect(sources.find((source) => source.location === 'sceneToken').target).toBeNull();
   });
});

describe('stored actor targets', () => {
   it('writes a world actor through its document and reads its stored data live', async () => {
      const { worldActor } = makeWorld();
      await walkAll((source) => source.location === 'worldActor', async (target) => {
         expect(target.readEffects()).toBe(worldActor._source.effects);
         expect(target.readItems()).toBe(worldActor._source.items);
         expect(target.readHeldEffects()).toEqual([EFFECT]);
         expect(await target.updateEffects([
            {
               _id: 'effect0',
               'system.rulesElement': [],
            },
         ])).toEqual([
            {
               _id: 'effect0',
               'system.rulesElement': [],
            },
         ]);
      });
      expect(worldActor.updateEmbeddedDocuments).toHaveBeenCalledTimes(1);
   });

   it('reads an invalid Item\'s deletion back from the stored items', async () => {
      const { worldActor } = makeWorld();
      await walkAll((source) => source.location === 'worldActor', async (target) => {
         expect(await target.deleteItems(['item0'])).toEqual(['item0']);
      });
      expect(worldActor._source.items).toEqual([]);
   });

   it('writes an unlinked token through its synthetic actor and reads the delta it holds itself', async () => {
      const { worldToken } = makeWorld();
      await walkAll((source) => source.location === 'sceneToken', async (target) => {
         expect(target.readEffects()).toBe(worldToken.token.delta._source.effects);
         expect(target.readHeldEffects()).toEqual([EFFECT]);
         await target.createEffects([{ name: 'Created' }]);
      });
      expect(worldToken.actorRead).toHaveBeenCalledTimes(1);
      expect(worldToken.actor.createEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [{ name: 'Created' }]);
   });
});

describe('Adventure writes', () => {
   it('edits an Adventure actor\'s working copy and stores the actors in one write once the walk leaves the Adventure',
      async () => {
         const { adventure } = makeWorld();

         /** @type {Function} The shared setup's id generator, restored after this test. */
         const originalRandomID = globalThis.foundry.utils.randomID;
         globalThis.foundry.utils.randomID = () => 'newEffect';
         onTestFinished(() => {
            globalThis.foundry.utils.randomID = originalRandomID;
         });

         /** @type {object[]} The walked sources. */
         const sources = await walkAll((source) => source.location === 'adventureActor', async (target) => {
            expect(await target.createEffects([{ name: 'Created' }])).toEqual([
               {
                  _id: 'newEffect',
                  built: true,
                  name: 'Created',
               },
            ]);
            expect(await target.updateEffects([
               {
                  _id: 'adventureEffect',
                  'flags.titan.description': FORCED_DELETION,
                  'system.rulesElement': [{ operation: 'flatModifier' }],
               },
            ])).toHaveLength(1);

            // Nothing is written while the walk is on the Adventure.
            expect(adventure.updates).toEqual([]);
         });
         expect(adventure.updates.map((data) => Object.keys(data))).toEqual([['actors']]);
         expect(adventure.updates[0].actors[0].effects).toEqual([
            {
               ...EFFECT,
               _id: 'adventureEffect',
               flags: {
                  titan: {},
               },
               system: {
                  rulesElement: [{ operation: 'flatModifier' }],
               },
            },
            {
               _id: 'newEffect',
               built: true,
               name: 'Created',
            },
         ]);
         await expect(sources.find((source) => source.location === 'adventureActor').target.stored())
            .resolves.toBeUndefined();
      });

   it('builds each effect an Adventure target creates through the Active Effect class, with a new id', async () => {
      const { adventure } = makeWorld();

      /** @type {Function} The shared setup's id generator, restored after this test. */
      const originalRandomID = globalThis.foundry.utils.randomID;
      globalThis.foundry.utils.randomID = () => 'newEffect';
      onTestFinished(() => {
         globalThis.foundry.utils.randomID = originalRandomID;
      });
      await walkAll((source) => source.location === 'adventureActor', async (target) => {
         await target.createEffects([
            {
               name: 'Expired',
               type: 'effect',
            },
         ]);
      });
      expect(CONFIG.ActiveEffect.documentClass.buildCreationSource).toHaveBeenCalledWith({
         _id: 'newEffect',
         name: 'Expired',
         type: 'effect',
      });
      expect(adventure.updates[0].actors[0].effects.at(-1)).toEqual({
         _id: 'newEffect',
         built: true,
         name: 'Expired',
         type: 'effect',
      });
   });

   it('edits an Adventure scene token\'s delta and stores the scenes in one write', async () => {
      const { adventure } = makeWorld();
      await walkAll((source) => source.location === 'adventureSceneToken', async (target) => {
         expect(target.readEffects()).toEqual([EFFECT]);
         expect(await target.updateEffects([
            {
               _id: 'effect0',
               'system.rulesElement': [{ operation: 'flatModifier' }],
            },
         ])).toHaveLength(1);
      });
      expect(adventure.updates.map((data) => Object.keys(data))).toEqual([['scenes']]);
      expect(adventure.updates[0].scenes[0].tokens[0].delta.effects).toEqual([
         {
            ...EFFECT,
            system: {
               rulesElement: [{ operation: 'flatModifier' }],
            },
         },
      ]);
   });

   it('stores the conversion of every Adventure actor in one write that holds no legacy Item', async () => {
      /** @type {object} An Adventure whose two actors each hold a legacy effect Item. */
      const adventure = makeFakeAdventure({
         actors: [
            'first',
            'second',
         ].map((key) => ({
            _id: `${key}Actor`,
            effects: [],
            items: [
               {
                  ...ITEM,
                  _id: `${key}Item`,
               },
            ],
            name: `${key} Actor`,
         })),
      });
      installAdventureWorld(adventure);
      await walkAll((source) => source.location === 'adventureActor', async (target) => {
         /** @type {string} The id of the actor's legacy Item. */
         const itemId = target.readItems()[0]._id;
         await target.createEffects([
            {
               flags: {
                  titan: {
                     convertedFromItem: itemId,
                  },
               },
               name: 'Converted',
               type: 'effect',
            },
         ]);
         expect(await target.deleteItems([itemId])).toEqual([itemId]);
      });
      expect(adventure.updates).toHaveLength(1);
      expect(adventure.updates[0].actors.map((actor) => ({
         converted: actor.effects.map((effect) => effect.flags.titan.convertedFromItem),
         items: actor.items,
      }))).toEqual([
         {
            converted: ['firstItem'],
            items: [],
         },
         {
            converted: ['secondItem'],
            items: [],
         },
      ]);
   });

   it('removes a deleted Item from an Adventure token\'s delta without leaving a tombstone', async () => {
      /** @type {object} An Adventure whose scene token's delta holds a legacy effect Item. */
      const adventure = makeFakeAdventure({
         scenes: [
            {
               _id: 'adventureScene',
               name: 'Adventure Scene',
               tokens: [
                  {
                     _id: 'adventureToken',
                     actorLink: false,
                     delta: {
                        effects: [],
                        items: [structuredClone(ITEM)],
                     },
                     name: 'Adventure Token',
                  },
               ],
            },
         ],
      });
      installAdventureWorld(adventure);
      await walkAll((source) => source.location === 'adventureSceneToken', async (target) => {
         expect(await target.deleteItems(['item0'])).toEqual(['item0']);
      });
      expect(adventure.updates[0].scenes[0].tokens[0].delta.items).toEqual([]);
   });

   it('writes nothing for an Adventure whose opened targets changed nothing, and their writes count as stored',
      async () => {
         const { adventure } = makeWorld();

         /** @type {object[]} The walked sources. */
         const sources = await walkAll((source) => source.location === 'adventureActor', async (target) => {
            expect(await target.updateEffects([
               {
                  _id: 'missingEffect',
                  'system.rulesElement': [],
               },
            ])).toEqual([]);
            expect(await target.deleteItems(['missingItem'])).toEqual([]);
         });
         expect(adventure.update).not.toHaveBeenCalled();
         await expect(sources.find((source) => source.location === 'adventureActor').target.stored())
            .resolves.toBeUndefined();
      });

   it('rejects the stored outcome of an Adventure\'s targets when core stores no write', async () => {
      const { adventure } = makeWorld();
      adventure.update.mockResolvedValueOnce(undefined);

      /** @type {object[]} The walked sources. */
      const sources = await walkAll((source) => source.location === 'adventureActor', async (target) => {
         await target.createEffects([{ name: 'Created' }]);
      });
      await expect(sources.find((source) => source.location === 'adventureActor').target.stored())
         .rejects.toThrow('was not stored');
   });

   it('rejects the stored outcome with the error of an Adventure write that throws', async () => {
      const { adventure } = makeWorld();
      adventure.update.mockRejectedValueOnce(new Error('server refused'));

      /** @type {object[]} The walked sources. */
      const sources = await walkAll((source) => source.location === 'adventureActor', async (target) => {
         await target.createEffects([{ name: 'Created' }]);
      });
      await expect(sources.find((source) => source.location === 'adventureActor').target.stored())
         .rejects.toThrow('server refused');
   });

   it('names the Adventure actors still holding a legacy effect Item when the actors write is not stored', async () => {
      /** @type {object} An Adventure whose first actor holds a legacy effect Item and whose second is stale. */
      const adventure = makeFakeAdventure({
         actors: [
            {
               _id: 'holderActor',
               effects: [],
               items: [structuredClone(ITEM)],
               name: 'Legacy Holder',
            },
            {
               ...makeAdventureActors()[0],
               name: 'Clean Actor',
            },
         ],
      });
      adventure.update.mockResolvedValueOnce(undefined);
      installAdventureWorld(adventure);

      /** @type {object[]} The walked sources. */
      const sources = await walkAll((source) => source.name.endsWith('Clean Actor'), async (target) => {
         await target.updateEffects([
            {
               _id: 'adventureEffect',
               'system.rulesElement': [{ operation: 'flatModifier' }],
            },
         ]);
      });
      await expect(sources.find((source) => source.name.endsWith('Clean Actor')).target.stored()).rejects.toThrow(
         'The write of the actors of Adventure "Adventure" was not stored. Still holding a legacy effect Item: '
            + '"Legacy Holder".',
      );
   });

   it('names the Adventure scene tokens still holding a legacy effect Item when the scenes write throws', async () => {
      /** @type {Error} The error the Adventure write throws. */
      const refusal = new Error('server refused');

      /** @type {object} An Adventure whose scene token's delta holds a legacy effect Item and a stale condition. */
      const adventure = makeFakeAdventure({
         scenes: [
            {
               _id: 'adventureScene',
               name: 'Adventure Scene',
               tokens: [
                  {
                     _id: 'holderToken',
                     actorLink: false,
                     delta: {
                        effects: [structuredClone(EFFECT)],
                        items: [structuredClone(ITEM)],
                     },
                     name: 'Holder Token',
                  },
               ],
            },
         ],
      });
      adventure.update.mockRejectedValueOnce(refusal);
      installAdventureWorld(adventure);

      /** @type {object[]} The walked sources. */
      const sources = await walkAll((source) => source.location === 'adventureSceneToken', async (target) => {
         await target.updateEffects([
            {
               _id: 'effect0',
               'system.rulesElement': [{ operation: 'flatModifier' }],
            },
         ]);
      });

      /** @type {Error} The error the token's stored outcome rejects with. */
      const failure = await sources.find((source) => source.location === 'adventureSceneToken').target.stored()
         .catch((err) => err);
      expect(failure.message).toBe('The write of the scenes of Adventure "Adventure" failed (server refused). Still '
         + 'holding a legacy effect Item: "Adventure Scene: Holder Token".');
      expect(failure.cause).toBe(refusal);
   });

   it('starts the next walk from the stored Adventure, not from a working copy whose write was not stored',
      async () => {
         const { adventure } = makeWorld();
         adventure.update.mockResolvedValueOnce(undefined);
         await walkAll((source) => source.location === 'adventureActor', async (target) => {
            await target.createEffects([{ name: 'Unstored' }]);
         });
         await walkAll((source) => source.location === 'adventureActor', async (target) => {
            await target.updateEffects([
               {
                  _id: 'adventureEffect',
                  'system.rulesElement': [{ operation: 'flatModifier' }],
               },
            ]);
         });
         expect(adventure.update).toHaveBeenCalledTimes(2);
         expect(adventure.updates).toHaveLength(1);
         expect(adventure.updates[0].actors[0].effects.map((effect) => effect._id)).toEqual(['adventureEffect']);
      });
});

describe('the stored-actor pass over the walk', () => {
   it('counts every actor an Adventure write carried as updated once the write is stored', async () => {
      /** @type {object} An Adventure with a stale actor and a stale scene token. */
      const adventure = makeFakeAdventure();
      installAdventureWorld(adventure);
      expect(await migrateStoredActors()).toEqual({
         failed: 0,
         skipped: 0,
         updated: 2,
      });
      expect(adventure.updates.map((data) => Object.keys(data))).toEqual([
         ['actors'],
         ['scenes'],
      ]);
   });

   it('counts every actor an Adventure write carried as failed when core stores no write', async () => {
      /** @type {object} An Adventure whose every write core does not store. */
      const adventure = makeFakeAdventure();
      adventure.update.mockResolvedValue(undefined);
      installAdventureWorld(adventure);
      expect(await migrateStoredActors()).toEqual({
         failed: 2,
         skipped: 0,
         updated: 0,
      });
      expect(uiErrors.filter((message) => message.includes('Failed to migrate the stored actor'))).toEqual([
         'TITAN | Failed to migrate the stored actor "Adventures: Adventure: Adventure Actor".',
         'TITAN | Failed to migrate the stored actor "Adventures: Adventure: Adventure Scene: Adventure Token".',
      ]);
   });

   it('counts a world pack the walk cannot read as a failure, and the scan reports work for it', async () => {
      const { packs } = makeWorld();
      packs.actor.documentClass.database.get.mockRejectedValue(new Error('projection failed'));
      game.actors = new FakeCollection();
      game.packs = [packs.actor];
      game.scenes = [];
      expect(await storedActorsNeedMigration()).toBe(true);
      expect(await migrateStoredActors()).toEqual({
         failed: 1,
         skipped: 0,
         updated: 0,
      });
   });
});
