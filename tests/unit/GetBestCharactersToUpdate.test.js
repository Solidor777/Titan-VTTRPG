import { afterEach, describe, expect, it, vi } from 'vitest';

// The focused-sheet fallback resolves through the focused-sheet helper, mocked here so each test can
// configure its return value directly instead of re-importing the module under test.
vi.mock('~/helpers/utility-functions/GetFocusedCharacterSheetActor.js', () => ({ default: vi.fn() }));

import getFocusedCharacterSheetActor from '~/helpers/utility-functions/GetFocusedCharacterSheetActor.js';
import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';

/**
 * Builds a fake Character Actor with the given id.
 * @param {string} id - The id to assign to the fake Actor.
 * @returns {TitanActor} A minimal fake Character Actor stub.
 */
const actor = (id) => ({
   id,
   system: { isCharacter: true },
});

/**
 * Builds a fake Token wrapping the given Actor.
 * @param {TitanActor} a - The Actor the fake Token wraps.
 * @returns {object} A minimal fake Token stub exposing the wrapped Actor on `.actor`.
 */
const token = (a) => ({ actor: a });

/**
 * Installs the global game/canvas state the targeting ladder reads and configures the mocked
 * focused-sheet helper's return value for this case.
 * @param {object} opts - Targeting inputs for this case.
 * @param {boolean} [opts.isGM=false] - Whether the current user is a GM.
 * @param {object[]} [opts.targets=[]] - The user's targeted tokens (objects with an `actor`).
 * @param {object[]} [opts.controlled=[]] - The user's controlled tokens (objects with an `actor`).
 * @param {object|null} [opts.userCharacter=null] - The user's assigned Character Actor, if any.
 * @param {object|null} [opts.focused=null] - The focused-sheet Character Actor the helper returns.
 * @returns {void}
 */
function setup({ isGM = false, targets = [], controlled = [], userCharacter = null, focused = null }) {
   globalThis.game = {
      user: {
         isGM,
         targets,
         character: userCharacter,
      },
   };
   globalThis.canvas = { tokens: { controlled } };
   getFocusedCharacterSheetActor.mockReturnValue(focused);
}

afterEach(() => {
   vi.restoreAllMocks();
});

describe('getBestCharactersToUpdate — upgraded fallback ladder', () => {
   it('GM: returns targeted characters first', () => {
      const t = actor('t');
      setup({
         isGM: true,
         targets: [{ actor: t }],
         controlled: [token(actor('c'))],
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['t']);
   });

   it('GM: falls back to controlled tokens when no targets', () => {
      const c = actor('c');
      setup({
         isGM: true,
         targets: [],
         controlled: [token(c)],
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['c']);
   });

   it('GM: falls back to the focused sheet actor when nothing is targeted or controlled', () => {
      const focused = actor('focused');
      setup({
         isGM: true,
         targets: [],
         controlled: [],
         focused,
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['focused']);
   });

   it('player: returns controlled characters first', () => {
      const c = actor('c');
      setup({
         isGM: false,
         controlled: [token(c)],
         userCharacter: actor('main'),
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['c']);
   });

   it('player: falls back to the assigned character', () => {
      const main = actor('main');
      setup({
         isGM: false,
         controlled: [],
         userCharacter: main,
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['main']);
   });

   it('player: falls back to the focused sheet actor when nothing else applies', () => {
      const focused = actor('focused');
      setup({
         isGM: false,
         controlled: [],
         userCharacter: null,
         focused,
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['focused']);
   });

   it('de-duplicates targets that resolve to the same actor id', () => {
      const shared = actor('shared');
      setup({
         isGM: true,
         targets: [
            { actor: shared },
            { actor: shared }
         ],
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['shared']);
   });
});
