import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
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

      const actor = await Actor.create({ name: actorName, type: 'player' });
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

test('skill rows lay out on one compact line', async () => {
   await page.getByText('Skills', { exact: true }).first().click();

   const firstRow = page.locator('.skill').first();
   await expect(firstRow, 'first skill row rendered').toBeVisible();

   const height = await firstRow.evaluate((el) => el.getBoundingClientRect().height);
   expect(height, 'skill row height stays under the compact single-line budget').toBeLessThan(56);
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
