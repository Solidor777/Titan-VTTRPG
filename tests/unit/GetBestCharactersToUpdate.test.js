import { afterEach, describe, expect, it, vi } from 'vitest';

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
 * Installs the global game/canvas state the targeting ladder reads, mocks the focused-sheet
 * helper, and dynamically imports a fresh copy of the system under test so the mock takes effect.
 * @param {object} opts - Targeting inputs for this case.
 * @param {boolean} [opts.isGM=false] - Whether the current user is a GM.
 * @param {object[]} [opts.targets=[]] - The user's targeted tokens (objects with an `actor`).
 * @param {object[]} [opts.controlled=[]] - The user's controlled tokens (objects with an `actor`).
 * @param {object|null} [opts.userCharacter=null] - The user's assigned Character Actor, if any.
 * @param {object|null} [opts.focused=null] - The focused-sheet Character Actor the helper returns.
 * @returns {Promise<() => TitanActor[]>} The freshly imported `getBestCharactersToUpdate` function.
 */
async function setup({ isGM = false, targets = [], controlled = [], userCharacter = null, focused = null }) {
   globalThis.game = {
      user: {
         isGM,
         targets,
         character: userCharacter,
      },
   };
   globalThis.canvas = { tokens: { controlled } };

   // The focused-sheet fallback resolves through the focused-sheet helper, mocked here.
   vi.doMock('~/helpers/utility-functions/GetFocusedCharacterSheetActor.js', () => ({
      default: () => focused,
   }));

   // Import a fresh module graph so the doMock above is applied to the system under test.
   const module = await import('~/helpers/utility-functions/GetBestCharactersToUpdate.js');
   return module.default;
}

afterEach(() => {
   vi.restoreAllMocks();
   vi.resetModules();
});

describe('getBestCharactersToUpdate — upgraded fallback ladder', () => {
   it('GM: returns targeted characters first', async () => {
      const t = actor('t');
      const getBestCharactersToUpdate = await setup({
         isGM: true,
         targets: [{ actor: t }],
         controlled: [token(actor('c'))],
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['t']);
   });

   it('GM: falls back to controlled tokens when no targets', async () => {
      const c = actor('c');
      const getBestCharactersToUpdate = await setup({
         isGM: true,
         targets: [],
         controlled: [token(c)],
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['c']);
   });

   it('GM: falls back to the focused sheet actor when nothing is targeted or controlled', async () => {
      const focused = actor('focused');
      const getBestCharactersToUpdate = await setup({
         isGM: true,
         targets: [],
         controlled: [],
         focused,
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['focused']);
   });

   it('player: returns controlled characters first', async () => {
      const c = actor('c');
      const getBestCharactersToUpdate = await setup({
         isGM: false,
         controlled: [token(c)],
         userCharacter: actor('main'),
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['c']);
   });

   it('player: falls back to the assigned character', async () => {
      const main = actor('main');
      const getBestCharactersToUpdate = await setup({
         isGM: false,
         controlled: [],
         userCharacter: main,
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['main']);
   });

   it('player: falls back to the focused sheet actor when nothing else applies', async () => {
      const focused = actor('focused');
      const getBestCharactersToUpdate = await setup({
         isGM: false,
         controlled: [],
         userCharacter: null,
         focused,
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['focused']);
   });

   it('de-duplicates targets that resolve to the same actor id', async () => {
      const shared = actor('shared');
      const getBestCharactersToUpdate = await setup({
         isGM: true,
         targets: [{ actor: shared }, { actor: shared }],
      });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['shared']);
   });
});
