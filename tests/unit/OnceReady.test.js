import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// onceReady with its collaborators replaced: the converter, the migration, the world scan, and the Player HUD are
// spies, so a failure can be injected at each step of the GM's migration attempt.

/** @type {object} The spies the module mocks share. */
const spies = vi.hoisted(() => ({
   convert: vi.fn(async () => {}),
   hudInit: vi.fn(),
   migrate: vi.fn(async () => {}),
   needsMigration: vi.fn(() => true),
}));

vi.mock('~/hooks/OnHotbarDrop.js', () => ({ default: vi.fn() }));
vi.mock('~/helpers/utility-functions/Error.js', () => ({ default: vi.fn() }));
vi.mock('~/helpers/migration/ConvertEffectItemsToActiveEffects.js', () => ({ default: spies.convert }));
vi.mock('~/helpers/migration/MigrateWorld.js', async (importOriginal) => ({
   ...(await importOriginal()),
   migrateWorld: spies.migrate,
   worldNeedsMigration: spies.needsMigration,
}));
vi.mock('~/helpers/migration/ConfirmMigrateWorldDialog.js', () => ({
   default: class {
      /**
       * Stands in for the dialog's render.
       * @returns {void}
       */
      render() {}
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
      settings: {
         get: () => 'automatic',
      },
      titan: {},
      user: { isGM: true },
   };
});

afterEach(() => {
   delete globalThis.Hooks;
   delete globalThis.game;
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
   it('reports a failed converter and still registers the hook and builds the HUD', async () => {
      spies.convert.mockRejectedValueOnce(new Error('converter failed'));
      await onceReady();
      expect(error).toHaveBeenCalledTimes(1);
      expect(spies.migrate).not.toHaveBeenCalled();
      expectLoadFinished();
   });

   it('reports a failed migration and still registers the hook and builds the HUD', async () => {
      spies.migrate.mockRejectedValueOnce(new Error('migration failed'));
      await onceReady();
      expect(error).toHaveBeenCalledTimes(1);
      expectLoadFinished();
   });

   it('scans nothing in Disabled mode', async () => {
      game.settings.get = () => 'disabled';
      await onceReady();
      expect(spies.needsMigration).not.toHaveBeenCalled();
      expect(spies.migrate).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expectLoadFinished();
   });
});
