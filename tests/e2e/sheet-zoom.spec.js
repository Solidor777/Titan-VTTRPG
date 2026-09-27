import { expect, test } from '@playwright/test';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * Regression: after a browser zoom change, a long list inside a character, item, or effect sheet must still scroll
 * to its last entry, and that entry must be fully visible, at every zoom level from 50% to 150%.
 *
 * Browser zoom is emulated through the DevTools protocol: zooming by a factor z shrinks the CSS-pixel viewport by
 * z and raises the device pixel ratio by z, which is the layout effect of Chromium's page zoom. The sheet is
 * opened at 100% and the zoom is changed while it is open, as a user would.
 */

/** @type {string} Name of the fixture actor carrying the long ability list and the long effect. */
const ACTOR_NAME = 'E2E Zoom Actor';

/** @type {number} Entries seeded into each list; enough to overflow every sheet at every tested zoom. */
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

/**
 * Builds a complete item check entry (the browser context cannot import the check template).
 * @param {number} index - The entry's position, used for a unique label and uuid.
 * @returns {object} The check entry.
 */
function check(index) {
   const suffix = String(index).padStart(12, '0');
   return {
      attribute: 'body',
      complexity: 1,
      damageReducedBy: 'none',
      difficulty: 4,
      initialValue: 1,
      isDamage: false,
      isHealing: false,
      label: `Zoom Check ${index}`,
      opposedCheck: {
         attribute: 'body',
         enabled: false,
         skill: 'athletics',
      },
      resistanceCheck: 'none',
      resolveCost: 0,
      scaling: true,
      skill: 'athletics',
      uuid: `e2e0c0de-0000-4000-a000-${suffix}`,
   };
}

/**
 * Builds a flat-modifier rules element.
 * @param {number} index - The entry's position, used for a unique uuid.
 * @returns {object} The rules element.
 */
function rulesElement(index) {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      uuid: `e2e0e1e0-0000-4000-a000-${String(index).padStart(12, '0')}`,
   };
}

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
 * @param {string} locateSrc - Stringified function body returning the document.
 * @returns {Promise<string>} The sheet application's element id.
 */
async function openSheet(locateSrc) {
   await setZoom(1);
   return page.evaluate(async (src) => {
      const doc = new Function(`return (${src})()`)();
      const app = await doc.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
      return app.id;
   }, locateSrc);
}

/**
 * Walks every zoom level with the sheet open and asserts the last entry of the list can be scrolled fully into view.
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
         timeout: 3000,
      }).toEqual({
         entries: entryCount,
         visible: true,
         reason: null,
      });
   }
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   cdp = await page.context().newCDPSession(page);
   errors = attachPageErrors(page);
   await login(page);
   await deleteFixtureActor(page, ACTOR_NAME);
   await page.evaluate(async ({ name, count, checks, elements }) => {
      const actor = await Actor.create({
         name,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', [
         ...Array.from({ length: count }, (_, index) => ({
            name: `Zoom Ability ${index + 1}`,
            type: 'ability',
         })),
         {
            name: 'Zoom Checks Item',
            type: 'equipment',
            system: { check: checks },
         },
      ]);
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'Zoom Rules Effect',
            type: 'effect',
            system: { rulesElement: elements },
         },
      ]);
   }, {
      name: ACTOR_NAME,
      count: ENTRY_COUNT,
      checks: Array.from({ length: ENTRY_COUNT }, (_, index) => check(index + 1)),
      elements: Array.from({ length: ENTRY_COUNT }, (_, index) => rulesElement(index + 1)),
   });
});

test.afterEach(async () => {
   await setZoom(1);
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await cdp.send('Emulation.clearDeviceMetricsOverride');
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('the character sheet ability list reaches its last entry at 50-150% zoom', async () => {
   const appId = await openSheet(`() => game.actors.getName('${ACTOR_NAME}')`);
   await openSheetTab(page, 'Abilities');
   await expectLastEntryReachableAtEveryZoom(appId, '[data-item-id]');
});

test('the character sheet sidebar reaches its last section at 50-150% zoom', async () => {
   const appId = await openSheet(`() => game.actors.getName('${ACTOR_NAME}')`);
   const sections = page.locator(`[id="${appId}"] .titan-sheet > .sidebar .section`);
   await expect(sections.first(), 'the sidebar rendered').toBeVisible();
   await expectLastEntryReachableAtEveryZoom(appId, '.titan-sheet > .sidebar .section', await sections.count());
});

test('the item sheet checks list reaches its last entry at 50-150% zoom', async () => {
   const appId = await openSheet(`() => game.actors.getName('${ACTOR_NAME}').items.getName('Zoom Checks Item')`);
   await openSheetTab(page, 'Checks');
   await expectLastEntryReachableAtEveryZoom(appId, 'li.reorder-row');
});

test('the effect sheet rules-element list reaches its last entry at 50-150% zoom', async () => {
   const appId = await openSheet(`() => game.actors.getName('${ACTOR_NAME}').effects.getName('Zoom Rules Effect')`);
   await openSheetTab(page, 'Rules Elements');
   await expectLastEntryReachableAtEveryZoom(appId, 'li.reorder-row');
   expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
});
