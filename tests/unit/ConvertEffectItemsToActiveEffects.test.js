import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import convertEffectItemsToActiveEffects, {
   buildEffectData,
   convertActor,
   convertPack,
   convertWorldActorPacks,
} from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';

// The converter module imports only log/error at module scope, so a static import is safe. The shared test setup
// (tests/setup.js) provides a minimal globalThis.foundry without utils.deepClone, and no ui global; this suite
// installs scoped stand-ins for both (deepClone backs buildEffectData's field copies; ui.notifications.error backs
// the error() helper exercised by the isolation tests) and removes them so later suites keep the shared minimal mock.

/** @type {string[]} - Messages recorded by the ui.notifications.error stand-in (reset after each test). */
const uiErrors = [];

beforeAll(() => {
   // Stand-in for foundry.utils.deepClone, used by buildEffectData to copy the four migrated system fields.
   globalThis.foundry.utils.deepClone = (value) => structuredClone(value);

   // Recording stand-in for the ui global, used by the error() helper on the isolation paths.
   globalThis.ui = {
      notifications: {
         error: (message) => {
            uiErrors.push(message);
         },
      },
   };
});

afterEach(() => {
   // Reset the recorded error messages so assertions never see another test's errors.
   uiErrors.length = 0;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.utils.deepClone;
   delete globalThis.ui;
});

/**
 * Builds a raw legacy effect-Item source entry (the shape of an actor._source.items element).
 * @param {object} [overrides] - Field overrides merged shallowly over the defaults.
 * @returns {object} The raw item source fixture.
 */
function makeLegacyItemSource(overrides = {}) {
   return {
      _id: 'legacyitem000001',
      name: 'Legacy Effect',
      type: 'effect',
      img: 'icons/legacy.webp',
      system: {
         description: '<p>Legacy.</p>',
         active: true,
         duration: {
            type: 'turnStart',
            remaining: 2,
            initiative: 7,
            custom: '',
         },
         rulesElement: [
            {
               operation: 'flatModifier',
            },
         ],
         check: [],
         customTrait: [],
      },
      ...overrides,
   };
}

// Shared scaffolding for the convertActor and pack-path suites.
/**
 * Builds a fake actor exposing only what convertActor reads: raw _source.items, the effects array, and recording
 * embedded-CRUD stubs. The create stub mirrors the real createEmbeddedDocuments contract by resolving to the array
 * of created documents (pseudo-docs carrying each payload's type and flags), so stamp verification sees them.
 * @param {object} [options] - The fake's contents.
 * @param {object[]} [options.items] - Raw item source entries for _source.items.
 * @param {object[]} [options.effects] - Active Effect stand-ins for the actor.effects array.
 * @returns {object} The fake actor; its calls array records [method, embeddedName, payload] triples in order, and
 * its create stub resolves to pseudo-docs mirroring the actually-created documents.
 */
function makeFakeActor({ items = [], effects = [] } = {}) {
   /** @type {Array<[string, string, *]>} - Recorded embedded-CRUD calls as [method, embeddedName, payload]. */
   const calls = [];

   return {
      name: 'Fake Actor',
      id: 'fakeactor0000001',
      _source: {
         items,
      },
      effects,
      calls,
      createEmbeddedDocuments: async (embeddedName, data) => {
         calls.push(['create', embeddedName, data]);

         // Resolve to pseudo-docs, mirroring the real API's array of actually-created documents.
         return data.map((entry, index) => ({
            id: `createdfx${String(index).padStart(8, '0')}`,
            type: entry.type,
            flags: entry.flags,
         }));
      },
      deleteEmbeddedDocuments: async (embeddedName, ids) => {
         calls.push(['delete', embeddedName, ids]);
      },
   };
}

describe('buildEffectData (raw source contract)', () => {
   it('maps the core raw source fields onto effect AE creation data', () => {
      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(makeLegacyItemSource());

      expect(result.name).toBe('Legacy Effect');
      expect(result.img).toBe('icons/legacy.webp');
      expect(result.type).toBe('effect');
      expect(result.description).toBe('<p>Legacy.</p>');
      expect(result.disabled).toBe(false);
      expect(result.system).toEqual({
         rulesElement: [
            {
               operation: 'flatModifier',
            },
         ],
         duration: {
            type: 'turnStart',
            remaining: 2,
            initiative: 7,
            custom: '',
         },
         check: [],
         customTrait: [],
      });
   });

   it('starts disabled only for explicitly-deactivated permanent effects', () => {
      /** @type {object} - A permanent, explicitly-deactivated legacy item source. */
      const inactivePermanent = makeLegacyItemSource();
      inactivePermanent.system.duration.type = 'permanent';
      inactivePermanent.system.active = false;

      /** @type {object} - A permanent, active legacy item source. */
      const activePermanent = makeLegacyItemSource();
      activePermanent.system.duration.type = 'permanent';
      activePermanent.system.active = true;

      /** @type {object} - A non-permanent, deactivated legacy item source (still starts enabled). */
      const inactiveTimed = makeLegacyItemSource();
      inactiveTimed.system.active = false;

      expect(buildEffectData(inactivePermanent).disabled).toBe(true);
      expect(buildEffectData(activePermanent).disabled).toBe(false);
      expect(buildEffectData(inactiveTimed).disabled).toBe(false);
   });

   it('deep-clones the migrated system fields and defaults a missing description to an empty string', () => {
      /** @type {object} - A legacy item source without a description. */
      const source = makeLegacyItemSource();
      delete source.system.description;

      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(source);
      result.system.duration.remaining = 99;
      result.system.rulesElement.push({});

      expect(result.description).toBe('');
      expect(source.system.duration.remaining).toBe(2);
      expect(source.system.rulesElement).toHaveLength(1);
   });
});

describe('buildEffectData (raw active normalization + provenance)', () => {
   it('normalizes template-era string active values like BooleanField casting would', () => {
      /** @type {object} - A permanent legacy source whose active value is the template-era string 'false'. */
      const stringFalse = makeLegacyItemSource();
      stringFalse.system.duration.type = 'permanent';
      stringFalse.system.active = 'false';

      /** @type {object} - A permanent legacy source whose active value is the template-era string 'true'. */
      const stringTrue = makeLegacyItemSource();
      stringTrue.system.duration.type = 'permanent';
      stringTrue.system.active = 'true';

      expect(buildEffectData(stringFalse).disabled).toBe(true);
      expect(buildEffectData(stringTrue).disabled).toBe(false);
   });

   it('defaults a missing active key to the schema default (enabled)', () => {
      /** @type {object} - A permanent legacy source with no active key at all (sparse pre-schema source). */
      const sparse = makeLegacyItemSource();
      sparse.system.duration.type = 'permanent';
      delete sparse.system.active;

      expect(buildEffectData(sparse).disabled).toBe(false);
   });

   it('treats an explicit null active as the schema default (enabled)', () => {
      /** @type {object} - Permanent source, null active: BooleanField cleans null to initial true; ?? true matches. */
      const nullActive = makeLegacyItemSource();
      nullActive.system.duration.type = 'permanent';
      nullActive.system.active = null;

      expect(buildEffectData(nullActive).disabled).toBe(false);
   });

   it('casts a numeric zero active to false like BooleanField._cast', () => {
      /** @type {object} - Permanent source, numeric 0 active: Boolean(0) is false, matching BooleanField._cast. */
      const zeroActive = makeLegacyItemSource();
      zeroActive.system.duration.type = 'permanent';
      zeroActive.system.active = 0;

      expect(buildEffectData(zeroActive).disabled).toBe(true);
   });

   it('passes missing check/customTrait through as undefined (filled by schema initials at creation)', () => {
      /** @type {object} - A template-era source lacking the later-added check and customTrait fields. */
      const sparse = makeLegacyItemSource();
      delete sparse.system.check;
      delete sparse.system.customTrait;

      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(sparse);

      expect(result.system.check).toBeUndefined();
      expect(result.system.customTrait).toBeUndefined();
   });

   it('stamps the source item id as the convertedFromItem provenance flag', () => {
      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(makeLegacyItemSource());

      expect(result.flags).toEqual({
         titan: {
            convertedFromItem: 'legacyitem000001',
         },
      });
   });
});

describe('convertActor (raw _source discovery)', () => {
   it('converts only legacy effect entries: creates replacement AEs, then deletes source items by _id', async () => {
      /** @type {object} - A legacy effect item source expected to convert. */
      const legacy = makeLegacyItemSource();

      /** @type {object} - A registered-subtype item source expected to be ignored. */
      const weapon = makeLegacyItemSource({
         _id: 'weaponitem000001',
         type: 'weapon',
      });

      /** @type {object} - The fake actor carrying one legacy and one modern item. */
      const actor = makeFakeActor({
         items: [
            legacy,
            weapon,
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(legacy)]],
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('is a no-op when there are no legacy items and no stale mirrors', async () => {
      /** @type {object} - A fake actor with only modern content. */
      const actor = makeFakeActor({
         items: [
            makeLegacyItemSource({
               _id: 'weaponitem000001',
               type: 'weapon',
            }),
         ],
         effects: [
            {
               id: 'modernfx00000001',
               type: 'effect',
               flags: {},
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([]);
   });

   it('deletes stale mirror AEs last, after item conversion', async () => {
      /** @type {object} - A stale cosmetic mirror AE (base subtype, titan effect flag). */
      const mirror = {
         id: 'mirrorfx00000001',
         type: 'base',
         flags: {
            titan: {
               type: 'effect',
            },
         },
      };

      /** @type {object} - The fake actor carrying one legacy item and one stale mirror. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
         effects: [mirror],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(makeLegacyItemSource())]],
         ['delete', 'Item', ['legacyitem000001']],
         ['delete', 'ActiveEffect', ['mirrorfx00000001']],
      ]);
   });

   it('removes stale mirrors even when no legacy items remain', async () => {
      /** @type {object} - The fake actor carrying only a stale mirror. */
      const actor = makeFakeActor({
         effects: [
            {
               id: 'mirrorfx00000001',
               type: 'base',
               flags: {
                  titan: {
                     type: 'effect',
                  },
               },
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['delete', 'ActiveEffect', ['mirrorfx00000001']],
      ]);
   });

   it('skips creating a replacement whose source already has a converted AE, but still deletes the item', async () => {
      /** @type {object} - A surviving converted AE stamped with the legacy source id (interrupted prior run). */
      const survivor = {
         id: 'convertedfx00001',
         type: 'effect',
         flags: {
            titan: {
               convertedFromItem: 'legacyitem000001',
            },
         },
      };

      /** @type {object} - The fake actor stuck mid-conversion: replacement exists, legacy item still present. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
         effects: [survivor],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('creates only the not-yet-converted sources when some replacements already exist', async () => {
      /** @type {object} - A second legacy source with no surviving replacement. */
      const fresh = makeLegacyItemSource({
         _id: 'legacyitem000002',
         name: 'Second Legacy Effect',
      });

      /** @type {object} - The fake actor with one converted and one unconverted legacy item. */
      const actor = makeFakeActor({
         items: [
            makeLegacyItemSource(),
            fresh,
         ],
         effects: [
            {
               id: 'convertedfx00001',
               type: 'effect',
               flags: {
                  titan: {
                     convertedFromItem: 'legacyitem000001',
                  },
               },
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(fresh)]],
         ['delete', 'Item', ['legacyitem000001', 'legacyitem000002']],
      ]);
   });

   it('retains a legacy source when its creation is vetoed (no verified replacement)', async () => {
      /** @type {object} - The fake actor carrying one legacy source whose creation will be vetoed. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
      });

      // Override the create stub with one that records but returns no documents, simulating a wholesale veto.
      actor.createEmbeddedDocuments = async (embeddedName, data) => {
         actor.calls.push(['create', embeddedName, data]);
         return [];
      };

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(makeLegacyItemSource())]],
      ]);
   });

   it('deletes only the sources whose replacements were actually created (partial veto)', async () => {
      /** @type {object} - A second fresh legacy source alongside the default one. */
      const fresh = makeLegacyItemSource({
         _id: 'legacyitem000002',
         name: 'Second Legacy Effect',
      });

      /** @type {object} - The fake actor carrying two fresh legacy sources. */
      const actor = makeFakeActor({
         items: [
            makeLegacyItemSource(),
            fresh,
         ],
      });

      // Override the create stub with one that returns a pseudo-doc for ONLY the first payload entry, simulating a
      // third-party veto of the second creation while keeping the stamp flags intact for verification.
      actor.createEmbeddedDocuments = async (embeddedName, data) => {
         actor.calls.push(['create', embeddedName, data]);
         return data.slice(0, 1).map((entry, index) => ({
            id: `createdfx${String(index).padStart(8, '0')}`,
            type: entry.type,
            flags: entry.flags,
         }));
      };

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(makeLegacyItemSource()), buildEffectData(fresh)]],
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });
});

/**
 * Builds a fake compendium pack exposing only what the pack path reads: metadata, the locked flag, and recording
 * getIndex/configure/getDocument stubs.
 * @param {object} [options] - The fake's contents.
 * @param {object[]} [options.indexEntries] - Projected index entries returned by getIndex.
 * @param {boolean} [options.locked] - The initial lock state.
 * @param {object} [options.documents] - Map of id → fake actor (or Error instance to throw) for getDocument.
 * @param {string} [options.type] - The pack's document type metadata.
 * @param {string} [options.packageType] - The pack's owning package type metadata.
 * @returns {object} The fake pack; its calls array records [method, payload] pairs in order.
 */
function makeFakePack({
   indexEntries = [],
   locked = false,
   documents = {},
   type = 'Actor',
   packageType = 'world',
} = {}) {
   /** @type {Array<[string, *]>} - Recorded pack-API calls as [method, payload] pairs. */
   const calls = [];

   /** @type {object} - The fake pack under construction (self-referenced by configure). */
   const pack = {
      metadata: {
         type,
         packageType,
         label: 'Fake Pack',
      },
      locked,
      calls,
      getIndex: async ({ fields } = {}) => {
         calls.push(['getIndex', fields]);
         return indexEntries;
      },
      configure: async ({ locked: nextLocked }) => {
         calls.push(['configure', nextLocked]);
         pack.locked = nextLocked;
      },
      getDocument: async (id) => {
         calls.push(['getDocument', id]);

         /** @type {object|Error} - The configured result for this id. */
         const result = documents[id];
         if (result instanceof Error) {
            throw result;
         }
         return result;
      },
   };
   return pack;
}

/**
 * Builds a pack-index entry whose items array uses the REAL server projection: each embedded item is filtered to
 * the Item compendiumIndexFields plus _id ({ _id, name, img, type, sort, folder }) — never a system bag.
 * @param {string} id - The entry's _id.
 * @param {string[]} itemTypes - The type string of each projected embedded item.
 * @returns {object} The index-entry fixture.
 */
function makeIndexEntry(id, itemTypes) {
   return {
      _id: id,
      name: 'Packed Actor',
      items: itemTypes.map((itemType, index) => ({
         _id: `projecteditem${String(index).padStart(3, '0')}`,
         name: 'Projected Item',
         img: 'icons/projected.webp',
         type: itemType,
         sort: 0,
         folder: null,
      })),
   };
}

describe('convertPack (index gate + lock handling)', () => {
   it('leaves clean packs completely untouched (no configure, no document loads)', async () => {
      /** @type {object} - A locked pack whose only entry carries no legacy items. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('cleanactor000001', ['weapon'])],
         locked: true,
      });

      await convertPack(pack);

      expect(pack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
   });

   it('unlocks a locked needy pack, converts, and restores the lock in order', async () => {
      /** @type {object} - The packed fake actor carrying one legacy item. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
      });

      /** @type {object} - A locked pack with one needy entry. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: true,
         documents: {
            packedactor00001: actor,
         },
      });

      await convertPack(pack);

      expect(pack.calls).toEqual([
         ['getIndex', ['items']],
         ['configure', false],
         ['getDocument', 'packedactor00001'],
         ['configure', true],
      ]);
      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(makeLegacyItemSource())]],
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('never toggles the lock on an already-unlocked pack', async () => {
      /** @type {object} - An unlocked pack with one needy entry. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: false,
         documents: {
            packedactor00001: makeFakeActor({
               items: [makeLegacyItemSource()],
            }),
         },
      });

      await convertPack(pack);

      expect(pack.calls.filter(([method]) => method === 'configure')).toEqual([]);
   });

   it('isolates a per-actor failure and still converts the rest of the pack, restoring the lock', async () => {
      /** @type {object} - The healthy packed fake actor. */
      const survivor = makeFakeActor({
         items: [makeLegacyItemSource()],
      });

      /** @type {object} - A locked pack where the first entry's document load fails. */
      const pack = makeFakePack({
         indexEntries: [
            makeIndexEntry('brokenactor00001', ['effect']),
            makeIndexEntry('packedactor00001', ['effect']),
         ],
         locked: true,
         documents: {
            brokenactor00001: new Error('load failed'),
            packedactor00001: survivor,
         },
      });

      await convertPack(pack);

      expect(survivor.calls.length).toBe(2);
      expect(pack.calls.at(-1)).toEqual(['configure', true]);
   });

   it('restores the lock in the finally path when the unlock itself fails wholesale', async () => {
      /** @type {object} - A locked pack with one needy entry whose unlock call fails. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: true,
         documents: {
            packedactor00001: makeFakeActor({
               items: [makeLegacyItemSource()],
            }),
         },
      });

      // Replace configure with a stub that fails the unlock (a wholesale failure outside per-actor isolation)
      // while still recording and honoring the finally path's re-lock.
      pack.configure = async ({ locked: nextLocked }) => {
         pack.calls.push(['configure', nextLocked]);
         if (nextLocked === false) {
            throw new Error('unlock failed');
         }
         pack.locked = nextLocked;
      };

      await expect(convertPack(pack)).rejects.toThrow('unlock failed');

      expect(pack.calls.filter(([method]) => method === 'configure')).toEqual([
         ['configure', false],
         ['configure', true],
      ]);
   });

   it('logs a restore-specific error and resolves when only the re-lock fails', async () => {
      /** @type {object} - A locked pack with one needy entry whose re-lock call fails. */
      const pack = makeFakePack({
         indexEntries: [makeIndexEntry('packedactor00001', ['effect'])],
         locked: true,
         documents: {
            packedactor00001: makeFakeActor({
               items: [makeLegacyItemSource()],
            }),
         },
      });

      // Replace configure with a stub that succeeds on unlock but fails the finally path's re-lock.
      pack.configure = async ({ locked: nextLocked }) => {
         pack.calls.push(['configure', nextLocked]);
         if (nextLocked === true) {
            throw new Error('re-lock failed');
         }
         pack.locked = nextLocked;
      };

      // The restore failure is caught inside the finally: conversion still resolves (it succeeded).
      await convertPack(pack);

      expect(uiErrors.some((message) => message.includes('Failed to restore the lock'))).toBe(true);
   });
});

describe('default export (wiring: the pack scan is reachable from the boot path)', () => {
   afterEach(() => {
      // Remove the game stand-in so later suites keep the shared minimal mock.
      delete globalThis.game;
   });

   it('reaches the world Actor pack scan when run as the GM', async () => {
      /** @type {object} - An eligible world Actor pack that must receive the index scan. */
      const pack = makeFakePack({});

      globalThis.game = {
         user: {
            isGM: true,
         },
         actors: [],
         scenes: [],
         packs: [pack],
      };

      await convertEffectItemsToActiveEffects();

      expect(pack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
   });

   it('does nothing for non-GM users', async () => {
      /** @type {object} - A pack that must never be scanned by a non-GM client. */
      const pack = makeFakePack({});

      globalThis.game = {
         user: {
            isGM: false,
         },
         actors: [],
         scenes: [],
         packs: [pack],
      };

      await convertEffectItemsToActiveEffects();

      expect(pack.calls).toEqual([]);
   });
});

describe('convertWorldActorPacks (pack filtering + isolation)', () => {
   afterEach(() => {
      // Remove the game stand-in so later suites keep the shared minimal mock.
      delete globalThis.game;
   });

   it('processes only world-package Actor packs', async () => {
      /** @type {object} - An eligible world Actor pack. */
      const worldActorPack = makeFakePack({});

      /** @type {object} - A module-owned Actor pack (ineligible). */
      const moduleActorPack = makeFakePack({
         packageType: 'module',
      });

      /** @type {object} - A world Item pack (ineligible). */
      const worldItemPack = makeFakePack({
         type: 'Item',
      });

      globalThis.game = {
         packs: [
            worldActorPack,
            moduleActorPack,
            worldItemPack,
         ],
      };

      await convertWorldActorPacks();

      expect(worldActorPack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
      expect(moduleActorPack.calls).toEqual([]);
      expect(worldItemPack.calls).toEqual([]);
   });

   it('isolates a pack failure and still processes the remaining packs', async () => {
      /** @type {object} - A pack whose index read fails. */
      const brokenPack = makeFakePack({});
      brokenPack.getIndex = async () => {
         throw new Error('index read failed');
      };

      /** @type {object} - A healthy pack processed after the failure. */
      const healthyPack = makeFakePack({});

      globalThis.game = {
         packs: [
            brokenPack,
            healthyPack,
         ],
      };

      await convertWorldActorPacks();

      expect(healthyPack.calls).toEqual([
         ['getIndex', ['items']],
      ]);
   });
});
