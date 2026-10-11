import { expect, flushPageErrors, test } from './harness.js';
import { clickSheetTab, commitText } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   activateScene,
   addEffect,
   controlPlacedToken,
   createActor,
   createOwnedItem,
   createScene,
   deleteOwnedItem,
   hoverToken,
   openPlacedTokenSheet,
   pickPortrait,
   placeToken,
   restOnToken,
   setAttributeBase,
   setOwnership,
   setResource,
   setTokenElevation,
   setTokenSize,
   toggleTokenLink,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps, discardKnownPageErrors, showChatLog } from './world.js';

/**
 * Linked actors and their scene tokens, with two clients (E2E GM 1 and E2E Player 1, who owns the actors). One actor
 * has two placed linked tokens; a second actor has an unlinked token. Changes are made through the actor sheet, the
 * sheet a token double-click opens, the Token HUD, the Player HUD and the token configuration windows, and read on both
 * clients from the actor, `token.actor`, the canvas token, the open sheets and the Player HUD. The prototype token is a
 * template for tokens placed afterwards (read: `Actor#_onUpdate` calls `_updateDependentTokens`, which refreshes a
 * token's actor but does not copy the prototype into it, `client/documents/actor.mjs:684,773`, Foundry 14.364).
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who owns the actors. */
let player;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {string} The id of the scene the tokens stand on. */
let sceneId;
/** @type {string} The id of the linked actor. */
let actorId;
/** @type {string} The id of the actor whose token is unlinked. */
let unlinkedActorId;
/** @type {string[]} The ids of the two linked tokens of the linked actor. */
const linkedTokens = [];
/** @type {string} The id of the unlinked token. */
let unlinkedTokenId;
/** @type {string} The linked actor's name when the file starts. */
let startName;
/** @type {string|undefined} The scene that was active before the file activated its own. */
let previousSceneId;
/** @type {{confirmDeletingEffects: boolean, confirmDeletingItems: boolean}} The GM's settings before the file. */
let previousSettings;

/** @type {number} The run stamp in every fixture name. */
const RUN = Date.now();

/**
 * Reads values of the linked actor and its tokens on one client.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} expression - A function body source taking `(actor, tokens)`, returning the value.
 * @returns {Promise<*>} The value.
 */
function read(page, expression) {
   return page.evaluate(({ actorId, sceneId, linkedTokens, expression }) => {
      /** @type {Actor} The world actor. */
      const actor = game.actors.get(actorId);

      /** @type {TokenDocument[]} The linked tokens. */
      const tokens = linkedTokens.map((id) => game.scenes.get(sceneId).tokens.get(id));
      return new Function('actor', 'tokens', `return (${expression})(actor, tokens);`)(actor, tokens);
   }, {
      actorId,
      sceneId,
      linkedTokens,
      expression,
   });
}

/**
 * Asserts that a value read from the actor, from each token's actor and from each canvas token's actor is the same on
 * both clients.
 * @param {string} path - The data path below `system`.
 * @param {*} expected - The value every reading must equal.
 * @returns {Promise<void>} Resolves once every reading equals the value.
 */
async function expectSystemEverywhere(path, expected) {
   for (const [label, page] of [
      [
         'GM',
         gm,
      ],
      [
         'player',
         player,
      ],
   ]) {
      await expect.poll(
         () => read(
            page,
            `(actor, tokens) => [actor, ...tokens.map((token) => token.actor),
               ...tokens.map((token) => token.object.actor)]
               .map((a) => foundry.utils.getProperty(a.system, ${JSON.stringify(path)}))`,
         ),
         { message: `${label}: ${path} on the actor, each token actor and each canvas token` },
      ).toEqual([
         expected,
         expected,
         expected,
         expected,
         expected,
      ]);
   }
}

/**
 * Locates the current-value input of a resource in the meter row of the actor sheet.
 * @param {import('@playwright/test').Locator} sheet - The actor's sheet.
 * @param {string} resource - The resource key.
 * @returns {import('@playwright/test').Locator} The input.
 */
function resourceInput(sheet, resource) {
   return sheet.locator(`.middle.${resource}`)
      .locator('xpath=ancestor::div[contains(@class, "container")][1]')
      .locator('.row').nth(1).locator('.side input').first();
}

/**
 * Locates an element of the player's Player HUD.
 * @param {string} id - The test id.
 * @returns {import('@playwright/test').Locator} The element.
 */
function playerHud(id) {
   return player.locator(`[data-testid="${id}"]`);
}

/**
 * Opens the sheet the double-click on a linked token opens (the world actor's sheet, with the token captured).
 * @param {string} tokenId - The linked token on the GM's viewed scene.
 * @returns {Promise<import('@playwright/test').Locator>} The sheet.
 */
async function openLinkedTokenSheet(tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client coordinates. */
   const centre = await hoverToken(gm, tokenId);
   await gm.mouse.dblclick(centre.x, centre.y);

   /** @type {import('@playwright/test').Locator} The sheet the double-click opened. */
   const sheet = gm.locator('.application.titan-document-sheet', { has: gm.locator('.unlink-token-button') });
   await expect(sheet).toBeVisible();
   return sheet;
}

/**
 * Moves the pointer onto a placed token without releasing control of the controlled tokens, for a Player seat that owns
 * every token of the scene (its other tokens stay visible while one is controlled). Releasing control presses Escape,
 * which core spends on closing a window or menu before it releases tokens
 * (`client/helpers/interaction/client-keybindings.mjs:722-760`). A GM who controls a token cannot hover a second token
 * under token vision (`releaseTokenControl` in `flows.js`), so a GM uses `hoverToken`.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} tokenId - The token on the client's viewed scene.
 * @returns {Promise<{x: number, y: number}>} The token's centre in client coordinates.
 */
async function pointAtToken(page, tokenId) {
   await closeAllApps(page);
   await showChatLog(page);

   /** @type {{x: number, y: number}} The token's centre in client coordinates. */
   const centre = await page.evaluate(
      (tokenId) => canvas.clientCoordinatesFromCanvas(canvas.scene.tokens.get(tokenId).object.center),
      tokenId,
   );
   await page.mouse.move(centre.x, centre.y, { steps: 5 });
   await page.mouse.move(centre.x + 200, centre.y);
   await restOnToken(page, tokenId, centre);
   return centre;
}

/**
 * Opens the Token Configuration window of a placed token from its Token HUD and returns it.
 * @param {string} tokenId - The placed token on the GM's viewed scene.
 * @returns {Promise<import('@playwright/test').Locator>} The configuration window.
 */
async function openTokenConfig(tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client coordinates. */
   const centre = await hoverToken(gm, tokenId);
   await gm.mouse.click(centre.x, centre.y, { button: 'right' });
   await expect(gm.locator('#token-hud')).toBeVisible();
   await gm.locator('#token-hud [data-action="config"]').click();

   /** @type {import('@playwright/test').Locator} The configuration window. */
   const config = gm.locator(`.application[id$="Token-${tokenId}"]`);
   await expect(config).toBeVisible();
   return config;
}

/**
 * Closes the Token HUD the way a user does: a click on the token.
 * @param {string} tokenId - The token whose HUD is open.
 * @param {import('@playwright/test').Page} [page] - The client; the GM's by default.
 * @returns {Promise<void>} Resolves once the HUD is hidden.
 */
async function closeHud(tokenId, page = gm) {
   /** @type {{x: number, y: number}} The token's centre in client coordinates. */
   const centre = await page.evaluate(
      (tokenId) => canvas.clientCoordinatesFromCanvas(canvas.scene.tokens.get(tokenId).object.center),
      tokenId,
   );
   await restOnToken(page, tokenId, centre);
   await page.mouse.click(centre.x, centre.y);
   await expect(page.locator('#token-hud')).toBeHidden();
}

/**
 * Reads the stored (not animated) name, size, elevation and image of a placed token on a client.
 * @param {import('@playwright/test').Page} page - The client.
 * @param {string} tokenId - The token.
 * @returns {Promise<{name: string, width: number, height: number, elevation: number, src: string}>} The stored values.
 */
function readToken(page, tokenId) {
   return page.evaluate(({ sceneId, tokenId }) => {
      /** @type {TokenDocument} The token. */
      const token = game.scenes.get(sceneId).tokens.get(tokenId);
      return {
         name: token._source.name,
         width: token._source.width,
         height: token._source.height,
         elevation: token._source.elevation,
         src: token._source.texture.src,
      };
   }, {
      sceneId,
      tokenId,
   });
}

test.beforeAll(async ({ browser }) => {
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   previousSettings = await gm.evaluate(() => ({
      confirmDeletingEffects: game.settings.get('titan', 'confirmDeletingEffects'),
      confirmDeletingItems: game.settings.get('titan', 'confirmDeletingItems'),
   }));
   previousSceneId = await gm.evaluate(() => game.scenes.active?.id);
   await setClientSetting(gm, 'confirmDeletingEffects', false);
   await setClientSetting(gm, 'confirmDeletingItems', false);
   player = await (await browser.newContext()).newPage();
   await login(player, 'E2E Player 1');

   sceneId = await createScene(gm, { name: `E2E Sync Scene ${RUN}` });
   await activateScene(gm, sceneId);
   actorId = await createActor(gm, {
      name: `E2E Sync Actor ${RUN}`,
      type: 'player',
   });
   startName = `E2E Sync Actor ${RUN}`;
   unlinkedActorId = await createActor(gm, {
      name: `E2E Sync Unlinked Actor ${RUN}`,
      type: 'player',
   });
   await toggleTokenLink(gm, unlinkedActorId);
   await setOwnership(gm, actorId, 'E2E Player 1', 'OWNER');
   await setOwnership(gm, unlinkedActorId, 'E2E Player 1', 'OWNER');
   await viewScene(gm, sceneId);
   linkedTokens.push(await placeToken(gm, actorId), await placeToken(gm, actorId));
   unlinkedTokenId = await placeToken(gm, unlinkedActorId);
   await closeAllApps(gm);
   await player.waitForFunction(
      (sceneId) => canvas.ready && canvas.scene?.id === sceneId && canvas.scene.tokens.size === 3,
      sceneId,
      { timeout: 1000 },
   );
});

test.afterEach(async () => {
   await closeAllApps(gm);
   await closeAllApps(player);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   // The file leaves the world as it found it: the previously active scene is active again, the GM's client settings
   // are restored, and the scene, the tokens on it and both actors are deleted. Player 1 owns the actors, so a
   // leftover would show to him as a character in later specs (the API delete is allowed for cleanup).
   if (previousSceneId && await gm.evaluate((id) => game.scenes.has(id), previousSceneId)) {
      await activateScene(gm, previousSceneId);
   }
   await closeAllApps(gm);
   await setClientSetting(gm, 'confirmDeletingEffects', previousSettings.confirmDeletingEffects);
   await setClientSetting(gm, 'confirmDeletingItems', previousSettings.confirmDeletingItems);
   await gm.evaluate(async ({ sceneId, actorIds }) => {
      await game.scenes.get(sceneId)?.delete();
      for (const id of actorIds) {
         await game.actors.get(id)?.delete();
      }
   }, {
      sceneId,
      actorIds: [
         actorId,
         unlinkedActorId,
      ],
   });
   for (const page of [
      gm,
      player,
   ]) {
      await expect.poll(
         () => page.evaluate(({ sceneId, actorIds }) => ({
            scene: game.scenes.has(sceneId),
            actors: actorIds.filter((id) => game.actors.has(id)),
            active: game.scenes.active?.id,
         }), {
            sceneId,
            actorIds: [
               actorId,
               unlinkedActorId,
            ],
         }),
         { message: 'nothing the file made is left on the client' },
      ).toEqual({
         scene: false,
         actors: [],
         active: previousSceneId,
      });
   }
   await flushPageErrors(player);
   await player?.context().close();
   await gm?.close();
});

test.describe('actor changes reach the tokens and the other client, both ways', () => {
   test('the placed tokens of a linked actor resolve the world actor itself on both clients', async () => {
      for (const page of [
         gm,
         player,
      ]) {
         expect(await read(page, '(actor, tokens) => tokens.map((token) => token.actorLink)')).toEqual([
            true,
            true,
         ]);
         expect(await read(page, '(actor, tokens) => tokens.map((token) => token.actor === actor)')).toEqual([
            true,
            true,
         ]);
      }
   });

   test('stamina typed on the actor sheet, then in the Player HUD, then in the Token HUD', async () => {
      const uuid = `Actor.${actorId}`;
      const gmSheet = await openSheetByUuid(gm, uuid);
      await setResource(gm, uuid, 'stamina', 2);
      await expectSystemEverywhere('resource.stamina.value', 2);
      await expect(playerHud('player-hud-bar-stamina-input')).toHaveValue('2');

      // The player's Player HUD bar writes the owner's change; the GM's open sheet follows.
      await commitText(playerHud('player-hud-bar-stamina-input'), 1);
      await expectSystemEverywhere('resource.stamina.value', 1);
      await expect(resourceInput(gmSheet, 'stamina')).toHaveValue('1');
      await expect(playerHud('player-hud-bar-stamina-input')).toHaveValue('1');

      // The GM's Token HUD bar of the second token writes the same actor.
      const centre = await hoverToken(gm, linkedTokens[1]);
      await gm.mouse.click(centre.x, centre.y, { button: 'right' });
      const bar = gm.locator('#token-hud input[name="bar1"]');
      await expect(bar).toBeVisible();
      await bar.fill('2');
      await bar.press('Enter');
      await expectSystemEverywhere('resource.stamina.value', 2);
      await expect(playerHud('player-hud-bar-stamina-input')).toHaveValue('2');
      await expect.poll(
         () => read(gm, '(actor, tokens) => tokens.map((token) => token.getBarAttribute("bar1").value)'),
         { message: 'both tokens report the bar value' },
      ).toEqual([
         2,
         2,
      ]);
      await closeHud(linkedTokens[1]);
   });

   test('an attribute typed in the sheet a token double-click opens reaches the other token and client', async () => {
      const original = await read(gm, '(actor) => actor.system.attribute.body.baseValue');
      const sheet = await openLinkedTokenSheet(linkedTokens[0]);
      const input = sheet.locator('.container:has(> .button > button.body) .stats input').first();
      await commitText(input, original + 1);
      await expectSystemEverywhere('attribute.body.baseValue', original + 1);

      // The second token's sheet and the player's sheet show the value.
      await closeAllApps(gm);
      const second = await openLinkedTokenSheet(linkedTokens[1]);
      await expect(second.locator('.container:has(> .button > button.body) .stats input').first())
         .toHaveValue(String(original + 1));
      const playerSheet = await openSheetByUuid(player, `Actor.${actorId}`);
      await expect(playerSheet.locator('.container:has(> .button > button.body) .stats input').first())
         .toHaveValue(String(original + 1));

      // The player owns the actor and edits the attribute back; the GM's open sheet follows.
      await setAttributeBase(player, `Actor.${actorId}`, 'body', original);
      await expectSystemEverywhere('attribute.body.baseValue', original);
      await expect(second.locator('.container:has(> .button > button.body) .stats input').first())
         .toHaveValue(String(original));
   });

   test('an effect added on the GM sheet shows on the player, the HUD and the tokens, then goes', async () => {
      const effectName = `E2E Sync Effect ${RUN}`;
      const effectId = await addEffect(gm, actorId, effectName);
      await closeAllApps(gm);
      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(
            () => read(
               page,
               `(actor, tokens) => [actor, ...tokens.map((token) => token.actor)]
                  .map((a) => a.effects.map((effect) => effect.name))`,
            ),
            { message: 'the effect is on the actor and on both token actors' },
         ).toEqual([
            [effectName],
            [effectName],
            [effectName],
         ]);
      }
      await expect(playerHud('player-hud-effect-row').filter({ hasText: effectName })).toHaveCount(1);

      const sheet = await openLinkedTokenSheet(linkedTokens[0]);
      await clickSheetTab(sheet, 'Effects');
      await sheet.locator(`[data-effect-id="${effectId}"]`).getByRole('button', { name: 'Delete Effect' }).click();
      await expect.poll(
         () => read(
            player,
            '(actor, tokens) => [actor.effects.size, ...tokens.map((token) => token.actor.effects.size)]',
         ),
         { message: 'the delete reached the player client' },
      ).toEqual([
         0,
         0,
         0,
      ]);
      await expect(playerHud('player-hud-effect-row').filter({ hasText: effectName })).toHaveCount(0);
   });

   test('an item added on the GM sheet shows on the player sheet and token actors, then goes', async () => {
      const itemName = `E2E Sync Equipment ${RUN}`;
      const itemId = await createOwnedItem(gm, actorId, 'equipment', itemName);
      await closeAllApps(gm);
      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(
            () => read(
               page,
               `(actor, tokens) => [actor, ...tokens.map((token) => token.actor)]
                  .map((a) => a.items.map((item) => item.name))`,
            ),
            { message: 'the item is on the actor and on both token actors' },
         ).toEqual([
            [itemName],
            [itemName],
            [itemName],
         ]);
      }
      const playerSheet = await openSheetByUuid(player, `Actor.${actorId}`);
      await clickSheetTab(playerSheet, 'Inventory');
      await settle(player, { transitions: true });
      await expect(playerSheet.locator(`[data-item-id="${itemId}"]`)).toHaveCount(1);
      await deleteOwnedItem(gm, `Actor.${actorId}`, 'Inventory', `Actor.${actorId}.Item.${itemId}`);
      await expect(playerSheet.locator(`[data-item-id="${itemId}"]`)).toHaveCount(0);
      expect(await read(player, '(actor, tokens) => tokens.map((token) => token.actor.items.size)')).toEqual([
         0,
         0,
      ]);
   });

   test('the name typed on the sheet reaches the clients and the HUD, not the placed tokens', async () => {
      const sheet = await openSheetByUuid(gm, `Actor.${actorId}`);
      const playerSheet = await openSheetByUuid(player, `Actor.${actorId}`);
      await commitText(sheet.locator('.document-name input'), 'E2E Sync Renamed');
      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(
            () => read(page, '(actor, tokens) => [actor.name, ...tokens.map((token) => token.actor.name)]'),
            { message: 'the actor and its token actors report the name' },
         ).toEqual([
            'E2E Sync Renamed',
            'E2E Sync Renamed',
            'E2E Sync Renamed',
         ]);
      }
      await expect(playerSheet.locator('.document-name input')).toHaveValue('E2E Sync Renamed');
      await expect(playerHud('player-hud-portrait').locator('.name')).toHaveText('E2E Sync Renamed');

      // The placed tokens keep their own name (measured: probe1.log; core stores it per token).
      for (const page of [
         gm,
         player,
      ]) {
         expect(await read(page, '(actor, tokens) => tokens.map((token) => token.name)')).toEqual([
            startName,
            startName,
         ]);
      }

      // The owner's rename from the player's sheet reaches the GM's open sheet.
      await commitText(playerSheet.locator('.document-name input'), 'E2E Sync Renamed Twice');
      await expect(sheet.locator('.document-name input')).toHaveValue('E2E Sync Renamed Twice');
      await expect.poll(() => read(gm, '(actor) => actor.name')).toBe('E2E Sync Renamed Twice');
   });

   test('the portrait picked on the GM sheet reaches the player, the token actors and the Player HUD', async () => {
      const sheet = await openSheetByUuid(gm, `Actor.${actorId}`);
      const before = await readToken(gm, linkedTokens[0]);
      await pickPortrait(gm, sheet, 'skull.svg');
      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(
            () => read(page, '(actor, tokens) => [actor.img, ...tokens.map((token) => token.actor.img)]'),
            { message: 'the actor and its token actors report the portrait' },
         ).toEqual([
            'icons/svg/skull.svg',
            'icons/svg/skull.svg',
            'icons/svg/skull.svg',
         ]);
      }
      await expect(playerHud('player-hud-portrait').locator('img')).toHaveAttribute('src', /icons\/svg\/skull\.svg$/);

      // The placed token keeps its own image.
      expect((await readToken(player, linkedTokens[0])).src).toBe(before.src);
   });

   test('the sheet from either token and the sheet from the directory show the same actor', async () => {
      const values = [];
      for (const open of [
         () => openLinkedTokenSheet(linkedTokens[0]),
         () => openLinkedTokenSheet(linkedTokens[1]),
         () => openSheetByUuid(gm, `Actor.${actorId}`),
      ]) {
         const sheet = await open();
         values.push({
            id: await sheet.getAttribute('id'),
            name: await sheet.locator('.document-name input').inputValue(),
            stamina: await resourceInput(sheet, 'stamina').inputValue(),
            body: await sheet.locator('.container:has(> .button > button.body) .stats input').first().inputValue(),
         });
         await closeAllApps(gm);
      }
      expect(values[1], 'the second token opens the same sheet').toEqual(values[0]);
      expect(values[2], 'the directory opens the same sheet').toEqual(values[0]);
      expect(values[0].name).toBe(await read(gm, '(actor) => actor.name'));
      expect(values[0].stamina).toBe(String(await read(gm, '(actor) => actor.system.resource.stamina.value')));
      expect(values[0].body).toBe(String(await read(gm, '(actor) => actor.system.attribute.body.baseValue')));
   });

   test('an unlinked token and its base actor stay independent in both directions, on both clients', async () => {
      /** @type {string} The selector of the Body base input in a character sheet. */
      const bodyInput = '.container:has(> .button > button.body) .stats input';

      /**
       * Reads the Body base value of the base actor and of the token's synthetic actor on a client.
       * @param {import('@playwright/test').Page} page - The client.
       * @returns {Promise<number[]>} The base actor's and the synthetic actor's Body base value.
       */
      const body = (page) => page.evaluate(
         ({ sceneId, tokenId, baseId }) => [
            game.actors.get(baseId).system.attribute.body.baseValue,
            game.scenes.get(sceneId).tokens.get(tokenId).actor.system.attribute.body.baseValue,
         ],
         {
            sceneId,
            tokenId: unlinkedTokenId,
            baseId: unlinkedActorId,
         },
      );
      expect(await gm.evaluate(
         ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actorLink,
         {
            sceneId,
            tokenId: unlinkedTokenId,
         },
      ), 'the token is unlinked').toBe(false);
      const [original] = await body(gm);

      // The token actor's own sheet (opened by the token double-click) writes the synthetic actor only.
      const tokenSheet = await openPlacedTokenSheet(gm, unlinkedTokenId);
      await commitText(tokenSheet.locator(bodyInput).first(), original + 2);
      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(() => body(page), { message: 'token actor changed, base unchanged' }).toEqual([
            original,
            original + 2,
         ]);
      }

      // The base actor's sheet writes the base actor only.
      await closeAllApps(gm);
      await setAttributeBase(gm, `Actor.${unlinkedActorId}`, 'body', original + 1);
      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(() => body(page), { message: 'base changed, token actor unchanged' }).toEqual([
            original + 1,
            original + 2,
         ]);
      }
   });
});

test.describe('player seat and controlled-token HUD', () => {
   test('the Player HUD bar of a GM-controlled token writes the actor on both clients', async () => {
      await setResource(gm, `Actor.${actorId}`, 'stamina', 2);
      await closeAllApps(gm);
      await controlPlacedToken(gm, linkedTokens[0]);
      const input = gm.locator('[data-testid="player-hud-bar-stamina-input"]');
      await expect(input).toHaveValue('2');
      await commitText(input, 1);
      await expectSystemEverywhere('resource.stamina.value', 1);
      await expect(playerHud('player-hud-bar-stamina-input')).toHaveValue('1');
      await expect(input).toHaveValue('1');
   });

   test('the portrait button opens no picker for a player without file browsing, and does for the GM', async () => {
      // The picker refuses a user without FILES_BROWSE, default Trusted
      // (`client/applications/apps/file-picker.mjs:648`, `common/constants.mjs:1303-1307`).
      const gmSheet = await openSheetByUuid(gm, `Actor.${actorId}`);
      await gmSheet.locator('.portrait button').first().click();
      const picker = gm.locator('#file-picker');
      await expect(picker, 'the GM gets the picker').toBeVisible();

      // The picker filters its file list after it renders (`FilePicker#_onSearchFilter` repositions the window), so the
      // list is awaited before the window closes: a close in between leaves that filter without an element.
      await expect(picker.locator('section.body')).toBeVisible();
      await settle(gm);
      await picker.locator('[data-action="close"]').first().click();
      await expect(picker).toHaveCount(0);

      const playerSheet = await openSheetByUuid(player, `Actor.${actorId}`);
      const before = await read(player, '(actor) => actor.img');
      expect(before, 'the portrait the GM picked earlier is still the actor image').toBe('icons/svg/skull.svg');
      await playerSheet.locator('.portrait button').first().click();
      await settle(player);
      await expect(player.locator('#file-picker'), 'the player gets no picker').toHaveCount(0);
      expect(await read(player, '(actor) => actor.img'), 'the portrait is unchanged').toBe(before);
   });

   test("a player's Token HUD has the bars but no configuration, lock, visibility or elevation entry", async () => {
      // GM presence: the same HUD shows all three (`templates/hud/token-hud.hbs:15,30,43`).
      const gmCentre = await hoverToken(gm, linkedTokens[1]);
      await gm.mouse.click(gmCentre.x, gmCentre.y, { button: 'right' });
      await expect(gm.locator('#token-hud [data-action="config"]')).toHaveCount(1);
      await expect(gm.locator('#token-hud [data-action="locked"]')).toHaveCount(1);
      await expect(gm.locator('#token-hud [data-action="visibility"]')).toHaveCount(1);
      await expect(gm.locator('#token-hud input[name="elevation"]')).toBeEnabled();
      await closeHud(linkedTokens[1]);

      // The player's HUD: the owner may open it (`token.mjs:4713-4721`); the configuration button needs
      // TOKEN_CONFIGURE (`token-hud.mjs:60`), the lock and visibility buttons a GM (`token-hud.hbs:15,43`).
      // Measured (t5-logs/hud-diag.log): while the player controls one token, the scene's token vision makes the
      // player's other token invisible (`visible` false), so it takes no pointer events. The HUD is opened on the token
      // the player controls, or on the second token when none is controlled.
      /** @type {string} The token whose HUD the player opens. */
      const target = await player.evaluate(
         (fallback) => canvas.tokens.controlled[0]?.id ?? fallback,
         linkedTokens[1],
      );
      const centre = await pointAtToken(player, target);
      await player.mouse.click(centre.x, centre.y, { button: 'right' });
      await expect(player.locator('#token-hud')).toBeVisible();
      await expect(player.locator('#token-hud input[name="elevation"]')).toBeVisible();
      await expect(player.locator('#token-hud [data-action="config"]')).toHaveCount(0);
      await expect(player.locator('#token-hud [data-action="locked"]')).toHaveCount(0);
      await expect(player.locator('#token-hud [data-action="visibility"]')).toHaveCount(0);

      // The bar writes the actor on both clients.
      const bar = player.locator('#token-hud input[name="bar1"]');
      await bar.fill('2');
      await bar.press('Enter');
      await expectSystemEverywhere('resource.stamina.value', 2);
      // Measured (t5-logs/full-run.log): the player's elevation field is disabled. The template disables it for a
      // locked token and, for a non-GM, while the game is paused (`templates/hud/token-hud.hbs:4`); the test world is
      // paused and the token is not locked, so the cause is the pause. The GM's field is enabled.
      const elevation = player.locator('#token-hud input[name="elevation"]');
      await expect(elevation).toBeDisabled();
      expect(
         await player.evaluate((tokenId) => ({
            paused: game.paused,
            locked: canvas.scene.tokens.get(tokenId).locked,
         }), target),
         'the pause, not a lock, disables the field',
      ).toEqual({
         paused: true,
         locked: false,
      });
      await closeHud(target, player);
   });
});

test.describe('token changes', () => {
   test('a placed linked token is configured alone: size, elevation, name and image', async () => {
      const [first, second] = linkedTokens;
      const prototypeBefore = await read(gm, '(actor) => actor.prototypeToken.width');
      const imageBefore = await read(gm, '(actor) => actor.img');
      const secondBefore = await readToken(gm, second);
      await setTokenSize(gm, first, 2);
      await setTokenElevation(gm, first, 3);

      const config = await openTokenConfig(first);
      await config.locator('nav.tabs [data-tab="identity"]').click();
      await config.locator('input[name="name"]').fill('E2E Sync Placed Only');
      await config.locator('nav.tabs [data-tab="appearance"]').click();
      const imageInput = config.locator('file-picker[name="texture.src"] input').first();
      await imageInput.fill('icons/svg/book.svg');
      await imageInput.blur();

      await config.locator('button[type="submit"]').click();
      await expect(config).toHaveCount(0);
      await settle(gm);

      await expect.poll(
         () => read(player, '(actor, tokens) => tokens[0].object.nameplate.text'),
         { message: 'the canvas nameplate on the player client' },
      ).toBe('E2E Sync Placed Only');

      // Core defect, not TITAN code: a changed image redraws the token; `Token#_destroy` destroys its ruler without
      // clearing `token.ruler` (`client/canvas/placeables/token.mjs:1211`), `_draw` reuses it (`:1286`) and
      // `TokenRuler#draw` adds the destroyed path to the layer (`client/canvas/placeables/tokens/ruler.mjs:221`). The
      // stack holds only core frames (measured: first full run, `TokenRuler.draw` <- `Token._draw`). Only that error is
      // removed from the collected ones; any other page error still fails the test.
      for (const page of [
         gm,
         player,
      ]) {
         await discardKnownPageErrors(
            page,
            (error) => error.includes('TokenRuler.draw') && error.includes('_parentID'),
         );
      }

      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(() => readToken(page, first), { message: 'the first token holds its edits' }).toEqual({
            name: 'E2E Sync Placed Only',
            width: 2,
            height: 2,
            elevation: 3,
            src: 'icons/svg/book.svg',
         });
         expect(await readToken(page, second), 'the second token is untouched').toEqual(secondBefore);
         expect(await read(page, '(actor) => actor.prototypeToken.width'), 'the prototype is untouched')
            .toBe(prototypeBefore);
         expect(await read(page, '(actor) => actor.img'), 'the actor image is untouched').toBe(imageBefore);
      }
      await closeAllApps(gm);
   });

   test('the header follows how the sheet was opened; a double-click on an open sheet only raises it', async () => {
      const tokenId = linkedTokens[0];

      // No token is controlled when the sheet is opened, so the pointer can later reach the token under the open sheet.
      await hoverToken(gm, tokenId);
      const sheet = await openSheetByUuid(gm, `Actor.${actorId}`);

      // The sheet stands right of the tokens, which the placing drag put left of the canvas centre.
      await gm.evaluate(
         (id) => game.actors.get(id).sheet.setPosition({
            left: 1000,
            top: 40,
         }),
         actorId,
      );
      await expect(sheet.locator('.toggle-token-linked-button'), 'the prototype link toggle').toHaveCount(1);
      await expect(sheet.locator('.unlink-token-button')).toHaveCount(0);

      // Core raises an open sheet on a token double-click and renders nothing
      // (`client/canvas/placeables/token.mjs:4807-4811`), so the sheet keeps the header it was opened with.
      const centre = await hoverToken(gm, tokenId, { keepWindows: true });
      await gm.mouse.dblclick(centre.x, centre.y);
      await expect(gm.locator('.application.titan-document-sheet'), 'one sheet window').toHaveCount(1);
      await expect(sheet.locator('.toggle-token-linked-button')).toHaveCount(1);
      await expect(sheet.locator('.unlink-token-button')).toHaveCount(0);

      // Closed, the same double-click opens the sheet with the token: Unlink, and Edit Token configures the token.
      await closeAllApps(gm);
      const fromToken = await openLinkedTokenSheet(tokenId);
      await expect(fromToken.locator('.unlink-token-button')).toHaveCount(1);
      await expect(fromToken.locator('.toggle-token-linked-button')).toHaveCount(0);
      await fromToken.locator('.edit-token-button').click();
      await expect(gm.locator(`.application[id$="Token-${tokenId}"]`)).toBeVisible();
      await expect(gm.locator('.application.prototype-token-config')).toHaveCount(0);

      // Closed and reopened from the directory, the controls are the prototype's again.
      await closeAllApps(gm);
      const reopened = await openSheetByUuid(gm, `Actor.${actorId}`);
      await expect(reopened.locator('.toggle-token-linked-button')).toHaveCount(1);
      await expect(reopened.locator('.unlink-token-button')).toHaveCount(0);
   });

   test('a prototype token edit leaves placed linked tokens alone and sets the next placed token', async () => {
      const before = await Promise.all(linkedTokens.map((id) => readToken(gm, id)));
      const sheet = await openSheetByUuid(gm, `Actor.${actorId}`);
      await sheet.locator('.edit-token-button').click();

      /** @type {import('@playwright/test').Locator} The prototype token configuration window. */
      const config = gm.locator('.application.prototype-token-config');
      await expect(config).toBeVisible();
      await config.locator('nav.tabs [data-tab="identity"]').click();
      await config.locator('input[name="name"]').fill('E2E Sync Prototype');
      await config.locator('nav.tabs [data-tab="appearance"]').click();
      await config.locator('input[name="width"]').fill('3');
      await config.locator('input[name="height"]').fill('3');
      await config.locator('button[type="submit"]').click();
      await expect.poll(
         () => read(player, '(actor) => [actor.prototypeToken.name, actor.prototypeToken.width]'),
         { message: 'the prototype reached the player client' },
      ).toEqual([
         'E2E Sync Prototype',
         3,
      ]);
      for (const page of [
         gm,
         player,
      ]) {
         expect(await Promise.all(linkedTokens.map((id) => readToken(page, id))), 'placed tokens are unchanged')
            .toEqual(before);
      }

      await closeAllApps(gm);
      const tokenId = await placeToken(gm, actorId);
      for (const page of [
         gm,
         player,
      ]) {
         await expect.poll(() => readToken(page, tokenId), { message: 'the new token takes the prototype' })
            .toMatchObject({
               name: 'E2E Sync Prototype',
               width: 3,
               height: 3,
            });
      }
   });

   test('the player has no Edit Token control while the GM has', async () => {
      // The denial rests on the default TOKEN_CONFIGURE role, Trusted (`common/constants.mjs:1393-1397`).
      expect(await player.evaluate(() => game.user.role), 'the seat is a plain Player')
         .toBe(await player.evaluate(() => CONST.USER_ROLES.PLAYER));
      const gmSheet = await openSheetByUuid(gm, `Actor.${actorId}`);
      await expect(gmSheet.locator('.edit-token-button')).toHaveCount(1);
      const playerSheet = await openSheetByUuid(player, `Actor.${actorId}`);
      await expect(playerSheet.locator('.window-header')).toBeVisible();
      await expect(playerSheet.locator('.edit-token-button')).toHaveCount(0);
   });
});
