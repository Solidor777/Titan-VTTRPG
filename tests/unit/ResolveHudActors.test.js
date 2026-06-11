import { describe, it, expect } from 'vitest';
import resolveHudActors from '~/ui/player-hud/ResolveHudActors.js';

/**
 * Builds a minimal actor stub.
 * @param {string} id - The actor id.
 * @param {boolean} [isOwner] - Whether the current user owns the actor.
 * @returns {object} The actor stub.
 */
function actor(id, isOwner = true) {
   return { id, isOwner };
}

describe('resolveHudActors', () => {
   it('returns all selected characters for a GM, in selection order', () => {
      const a = actor('a');
      const b = actor('b');
      const result = resolveHudActors({ isGM: true, selected: [a, b], owned: [], assigned: null });
      expect(result.actors).toEqual([a, b]);
      expect(result.primary).toBe(a);
   });

   it('returns empty for a GM with no selection (no fallback)', () => {
      const result = resolveHudActors({ isGM: true, selected: [], owned: [actor('a')], assigned: actor('b') });
      expect(result.actors).toEqual([]);
      expect(result.primary).toBe(null);
   });

   it('returns all selected owned characters for a player', () => {
      const mine = actor('mine');
      const theirs = actor('theirs', false);
      const mine2 = actor('mine2');
      const result = resolveHudActors({ isGM: false, selected: [theirs, mine, mine2], owned: [], assigned: null });
      expect(result.actors).toEqual([mine, mine2]);
      expect(result.primary).toBe(mine);
   });

   it('puts the assigned character first when it is among the player selection', () => {
      const assigned = actor('assigned');
      const other = actor('other');
      const result = resolveHudActors({ isGM: false, selected: [other, assigned], owned: [], assigned });
      expect(result.actors).toEqual([assigned, other]);
      expect(result.primary).toBe(assigned);
   });

   it('falls back to the assigned character with an owned token on scene', () => {
      const assigned = actor('assigned');
      const result = resolveHudActors({ isGM: false, selected: [], owned: [actor('x'), assigned], assigned });
      expect(result.actors).toEqual([assigned]);
   });

   it('falls back to the first owned token when the assigned character has none', () => {
      const first = actor('first');
      const result = resolveHudActors({ isGM: false, selected: [], owned: [first, actor('b')], assigned: null });
      expect(result.actors).toEqual([first]);
   });

   it('falls back to the assigned character even with no token on scene', () => {
      const assigned = actor('assigned');
      const result = resolveHudActors({ isGM: false, selected: [], owned: [], assigned });
      expect(result.actors).toEqual([assigned]);
   });

   it('returns empty when nothing resolves', () => {
      const result = resolveHudActors({ isGM: false, selected: [], owned: [], assigned: null });
      expect(result.actors).toEqual([]);
      expect(result.primary).toBe(null);
   });
});
