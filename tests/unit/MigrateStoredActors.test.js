import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** @type {{sources: object[], walked: string[]}} The sources the mocked walker yields, and the names it walked. */
const walk = vi.hoisted(() => ({
   sources: [],
   walked: [],
}));

vi.mock('~/helpers/migration/StoredActorSources.js', () => ({
   /**
    * Yields the test's sources, recording each one walked.
    * @returns {AsyncGenerator<object>} A generator over the sources.
    * @yields {object} The next source.
    */
   async* walkStoredActorSources() {
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

/**
 * Builds a write target whose writes are spies that change its stored data as a stored write does: a creation stores
 * the effects, a deletion removes the Items, and an update applies its rules elements and description deletion. A
 * target given `updated` resolves that from every update and stores nothing, as a write a hook vetoed.
 * @param {object} [data] - The target's contents.
 * @param {object[]} [data.effects] - The effect data it holds.
 * @param {object[]} [data.items] - The Item data it holds.
 * @param {object[]} [data.updated] - What its updates resolve when they store nothing.
 * @returns {object} A stored-actor target with spied writes.
 */
function makeTarget({ effects = [], items = [], updated } = {}) {
   /** @type {{effects: object[], items: object[]}} The target's stored data. */
   const held = {
      effects: structuredClone(effects),
      items: structuredClone(items),
   };
   return {
      createEffects: vi.fn(async (data) => {
         /** @type {object[]} The created effects' data, each with an id. */
         const created = data.map((entry, index) => ({
            ...structuredClone(entry),
            _id: `created${index}`,
         }));
         held.effects.push(...created);
         return created;
      }),
      deleteItems: vi.fn(async (ids) => {
         held.items = held.items.filter((item) => !ids.includes(item._id));
         return ids;
      }),
      readEffects: () => held.effects,
      readHeldEffects: () => held.effects,
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
 * Builds a stored actor source whose `open` is a spy.
 * @param {string} name - The name the walk records for the source.
 * @param {object} [data] - The source's contents.
 * @param {object[]} [data.effects] - Its stored effect data.
 * @param {object[]} [data.items] - Its stored Item data.
 * @param {object|null} [data.target] - What opening it resolves.
 * @returns {object} A worldActor-location source with a spied `open`.
 */
function makeSource(name, { effects = [], items = [], target = null } = {}) {
   return {
      effects,
      items,
      location: 'worldActor',
      name,
      open: vi.fn(async () => target),
   };
}

beforeEach(() => {
   walk.sources = [];
   walk.walked.length = 0;

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
});
