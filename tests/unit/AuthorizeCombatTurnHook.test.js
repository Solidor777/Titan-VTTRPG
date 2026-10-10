import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authorizeCombatTurnHook from '~/hooks/AuthorizeCombatTurnHook.js';

beforeEach(() => {
   vi.useFakeTimers();
   const owners = new Set(['owner']);
   const actor = { testUserPermission: (user) => owners.has(user.id) };
   vi.stubGlobal('game', {
      users: {
         get: (id) => ({
            gm: {
               id: 'gm',
               isGM: true,
            },
            owner: {
               id: 'owner',
               isGM: false,
            },
            other: {
               id: 'other',
               isGM: false,
            },
         })[id],
      },
      combats: {
         get: (id) => {
            if (id !== 'c1') {
               return undefined;
            }
            return { combatants: { get: (combatantId) => (combatantId === 'ending' ? { actor } : undefined) } };
         },
      },
   });
});

afterEach(() => {
   vi.useRealTimers();
   vi.unstubAllGlobals();
});

describe('authorizeCombatTurnHook', () => {
   it('lets a GM and the owner of the combatant whose turn ended move the turn', async () => {
      expect(await authorizeCombatTurnHook('gm', 'next', 'ending', 'c1')).toBe(true);
      expect(await authorizeCombatTurnHook('owner', 'next', 'ending', 'c1')).toBe(true);
   });

   it('refuses a user who owns nothing there and an unknown sender', async () => {
      expect(await authorizeCombatTurnHook('other', 'next', 'ending', 'c1')).toBe(false);
      expect(await authorizeCombatTurnHook('nobody', 'next', 'ending', 'c1')).toBe(false);
   });

   it('refuses when the combat or combatant cannot be found', async () => {
      const refused = authorizeCombatTurnHook('owner', 'next', 'missing', 'c1');
      await vi.runAllTimersAsync();
      expect(await refused).toBe(false);
   });
});
