import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   deleteFixtureActor,
   deleteOrphanedTokens,
   newestMessageType,
} from './world.js';

/**
 * Item-sheet check rolling (owner path): as the GM login (an owner of every item) the item sheet's
 * sidebar shows the condensed roll button in place of the static info line, and the editing settings
 * panels show a top roll-preview row. Clicking a button rolls through the parent actor's existing
 * request*Check path and posts the matching check subtype. Covers item checks (equipment), attacks
 * (weapon, two attacks for per-row index targeting), and the casting check (spell).
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Item Roll Actor';

/** @type {string} Label of the equipment item's seeded item check. */
const ITEM_CHECK_LABEL = 'E2E Roll Item Check';

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test. */
let errors;
/** @type {{equipmentId: string, weaponId: string, spellId: string}} Seeded document ids. */
let ids;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await deleteOrphanedTokens(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('item-sheet check rolling (owner)', () => {
   test.beforeEach(async () => {
      /** @type {boolean} Whether the TITAN system finished initializing in the shared page. */
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(systemReady, `TITAN system failed to initialize.\n${errors.join('\n')}`).toBe(true);

      await deleteFixtureActor(page, ACTOR_NAME);

      ids = await page.evaluate(async ({ actorName, itemCheck }) => {
         const actor = await Actor.create({ name: actorName, type: 'player' });
         const [equipment] = await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
         ]);
         const [weapon] = await actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Roll Weapon',
               type: 'weapon',
               system: {
                  attack: [
                     { label: 'E2E Roll Attack One', attribute: 'body', skill: 'meleeWeapons', type: 'melee' },
                     { label: 'E2E Roll Attack Two', attribute: 'mind', skill: 'rangedWeapons', type: 'ranged' },
                  ],
               },
            },
         ]);
         const [spell] = await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Roll Spell', type: 'spell' },
         ]);

         // Roll straight to chat: no options dialog.
         await game.settings.set('titan', 'getCheckOptions', false);

         return { equipmentId: equipment.id, weaponId: weapon.id, spellId: spell.id };
      }, {
         actorName: ACTOR_NAME,
         itemCheck: buildCheck(ITEM_CHECK_LABEL, 'e2e-roll-item-check'),
      });
   });

   test.afterEach(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
      });
   });

   test.afterAll(async () => {
      await deleteFixtureActor(page, ACTOR_NAME);
   });

   /**
    * Opens an item's sheet by id and waits for the Svelte mount.
    * @param {string} itemId - The embedded item's id.
    * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
    */
   async function openItemSheet(itemId) {
      await closeAllApps(page);
      await page.evaluate(async ({ actorName, id }) => {
         const item = game.actors.getName(actorName).items.get(id);
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'item sheet mounted' },
         );
      }, { actorName: ACTOR_NAME, id: itemId });
      return page.locator('.application.titan-document-sheet');
   }

   test('equipment sidebar roll button posts an itemCheck', async () => {
      const sheet = await openItemSheet(ids.equipmentId);

      /** @type {import('@playwright/test').Locator} The sidebar roll button. */
      const button = sheet.locator('.sidebar-check .header .roll button').first();
      await expect(button, 'sidebar roll button renders for the owner').toBeVisible();

      /** @type {number} The world message count before the roll. */
      const before = await page.evaluate(() => game.messages.size);
      await button.click();
      await expect
         .poll(() => newestMessageType(page, before), { message: 'roll posts an itemCheck' })
         .toBe('itemCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('weapon sidebar second attack row targets attack index 1 and posts an attackCheck', async () => {
      const sheet = await openItemSheet(ids.weaponId);

      /** @type {import('@playwright/test').Locator} The roll buttons, one per attack row, in order. */
      const buttons = sheet.locator('.sidebar-check .header .roll button');
      await expect(buttons, 'both attack rows render a roll button').toHaveCount(2);

      /** @type {number} The world message count before the roll. */
      const before = await page.evaluate(() => game.messages.size);
      await buttons.nth(1).click();
      await expect
         .poll(() => newestMessageType(page, before), { message: 'second attack posts an attackCheck' })
         .toBe('attackCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('spell sidebar casting button posts a castingCheck', async () => {
      const sheet = await openItemSheet(ids.spellId);

      /** @type {import('@playwright/test').Locator} The casting sidebar roll button. */
      const button = sheet.locator('.sidebar-check .header .roll button').first();
      await expect(button, 'casting roll button renders for the owner').toBeVisible();

      /** @type {number} The world message count before the roll. */
      const before = await page.evaluate(() => game.messages.size);
      await button.click();
      await expect
         .poll(() => newestMessageType(page, before), { message: 'roll posts a castingCheck' })
         .toBe('castingCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('equipment check settings panel shows the roll-preview row', async () => {
      const sheet = await openItemSheet(ids.equipmentId);

      // Activate the Checks tab, then expand the seeded check's settings.
      await sheet.getByText('Checks', { exact: true }).first().click();

      /** @type {import('@playwright/test').Locator} The check settings panel header (expands on click). */
      const header = sheet.locator('.check .header').first();
      await expect(header, 'check settings header renders').toBeVisible();
      await header.locator('button').first().click();

      /** @type {import('@playwright/test').Locator} The roll-preview button inside the expanded panel. */
      const previewButton = sheet.locator('.check .expandable-content .check-button button').first();
      await expect(previewButton, 'settings panel shows the roll-preview button').toBeVisible();

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
