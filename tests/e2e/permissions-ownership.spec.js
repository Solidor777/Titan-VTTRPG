import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';

test.describe('permissions — sheet ownership levels', () => {
   /**
    * Seeds one actor with a specific ownership level for the named player, on the GM client.
    * @param {import('@playwright/test').Page} gm - The GM client.
    * @param {string} actorName - The actor name.
    * @param {string} playerName - The player display name to grant the level to.
    * @param {string} levelKey - One of NONE/LIMITED/OBSERVER/OWNER.
    * @returns {Promise<string>} The created actor id.
    */
   async function seedOwnedActor(gm, actorName, playerName, levelKey) {
      return gm.evaluate(
         async ({ actorName, playerName, levelKey }) => {
            const stale = game.actors.getName(actorName);
            if (stale) {
               await stale.delete();
            }
            const player = game.users.getName(playerName);
            const level = CONST.DOCUMENT_OWNERSHIP_LEVELS[levelKey];
            const actor = await Actor.create({
               name: actorName,
               type: 'player',
               ownership: { default: 0, [player.id]: level },
            });
            return actor.id;
         },
         { actorName, playerName, levelKey },
      );
   }

   /**
    * Reads the player client's view of an actor's sheet permission state.
    * @param {import('@playwright/test').Page} player - The player client.
    * @param {string} actorId - The actor id.
    * @returns {Promise<{visible: boolean, editable: boolean, rendered: boolean}>} The sheet state.
    */
   async function readSheetState(player, actorId) {
      // testUserPermission is the source of truth for visibility/editability.
      const perms = await player.evaluate((id) => {
         const actor = game.actors.get(id);
         return {
            visible: actor ? actor.testUserPermission(game.user, 'OBSERVER') : false,
            editable: actor ? actor.testUserPermission(game.user, 'OWNER') : false,
         };
      }, actorId);

      // Trigger the render, then POLL for the rendered+visible state (no fixed sleep).
      await player.evaluate((id) => game.actors.get(id)?.sheet.render(true), actorId);
      await player.waitForFunction(
         (id) => {
            const sheet = game.actors.get(id)?.sheet;
            return sheet?.rendered === true && sheet?.isVisible === true;
         },
         actorId,
         { timeout: 15_000 },
      );
      await player.evaluate((id) => game.actors.get(id)?.sheet.close(), actorId);

      return {
         visible: perms.visible,
         editable: perms.editable,
         rendered: true,
      };
   }

   test('OWNER: player can view and edit', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 Owner Actor', 'E2E Player 1', 'OWNER');
         try {
            await player.waitForFunction((id) => !!game.actors.get(id), id, { timeout: 15_000 });
            const state = await readSheetState(player, id);
            expect(state.visible).toBe(true);
            expect(state.editable).toBe(true);
            expect(state.rendered).toBe(true);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });

   test('OBSERVER: player can view but not edit', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 Observer Actor', 'E2E Player 1', 'OBSERVER');
         try {
            await player.waitForFunction((id) => !!game.actors.get(id), id, { timeout: 15_000 });
            const state = await readSheetState(player, id);
            expect(state.visible).toBe(true);
            expect(state.editable).toBe(false);
            expect(state.rendered).toBe(true);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });

   test('LIMITED: player can view (limited) but not edit', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 Limited Actor', 'E2E Player 1', 'LIMITED');
         try {
            await player.waitForFunction((id) => !!game.actors.get(id), id, { timeout: 15_000 });
            // LIMITED meets the default viewPermission (LIMITED) so the sheet is visible, but not editable.
            const state = await player.evaluate((id) => {
               const actor = game.actors.get(id);
               return {
                  view: actor.testUserPermission(game.user, 'LIMITED'),
                  observer: actor.testUserPermission(game.user, 'OBSERVER'),
                  editable: actor.testUserPermission(game.user, 'OWNER'),
               };
            }, id);
            expect(state.view).toBe(true);
            expect(state.observer).toBe(false);
            expect(state.editable).toBe(false);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });

   test('NONE: player has no view permission on the actor', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 None Actor', 'E2E Player 1', 'NONE');
         try {
            // Foundry replicates the Actor document to ALL clients regardless of ownership — permission
            // gates VISIBILITY, not collection membership. So the doc IS present in the player's
            // collection; wait for it to arrive, then assert the player resolves below LIMITED (no view).
            await player.waitForFunction((id) => !!game.actors.get(id), id, { timeout: 15_000 });
            const view = await player.evaluate(
               (id) => game.actors.get(id).testUserPermission(game.user, 'LIMITED'),
               id,
            );
            expect(view).toBe(false);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });
});
