import { describe, it, expect } from 'vitest';
import { E2E_USERS, DEFAULT_GM, GM_USERS, PLAYER_USERS } from '../e2e/users.js';

describe('e2e user registry', () => {
   it('defines exactly four users with the expected names', () => {
      expect(E2E_USERS.map((u) => u.name)).toEqual([
         'E2E GM 1',
         'E2E GM 2',
         'E2E Player 1',
         'E2E Player 2',
      ]);
   });

   it('splits two GMs and two players by role', () => {
      expect(GM_USERS.map((u) => u.name)).toEqual(['E2E GM 1', 'E2E GM 2']);
      expect(PLAYER_USERS.map((u) => u.name)).toEqual(['E2E Player 1', 'E2E Player 2']);
   });

   it('defaults to the first GM (never the developer Gamemaster)', () => {
      expect(DEFAULT_GM).toBe('E2E GM 1');
   });
});
