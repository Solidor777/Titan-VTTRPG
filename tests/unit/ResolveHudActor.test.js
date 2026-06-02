import { describe, it, expect } from 'vitest';
import resolveHudActor from '~/ui/effect-hud/ResolveHudActor.js';

/**
 * Builds a minimal mock actor for resolution tests.
 * @param {string} id - Unique identifier used to match the mock against the resolution ladder.
 * @param {boolean} [isOwner] - Whether the user owns the actor.
 * @returns {{ id: string, isOwner: boolean }} The mock actor.
 */
function actor(id, isOwner = true) {
   return { id, isOwner };
}

describe('resolveHudActor', () => {
   it('returns the first selected token for a GM', () => {
      const a = actor('a');
      const b = actor('b');
      expect(resolveHudActor({ isGM: true, selected: [a, b], owned: [], assigned: null })).toBe(a);
   });

   it('returns null for a GM with nothing selected', () => {
      expect(resolveHudActor({ isGM: true, selected: [], owned: [], assigned: null })).toBe(null);
   });

   it('prefers a selected token that is the assigned character', () => {
      const assigned = actor('assigned');
      const other = actor('other');
      expect(resolveHudActor({
         isGM: false,
         selected: [other, assigned],
         owned: [other, assigned],
         assigned,
      })).toBe(assigned);
   });

   it('falls back to a selected owned token when none is the assigned character', () => {
      const assigned = actor('assigned');
      const selected = actor('selected');
      expect(resolveHudActor({
         isGM: false,
         selected: [selected],
         owned: [selected],
         assigned,
      })).toBe(selected);
   });

   it('returns the assigned character when an owned token of it exists but none is selected', () => {
      const assigned = actor('assigned');
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [assigned],
         assigned,
      })).toBe(assigned);
   });

   it('returns the first owned token when nothing is selected or assigned-owned', () => {
      const owned = actor('owned');
      const assigned = actor('assigned');
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [owned],
         assigned,
      })).toBe(owned);
   });

   it('returns the assigned character when no tokens exist on the scene', () => {
      const assigned = actor('assigned');
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [],
         assigned,
      })).toBe(assigned);
   });

   it('returns null when nothing resolves', () => {
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [],
         assigned: null,
      })).toBe(null);
   });
});
