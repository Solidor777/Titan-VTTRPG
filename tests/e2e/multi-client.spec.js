import { expect, test } from '@playwright/test';
import { withClients, awaitUsersActive } from './multiClient.js';

test.describe('multi-client harness', () => {
   test('two contexts log in as distinct users and both see each other active', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         // Each client must reach a ready world.
         expect(await gm.evaluate(() => game.ready)).toBe(true);
         expect(await player.evaluate(() => game.ready)).toBe(true);

         // Each client is the user it logged in as.
         expect(await gm.evaluate(() => game.user.name)).toBe('E2E GM 1');
         expect(await player.evaluate(() => game.user.name)).toBe('E2E Player 1');

         // Both users become active and each client observes the other.
         await awaitUsersActive(gm, ['E2E GM 1', 'E2E Player 1']);
         await awaitUsersActive(player, ['E2E GM 1', 'E2E Player 1']);
      });
   });
});
