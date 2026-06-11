import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Theme-system walk: live switching, Auto resolution against the core color scheme, custom-theme
 * import round-trip, and the chat visibility surface. All theme state is restored after each probe.
 */

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

test.afterEach(async () => {
   // Restore theme state before closing apps so later files start from defaults.
   await page.evaluate(async () => {
      await game.settings.set('titan', 'theme', 'auto');
      await game.settings.set('titan', 'customThemes', {});
   });
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('v14 theme system', () => {
   test('switching the theme updates tokens live without reload', async () => {
      // Read the injected app-background under an explicit heritage-dark selection.
      await page.evaluate(() => game.settings.set('titan', 'theme', 'heritage-dark'));
      await expect
         .poll(() => page.evaluate(
            () => getComputedStyle(document.documentElement).getPropertyValue('--titan-app-background').trim(),
         ), { message: 'heritage-dark applies' })
         .toBe('#262836');

      // Switch to Macchiato and confirm the token swaps in place.
      await page.evaluate(() => game.settings.set('titan', 'theme', 'macchiato'));
      await expect
         .poll(() => page.evaluate(
            () => getComputedStyle(document.documentElement).getPropertyValue('--titan-app-background').trim(),
         ), { message: 'macchiato applies' })
         .toBe('#24273a');
      expect(errors, `uncaught errors during theme switch:\n${errors.join('\n')}`).toEqual([]);
   });

   test('auto follows the Foundry core color scheme', async () => {
      // Force the core scheme light, then dark, asserting the world-default theme tracks it.
      const observed = await page.evaluate(async () => {
         await game.settings.set('titan', 'theme', 'auto');

         /** @type {object} The original core UI config, restored after the probe. */
         const original = game.settings.get('core', 'uiConfig');

         /**
          * Sets the core applications color scheme and reads back the applied app background.
          * @param {string} scheme - The colorScheme.applications value to probe under.
          * @param {string} expected - The app-background value that proves the theme applied.
          * @returns {Promise<string>} The applied --titan-app-background value.
          */
         async function probe(scheme, expected) {
            await game.settings.set('core', 'uiConfig', {
               ...original,
               colorScheme: { ...original.colorScheme, applications: scheme },
            });
            await titanWait(
               () => getComputedStyle(document.documentElement)
                  .getPropertyValue('--titan-app-background').trim() === expected,
               { message: `theme for scheme ${scheme} applied` },
            );
            return getComputedStyle(document.documentElement).getPropertyValue('--titan-app-background').trim();
         }

         const light = await probe('light', '#f4f4f6');
         const dark = await probe('dark', '#262836');
         await game.settings.set('core', 'uiConfig', original);
         return { light, dark };
      });

      // World defaults: heritage-light and heritage-dark.
      expect(observed.light, 'auto resolves the light world default').toBe('#f4f4f6');
      expect(observed.dark, 'auto resolves the dark world default').toBe('#262836');
      expect(errors, `uncaught errors during auto probe:\n${errors.join('\n')}`).toEqual([]);
   });

   test('custom theme export text round-trips through import and applies', async () => {
      const result = await page.evaluate(async () => {
         // Export Macchiato, retint its app background, and import it as a custom theme.
         const themeManager = game.titan.themeManager;
         const exported = JSON.parse(themeManager.exportThemeText(themeManager.getTheme('macchiato')));
         exported.name = 'E2E Custom';
         exported.tokens['app-background'] = '#123456';
         const imported = await themeManager.importThemeText(JSON.stringify(exported));
         if (!imported.ok) {
            return { error: imported.error };
         }
         await game.settings.set('titan', 'theme', imported.theme.id);
         await titanWait(
            () => getComputedStyle(document.documentElement)
               .getPropertyValue('--titan-app-background').trim() === '#123456',
            { message: 'custom theme applied' },
         );
         return {
            applied: getComputedStyle(document.documentElement)
               .getPropertyValue('--titan-app-background').trim(),
            listed: themeManager.getAllThemes().some((theme) => theme.name === 'E2E Custom'),
         };
      });

      expect(result.error, 'import must validate').toBeUndefined();
      expect(result.applied, 'imported theme applies').toBe('#123456');
      expect(result.listed, 'imported theme is listed').toBe(true);
      expect(errors, `uncaught errors during round-trip:\n${errors.join('\n')}`).toEqual([]);
   });

   test('blind TITAN check carries the GM-only tint and a readable badge', async () => {
      // Roll a blind attribute check on a purpose-built actor and inspect the rendered card.
      const observed = await page.evaluate(async () => {
         /** @type {string} The original message mode, restored after the probe. */
         const originalMode = game.settings.get('core', 'messageMode');
         await game.settings.set('core', 'messageMode', 'blind');

         // The purpose-built roller (recreated fresh to keep the fixture deterministic).
         const stale = game.actors.getName('E2E Theme Roller');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Theme Roller', type: 'player' });
         const before = game.messages.size;
         await actor.system.rollAttributeCheck({ attribute: 'body' });
         await titanWait(() => game.messages.size > before, { message: 'blind check posted' });

         // The newest message and its rendered chat-log element.
         const message = game.messages.contents[game.messages.size - 1];
         await titanWait(
            () => !!globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`),
            { message: 'blind card rendered' },
         );
         const li = globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`);
         const badge = li?.querySelector('.titan-visibility-badge');
         const badgeStyle = badge ? getComputedStyle(badge) : undefined;

         await game.settings.set('core', 'messageMode', originalMode);
         await actor.delete();
         return {
            blind: message.blind,
            hasGmClass: !!li?.classList.contains('titan-gm-only'),
            badgeText: badge?.textContent,
            badgeFontSize: badgeStyle ? Number.parseFloat(badgeStyle.fontSize) : 0,
         };
      });

      expect(observed.blind, 'roll posted as blind').toBe(true);
      expect(observed.hasGmClass, 'card carries titan-gm-only').toBe(true);
      expect(observed.badgeText, 'badge text').toBe('GM Only');
      expect(observed.badgeFontSize, 'badge text is readable (>= 12px)').toBeGreaterThanOrEqual(12);
      expect(errors, `uncaught errors during blind-check probe:\n${errors.join('\n')}`).toEqual([]);
   });
});
