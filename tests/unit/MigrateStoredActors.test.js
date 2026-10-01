import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** @type {{failures: object[], sources: object[], walked: string[]}} The walk's failures, sources, and record. */
const walk = vi.hoisted(() => ({
   failures: [],
   sources: [],
   walked: [],
}));

vi.mock('~/helpers/migration/StoredActorSources.js', () => ({
   /**
    * Records the test's walk failures, then yields the test's sources, recording each one walked.
    * @param {object[]} [failures] - Receives the walk's failures.
    * @returns {AsyncGenerator<object>} A generator over the sources.
    * @yields {object} The next source.
    */
   async* walkStoredActorSources(failures = []) {
      failures.push(...walk.failures);
      for (const source of walk.sources) {
         walk.walked.push(source.name);
         yield source;
      }
   },
}));
vi.mock('~/helpers/utility-functions/Log.js', () => ({ default: vi.fn() }));

import { getConditionEffectUpdate } from '~/helpers/migration/SyncConditionEffects.js';
import {
   migrateStoredActors,
   storedActorNeedsMigration,
   storedActorsNeedMigration,
} from '~/helpers/migration/MigrateStoredActors.js';

/** @type {object} A Blinded condition effect storing no rules elements: stale against its definition. */
const STALE_BLINDED = {
   _id: 'blinded0',
   flags: {},
   statuses: ['blinded'],
   system: {
      rulesElement: [],
   },
   type: 'condition',
};

/** @type {object} A legacy effect Item. */
const LEGACY_ITEM = {
   _id: 'legacy0',
   img: 'icons/legacy.webp',
   name: 'Legacy Effect',
   system: {
      active: true,
      check: [],
      customTrait: [],
      description: '',
      duration: {
         custom: '',
         initiative: 0,
         remaining: 1,
         type: 'turnStart',
      },
      rulesElement: [],
   },
   type: 'effect',
};

/** @type {object} A conversion of the legacy Item, with the Item's id, as a token inherits it from its base actor. */
const INHERITED_CONVERSION = {
   _id: 'legacy0',
   flags: {
      titan: {
         convertedFromItem: 'legacy0',
      },
   },
   type: 'effect',
};

/** @type {object} A tombstone of the legacy Item in a token's delta: the token removed the inherited Item. */
const REMOVED_ITEM = {
   _id: 'legacy0',
   _tombstone: true,
};

/**
 * Builds a write target whose writes are spies that change its stored data as a stored write does: a creation stores
 * the effects with their ids, an effect deletion hides an inherited effect behind a tombstone, an Item deletion
 * removes the Items, and an update applies its rules elements and description deletion. A target given `updated`
 * resolves that from every update and stores nothing, as a write a hook vetoed; one given `vetoHide` hides nothing.
 * @param {object} [data] - The target's contents.
 * @param {object[]} [data.effects] - The effect data it holds.
 * @param {object[]} [data.inheritedEffects] - The effect data it inherits and does not override.
 * @param {object[]} [data.items] - The Item data it holds.
 * @param {object[]} [data.updated] - What its updates resolve when they store nothing.
 * @param {boolean} [data.vetoHide] - Whether its effect deletions store nothing.
 * @returns {object} A stored-actor target with spied writes.
 */
function makeTarget({ effects = [], inheritedEffects = [], items = [], updated, vetoHide = false } = {}) {
   /** @type {{effects: object[], inherited: object[], items: object[]}} The target's stored data. */
   const held = {
      effects: structuredClone(effects),
      inherited: structuredClone(inheritedEffects),
      items: structuredClone(items),
   };
   return {
      createEffects: vi.fn(async (data) => {
         /** @type {object[]} The created effects' data, each keeping the id its data gives. */
         const created = data.map((entry) => structuredClone(entry));
         held.effects.push(...created);
         return created;
      }),
      deleteEffects: vi.fn(async (ids) => {
         if (vetoHide) {
            return [];
         }
         held.inherited = held.inherited.filter((effect) => !ids.includes(effect._id));
         held.effects.push(...ids.map((id) => ({
            _id: id,
            _tombstone: true,
         })));
         return ids;
      }),
      deleteItems: vi.fn(async (ids) => {
         held.items = held.items.filter((item) => !ids.includes(item._id));
         return ids;
      }),
      readEffects: () => held.effects,
      readInheritedEffects: () => held.inherited,
      readItems: () => held.items,
      stored: vi.fn(async () => {}),
      updateEffects: vi.fn(async (updates) => {
         if (updated) {
            return updated;
         }
         for (const update of updates) {
            /** @type {object} The effect the update names. */
            const effect = held.effects.find((entry) => entry._id === update._id);
            if ('system.rulesElement' in update) {
               effect.system.rulesElement = structuredClone(update['system.rulesElement']);
            }
            if ('flags.titan.description' in update) {
               delete effect.flags.titan.description;
            }
         }
         return updates;
      }),
   };
}

/**
 * Builds a stored actor source whose `open` is a spy, or an orphaned token's source, which has no `open`.
 * @param {string} name - The name the walk records for the source.
 * @param {object} [data] - The source's contents.
 * @param {object[]} [data.effects] - Its stored effect data.
 * @param {object[]} [data.inheritedEffects] - The stored effect data it inherits and does not override.
 * @param {object[]} [data.items] - Its stored Item data.
 * @param {object|null} [data.orphan] - The orphaned token's names; null for any other stored actor.
 * @param {object|null} [data.target] - What opening it resolves.
 * @returns {object} A worldActor-location source with a spied `open`, or a sceneToken-location orphan.
 */
function makeSource(name, { effects = [], inheritedEffects = [], items = [], orphan = null, target = null } = {}) {
   return {
      effects,
      inheritedEffects,
      items,
      location: orphan ? 'sceneToken' : 'worldActor',
      name,
      open: orphan ? null : vi.fn(async () => target),
      orphan,
   };
}

/** @type {object} The names of an orphaned token on a world scene. */
const ORPHAN = {
   pack: null,
   scene: 'Orphan Scene',
   token: 'Orphan',
};

beforeEach(() => {
   walk.sources = [];
   walk.walked.length = 0;
   walk.failures = [];

   // Stand-in for foundry.utils.deepClone, used by buildEffectData to copy the migrated system fields.
   globalThis.foundry.utils.deepClone = (value) => structuredClone(value);
   globalThis.ui = {
      notifications: {
         error: vi.fn(),
      },
   };
   vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
   delete globalThis.foundry.utils.deepClone;
   delete globalThis.ui;
   vi.restoreAllMocks();
});

describe('storedActorNeedsMigration', () => {
   it.each([
      [
         'a stale condition effect',
         {
            effects: [STALE_BLINDED],
            items: [],
         },
         true,
      ],
      [
         'a legacy effect Item',
         {
            effects: [],
            items: [LEGACY_ITEM],
         },
         true,
      ],
      [
         'an inherited conversion of an Item its delta removed',
         {
            effects: [],
            inheritedEffects: [INHERITED_CONVERSION],
            items: [REMOVED_ITEM],
         },
         true,
      ],
      [
         'an inherited conversion of an Item it does not claim',
         {
            effects: [],
            inheritedEffects: [INHERITED_CONVERSION],
            items: [],
         },
         false,
      ],
      [
         'nothing stale',
         {
            effects: [],
            items: [],
         },
         false,
      ],
   ])('reports %s as %s', (label, source, expected) => {
      expect(storedActorNeedsMigration(source)).toBe(expected);
   });
});

describe('storedActorsNeedMigration', () => {
   it('walks every stored actor and reports nothing when none needs work', async () => {
      walk.sources = [
         makeSource('Clean A'),
         makeSource('Clean B'),
      ];
      expect(await storedActorsNeedMigration()).toBe(false);
      expect(walk.walked).toEqual([
         'Clean A',
         'Clean B',
      ]);
   });

   it('stops at the first stored actor needing work', async () => {
      walk.sources = [
         makeSource('Clean'),
         makeSource('Stale', { effects: [STALE_BLINDED] }),
         makeSource('Later'),
      ];
      expect(await storedActorsNeedMigration()).toBe(true);
      expect(walk.walked).toEqual([
         'Clean',
         'Stale',
      ]);
   });

   it('reports work when the walk could not read a pack, even with every readable actor clean', async () => {
      walk.failures = [
         {
            error: new Error('projection failed'),
            subject: 'pack "Actors"',
         },
      ];
      walk.sources = [makeSource('Clean')];
      expect(await storedActorsNeedMigration()).toBe(true);
   });

   it('reports work for an orphaned token whose own data holds a stale condition, and none for a clean one',
      async () => {
         walk.sources = [makeSource('Orphan', { orphan: ORPHAN })];
         expect(await storedActorsNeedMigration()).toBe(false);
         walk.sources = [
            makeSource('Orphan', {
               effects: [STALE_BLINDED],
               orphan: ORPHAN,
            }),
         ];
         expect(await storedActorsNeedMigration()).toBe(true);
      });
});

describe('migrateStoredActors', () => {
   it('opens only the stored actors needing work, converting then syncing each, and counts them once stored',
      async () => {
         /** @type {object} The stale actor's target. */
         const target = makeTarget({
            effects: [STALE_BLINDED],
            items: [LEGACY_ITEM],
         });

         /** @type {object} A source needing no work. */
         const clean = makeSource('Clean');
         walk.sources = [
            clean,
            makeSource('Stale', {
               effects: [STALE_BLINDED],
               items: [LEGACY_ITEM],
               target,
            }),
         ];
         expect(await migrateStoredActors()).toEqual({
            failed: 0,
            skipped: 0,
            updated: 1,
         });
         expect(clean.open).not.toHaveBeenCalled();
         expect(target.deleteItems).toHaveBeenCalledWith(['legacy0']);
         expect(target.updateEffects).toHaveBeenCalledWith([getConditionEffectUpdate(STALE_BLINDED)]);
         expect(target.createEffects.mock.invocationCallOrder[0])
            .toBeLessThan(target.updateEffects.mock.invocationCallOrder[0]);
         expect(target.stored).toHaveBeenCalledTimes(1);
      });

   it('skips a stored actor with nothing left to write to, reporting no error', async () => {
      walk.sources = [makeSource('Gone', { effects: [STALE_BLINDED] })];
      expect(await migrateStoredActors()).toEqual({
         failed: 0,
         skipped: 1,
         updated: 0,
      });
      expect(ui.notifications.error).not.toHaveBeenCalled();
   });

   it('skips a stored actor that holds no work once opened', async () => {
      walk.sources = [
         makeSource('Changed Since The Scan', {
            effects: [STALE_BLINDED],
            target: makeTarget(),
         }),
      ];
      expect(await migrateStoredActors()).toEqual({
         failed: 0,
         skipped: 1,
         updated: 0,
      });
      expect(ui.notifications.error).not.toHaveBeenCalled();
   });

   it('counts a stored actor whose write a hook vetoed as failed: its work is left', async () => {
      walk.sources = [
         makeSource('Vetoed', {
            effects: [STALE_BLINDED],
            target: makeTarget({
               effects: [STALE_BLINDED],
               updated: [],
            }),
         }),
      ];
      expect(await migrateStoredActors()).toEqual({
         failed: 1,
         skipped: 0,
         updated: 0,
      });
      expect(ui.notifications.error).toHaveBeenCalledTimes(1);
      expect(ui.notifications.error.mock.calls[0][0]).toContain('"Vetoed"');
   });

   it('counts a stored actor whose writes were not stored as failed, not updated', async () => {
      /** @type {object} A target whose writes the database did not store. */
      const unstored = makeTarget({ effects: [STALE_BLINDED] });
      unstored.stored.mockRejectedValueOnce(new Error('not stored'));
      walk.sources = [
         makeSource('Unstored', {
            effects: [STALE_BLINDED],
            target: unstored,
         }),
      ];
      expect(await migrateStoredActors()).toEqual({
         failed: 1,
         skipped: 0,
         updated: 0,
      });
      expect(ui.notifications.error.mock.calls[0][0]).toContain('"Unstored"');
   });

   it('reads the stored outcome of every changed actor only once the walk is over', async () => {
      /** @type {number[]} How many sources the walk had yielded when each stored outcome was read. */
      const walkedAtRead = [];

      /** @type {object[]} Two stale actors' targets. */
      const targets = [
         makeTarget({ effects: [STALE_BLINDED] }),
         makeTarget({ effects: [STALE_BLINDED] }),
      ];
      for (const target of targets) {
         target.stored.mockImplementation(async () => {
            walkedAtRead.push(walk.walked.length);
         });
      }
      walk.sources = targets.map((target, index) => makeSource(`Stale ${index}`, {
         effects: [STALE_BLINDED],
         target,
      }));
      await migrateStoredActors();
      expect(walkedAtRead).toEqual([
         2,
         2,
      ]);
   });

   it('reports a failed actor\'s update and still syncs the rest', async () => {
      /** @type {object} A target whose update is refused. */
      const refused = makeTarget({ effects: [STALE_BLINDED] });
      refused.updateEffects.mockRejectedValueOnce(new Error('write refused'));

      /** @type {object} A healthy target after it. */
      const healthy = makeTarget({ effects: [STALE_BLINDED] });
      walk.sources = [
         makeSource('Refused', {
            effects: [STALE_BLINDED],
            target: refused,
         }),
         makeSource('Healthy', {
            effects: [STALE_BLINDED],
            target: healthy,
         }),
      ];
      expect(await migrateStoredActors()).toEqual({
         failed: 1,
         skipped: 0,
         updated: 1,
      });
      expect(ui.notifications.error).toHaveBeenCalledTimes(1);
      expect(ui.notifications.error.mock.calls[0][0]).toContain('Refused');
      expect(healthy.updateEffects).toHaveBeenCalledTimes(1);
   });

   it('adds each failure of the walk itself to the failed count', async () => {
      walk.failures = [
         {
            error: new Error('projection failed'),
            subject: 'pack "Actors"',
         },
         {
            error: new Error('re-lock failed'),
            subject: 'the lock of pack "Scenes"',
         },
      ];
      walk.sources = [makeSource('Clean')];
      expect(await migrateStoredActors()).toEqual({
         failed: 2,
         skipped: 0,
         updated: 0,
      });
   });

   it('counts an orphaned token with pending work as one failure, names its scene and pack, and opens nothing',
      async () => {
         /** @type {object} The source of a stale actor after the orphans, which still migrates. */
         const stale = makeSource('Stale', {
            effects: [STALE_BLINDED],
            target: makeTarget({ effects: [STALE_BLINDED] }),
         });
         walk.sources = [
            makeSource('Orphan', {
               effects: [STALE_BLINDED],
               orphan: ORPHAN,
            }),
            makeSource('Packed Orphan', {
               items: [LEGACY_ITEM],
               orphan: {
                  pack: 'Scenes',
                  scene: 'Packed Scene',
                  token: 'Packed Orphan',
               },
            }),
            makeSource('Clean Orphan', { orphan: ORPHAN }),
            stale,
         ];
         expect(await migrateStoredActors()).toEqual({
            failed: 2,
            skipped: 0,
            updated: 1,
         });
         expect(console.error.mock.calls.map(([message]) => message)).toEqual([
            'TITAN | Failed to migrate the unlinked token "Orphan" on scene "Orphan Scene": its base actor is gone, so '
               + 'the migration does not write to it. Delete the token.',
            'TITAN | Failed to migrate the unlinked token "Packed Orphan" on scene "Packed Scene" in pack "Scenes": '
               + 'its base actor is gone, so the migration does not write to it. Delete the token.',
         ]);
         expect(stale.open).toHaveBeenCalledTimes(1);
      });

   it('hides an inherited conversion of an Item a token removed, and counts the token updated', async () => {
      /** @type {object} The token's target. */
      const target = makeTarget({
         inheritedEffects: [INHERITED_CONVERSION],
         items: [REMOVED_ITEM],
      });
      walk.sources = [
         makeSource('Token', {
            inheritedEffects: [INHERITED_CONVERSION],
            items: [REMOVED_ITEM],
            target,
         }),
      ];
      expect(await migrateStoredActors()).toEqual({
         failed: 0,
         skipped: 0,
         updated: 1,
      });
      expect(target.deleteEffects).toHaveBeenCalledWith(['legacy0']);
   });

   it('counts a token whose inherited conversion stays shown as failed: its work is left', async () => {
      walk.sources = [
         makeSource('Vetoed Hide', {
            inheritedEffects: [INHERITED_CONVERSION],
            items: [REMOVED_ITEM],
            target: makeTarget({
               inheritedEffects: [INHERITED_CONVERSION],
               items: [REMOVED_ITEM],
               vetoHide: true,
            }),
         }),
      ];
      expect(await migrateStoredActors()).toEqual({
         failed: 1,
         skipped: 0,
         updated: 0,
      });
      expect(ui.notifications.error.mock.calls[0][0]).toContain('"Vetoed Hide"');
   });
});
