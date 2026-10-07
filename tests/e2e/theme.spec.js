import { readFileSync } from 'node:fs';
import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import { createWorldItem, setDescription, sharedUuid } from './flows.js';
import { getSetting, setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Theme-system walk: live switching, Auto resolution against the core color scheme, the custom-theme export text
 * round trip, the theme editor's own export and import controls, the editor's computed styles, a content link in a
 * sheet's rich text under each built-in theme, and the chat visibility surface. The theme and the custom themes are
 * client settings; they are restored after each test.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the world item whose description holds the content link. */
let linkItemUuid;

/** @type {string} The text of the content link typed into the item's description. */
const LINK_TEXT = 'Linked Document';

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // The chat log must be on screen: cards in a collapsed sidebar sit outside the viewport.
   await showChatLog(page);

   // A world item whose description links to the shared player; the link is typed into the sheet's editor and saved.
   /** @type {string} The new item's id. */
   const itemId = await createWorldItem(page, {
      name: `E2E Content Link Item ${Date.now()}`,
      type: 'ability',
   });
   linkItemUuid = `Item.${itemId}`;

   /** @type {string} The uuid of the document the link points at. */
   const targetUuid = await sharedUuid(page, 'player');
   const editor = await setDescription(page, linkItemUuid, `See @UUID[${targetUuid}]{${LINK_TEXT}} here.`);
   await expect(editor.locator('a.content-link'), 'the saved description shows the link').toHaveText(LINK_TEXT);
   await closeAllApps(page);
});

test.afterEach(async () => {
   // Restore theme state before closing apps so later files start from defaults.
   await setClientSetting(page, 'theme', 'auto');
   await setClientSetting(page, 'customThemes', {});
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads the resolved `--titan-app-background` token of the page.
 * @returns {Promise<string>} The token's computed value, trimmed.
 */
function readAppBackground() {
   return page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue('--titan-app-background').trim(),
   );
}

/**
 * Opens the theme editor the way the settings menu button does: an instance of the menu's registered application.
 * @returns {Promise<import('@playwright/test').Locator>} The editor's root element.
 */
async function openThemeEditor() {
   await page.evaluate(async () => {
      await new (game.settings.menus.get('titan.themeEditor').type)().render(true);
   });
   const editor = page.locator('.theme-editor');
   await expect(editor.locator('section h3').first(), 'the editor rendered its token groups').toBeVisible();
   return editor;
}

test.describe('v14 theme system', () => {
   test('switching the theme updates tokens live without reload', async () => {
      // Read the injected app-background under an explicit heritage-dark selection.
      await setClientSetting(page, 'theme', 'heritage-dark');
      await expect.poll(readAppBackground, { message: 'heritage-dark applies' }).toBe('#262836');

      // Switch to Macchiato and confirm the token swaps in place.
      await setClientSetting(page, 'theme', 'macchiato');
      await expect.poll(readAppBackground, { message: 'macchiato applies' }).toBe('#24273a');
   });

   test('auto follows the Foundry core color scheme', async () => {
      // Force the core scheme light, then dark, asserting the world-default theme tracks it. The
      // expected backgrounds come from the theme registry rather than literals, so a palette change
      // cannot silently stale this test; the resolved theme ids below keep it a real assertion.
      const observed = await page.evaluate(async () => {
         await game.settings.set('titan', 'theme', 'auto');

         /** @type {object} The original core UI config, restored after the probe. */
         const original = game.settings.get('core', 'uiConfig');

         /** @type {object} The world-default theme for the light scheme, which `auto` must resolve to. */
         const expectedLight = game.titan.themeManager.getSchemeTheme(false);

         /** @type {object} The world-default theme for the dark scheme, which `auto` must resolve to. */
         const expectedDark = game.titan.themeManager.getSchemeTheme(true);

         /**
          * Sets the core applications color scheme and reads back the applied theme.
          * @param {string} scheme - The colorScheme.applications value to probe under.
          * @param {string} expected - The app-background value that proves the theme applied.
          * @returns {Promise<object>} The applied `--titan-app-background` and the active theme id.
          */
         async function probe(scheme, expected) {
            await game.settings.set('core', 'uiConfig', {
               ...original,
               colorScheme: {
                  ...original.colorScheme,
                  applications: scheme,
               },
            });
            await titanWait(
               () => getComputedStyle(document.documentElement)
                  .getPropertyValue('--titan-app-background').trim() === expected,
               { message: `theme for scheme ${scheme} applied` },
            );
            return {
               background: getComputedStyle(document.documentElement)
                  .getPropertyValue('--titan-app-background').trim(),
               id: game.titan.themeManager.getActiveTheme().id,
            };
         }

         const light = await probe('light', expectedLight.tokens['app-background']);
         const dark = await probe('dark', expectedDark.tokens['app-background']);
         await game.settings.set('core', 'uiConfig', original);
         return {
            light,
            dark,
            expectedLight: {
               id: expectedLight.id,
               background: expectedLight.tokens['app-background'],
            },
            expectedDark: {
               id: expectedDark.id,
               background: expectedDark.tokens['app-background'],
            },
         };
      });

      // Each scheme resolves that scheme's world default, by theme id and by the background applied.
      expect(observed.light.id, 'auto resolves the light world default').toBe(observed.expectedLight.id);
      expect(observed.light.background, 'the light default is applied').toBe(observed.expectedLight.background);
      expect(observed.dark.id, 'auto resolves the dark world default').toBe(observed.expectedDark.id);
      expect(observed.dark.background, 'the dark default is applied').toBe(observed.expectedDark.background);

      // The schemes must resolve DIFFERENT themes, or tracking the core scheme proved nothing.
      expect(observed.light.id, 'the two schemes resolve different themes').not.toBe(observed.dark.id);
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
   });

   test('the editor imports through its hidden file input a theme file the same editor exported', async () => {
      const editor = await openThemeEditor();
      const picker = editor.locator('select.picker');

      // A custom theme: a duplicate of Heritage Dark with a retinted app background, exactly as a user edits one.
      await picker.selectOption('heritage-dark');
      await editor.getByRole('button', {
         name: 'Duplicate',
         exact: true,
      }).click();
      await expect(picker, 'the duplicate is selected').toHaveValue(/^custom-/);
      /** @type {string} The id of the duplicate the user edits. */
      const copyId = await picker.inputValue();
      await editor.locator('.token-row', { hasText: 'App Background' }).locator('input[type="color"]').fill('#123456');

      // The editor's Export button downloads the draft as a theme file.
      const [download] = await Promise.all([
         page.waitForEvent('download', { timeout: 1000 }),
         editor.getByRole('button', {
            name: 'Export',
            exact: true,
         }).click(),
      ]);
      /** @type {string} The path of the downloaded file in Node's temporary store. */
      const exportedPath = await download.path();
      /** @type {{name: string, tokens: Record<string, string>}} The exported file's content. */
      const exported = JSON.parse(readFileSync(exportedPath, 'utf8'));
      expect(exported.name, 'the file carries the duplicate\'s name').toBe('Heritage Dark (Copy)');
      expect(exported.tokens['app-background'], 'the file carries the edited token').toBe('#123456');

      // Deleting the duplicate removes the only custom theme, so the import below is what brings it back.
      await editor.getByRole('button', {
         name: 'Delete',
         exact: true,
      }).click();
      await page.locator('.application.titan-dialog').getByRole('button', {
         name: 'Delete',
         exact: true,
      }).click();
      await expect(picker.locator(`option[value="${copyId}"]`), 'the duplicate is gone').toHaveCount(0);
      await expect(picker, 'the editor fell back to Heritage Dark').toHaveValue('heritage-dark');

      // The hidden file input receives the file the editor exported.
      await editor.locator('input.import-input').setInputFiles(exportedPath);
      await expect(picker, 'the imported theme is selected').toHaveValue(/^custom-/);
      expect(await picker.inputValue(), 'the import made a theme of its own').not.toBe(copyId);
      await expect(editor.locator('.identity input[type="text"]'), 'the imported theme keeps the name')
         .toHaveValue('Heritage Dark (Copy)');
      await expect(
         editor.locator('.token-row', { hasText: 'App Background' }).locator('input[type="color"]'),
         'the imported theme keeps the edited token',
      ).toHaveValue('#123456');

      // Applying the imported theme sets the theme setting and the token it carries.
      await editor.getByRole('button', {
         name: 'Apply',
         exact: true,
      }).click();
      await expect.poll(() => getSetting(page, 'theme'), { message: 'Apply stored the imported theme' })
         .toBe(await picker.inputValue());
      await expect.poll(readAppBackground, { message: 'the imported theme applies' }).toBe('#123456');
   });

   test('blind TITAN check carries the GM-only tint and a readable badge', async () => {
      // Roll a blind attribute check from the shared player's sheet and inspect the rendered card.
      await setClientSetting(page, 'getCheckOptions', 'never');
      /** @type {string} The original message mode, restored after the roll. */
      const originalMode = await page.evaluate(() => game.settings.get('core', 'messageMode'));
      try {
         await page.evaluate(() => game.settings.set('core', 'messageMode', 'blind'));
         /** @type {number} The chat message count before the roll. */
         const before = await page.evaluate(() => game.messages.size);
         const sheet = await openSheetByUuid(page, await sharedUuid(page, 'player'));
         await sheet.getByRole('button', {
            name: 'Body',
            exact: true,
         }).first().click();
         await expect.poll(() => page.evaluate(() => game.messages.size), { message: 'the blind check posted' })
            .toBe(before + 1);

         /** @type {string} The newest message's id. */
         const messageId = await page.evaluate(() => game.messages.contents.at(-1).id);
         expect(await page.evaluate((id) => game.messages.get(id).blind, messageId), 'roll posted as blind')
            .toBe(true);

         const card = page.locator(`#chat .message[data-message-id="${messageId}"]`);
         await expect(card, 'the card carries titan-gm-only').toHaveClass(/titan-gm-only/);
         const badge = card.locator('.titan-visibility-badge');
         await expect(badge, 'badge text').toHaveText('GM Only');
         expect(
            await badge.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
            'badge text is readable (>= 12px)',
         ).toBeGreaterThanOrEqual(12);
      }
      finally {
         await page.evaluate((mode) => game.settings.set('core', 'messageMode', mode), originalMode);
      }
   });
});

test.describe('theme editor styles', () => {
   // Empirical guards (CLOSED_BUGS #30/#31): validated by reading the FINAL COMPUTED STYLE of the live rendered
   // theme-editor elements, never by inspecting the build or forcing synthetic-only conditions.

   test('theme editor h3 uses the header token, and light-theme panel-1 is stepped', async () => {
      await setClientSetting(page, 'theme', 'heritage-light');
      const editor = await openThemeEditor();
      const heading = editor.locator('section h3').first();
      const colorOf = () => heading.evaluate((element) => getComputedStyle(element).color);

      expect(await colorOf()).toBe('rgb(38, 38, 38)');

      // Override only the header-3 token and re-read: proves the heading tracks the header token specifically, not a
      // coincidental match with the body color or Foundry's --color-text-primary.
      await page.evaluate(() => document.documentElement.style.setProperty('--titan-header-3-font-color', '#aa3377'));
      try {
         expect(await colorOf()).toBe('rgb(170, 51, 119)');
      }
      finally {
         await page.evaluate(() => document.documentElement.style.removeProperty('--titan-header-3-font-color'));
      }

      expect(
         await page.evaluate(
            () => getComputedStyle(document.documentElement).getPropertyValue('--titan-panel-1-background').trim(),
         ),
      ).toBe('#e4e7ee');
   });

   test('theme editor preview shows the three stepped panels and per-level headers', async () => {
      await setClientSetting(page, 'theme', 'heritage-light');
      const editor = await openThemeEditor();
      const preview = editor.locator('.preview');
      await expect(preview.locator('.panel-3')).toBeVisible();

      /**
       * Reads the background color of a preview panel.
       * @param {string} selector - The panel's selector inside the preview.
       * @returns {Promise<string>} The panel's computed background color.
       */
      const background = (selector) => preview.locator(selector)
         .evaluate((element) => getComputedStyle(element).backgroundColor);
      const panel1 = await background('.panel-1');
      const panel2 = await background('.panel-2');
      const panel3 = await background('.panel-3');

      // The three preview panels render the (darkened) HeritageLight ramp, each distinct.
      expect(panel1).toBe('rgb(228, 231, 238)');
      expect(panel2).toBe('rgb(208, 213, 223)');
      expect(panel3).toBe('rgb(188, 195, 209)');
      expect(new Set([
         panel1,
         panel2,
         panel3,
      ]).size).toBe(3);

      // The preview headers are driven by the per-level header tokens: the preview's own draft token moves the header.
      const header = preview.locator('.headers h3');
      expect(await header.evaluate((element) => getComputedStyle(element).color)).toBe('rgb(38, 38, 38)');
      await preview.evaluate((element) => element.style.setProperty('--titan-header-3-font-color', '#aa3377'));
      expect(await header.evaluate((element) => getComputedStyle(element).color)).toBe('rgb(170, 51, 119)');
   });
});

test.describe('content links', () => {
   // A content link in a sheet's rich text renders with the active theme's link color pair. Foundry paints the link
   // background per color scheme (near-black in the dark scheme), so a text-only override left the link unreadable on
   // sheets. Verified on the live enriched link under each built-in theme.
   for (const themeId of [
      'heritage-dark',
      'heritage-light',
      'macchiato',
      'clean-neutral-light',
   ]) {
      test(`a sheet content link uses the ${themeId} link colors`, async () => {
         await setClientSetting(page, 'theme', themeId);
         const sheet = await openSheetByUuid(page, linkItemUuid);
         await clickSheetTab(sheet, 'Description');
         const link = sheet.locator('a.content-link');
         await expect(link, 'the enriched link').toBeVisible();

         // Resolve each token to a computed rgb string in the link's own cascade scope.
         const result = await link.evaluate((element) => {
            const resolve = (token) => {
               const probe = document.createElement('span');
               probe.style.color = `var(--titan-${token})`;
               element.parentElement.appendChild(probe);
               const value = getComputedStyle(probe).color;
               probe.remove();
               return value;
            };
            const style = getComputedStyle(element);
            return {
               color: style.color === resolve('content-link-font-color'),
               background: style.backgroundColor === resolve('content-link-background'),
               text: element.textContent.trim(),
            };
         });
         expect(result).toEqual({
            color: true,
            background: true,
            text: LINK_TEXT,
         });
      });
   }
});
