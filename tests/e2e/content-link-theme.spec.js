import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Regression: a content link in a sheet's rich text renders with the active theme's link color pair. Foundry
 * paints the link background per color scheme (near-black in the dark scheme), so a text-only override left the
 * link unreadable on sheets. Verified on the live enriched link under each built-in theme.
 */

/** @type {string} Name of the throwaway item carrying the link. */
const ITEM_NAME = 'E2E Content Link Item';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The theme selection before this file changed it. */
let priorTheme;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   priorTheme = await page.evaluate(async (itemName) => {
      await game.items.getName(itemName)?.delete();
      const target = game.actors.contents[0] ?? await Actor.create({
         name: 'E2E Content Link Target',
         type: 'player',
      });
      await Item.create({
         name: itemName,
         type: 'ability',
         system: { description: `<p>See @UUID[${target.uuid}]{Linked Document} here.</p>` },
      });
      return game.settings.get('titan', 'theme');
   }, ITEM_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async ({ itemName, theme }) => {
      await game.items.getName(itemName)?.delete();
      await game.settings.set('titan', 'theme', theme);
   }, {
      itemName: ITEM_NAME,
      theme: priorTheme,
   });
   await page?.close();
});

for (const themeId of [
   'heritage-dark',
   'heritage-light',
   'macchiato',
   'clean-neutral-light',
]) {
   test(`a sheet content link uses the ${themeId} link colors`, async () => {
      const result = await page.evaluate(async ({ itemName, id }) => {
         await game.settings.set('titan', 'theme', id);
         const app = await game.items.getName(itemName).sheet.render(true);
         await titanWait(() => !!app.element?.querySelector('a.content-link'), { message: 'enriched link' });
         const link = app.element.querySelector('a.content-link');

         // Resolve each token to a computed rgb string in the link's own cascade scope.
         const resolve = (token) => {
            const probe = document.createElement('span');
            probe.style.color = `var(--titan-${token})`;
            link.parentElement.appendChild(probe);
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
         };
         const style = getComputedStyle(link);
         return {
            color: style.color === resolve('content-link-font-color'),
            background: style.backgroundColor === resolve('content-link-background'),
            text: link.textContent.trim(),
         };
      }, {
         itemName: ITEM_NAME,
         id: themeId,
      });
      expect(result).toEqual({
         color: true,
         background: true,
         text: 'Linked Document',
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
}
