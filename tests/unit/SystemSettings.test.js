import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The settings menus are ApplicationV2 subclasses and the theme choices read the theme catalogue; neither matters to
// the stored-value rewrite, so they are stubbed. The project error logger is mocked to observe what it reports.
vi.mock('~/theme/ThemeManager.js', () => ({
   BUILT_IN_THEMES: [],
   buildThemeChoices: () => ({}),
}));
vi.mock('~/theme/editor/ThemeEditorApplication.js', () => ({ default: class {} }));
vi.mock('~/ui/player-hud/settings/PlayerHudSettingsApplication.js', () => ({ default: class {} }));
vi.mock('~/helpers/utility-functions/Error.js', () => ({ default: vi.fn() }));

import error from '~/helpers/utility-functions/Error.js';
import registerSystemSettings from '~/system/SystemSettings.js';

/** @type {Error} The failure the stubbed settings store rejects the rewrite with. */
const STORAGE_FAILURE = new Error('storage denied');

beforeEach(() => {
   globalThis.game = {
      keybindings: { register: vi.fn() },
      settings: {
         /**
          * Reads a stored value: client storage holds a Boolean for the check-options choice.
          * @param {string} namespace - The setting namespace.
          * @param {string} key - The setting key.
          * @returns {*} `true` for `getCheckOptions`, otherwise nothing.
          */
         get: (namespace, key) => (key === 'getCheckOptions' ? true : undefined),
         register: vi.fn(),
         registerMenu: vi.fn(),
         set: vi.fn(() => Promise.reject(STORAGE_FAILURE)),
      },
   };
});

afterEach(() => {
   delete globalThis.game;
   vi.mocked(error).mockReset();
});

describe('registerSystemSettings — stored check-options rewrite', () => {
   it('reports a rejected rewrite of a stored Boolean through the project logger', async () => {
      registerSystemSettings();
      expect(game.settings.set).toHaveBeenCalledWith('titan', 'getCheckOptions', 'always');

      // The rejection settles on a later microtask.
      await vi.waitFor(() => {
         expect(error).toHaveBeenCalledWith(expect.stringContaining('getCheckOptions'), STORAGE_FAILURE);
      });
   });
});
