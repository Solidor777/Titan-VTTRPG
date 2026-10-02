import { expect, test } from './harness.js';
import { login, openSheetByUuid, openSheetTab } from './fixtures.js';
import { addCheck, addEffect, createActor, createOwnedItem, createWorldItem } from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The name filters of the character sheet tabs (Skills, Spells, Abilities, Inventory, Effects) and of the item sheet
 * Checks tab. Each filter narrows its own list and leaves the other tabs' lists alone: the Spells filter was once
 * bound to the Abilities filter's state, so typing in one changed the other. The documents come from flows: one
 * actor holding two entries per list, and one ability holding two checks.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the actor that holds the entries of every tab. */
let actorUuid;

/**
 * The character sheet tabs that list rows, each with the names of its two entries and the selector of one row.
 * @type {Record<string, {tab: string, names: string[], row: string}>}
 */
const LISTS = {
   spells: {
      tab: 'Spells',
      names: [
         'E2E Fireball Spell',
         'E2E Frostbite Spell',
      ],
      row: '[data-item-id]',
   },
   abilities: {
      tab: 'Abilities',
      names: [
         'E2E Alpha Ability',
         'E2E Bravo Ability',
      ],
      row: '[data-item-id]',
   },
   inventory: {
      tab: 'Inventory',
      names: [
         'E2E Longsword Weapon',
         'E2E Rope Commodity',
      ],
      row: '[data-item-id]',
   },
   effects: {
      tab: 'Effects',
      names: [
         'E2E Blessing Effect',
         'E2E Curse Effect',
      ],
      row: '[data-effect-id]',
   },
};

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);

   /** @type {string} The new actor's id. */
   const actorId = await createActor(page, {
      name: 'E2E Filters Actor',
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   await createOwnedItem(page, actorId, 'spell', LISTS.spells.names[0]);
   await createOwnedItem(page, actorId, 'spell', LISTS.spells.names[1]);
   await createOwnedItem(page, actorId, 'ability', LISTS.abilities.names[0]);
   await createOwnedItem(page, actorId, 'ability', LISTS.abilities.names[1]);
   await createOwnedItem(page, actorId, 'weapon', LISTS.inventory.names[0]);
   await createOwnedItem(page, actorId, 'commodity', LISTS.inventory.names[1]);
   await addEffect(page, actorId, LISTS.effects.names[0]);
   await addEffect(page, actorId, LISTS.effects.names[1]);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Opens the actor's sheet on a tab. The sheet instance keeps its tab filters between tests, so each test that types
 * into a filter empties it again before it ends.
 * @param {string} tab - The tab label.
 * @returns {Promise<import('@playwright/test').Locator>} The sheet's window element.
 */
async function openActorSheet(tab) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await sheet.locator('.tab-list').getByText(tab, { exact: true }).first().click();
   return sheet;
}

/**
 * Asserts the number of rows each list tab shows, opening each tab in turn.
 * @param {import('@playwright/test').Locator} sheet - The actor's sheet.
 * @param {Record<string, number>} counts - The expected row count by list key (`spells`, `abilities`, ...).
 * @returns {Promise<void>} Resolves once every count has been asserted.
 */
async function expectRowCounts(sheet, counts) {
   for (const [key, count] of Object.entries(counts)) {
      await sheet.locator('.tab-list').getByText(LISTS[key].tab, { exact: true }).first().click();
      await expect(sheet.locator(LISTS[key].row), `${key} rows`).toHaveCount(count);
   }
}

test.describe('character sheet tab filters', () => {
   for (const [key, list] of Object.entries(LISTS)) {
      test(`typing in the ${key} filter narrows only the ${key} list`, async () => {
         /** @type {import('@playwright/test').Locator} The actor's sheet. */
         const sheet = await openActorSheet(list.tab);
         await expect(sheet.locator(list.row), `both ${key} rows before filtering`).toHaveCount(2);
         try {
            // A substring of only the first entry's name; the match ignores case.
            await sheet.locator('.tab .header .input input').first().fill(list.names[0].slice(4, 12).toUpperCase());
            await expect(sheet.locator(list.row), `${key} narrowed to the matching entry`).toHaveCount(1);
            await expect(sheet.locator(list.row).first(), `the matching ${key} row`).toContainText(list.names[0]);

            // A filter that matches nothing empties the list.
            await sheet.locator('.tab .header .input input').first().fill('no such entry');
            await expect(sheet.locator(list.row), `${key} rows when nothing matches`).toHaveCount(0);

            // The other tabs list both of their entries.
            await expectRowCounts(sheet, Object.fromEntries(
               Object.keys(LISTS).filter((other) => other !== key).map((other) => [
                  other,
                  2,
               ]),
            ));
            expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
         }
         finally {
            // The sheet keeps the typed text, so the filter is emptied for the tests that follow.
            await sheet.locator('.tab-list').getByText(list.tab, { exact: true }).first().click();
            await sheet.locator('.tab .header .input input').first().fill('');
         }
      });
   }

   test('the skills filter falls back to matching the default attribute', async () => {
      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openActorSheet('Skills');
      /** @type {import('@playwright/test').Locator} The matching rows. */
      const rows = sheet.locator('.skill');
      await expect(rows).toHaveCount(18);
      await sheet.locator('.skill-tab .header .filter input').fill('soul');

      // No skill name contains "soul"; the fallback lists the skills whose default attribute is Soul.
      /** @type {number} The number of skills whose default attribute is Soul. */
      const expected = await page.evaluate(async (uuid) => {
         /** @type {object[]} The actor's skills. */
         const skills = Object.values((await fromUuid(uuid)).system.skill);
         return skills.filter((skill) => skill.defaultAttribute === 'soul').length;
      }, actorUuid);
      expect(expected, 'the actor has Soul skills').toBeGreaterThan(0);
      await expect(rows).toHaveCount(expected);

      // A skill name still matches by name.
      await sheet.locator('.skill-tab .header .filter input').fill('athl');
      await expect(rows).toHaveCount(1);
      await sheet.locator('.skill-tab .header .filter input').fill('');
      await expect(rows).toHaveCount(18);
   });
});

test.describe('item sheet checks filter', () => {
   test('typing into the TopFilter narrows the rendered checks list to the matching check', async () => {
      /** @type {string} The new ability's id. */
      const id = await createWorldItem(page, {
         name: 'E2E Filter Ability',
         type: 'ability',
      });
      await addCheck(page, `Item.${id}`, { label: 'AlphaCheck' });
      await addCheck(page, `Item.${id}`, { label: 'BravoCheck' });

      /** @type {import('@playwright/test').Locator} The document's sheet. */
      const sheet = await openSheetByUuid(page, `Item.${id}`);
      await openSheetTab(page, 'Checks');

      // The checks list <ol> and the filter input both live inside the checks tab.
      /** @type {import('@playwright/test').Locator} The checks listed on the sheet. */
      const checkItems = sheet.locator('.scrolling-content > ol > li');
      /** @type {import('@playwright/test').Locator} The checks filter input. */
      const filterInput = sheet.locator('.filter input');
      await expect(checkItems).toHaveCount(2);

      await filterInput.fill('Alpha');
      await expect(checkItems).toHaveCount(1);
      await expect(checkItems.locator('.header .label input')).toHaveValue('AlphaCheck');

      // A no-match filter hides every row rather than the whole list.
      await filterInput.fill('Zulu');
      await expect(checkItems).toHaveCount(0);
      expect(errors, `uncaught errors during checks-filter walk:\n${errors.join('\n')}`).toEqual([]);
   });
});
