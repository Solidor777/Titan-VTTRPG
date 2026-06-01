import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';

// Resolve system.json once in the Node process — same pattern as integration-manifest.spec.js.
const HERE = dirname(fileURLToPath(import.meta.url));
const SYSTEM_JSON = resolve(HERE, '../../system.json');

test.describe('permissions — compendium ownership', () => {
   /**
    * Verifies that the effects pack's declared per-role ownership in system.json matches the level
    * that each client resolves at runtime via CompendiumCollection#getUserLevel.
    *
    * v14 API confirmed from client/documents/collections/compendium-collection.mjs:
    *   getUserLevel(user = game.user) → number (CONST.DOCUMENT_OWNERSHIP_LEVELS value)
    *   NONE=0, LIMITED=1, OBSERVER=2, OWNER=3
    *
    * getUserLevel iterates this.ownership and calls user.hasRole(role) (non-exact, i.e. role >=),
    * so a GAMEMASTER user satisfies both PLAYER and ASSISTANT entries and takes the max → OWNER (3).
    * testUserPermission short-circuits for isGM users, but getUserLevel does not need that
    * short-circuit because the hierarchy arithmetic already resolves OWNER for GMs.
    */
   test('effects pack declares PLAYER:OBSERVER and a player client resolves OBSERVER (not OWNER)', async ({ browser }) => {
      // --- Ground truth: manifest declarations ---
      // Parse the shipped system.json in the Node process (no Playwright evaluate needed for this).
      const manifest = JSON.parse(readFileSync(SYSTEM_JSON, 'utf8'));

      /** @type {{ name: string, ownership: Record<string, string> } | undefined} */
      const effectsPack = manifest.packs.find((p) => p.name === 'effects');
      expect(effectsPack, 'effects pack must be declared in system.json').toBeTruthy();
      expect(effectsPack.ownership.PLAYER, 'manifest PLAYER ownership').toBe('OBSERVER');
      expect(effectsPack.ownership.ASSISTANT, 'manifest ASSISTANT ownership').toBe('OWNER');

      // --- Runtime assertions: per-client permission resolution ---
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         // The GM (GAMEMASTER role ≥ ASSISTANT) inherits both OBSERVER and OWNER from the pack's
         // ownership map and takes the max → OWNER (3). Confirmed via getUserLevel source.
         const gmLevel = await gm.evaluate(() => game.packs.get('titan.effects').getUserLevel(game.user));
         expect(gmLevel, 'GM resolves OWNER (3) on titan.effects').toBe(3);

         // A basic player (PLAYER role) matches only the PLAYER entry → OBSERVER (2), not OWNER (3).
         // This confirms the manifest declaration is honoured at runtime with no custom world override.
         const playerLevel = await player.evaluate(() => game.packs.get('titan.effects').getUserLevel(game.user));
         expect(playerLevel, 'player resolves OBSERVER (2) on titan.effects').toBe(2);
         expect(playerLevel, 'player must not resolve OWNER on titan.effects').toBeLessThan(3);
      });
   });
});
