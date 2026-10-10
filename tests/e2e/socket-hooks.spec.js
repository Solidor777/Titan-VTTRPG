import { expect, flushPageErrors, test } from './harness.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import {
   addCombatant,
   createActor,
   createCombat,
   createScene,
   endCombat,
   nextTurn,
   placeToken,
   rollInitiative,
   setOwnership,
   startCombat,
   viewScene,
} from './flows.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * The hooks that the system mirrors between clients through its socket. A hook name is callable from the socket only
 * when the system registered it as mirrored, and the combat turn hooks also check, with the sender the server reports,
 * that the sender may move the turn (a GM, or the owner of the combatant whose turn ended). The tests send messages
 * on the socket by hand from E2E Player 1's client and watch what a spy hook on E2E GM 1's client receives. The
 * socket keeps the order of one client's messages, so the answer to a request sent after a message means that the
 * message has been handled.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E Player 1. */
let player;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {{owned: {id: string, tokenId: string}, plain: {id: string, tokenId: string}}} The session's characters. */
const cast = {};

/**
 * Installs spies for the given hooks on a client: each call records the hook name and its arguments.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string[]} names - The hook names to spy on.
 * @returns {Promise<void>} Resolves once the spies are installed.
 */
async function spyOn(page, names) {
   await page.evaluate((names) => {
      globalThis.__hookCalls = [];
      for (const name of names) {
         Hooks.on(name, (...args) => globalThis.__hookCalls.push({
            name,
            args,
         }));
      }
   }, names);
}

/**
 * Reads what a client's spies recorded for a hook name.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} name - The hook name.
 * @returns {Promise<unknown[][]>} The arguments of each call.
 */
function callsOf(page, name) {
   return page.evaluate(
      (name) => globalThis.__hookCalls.filter((call) => call.name === name).map((call) => call.args),
      name,
   );
}

/**
 * Sends a message on the system socket from the player's client by hand.
 * @param {object} message - The socket message.
 * @returns {Promise<void>} Resolves once it is sent.
 */
function emitFromPlayer(message) {
   return player.evaluate((message) => game.socket.emit('system.titan', message), message);
}

/**
 * Waits until the GM's client has handled everything the player sent so far, by asking it a request and waiting for
 * the answer.
 * @param {string} requestId - A request id not used before.
 * @returns {Promise<void>} Resolves once the GM's client answered.
 */
async function awaitHandled(requestId) {
   await emitFromPlayer({
      request: 'relayChatMessageUpdate',
      requestId,
      args: [],
   });
   await expect.poll(
      () => player.evaluate((id) => globalThis.__titanReplies.some((reply) => reply.reply === id), requestId),
      { message: `the GM's client answered ${requestId}` },
   ).toBe(true);
}

/**
 * Waits for a warning on the GM's client that names a hook and says it was refused.
 * @param {string} text - Text the warning contains.
 * @returns {Promise<void>} Resolves once the warning is visible.
 */
async function expectGmRefusal(text) {
   await expect(
      gm.locator('#notifications .notification', { hasText: text }).first(),
      `the GM's client refused: ${text}`,
   ).toBeVisible();
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(120_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   player = await (await browser.newContext()).newPage();
   await login(player, 'E2E Player 1');
   await player.evaluate(() => {
      globalThis.__titanReplies = [];
      game.socket.on('system.titan', (data) => {
         if (data?.reply !== undefined) {
            globalThis.__titanReplies.push(data);
         }
      });
   });

   /** @type {string} The scene of the combat; both clients view it. */
   const sceneId = await createScene(gm, { name: 'E2E Socket Hooks Scene' });
   await viewScene(gm, sceneId);
   await viewScene(player, sceneId);
   for (const role of [
      'owned',
      'plain',
   ]) {
      /** @type {string} The character's id. */
      const id = await createActor(gm, {
         name: `E2E Socket Hooks ${role}`,
         type: 'player',
      });
      cast[role] = {
         id,
         tokenId: await placeToken(gm, id),
      };
   }
   await setOwnership(gm, cast.owned.id, 'E2E Player 1', 'OWNER');
   await player.waitForFunction(
      (id) => game.actors.get(id)?.testUserPermission(game.user, 'OWNER'),
      cast.owned.id,
      { timeout: 1000 },
   );
   await closeAllApps(gm);
});

test.afterEach(async () => {
   if (await gm.evaluate(() => game.combat?.started === true)) {
      await endCombat(gm);
   }
   await resetDice(gm);
   await closeAllApps(gm);
   await closeAllApps(player);
   errors.length = 0;
});

test.afterAll(async () => {
   await flushPageErrors(player);
   await player?.context().close();
   await gm?.close();
});

test.describe('hooks mirrored over the socket', () => {
   test('a registered hook reaches the other client and a name the system never registered does not', async () => {
      // A hook registered as mirrored on both clients, the way the system registers its own.
      for (const page of [
         gm,
         player,
      ]) {
         await page.evaluate(() => game.titan.socketManager.registerMirroredHook('e2eMirroredProbe'));
      }
      await spyOn(gm, [
         'e2eMirroredProbe',
         'e2eForgedProbe',
      ]);
      await spyOn(player, ['e2eMirroredProbe']);

      // Presence: the GM's registered hook fires on the GM's client at once and reaches the player's client.
      await gm.evaluate(() => game.titan.socketManager.triggerSocketHook('e2eMirroredProbe', 'from gm'));
      expect(await callsOf(gm, 'e2eMirroredProbe'), 'it fires locally').toEqual([['from gm']]);
      await expect.poll(() => callsOf(player, 'e2eMirroredProbe'), { message: 'it reached the player' })
         .toEqual([['from gm']]);

      // Absence on the same GM client: the player's registered hook is delivered, an unregistered name is not.
      await emitFromPlayer({
         id: 'e2eForgedProbe',
         args: ['forged'],
      });
      await emitFromPlayer({
         id: 'e2eMirroredProbe',
         args: ['from player'],
      });
      await awaitHandled('hook-1');
      expect(await callsOf(gm, 'e2eMirroredProbe'), 'the registered hook from the player is delivered').toEqual([
         ['from gm'],
         ['from player'],
      ]);
      expect(await callsOf(gm, 'e2eForgedProbe'), 'a hook name the system never registered is not fired').toEqual([]);
      await expectGmRefusal('e2eForgedProbe');
   });

   test('the combat turn hooks fire only for a sender who may move the turn', async () => {
      await spyOn(gm, [
         'combatNextTurn',
         'combatPreviousTurn',
      ]);

      // The owned character acts first (6, 6), the plain character second (1, 1).
      await createCombat(gm);
      await addCombatant(gm, cast.owned.tokenId);
      await addCombatant(gm, cast.plain.tokenId);
      await forceDice(gm, [
         6,
         6,
         1,
         1,
      ]);
      await rollInitiative(gm);
      await resetDice(gm);
      await startCombat(gm);

      /** @type {{combatId: string, owned: string, plain: string}} The combat and its combatants' ids. */
      const ids = await gm.evaluate(({ owned, plain }) => ({
         combatId: game.combat.id,
         owned: game.combat.combatants.find((combatant) => combatant.actorId === owned).id,
         plain: game.combat.combatants.find((combatant) => combatant.actorId === plain).id,
      }), {
         owned: cast.owned.id,
         plain: cast.plain.id,
      });
      expect(await gm.evaluate(() => game.combat.combatant.id), 'the owned character acts first').toBe(ids.owned);
      await player.waitForFunction(
         (id) => game.combat?.id === id && game.combat.combatant?.id !== undefined,
         ids.combatId,
         { timeout: 1000 },
      );

      // Presence: the player ends the turn of the character the player owns with the tracker's Next Turn button, and
      // the GM's client receives the hook with the combatant whose turn ended.
      await nextTurn(player);
      await expect.poll(() => callsOf(gm, 'combatNextTurn'), { message: 'the owner\'s turn end reached the GM' })
         .toEqual([
            [
               ids.plain,
               ids.owned,
               ids.combatId,
            ],
         ]);

      // Absence on the same hook of the same client: the player forges the end of the plain character's turn, whom the
      // player does not own, and the turn hook the other way round. Both are refused.
      await emitFromPlayer({
         id: 'combatNextTurn',
         args: [
            ids.owned,
            ids.plain,
            ids.combatId,
         ],
      });
      await emitFromPlayer({
         id: 'combatPreviousTurn',
         args: [
            ids.owned,
            ids.plain,
            ids.combatId,
         ],
      });
      await awaitHandled('hook-2');
      await expectGmRefusal('"combatNextTurn" was refused');
      await expectGmRefusal('"combatPreviousTurn" was refused');
      expect(await callsOf(gm, 'combatNextTurn'), 'the forged next turn did not fire').toHaveLength(1);
      expect(await callsOf(gm, 'combatPreviousTurn'), 'the forged previous turn did not fire').toEqual([]);
   });
});
