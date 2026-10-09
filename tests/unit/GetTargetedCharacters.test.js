import { describe, it, expect, afterEach } from 'vitest';
import getTargetedCharacters from '~/helpers/utility-functions/GetTargetedCharacters.js';

/**
 * Builds a token whose actor is or is not a Character.
 * @param {string} uuid - The actor's uuid.
 * @param {boolean} [isCharacter] - Whether the actor is a Character.
 * @returns {object} The fake token.
 */
function token(uuid, isCharacter = true) {
   return {
      actor: {
         system: { isCharacter },
         uuid,
      },
   };
}

/**
 * Installs the user's targets, GM flag, and controlled tokens.
 * @param {object} state - The user's targets, controlled tokens and GM flag.
 * @param {object[]} state.targets - The targeted tokens.
 * @param {object[]} state.controlled - The controlled tokens.
 * @param {boolean} state.isGM - Whether the user is a GM.
 */
function setTargeting({ targets, controlled, isGM }) {
   globalThis.game = {
      user: {
         isGM,
         targets: new Set(targets),
      },
   };
   globalThis.canvas = { tokens: { controlled } };
}

afterEach(() => {
   delete globalThis.game;
   delete globalThis.canvas;
});

describe('getTargetedCharacters', () => {
   it('returns the targeted tokens\' Character actors', () => {
      setTargeting({
         controlled: [token('Actor.c')],
         isGM: true,
         targets: [
            token('Actor.a'),
            token('Actor.loot', false),
         ],
      });
      expect(getTargetedCharacters().map((actor) => actor.uuid)).toEqual(['Actor.a']);
   });

   it('falls back to a GM\'s controlled tokens when nothing is targeted', () => {
      setTargeting({
         controlled: [token('Actor.c')],
         isGM: true,
         targets: [],
      });
      expect(getTargetedCharacters().map((actor) => actor.uuid)).toEqual(['Actor.c']);
   });

   it('gives a player no fallback', () => {
      setTargeting({
         controlled: [token('Actor.c')],
         isGM: false,
         targets: [],
      });
      expect(getTargetedCharacters()).toEqual([]);
   });
});
