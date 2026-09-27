import { expect, test } from '@playwright/test';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Regression: Pass 1a compacts each Skills-tab row onto a single line (check button, attribute select,
 * training/expertise stats) and Pass 1b labels the Ratings/Mods/Speeds sidebar sections. Both are style
 * changes verified only against the live computed layout of the real rendered elements.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Character Sheet Layout Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.beforeEach(async () => {
   // Seed a fresh player actor with two skills trained above zero and render its sheet.
   await page.evaluate(async (actorName) => {
      const stale = game.actors.getName(actorName);
      if (stale) {
         await stale.delete();
      }

      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.update({
         'system.skill.athletics.training.baseValue': 2,
         'system.skill.perception.training.baseValue': 3,
      });

      const app = await actor.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
   }, ACTOR_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName)?.delete();
   }, ACTOR_NAME);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
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

   // At the default width and at a narrow width that forces the rows to wrap.
   for (const width of [
      850,
      640,
   ]) {
      await page.evaluate(({ name, sheetWidth }) => {
         game.actors.getName(name).sheet.setPosition({ width: sheetWidth });
      }, {
         name: ACTOR_NAME,
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

test('the skills filter falls back to matching the default attribute', async () => {
   await openSheetTab(page, 'Skills');
   const rows = page.locator('.application.titan-document-sheet .skill');
   await expect(rows).toHaveCount(18);
   await page.locator('.application.titan-document-sheet .skill-tab .header .filter input').fill('soul');

   // No skill name contains "soul"; the fallback lists the skills whose default attribute is Soul.
   const expected = await page.evaluate((name) => {
      const skills = Object.values(game.actors.getName(name).system.skill);
      return skills.filter((skill) => skill.defaultAttribute === 'soul').length;
   }, ACTOR_NAME);
   expect(expected, 'the seeded actor has Soul skills').toBeGreaterThan(0);
   await expect(rows).toHaveCount(expected);
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
      expect(gap, 'the section content starts at least the standard spacing below its label').toBeGreaterThanOrEqual(5);
   }
});
