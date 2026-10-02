import { expect, test } from './harness.js';
import { login, openSheetByUuid, openSheetTab } from './fixtures.js';
import { createActor, shared } from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The character sheet's layout, measured from the live computed geometry of the real rendered elements: each Skills
 * tab row places its parts on one line and wraps at one point, the Ratings/Mods/Speeds sidebar sections are labelled
 * and spaced, and after a browser zoom change a long list in a character, item or effect sheet still scrolls to its
 * last entry with that entry fully visible, at every zoom from 50% to 150%.
 *
 * Browser zoom is emulated through the DevTools protocol: zooming by a factor z shrinks the CSS-pixel viewport by z and
 * raises the device pixel ratio by z, which is the layout effect of Chromium's page zoom. The sheet is opened at 100%
 * and the zoom is changed while it is open, as a user would.
 */

/** @type {string} Name of the actor whose Skills tab rows are measured; `E2E ` lets the census find it. */
const LAYOUT_ACTOR_NAME = 'E2E Layout Actor';

/** @type {number} The number of entries in each long list of the shared bulk actor. */
const ENTRY_COUNT = 30;

/** @type {number[]} Browser zoom factors under test (50% to 150%). */
const ZOOM_LEVELS = [
   0.5,
   0.75,
   0.9,
   1,
   1.1,
   1.25,
   1.5,
];

/** @type {{width: number, height: number}} The suite's 100% viewport (playwright.config.mjs). */
const BASE_VIEWPORT = {
   width: 1920,
   height: 1080,
};

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {import('@playwright/test').CDPSession} DevTools session driving the zoom emulation. */
let cdp;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   cdp = await page.context().newCDPSession(page);
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await cdp.send('Emulation.setDeviceMetricsOverride', {
      ...BASE_VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
   });
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await cdp.send('Emulation.clearDeviceMetricsOverride');
   await page?.close();
});

test.describe('the Skills tab and the sidebar', () => {
   /** @type {string} The uuid of the actor whose rows are measured. */
   let layoutUuid;

   test.beforeAll(async () => {
      /** @type {string} The new actor's id. */
      const id = await createActor(page, {
         name: LAYOUT_ACTOR_NAME,
         type: 'player',
      });
      layoutUuid = `Actor.${id}`;

      // Two skills carry non-zero training so that the stats of those rows are measured with digits in them.
      /** @type {import('@playwright/test').Locator} The new actor's sheet. */
      const sheet = await openSheetByUuid(page, layoutUuid);
      await openSheetTab(page, 'Skills');
      for (const [skill, label, value] of [
         [
            'athletics',
            'Athletics',
            2,
         ],
         [
            'perception',
            'Perception',
            3,
         ],
      ]) {
         /** @type {import('@playwright/test').Locator} The training base value input of the skill's row. */
         const input = sheet.locator('.skill', { hasText: label }).locator('.stats .stat').first()
            .getByRole('textbox').first();
         await input.fill(String(value));
         await input.blur();
         await expect.poll(
            () => page.evaluate(
               async ({ uuid, skill }) => (await fromUuid(uuid)).system.skill[skill].training.baseValue,
               {
                  uuid: layoutUuid,
                  skill,
               },
            ),
            { message: `the training input stored ${skill}` },
         ).toBe(value);
      }
      await closeAllApps(page);
   });

   test.beforeEach(async () => {
      await openSheetByUuid(page, layoutUuid);
   });

   /**
    * Measures every skill row: each part's offset and width relative to its row, and whether any part is clipped.
    * @returns {Promise<object>} The per-part distinct offsets/widths across rows and the clipped part count.
    */
   function measureSkillRows() {
      return page.evaluate(() => {
         const rows = [...document.querySelectorAll('.application.titan-document-sheet .skill')];
         const parts = {
            check: new Set(),
            attribute: new Set(),
            stats: new Set(),
         };
         let clipped = 0;
         for (const row of rows) {
            const rowBox = row.getBoundingClientRect();
            for (const name of Object.keys(parts)) {
               const box = row.querySelector(`:scope > .${name}`).getBoundingClientRect();
               const left = Math.round(box.left - rowBox.left);
               const top = Math.round(box.top - rowBox.top);
               parts[name].add(`${left}/${top}/${Math.round(box.width)}`);
               if (box.right > rowBox.right + 0.5 || box.left < rowBox.left - 0.5) {
                  clipped += 1;
               }
            }

            // Content that overflows its own box is cut off.
            for (const element of row.querySelectorAll('.check button, .attribute [role="combobox"]')) {
               if (element.scrollWidth > element.clientWidth + 1) {
                  clipped += 1;
               }
            }
         }
         return {
            rows: rows.length,
            check: parts.check.size,
            attribute: parts.attribute.size,
            stats: parts.stats.size,
            clipped,
         };
      });
   }

   test('every skill row places its parts identically and nothing is cut off', async () => {
      await openSheetTab(page, 'Skills');
      await expect(page.locator('.skill').first(), 'first skill row rendered').toBeVisible();

      // At a narrow width that forces the rows to wrap, and at the default width the sheet is left at.
      for (const width of [
         640,
         850,
      ]) {
         await page.evaluate(async ({ uuid, sheetWidth }) => {
            (await fromUuid(uuid)).sheet.setPosition({ width: sheetWidth });
         }, {
            uuid: layoutUuid,
            sheetWidth: width,
         });
         await expect.poll(() => page.evaluate(() => Math.round(
            document.querySelector('.application.titan-document-sheet').getBoundingClientRect().width,
         )), { message: `sheet resized to ${width}` }).toBe(width);
         expect(await measureSkillRows(), `skill rows at ${width}px`).toEqual({
            rows: 18,
            check: 1,
            attribute: 1,
            stats: 1,
            clipped: 0,
         });
      }
   });

   test('sidebar sections carry uppercase labels', async () => {
      const labels = page.locator('.section-label');
      await expect(labels, 'sidebar shows the three labelled sections').toHaveCount(3);

      const texts = await labels.allTextContents();
      expect(texts, 'sidebar labels match the localized Ratings/Mods/Speeds text').toEqual([
         'Ratings',
         'Mods',
         'Speeds',
      ]);

      const transforms = await labels.evaluateAll(
         (elements) => elements.map((el) => globalThis.getComputedStyle(el).textTransform),
      );
      for (const transform of transforms) {
         expect(transform, 'section label is rendered uppercase').toBe('uppercase');
      }

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('sidebar section labels are spaced from the items they contain', async () => {
      const gaps = await page.locator('.section-label').evaluateAll((labels) => labels.map((label) => {
         return label.nextElementSibling.getBoundingClientRect().top - label.getBoundingClientRect().bottom;
      }));
      expect(gaps, 'one gap per labelled section').toHaveLength(3);
      for (const gap of gaps) {
         expect(gap, 'the section content starts at least the standard spacing below its label')
            .toBeGreaterThanOrEqual(5);
      }
   });
});

test.describe('browser zoom', () => {
   /** @type {string} The shared bulk actor's id. */
   let bulkId;

   test.beforeAll(async () => {
      // The first use of the bulk actor builds it through the sheet controls, which takes about a minute.
      test.setTimeout(240_000);
      bulkId = await shared(page, 'bulkActor');
   });

   /**
    * Emulates a browser zoom factor.
    * @param {number} zoom - The zoom factor (1 = 100%).
    * @returns {Promise<void>} Resolves once the page has laid out at the new zoom.
    */
   async function setZoom(zoom) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
         width: Math.round(BASE_VIEWPORT.width / zoom),
         height: Math.round(BASE_VIEWPORT.height / zoom),
         deviceScaleFactor: zoom,
         mobile: false,
      });
      await expect.poll(() => page.evaluate(() => window.innerWidth), { message: `viewport at ${zoom * 100}%` })
         .toBe(Math.round(BASE_VIEWPORT.width / zoom));
   }

   /**
    * Scrolls every user-scrollable ancestor of the last entry to its end, then reports whether the last entry is
    * fully visible: inside every clipping ancestor, inside the viewport, and the topmost element at its corners.
    * @param {string} appId - The sheet application's element id.
    * @param {string} rowSelector - Selector of one list entry inside the sheet.
    * @returns {Promise<object>} The entry count and the visibility verdict with the failing reason, if any.
    */
   function scrollToLastAndMeasure(appId, rowSelector) {
      return page.evaluate(({ id, selector }) => {
         const sheet = document.getElementById(id);
         const rows = sheet.querySelectorAll(selector);
         const last = rows[rows.length - 1];

         // Only containers a user can scroll (overflow auto/scroll) are scrolled.
         for (let element = last.parentElement; element && element !== document.body; element = element.parentElement) {
            const overflow = getComputedStyle(element).overflowY;
            if (overflow === 'auto' || overflow === 'scroll') {
               element.scrollTop = element.scrollHeight;
            }
         }

         const box = last.getBoundingClientRect();
         const inside = (outer) => box.top >= outer.top - 1 && box.bottom <= outer.bottom + 1
            && box.left >= outer.left - 1 && box.right <= outer.right + 1;

         let reason = null;
         if (!inside({
            top: 0,
            left: 0,
            bottom: window.innerHeight,
            right: window.innerWidth,
         })) {
            const span = `${box.top.toFixed(1)}-${box.bottom.toFixed(1)}`;
            reason = `outside the viewport (entry ${span}, viewport ${window.innerHeight})`;
         }
         for (let element = last.parentElement; !reason && element && element !== document.body;
            element = element.parentElement) {
            const style = getComputedStyle(element);
            const clips = [
               style.overflowX,
               style.overflowY,
            ].some((value) => value !== 'visible');
            if (clips && !inside(element.getBoundingClientRect())) {
               reason = `clipped by ${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
            }
         }

         // The entry's corners must hit the entry itself (nothing painted over it).
         const inset = 2;
         for (const [x, y] of [
            [
               box.left + inset,
               box.top + inset,
            ],
            [
               box.right - inset,
               box.bottom - inset,
            ],
         ]) {
            if (!reason && !last.contains(document.elementFromPoint(x, y))) {
               reason = `covered at (${Math.round(x)}, ${Math.round(y)})`;
            }
         }

         return {
            entries: rows.length,
            visible: reason === null,
            reason,
         };
      }, {
         id: appId,
         selector: rowSelector,
      });
   }

   /**
    * Opens a document's sheet at 100% zoom and returns its application id.
    * @param {string} uuid - The uuid of the document.
    * @returns {Promise<string>} The sheet application's element id.
    */
   async function openSheetAtFullZoom(uuid) {
      await setZoom(1);
      return (await openSheetByUuid(page, uuid)).getAttribute('id');
   }

   /**
    * Reads the uuid of a document the bulk actor owns, found by name.
    * @param {'items'|'effects'} collection - The actor's collection.
    * @param {string} name - The document's name.
    * @returns {Promise<string>} The document's uuid.
    */
   function bulkUuid(collection, name) {
      return page.evaluate(
         ({ bulkId, collection, name }) => game.actors.get(bulkId)[collection].getName(name).uuid,
         {
            bulkId,
            collection,
            name,
         },
      );
   }

   /**
    * Walks every zoom level with the sheet open and asserts the last entry of the list can be scrolled fully into
    * view.
    * @param {string} appId - The sheet application's element id.
    * @param {string} rowSelector - Selector of one list entry inside the sheet.
    * @param {number} [entryCount] - The number of entries the selector matches.
    * @returns {Promise<void>} Resolves once every zoom level has been checked.
    */
   async function expectLastEntryReachableAtEveryZoom(appId, rowSelector, entryCount = ENTRY_COUNT) {
      const rows = page.locator(`[id="${appId}"] ${rowSelector}`);
      await expect(rows, 'the long list rendered').toHaveCount(entryCount);
      for (const zoom of ZOOM_LEVELS) {
         await setZoom(zoom);

         // Foundry re-clamps and repositions open windows after a viewport resize, so the check polls until the
         // layout settles rather than measuring the first frame.
         await expect.poll(() => scrollToLastAndMeasure(appId, rowSelector), {
            message: `last entry at ${Math.round(zoom * 100)}% zoom`,
            timeout: 1000,
         }).toEqual({
            entries: entryCount,
            visible: true,
            reason: null,
         });
      }
   }

   test('the character sheet ability list reaches its last entry at 50-150% zoom', async () => {
      const appId = await openSheetAtFullZoom(`Actor.${bulkId}`);
      await openSheetTab(page, 'Abilities');
      await expectLastEntryReachableAtEveryZoom(appId, '[data-item-id]');
   });

   test('the character sheet sidebar reaches its last section at 50-150% zoom', async () => {
      const appId = await openSheetAtFullZoom(`Actor.${bulkId}`);
      const sections = page.locator(`[id="${appId}"] .titan-sheet > .sidebar .section`);
      await expect(sections.first(), 'the sidebar rendered').toBeVisible();
      await expectLastEntryReachableAtEveryZoom(appId, '.titan-sheet > .sidebar .section', await sections.count());
   });

   test('the item sheet checks list reaches its last entry at 50-150% zoom', async () => {
      const appId = await openSheetAtFullZoom(await bulkUuid('items', 'E2E Bulk Equipment'));
      await openSheetTab(page, 'Checks');
      await expectLastEntryReachableAtEveryZoom(appId, 'li.reorder-row');
   });

   test('the effect sheet rules-element list reaches its last entry at 50-150% zoom', async () => {
      const appId = await openSheetAtFullZoom(await bulkUuid('effects', 'E2E Bulk Effect'));
      await openSheetTab(page, 'Rules Elements');
      await expectLastEntryReachableAtEveryZoom(appId, 'li.reorder-row');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
