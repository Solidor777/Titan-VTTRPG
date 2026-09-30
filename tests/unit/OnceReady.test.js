import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// onceReady with the real migration pipeline (MigrateWorld.js) and its stored-actor pass replaced: the stored-actor
// scan and pass are spies, the only route to the legacy converter and the condition sync, so a test sees whether a
// load scanned or wrote anything.

/** @type {object} The spies the module mocks share. */
const spies = vi.hoisted(() => ({
   dialogRender: vi.fn(),
   hudInit: vi.fn(),
   migrateStoredActors: vi.fn(async () => ({
      failed: 0,
      skipped: 0,
      updated: 1,
   })),
   storedActorsNeedMigration: vi.fn(async () => true),
}));

vi.mock('~/hooks/OnHotbarDrop.js', () => ({ default: vi.fn() }));
vi.mock('~/helpers/utility-functions/Error.js', () => ({ default: vi.fn() }));
vi.mock('~/helpers/utility-functions/Log.js', () => ({ default: vi.fn() }));
vi.mock('~/helpers/migration/MigrateStoredActors.js', () => ({
   migrateStoredActors: spies.migrateStoredActors,
   storedActorsNeedMigration: spies.storedActorsNeedMigration,
}));
vi.mock('~/helpers/migration/ConfirmMigrateWorldDialog.js', () => ({
   default: class {
      /**
       * Records the dialog's render.
       * @returns {void}
       */
      render() {
         spies.dialogRender();
      }
   },
}));
vi.mock('~/ui/player-hud/TitanPlayerHud.js', () => ({
   default: class {
      /**
       * Records the HUD's initialization.
       * @returns {void}
       */
      init() {
         spies.hudInit();
      }
   },
}));
vi.mock('~/ui/player-hud/settings/PlayerHudSettingsApplication.js', () => ({ default: class {} }));

import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import error from '~/helpers/utility-functions/Error.js';
import onceReady from '~/hooks/OnceReady.js';

beforeEach(() => {
   globalThis.Hooks = { on: vi.fn() };
   globalThis.game = {
      actors: [],
      i18n: {
         localize: (key) => key,
      },
      items: [],
      settings: {
         get: () => 'automatic',
      },
      titan: {},
      users: {
         activeGM: { isSelf: true },
      },
   };
   globalThis.ui = {
      notifications: {
         info: vi.fn(),
         warn: vi.fn(),
      },
   };
});

afterEach(() => {
   delete globalThis.Hooks;
   delete globalThis.game;
   delete globalThis.ui;
   vi.clearAllMocks();
});

/**
 * Asserts the load finished for every user: the hot-bar drop hook is registered and the Player HUD is built.
 * @returns {void}
 */
function expectLoadFinished() {
   expect(Hooks.on).toHaveBeenCalledWith('hotbarDrop', onHotbarDrop);
   expect(spies.hudInit).toHaveBeenCalledTimes(1);
   expect(game.titan.playerHud).toBeDefined();
}

describe('onceReady', () => {
   it('migrates the stored actors in Automatic mode', async () => {
      await onceReady();
      expect(spies.migrateStoredActors).toHaveBeenCalledTimes(1);
      expectLoadFinished();
   });

   it('reports a failed migration and still registers the hook and builds the HUD', async () => {
      spies.migrateStoredActors.mockRejectedValueOnce(new Error('migration failed'));
      await onceReady();
      expect(error).toHaveBeenCalledTimes(1);
      expectLoadFinished();
   });

   it('scans and converts nothing in Disabled mode', async () => {
      game.settings.get = () => 'disabled';
      await onceReady();
      expect(spies.storedActorsNeedMigration).not.toHaveBeenCalled();
      expect(spies.migrateStoredActors).not.toHaveBeenCalled();
      expect(spies.dialogRender).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expectLoadFinished();
   });

   it('asks first in Prompt mode and converts nothing before the GM confirms', async () => {
      game.settings.get = () => 'prompt';
      await onceReady();
      expect(spies.storedActorsNeedMigration).toHaveBeenCalledTimes(1);
      expect(spies.dialogRender).toHaveBeenCalledTimes(1);
      expect(spies.migrateStoredActors).not.toHaveBeenCalled();
      expectLoadFinished();
   });

   it('leaves migration to the active GM on any other client', async () => {
      game.users.activeGM = { isSelf: false };
      await onceReady();
      expect(spies.storedActorsNeedMigration).not.toHaveBeenCalled();
      expect(spies.migrateStoredActors).not.toHaveBeenCalled();
      expectLoadFinished();
   });
});
