import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** @type {object} The spies the module mocks share, and the player chain's (mocked) migration lists, level by level. */
const spies = vi.hoisted(() => ({
   actorMigrations: [],
   characterMigrations: [],
   migrateStoredActors: vi.fn(async () => ({
      failed: 0,
      skipped: 0,
      updated: 1,
   })),
   playerMigrations: [],
   storedActorsNeedMigration: vi.fn(async () => true),
}));

vi.mock('~/helpers/migration/MigrateStoredActors.js', () => ({
   migrateStoredActors: spies.migrateStoredActors,
   storedActorsNeedMigration: spies.storedActorsNeedMigration,
}));
vi.mock('~/helpers/migration/actor/ActorMigrations.js', () => ({ default: spies.actorMigrations }));
vi.mock('~/helpers/migration/actor/CharacterMigrations.js', () => ({ default: spies.characterMigrations }));
vi.mock('~/helpers/migration/actor/PlayerMigrations.js', () => ({ default: spies.playerMigrations }));
vi.mock('~/helpers/utility-functions/Log.js', () => ({ default: vi.fn() }));

import { migrateWorld, worldNeedsMigration } from '~/helpers/migration/MigrateWorld.js';

/**
 * Stands in for foundry.utils.deepClone: copies plain objects and arrays, and keeps any other object (an update
 * operator such as `_del`) by reference, as Foundry's deepClone does.
 * @param {*} value - The value to copy.
 * @returns {*} The copy.
 */
function deepClone(value) {
   if (Array.isArray(value)) {
      return value.map(deepClone);
   }
   if (value && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
         key,
         deepClone(entry),
      ]));
   }
   return value;
}

beforeEach(() => {
   globalThis.foundry.utils.deepClone = deepClone;
   globalThis.game = {
      actors: [],
      i18n: {
         localize: (key) => key,
      },
      items: [],
      users: {
         activeGM: { isSelf: true },
      },
   };
   globalThis.ui = {
      notifications: {
         error: vi.fn(),
         info: vi.fn(),
         warn: vi.fn(),
      },
   };
});

afterEach(() => {
   delete globalThis.foundry.utils.deepClone;
   delete globalThis.game;
   delete globalThis.ui;
   spies.actorMigrations.length = 0;
   spies.characterMigrations.length = 0;
   spies.playerMigrations.length = 0;
   vi.clearAllMocks();
});

describe('worldNeedsMigration', () => {
   it('reports stored actors needing migration', async () => {
      expect(await worldNeedsMigration()).toBe(true);
   });

   it('reports nothing when no document is behind its chain and no stored actor needs work', async () => {
      spies.storedActorsNeedMigration.mockResolvedValueOnce(false);
      expect(await worldNeedsMigration()).toBe(false);
   });
});

describe('migrateWorld', () => {
   it.each([
      [
         'another GM is the active GM',
         { isSelf: false },
      ],
      [
         'no GM is active',
         null,
      ],
   ])('does nothing when %s', async (label, activeGM) => {
      game.users.activeGM = activeGM;
      await migrateWorld();
      expect(spies.storedActorsNeedMigration).not.toHaveBeenCalled();
      expect(spies.migrateStoredActors).not.toHaveBeenCalled();
   });

   it('announces completion when nothing failed', async () => {
      await migrateWorld();
      expect(spies.migrateStoredActors).toHaveBeenCalledTimes(1);
      expect(ui.notifications.info).toHaveBeenLastCalledWith('LOCAL.migrationComplete.text');
      expect(ui.notifications.warn).not.toHaveBeenCalled();
   });

   it('reports how many stored actors failed instead of announcing completion', async () => {
      spies.migrateStoredActors.mockResolvedValueOnce({
         failed: 2,
         skipped: 0,
         updated: 3,
      });
      await migrateWorld();
      expect(ui.notifications.warn).toHaveBeenCalledWith('LOCAL.migrationFailed2.text');
      expect(ui.notifications.info).not.toHaveBeenCalledWith('LOCAL.migrationComplete.text');
   });

   it('counts a document whose version-chain migration fails', async () => {
      /** @type {Function} The console.error spy, silencing the expected error output. */
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      spies.playerMigrations.push({
         migrate: () => {
            throw new Error('migration step failed');
         },
         version: 1,
      });
      game.actors = [
         {
            documentName: 'Actor',
            id: 'actor0',
            items: [],
            name: 'E2E Player',
            system: { documentVersion: 0 },
            type: 'player',
            update: vi.fn(async () => {}),
         },
      ];
      await migrateWorld();
      expect(game.actors[0].update).not.toHaveBeenCalled();
      expect(ui.notifications.warn).toHaveBeenCalledWith('LOCAL.migrationFailed1.text');
      consoleError.mockRestore();
   });

   it('writes the data of the last fully migrated version when a later level of the next version throws', async () => {
      /** @type {Function} The console.error spy, silencing the expected error output. */
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      /** @type {object} An update operator, which the write must carry by reference, as Foundry's `_del`. */
      const operator = new (class UpdateOperator {})();
      spies.actorMigrations.push(
         {
            migrate: (actor, data) => {
               data['system.first'] = operator;
               return data;
            },
            version: 1,
         },
         {
            // Changes the accumulated data in place before a later level of the same version throws.
            migrate: (actor, data) => {
               data['system.second'] = true;
               return data;
            },
            version: 2,
         },
      );
      spies.characterMigrations.push({
         migrate: () => {
            throw new Error('level two failed');
         },
         version: 2,
      });
      game.actors = [
         {
            documentName: 'Actor',
            id: 'actor0',
            items: [],
            name: 'E2E Player',
            system: { documentVersion: 0 },
            type: 'player',
            update: vi.fn(async () => {}),
         },
      ];
      await migrateWorld();

      /** @type {object} The data the actor was written with. */
      const written = game.actors[0].update.mock.calls[0][0];
      expect(written).toEqual({
         'system.documentVersion': 1,
         'system.first': operator,
      });
      expect(written['system.first']).toBe(operator);
      expect(ui.notifications.warn).toHaveBeenCalledWith('LOCAL.migrationFailed1.text');
      consoleError.mockRestore();
   });
});
