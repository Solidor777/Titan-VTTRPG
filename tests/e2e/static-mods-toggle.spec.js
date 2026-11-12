import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import { createActor, readServerSystem, setStaticModsShown } from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { MODS } from '~/system/Mods.js';
import { RATINGS } from '~/system/Ratings.js';
import { RESOURCES } from '~/system/Resources.js';
import { SPEEDS } from '~/system/Speeds.js';

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

test.describe('the sidebar', () => {
   /** @type {string[]} The test ids of every sidebar static mod input: 3 Resources, 5 Ratings, 1 Mod and 5 Speeds. */
   const sidebarModIds = [
      ...RESOURCES.map((resource) => `sheet-resource-${resource}-mod`),
      ...RATINGS.map((rating) => `sheet-rating-${rating}-mod`),
      ...MODS.filter((mod) => mod === 'armor').map((mod) => `sheet-mod-${mod}-mod`),
      ...SPEEDS.map((speed) => `sheet-speed-${speed}-mod`),
   ];

   /** @type {string[]} The test ids of every sidebar total, which shows in both states. */
   const sidebarTotalIds = [
      ...RESOURCES.map((resource) => `sheet-resource-${resource}-max`),
      ...RATINGS.map((rating) => `sheet-rating-${rating}`),
      'sheet-mod-armor',
      ...SPEEDS.map((speed) => `sheet-speed-${speed}`),
   ];

   /** @type {string} The uuid of the actor measured by the sidebar tests. */
   let uuid;
   /** @type {import('@playwright/test').Locator} The actor's open sheet. */
   let sheet;

   test.beforeAll(async () => {
      uuid = `Actor.${await createActor(page, {
         name: 'E2E Static Mods Sidebar',
         type: 'player',
      })}`;
   });

   test.beforeEach(async () => {
      sheet = await openSheetByUuid(page, uuid);
   });

   /**
    * Measures the sidebar: the width of its inner column, and the heights of its sections and of each Resource, Rating,
    * Mod and Speed container.
    * @returns {Promise<{width: number, sections: number[], containers: number[]}>} The rounded width and the heights.
    */
   function measureSidebar() {
      return sheet.evaluate((element) => {
         /** @type {Element} The sidebar column that sizes itself from the sidebar width. */
         const column = element.querySelector('.titan-sheet > .sidebar > .sidebar');
         return {
            width: Math.round(column.getBoundingClientRect().width),
            sections: [...element.querySelectorAll('.titan-sheet > .sidebar .section')]
               .map((section) => section.getBoundingClientRect().height),
            containers: [...element.querySelectorAll('.titan-sheet > .sidebar .section .container')]
               .map((container) => container.getBoundingClientRect().height),
         };
      });
   }

   test('hidden: no sidebar static mod input exists and every total is still shown', async () => {
      await setStaticModsShown(sheet, false);
      for (const id of sidebarModIds) {
         await expect(sheet.getByTestId(id), id).toHaveCount(0);
      }
      for (const id of sidebarTotalIds) {
         await expect(sheet.getByTestId(id), id).toBeVisible();
      }
   });

   test('shown: every sidebar static mod input exists (3 resources, 5 ratings, 1 mod, 5 speeds)', async () => {
      await setStaticModsShown(sheet, true);
      for (const id of sidebarModIds) {
         await expect(sheet.getByTestId(id), id).toHaveCount(1);
      }
      expect(sidebarModIds).toHaveLength(14);
   });

   test('the sidebar is 184px wide hidden and 208px shown', async () => {
      await setStaticModsShown(sheet, false);
      await expect.poll(async () => (await measureSidebar()).width, { message: 'hidden width' }).toBe(184);
      await setStaticModsShown(sheet, true);
      await expect.poll(async () => (await measureSidebar()).width, { message: 'shown width' }).toBe(208);
   });

   test('toggling does not change any sidebar row height', async () => {
      await setStaticModsShown(sheet, false);
      await expect(sheet.getByTestId('sheet-rating-defense-mod')).toHaveCount(0);

      /** @type {Awaited<ReturnType<typeof measureSidebar>>} The sidebar measured hidden. */
      const hidden = await measureSidebar();
      await setStaticModsShown(sheet, true);
      await expect(sheet.getByTestId('sheet-rating-defense-mod')).toHaveCount(1);

      /** @type {Awaited<ReturnType<typeof measureSidebar>>} The sidebar measured shown. */
      const shown = await measureSidebar();
      expect(shown.sections).toHaveLength(hidden.sections.length);
      expect(shown.containers).toHaveLength(hidden.containers.length);
      for (const [index, height] of hidden.sections.entries()) {
         expect(Math.abs(shown.sections[index] - height), `section ${index} height`).toBeLessThanOrEqual(1);
      }
      for (const [index, height] of hidden.containers.entries()) {
         expect(Math.abs(shown.containers[index] - height), `container ${index} height`).toBeLessThanOrEqual(1);
      }
   });

   test('a typed static mod still counts while hidden', async () => {
      await setStaticModsShown(sheet, true);

      /** @type {import('@playwright/test').Locator} The Defense total. */
      const total = sheet.getByTestId('sheet-rating-defense');

      /** @type {number} The Defense total before the static mod is typed. */
      const before = Number(await total.textContent());
      await commitText(sheet.getByTestId('sheet-rating-defense-mod'), '2');
      await expect(total).toHaveText(String(before + 2));
      await expect.poll(
         async () => (await readServerSystem(page, uuid)).rating.defense.mod.static,
         { message: 'the static mod is stored' },
      ).toBe(2);
      await setStaticModsShown(sheet, false);
      await expect(sheet.getByTestId('sheet-rating-defense-mod')).toHaveCount(0);
      await expect(total).toHaveText(String(before + 2));
      expect((await readServerSystem(page, uuid)).rating.defense.mod.static).toBe(2);
   });
});
