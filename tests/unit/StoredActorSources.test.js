import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

vi.mock('~/helpers/utility-functions/Log.js', () => ({ default: vi.fn() }));

import log from '~/helpers/utility-functions/Log.js';
import {
   PACK_PROJECTION_FIELDS,
   STORED_ACTOR_LOCATIONS,
   walkStoredActorSources,
} from '~/helpers/migration/StoredActorSources.js';

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
         /** @type {string} The stored collection the deletion removes from. */
         const collection = embeddedName === 'Item' ? 'items' : 'effects';
         actor._source[collection] = actor._source[collection].filter((entry) => !ids.includes(entry._id));
         return embeddedName === 'Item' ? [] : ids.map((effectId) => ({ id: effectId }));
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
 * Builds a fake packed Adventure whose updates are recorded as snapshots.
 * @returns {object} The fake Adventure; `updates` lists each update's data.
 */
function makeFakeAdventure() {
   /** @type {object[]} Snapshots of each update's data. */
   const updates = [];
   return {
      _source: {
         _id: 'adventure0',
         actors: [
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
         ],
         name: 'Adventure',
         scenes: [
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
         ],
      },
      update: vi.fn(async (data) => {
         updates.push(structuredClone(data));
      }),
      updates,
   };
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
   vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
   uiErrors.length = 0;
   delete globalThis.ui;
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

   it('reports a failed lock restore without throwing', async () => {
      const { packs } = makeWorld();
      packs.actor.configure.mockImplementation(async ({ locked }) => {
         if (locked) {
            throw new Error('re-lock failed');
         }
         packs.actor.locked = locked;
      });
      await walkAll((source) => source.location === 'actorPack');
      expect(uiErrors.some((message) => message.includes('Failed to restore the lock on pack "Actors"'))).toBe(true);
   });

   it('reports a pack whose projection fails and walks on', async () => {
      const { packs } = makeWorld();
      packs.actor.documentClass.database.get.mockRejectedValueOnce(new Error('projection failed'));

      /** @type {object[]} The walked sources. */
      const sources = await walkAll();
      expect(sources.map((source) => source.location))
         .toEqual(STORED_ACTOR_LOCATIONS.filter((location) => location !== 'actorPack'));
      expect(uiErrors.some((message) => message.includes('Failed to read world pack "Actors"'))).toBe(true);
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
         expect(await target.deleteEffects(['effect0'])).toEqual(['effect0']);
      });
      expect(worldActor.updateEmbeddedDocuments).toHaveBeenCalledTimes(1);
      expect(worldActor.deleteEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', ['effect0']);
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

   it('edits an Adventure actor\'s data and persists the Adventure\'s actors whole after each write', async () => {
      const { adventure } = makeWorld();

      /** @type {Function} The shared setup's id generator, restored after this test. */
      const originalRandomID = globalThis.foundry.utils.randomID;
      globalThis.foundry.utils.randomID = () => 'newEffect';
      onTestFinished(() => {
         globalThis.foundry.utils.randomID = originalRandomID;
      });
      await walkAll((source) => source.location === 'adventureActor', async (target) => {
         expect(await target.createEffects([{ name: 'Created' }])).toEqual([
            {
               _id: 'newEffect',
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
         expect(await target.deleteEffects(['newEffect'])).toEqual(['newEffect']);
      });
      expect(adventure.updates.map((data) => Object.keys(data))).toEqual([
         ['actors'],
         ['actors'],
         ['actors'],
      ]);
      expect(adventure.updates[0].actors[0].effects.map((effect) => effect._id)).toEqual([
         'adventureEffect',
         'newEffect',
      ]);
      expect(adventure.updates[2].actors[0].effects).toEqual([
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
      ]);
   });

   it('edits an Adventure scene token\'s delta and persists the Adventure\'s scenes whole', async () => {
      const { adventure } = makeWorld();
      await walkAll((source) => source.location === 'adventureSceneToken', async (target) => {
         expect(target.readEffects()).toEqual([EFFECT]);
         expect(await target.deleteEffects(['effect0'])).toEqual(['effect0']);
      });
      expect(adventure.updates).toHaveLength(1);
      expect(adventure.updates[0].scenes[0].tokens[0].delta.effects).toEqual([]);
   });
});
