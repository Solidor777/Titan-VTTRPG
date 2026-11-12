import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { createActor, setStaticModsShown } from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The Static Mods header button: its pressed state, its icon, its size against the Edit Token button, the flag it
 * stores and its persistence across sheet reopenings, on Player and NPC sheets. Every actor is made through the
 * Actors tab.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads the Static Mods flag of an actor from the server-side data.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} uuid - The uuid of the actor.
 * @returns {Promise<boolean | undefined>} The stored flag, or undefined when none is stored.
 */
async function readFlag(page, uuid) {
   return page.evaluate(async (uuid) => (await fromUuid(uuid)).flags.titan?.showStaticMods, uuid);
}

/**
 * Asserts that the Static Mods button is as wide and as tall as the Edit Token button, within 1px.
 * @param {import('@playwright/test').Locator} sheet - The open sheet's window element.
 * @returns {Promise<void>} Resolves once the boxes are measured and compared.
 */
async function expectSameBoxAsEditToken(sheet) {
   /** @type {import('@playwright/test').Locator} The Static Mods button. */
   const button = sheet.locator('.window-header .static-mods-button');

   /** @type {import('@playwright/test').Locator} The Edit Token button. */
   const editToken = sheet.locator('.window-header .edit-token-button');

   /** @type {{width: number, height: number}} The Static Mods button's box. */
   const buttonBox = await button.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return {
         width,
         height,
      };
   });

   /** @type {{width: number, height: number}} The Edit Token button's box. */
   const editBox = await editToken.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return {
         width,
         height,
      };
   });
   expect(Math.abs(buttonBox.width - editBox.width)).toBeLessThanOrEqual(1);
   expect(Math.abs(buttonBox.height - editBox.height)).toBeLessThanOrEqual(1);
}

test.describe('the Static Mods header button', () => {
   test('a new player starts hidden: pressed false, slashed icon, no flag stored', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 1',
         type: 'player',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, uuid);

      /** @type {import('@playwright/test').Locator} The Static Mods button. */
      const button = sheet.locator('.window-header .static-mods-button');
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button.locator('i.fa-plus-minus')).toHaveCount(1);
      await expect(button.locator('i.fa-slash')).toHaveCount(1);
      expect(await readFlag(page, uuid)).toBeUndefined();
   });

   test('pressing it shows the inputs: pressed true, slash gone, flag true, button as big as Edit Token', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 2',
         type: 'player',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, uuid);

      /** @type {import('@playwright/test').Locator} The Static Mods button. */
      const button = sheet.locator('.window-header .static-mods-button');
      await expectSameBoxAsEditToken(sheet);
      await setStaticModsShown(sheet, true);
      await expect(button.locator('i.fa-plus-minus')).toHaveCount(1);
      await expect(button.locator('i.fa-slash')).toHaveCount(0);
      await expect.poll(() => readFlag(page, uuid), { message: 'the flag is stored' }).toBe(true);
      await expectSameBoxAsEditToken(sheet);
   });

   test('the setting survives closing and reopening the sheet', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 3',
         type: 'player',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      let sheet = await openSheetByUuid(page, uuid);
      await setStaticModsShown(sheet, true);
      await closeAllApps(page);
      sheet = await openSheetByUuid(page, uuid);
      await expect(sheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'true');

      await setStaticModsShown(sheet, false);
      await closeAllApps(page);
      sheet = await openSheetByUuid(page, uuid);
      await expect(sheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'false');
      expect(await readFlag(page, uuid)).toBe(false);
   });

   test('an NPC sheet has the same button and stores the same flag', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 4',
         type: 'npc',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await setStaticModsShown(sheet, true);
      await expect.poll(() => readFlag(page, uuid), { message: 'the flag is stored' }).toBe(true);
      await expect(sheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'true');
   });
});
