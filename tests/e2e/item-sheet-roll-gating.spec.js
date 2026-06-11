import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';
import { attachPageErrors, buildCheck, closeAllApps } from './world.js';
import { GM_USERS, PLAYER_USERS } from './users.js';

/**
 * Item-sheet roll-button gating (player perspective): viewed from a real non-GM seat, an item on an
 * actor the player OWNS shows the sidebar roll button (replacing the info line), while an item on an
 * actor the player only OBSERVES shows the static info line and no button. The resolveRollActor unit
 * test locks the decision logic deterministically; this spec proves the gate end-to-end on the
 * rendered sheet. A GM client seeds and cleans the fixtures (players cannot create actors); the
 * player client only opens and inspects the sheets.
 */

/** @type {string} Name of the actor the player owns. */
const OWNED_ACTOR_NAME = 'E2E Player-Owned Roll Actor';

/** @type {string} Name of the actor the player can only observe. */
const OBSERVED_ACTOR_NAME = 'E2E Observed Roll Actor';

/** @type {string} Label shared by both seeded item checks. */
const ITEM_CHECK_LABEL = 'E2E Gating Item Check';

test.describe('item-sheet roll-button gating (player)', () => {
   test('roll button shows only when the player owns the item\'s actor', async ({ browser }) => {
      await withClients(
         browser,
         { gm: GM_USERS[0].name, player: PLAYER_USERS[0].name },
         async ({ gm, player }) => {
            /** @type {string[]} Uncaught errors on the player page (the surface under test). */
            const errors = attachPageErrors(player);

            // GM seeds both actors and a check item each, encoding the player's access via ownership:
            // OWNER on one, only the default OBSERVER on the other. Stale fixtures from a prior run are
            // removed first.
            /** @type {{ownedActorId: string, ownedItemId: string, observedActorId: string, observedItemId: string}} */
            const ids = await gm.evaluate(async ({
               ownedName,
               observedName,
               playerName,
               itemCheck,
            }) => {
               /** @type {User} The player whose access the fixtures encode. */
               const playerUser = game.users.getName(playerName);
               const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
               const OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

               for (const name of [ownedName, observedName]) {
                  const stale = game.actors.getName(name);
                  if (stale) {
                     await stale.delete();
                  }
               }

               const owned = await Actor.create({
                  name: ownedName,
                  type: 'player',
                  ownership: { default: OBSERVER, [playerUser.id]: OWNER },
               });
               const [ownedItem] = await owned.createEmbeddedDocuments('Item', [
                  { name: 'E2E Owned Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
               ]);

               const observed = await Actor.create({
                  name: observedName,
                  type: 'player',
                  ownership: { default: OBSERVER },
               });
               const [observedItem] = await observed.createEmbeddedDocuments('Item', [
                  { name: 'E2E Observed Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
               ]);

               return {
                  ownedActorId: owned.id,
                  ownedItemId: ownedItem.id,
                  observedActorId: observed.id,
                  observedItemId: observedItem.id,
               };
            }, {
               ownedName: OWNED_ACTOR_NAME,
               observedName: OBSERVED_ACTOR_NAME,
               playerName: PLAYER_USERS[0].name,
               itemCheck: buildCheck(ITEM_CHECK_LABEL, 'e2e-gating-item-check'),
            });

            // Wait until the player client has received both actors over the socket.
            await player.waitForFunction(
               (actorIds) => actorIds.every((id) => !!game.actors.get(id)),
               [ids.ownedActorId, ids.observedActorId],
               { timeout: 30_000 },
            );

            /**
             * Opens an item's sheet on the player page and waits for the Svelte mount.
             * @param {string} actorId - The owning actor's id.
             * @param {string} itemId - The embedded item's id.
             * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
             */
            async function openOnPlayer(actorId, itemId) {
               await closeAllApps(player);
               await player.evaluate(async ({ aid, iid }) => {
                  const item = game.actors.get(aid).items.get(iid);
                  const app = await item.sheet.render(true);
                  await titanWait(
                     () => !!app?.element?.querySelector('.window-content')?.children.length,
                     { message: 'item sheet mounted' },
                  );
               }, { aid: actorId, iid: itemId });
               return player.locator('.application.titan-document-sheet');
            }

            // OWNED: presence — the roll button renders and the static info line is gone.
            const ownedSheet = await openOnPlayer(ids.ownedActorId, ids.ownedItemId);
            await expect(
               ownedSheet.locator('.sidebar-check .header .roll button').first(),
               'owned item shows the roll button',
            ).toBeVisible();
            await expect(
               ownedSheet.locator('.sidebar-check .header .info').first(),
               'owned item hides the static info line',
            ).toHaveCount(0);

            // OBSERVED: presence of the info line first, then absence of the button on the same surface.
            const observedSheet = await openOnPlayer(ids.observedActorId, ids.observedItemId);
            await expect(
               observedSheet.locator('.sidebar-check .header .info').first(),
               'observed item renders the static info line',
            ).toBeVisible();
            await expect(
               observedSheet.locator('.sidebar-check .header .roll button'),
               'observed item shows no roll button',
            ).toHaveCount(0);

            expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);

            // GM removes the fixtures.
            await gm.evaluate(async ({ ownedName, observedName }) => {
               for (const name of [ownedName, observedName]) {
                  const actor = game.actors.getName(name);
                  if (actor) {
                     await actor.delete();
                  }
               }
            }, { ownedName: OWNED_ACTOR_NAME, observedName: OBSERVED_ACTOR_NAME });
         },
      );
   });
});
