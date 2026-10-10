import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   activateScene,
   controlPlacedToken,
   createActor,
   createScene,
   placeToken,
   readServerSystem,
   setAttributeBase,
   setOwnership,
   viewScene,
} from './flows.js';
import { withClients } from './multiClient.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * The resource meters (Stamina, Resolve, Wounds) edited from the character sheet's sidebar inputs and from the Player
 * HUD's bar inputs: typed values, relative `+`/`-` entries, entries above the maximum and below zero, text that is no
 * number, the same value entered on either surface and read on the other, and the HUD of a second client.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the character the tests edit. */
let actorUuid;
/** @type {string} The character's id. */
let actorId;
/** @type {number} The run stamp in the fixture names. */
const RUN = Date.now();
/** @type {string[]} The resources, in the order of the sheet's sidebar. */
const RESOURCES = [
   'stamina',
   'wounds',
   'resolve',
];

/**
 * Selects an element of the Player HUD of a page by its test id.
 * @param {import('@playwright/test').Page} on - The page.
 * @param {string} id - The test id.
 * @returns {import('@playwright/test').Locator} The element.
 */
function hud(on, id) {
   return on.locator(`[data-testid="${id}"]`);
}

/**
 * Reads a value the server stores for the character's resource.
 * @param {string} resource - The resource.
 * @returns {Promise<number>} The stored current value.
 */
async function stored(resource) {
   return (await readServerSystem(page, actorUuid)).resource[resource].value;
}

/**
 * Opens the character's sheet and returns its input and max label of a resource.
 * @param {string} resource - The resource.
 * @returns {Promise<{input: import('@playwright/test').Locator, max: import('@playwright/test').Locator}>} The
 * sheet's controls.
 */
async function sheetMeter(resource) {
   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   return {
      input: sheet.getByTestId(`sheet-resource-${resource}-input`),
      max: sheet.getByTestId(`sheet-resource-${resource}-max`),
   };
}

/**
 * Reads the maximum the sheet displays for a resource.
 * @param {string} resource - The resource.
 * @returns {Promise<number>} The displayed maximum.
 */
async function displayedMax(resource) {
   /** @type {{max: import('@playwright/test').Locator}} The sheet's controls. */
   const { max } = await sheetMeter(resource);
   return Number((await max.innerText()).trim());
}

/**
 * Types into the sheet's current-value input of a resource.
 * @param {string} resource - The resource.
 * @param {string|number} text - The text typed.
 * @returns {Promise<void>} Resolves once the entry is committed.
 */
async function typeOnSheet(resource, text) {
   /** @type {{input: import('@playwright/test').Locator}} The sheet's controls. */
   const { input } = await sheetMeter(resource);
   await commitText(input, text);
}

/**
 * Types into the HUD's bar input of a resource.
 * @param {string} resource - The resource.
 * @param {string|number} text - The text typed.
 * @returns {Promise<void>} Resolves once the entry is committed.
 */
async function typeOnHud(resource, text) {
   await commitText(hud(page, `player-hud-bar-${resource}-input`), text);
}

/**
 * Asserts the stored value and both surfaces of the GM page show a value of a resource.
 * @param {string} resource - The resource.
 * @param {number} value - The expected current value.
 * @returns {Promise<void>} Resolves once all agree.
 */
async function expectEverywhere(resource, value) {
   await expect.poll(() => stored(resource), { message: `the server stores ${resource} ${value}` }).toBe(value);
   await expect(hud(page, `player-hud-bar-${resource}-input`), `the HUD bar shows ${resource} ${value}`)
      .toHaveValue(String(value));
   /** @type {{input: import('@playwright/test').Locator}} The sheet's controls. */
   const { input } = await sheetMeter(resource);
   await expect(input, `the sheet input shows ${resource} ${value}`).toHaveValue(String(value));
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   /** @type {string} The scene the token stands on. */
   const sceneId = await createScene(page, { name: `E2E Resources Scene ${RUN}` });
   await viewScene(page, sceneId);
   actorId = await createActor(page, {
      name: `E2E Resources Actor ${RUN}`,
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   for (const attribute of [
      'body',
      'mind',
      'soul',
   ]) {
      await setAttributeBase(page, actorUuid, attribute, 4);
   }
   await placeToken(page, actorId);
   await setOwnership(page, actorId, 'E2E Player 1', 'OWNER');
   if (!await page.evaluate((id) => game.scenes.get(id).active, sceneId)) {
      await activateScene(page, sceneId);
   }
   await closeAllApps(page);
});

test.beforeEach(async () => {
   /** @type {string} The id of the placed token of the character. */
   const tokenId = await page.evaluate((id) => canvas.scene.tokens.find((token) => token.actorId === id).id, actorId);
   await controlPlacedToken(page, tokenId);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('typed values on both surfaces', () => {
   for (const resource of RESOURCES) {
      test(`${resource}: a value typed on the sheet shows on the HUD and the reverse`, async () => {
         /** @type {number} The maximum the sheet displays. */
         const max = await displayedMax(resource);
         expect(max, `${resource} has room for the values below`).toBeGreaterThanOrEqual(1);

         await typeOnSheet(resource, 1);
         await expectEverywhere(resource, 1);

         // The maximum entered on the HUD reaches the sheet.
         await typeOnHud(resource, max);
         await expectEverywhere(resource, max);

         await typeOnHud(resource, 0);
         await expectEverywhere(resource, 0);

         await typeOnSheet(resource, max);
         await expectEverywhere(resource, max);
      });
   }
});

test.describe('entries the meters clamp or refuse', () => {
   for (const resource of RESOURCES) {
      test(`${resource}: an entry above the maximum is held at the maximum`, async () => {
         /** @type {number} The maximum the sheet displays. */
         const max = await displayedMax(resource);
         await typeOnSheet(resource, 0);
         await expectEverywhere(resource, 0);

         await typeOnSheet(resource, max + 5);
         await expectEverywhere(resource, max);

         await typeOnSheet(resource, 0);
         await typeOnHud(resource, max + 5);
         await expectEverywhere(resource, max);
      });

      test(`${resource}: an entry below zero is held at zero`, async () => {
         await typeOnSheet(resource, 1);
         await expectEverywhere(resource, 1);

         // A leading minus is a change to the current value (1 - 9).
         await typeOnSheet(resource, '-9');
         await expectEverywhere(resource, 0);

         await typeOnSheet(resource, 1);
         await typeOnHud(resource, '-9');
         await expectEverywhere(resource, 0);
      });

      test(`${resource}: text that is no number leaves the value unchanged`, async () => {
         await typeOnSheet(resource, 1);
         await expectEverywhere(resource, 1);

         await typeOnSheet(resource, 'abc');
         await expectEverywhere(resource, 1);

         await typeOnHud(resource, '3+');
         await expectEverywhere(resource, 1);
      });
   }

   test('stamina steps with relative entries on the sheet and on the HUD', async () => {
      /** @type {number} The maximum the sheet displays. */
      const max = await displayedMax('stamina');
      expect(max, 'stamina has room to step twice').toBeGreaterThanOrEqual(4);

      await typeOnSheet('stamina', 1);
      await typeOnSheet('stamina', '+2');
      await expectEverywhere('stamina', 3);

      await typeOnHud('stamina', '-1');
      await expectEverywhere('stamina', 2);

      await typeOnHud('stamina', '+2');
      await expectEverywhere('stamina', 4);

      // An expression is evaluated, not read as a number.
      await typeOnSheet('stamina', '(1+1)*2-1');
      await expectEverywhere('stamina', 3);
   });
});

test.describe('a second client', () => {
   test('a player\'s HUD shows what the sheet stores and writes through its own bar', async ({ browser }) => {
      await typeOnSheet('stamina', 1);
      await typeOnSheet('wounds', 0);
      await typeOnSheet('resolve', 1);

      await withClients(browser, { player: 'E2E Player 1' }, async ({ player }) => {
         for (const [resource, value] of [
            [
               'stamina',
               1,
            ],
            [
               'wounds',
               0,
            ],
            [
               'resolve',
               1,
            ],
         ]) {
            await expect(
               hud(player, `player-hud-bar-${resource}-input`),
               `the player's HUD shows ${resource} ${value}`,
            ).toHaveValue(String(value));
         }

         // The GM edits again on the sheet; the player's bar follows.
         await typeOnSheet('stamina', 2);
         await expect(hud(player, 'player-hud-bar-stamina-input'), 'the player\'s bar follows the GM sheet')
            .toHaveValue('2');

         // The player types into the HUD; the server and the GM's views follow.
         await commitText(hud(player, 'player-hud-bar-wounds-input'), 1);
         await expectEverywhere('wounds', 1);
         await commitText(hud(player, 'player-hud-bar-stamina-input'), '+1');
         await expectEverywhere('stamina', 3);
      });
   });
});
