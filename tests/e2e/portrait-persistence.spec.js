import { test, expect } from '@playwright/test';
import { ensureDocument, login } from './fixtures.js';
import { closeAllApps, attachPageErrors } from './world.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

/** @type {string} The image path the stubbed file picker selects. */
const NEW_IMAGE = 'icons/svg/mystery-man.svg';

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
 * Renders the sheet of the fixture document, stubs the file picker so `browse()` selects `NEW_IMAGE`, and
 * clicks the sheet's real image-picker button.
 * @param {string} locate - Stringified locator function body returning the document.
 * @param {string} sheetClass - A CSS class the rendered sheet frame exposes (without the dot).
 * @param {string} buttonSelector - Selector, relative to the sheet frame, of the image-picker button.
 * @returns {Promise<void>} Resolves once the picker callback has run.
 */
async function pickImageThroughSheet(locate, sheetClass, buttonSelector) {
   const appId = await page.evaluate(async (src) => {
      const doc = new Function(`return (${src})()`)();
      const app = await doc.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
      return app.id;
   }, locate);
   const sheet = page.locator(`[id="${appId}"]`);
   await expect(sheet).toHaveClass(new RegExp(sheetClass));

   // Replace only the dialog: browse() reports the chosen path through the picker's own callback.
   await page.evaluate((path) => {
      const picker = foundry.applications.apps.FilePicker.implementation;
      picker.prototype.browse = async function browse() {
         await this.options.callback(path);
      };
   }, NEW_IMAGE);

   await sheet.locator(buttonSelector).click();
}

/**
 * Reads the stored (source) image of the fixture document after a full page reload.
 * @param {string} locate - Stringified locator function body returning the document.
 * @returns {Promise<string>} The persisted image path.
 */
async function readImageAfterReload(locate) {
   await page.reload();
   await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });
   return page.evaluate((src) => new Function(`return (${src})()`)()._source.img, locate);
}

test.describe('portrait persistence', () => {
   test('character sheet portrait pick persists across a reload', async () => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Portrait Player');
      await page.evaluate((src) => new Function(`return (${src})()`)().update({ img: 'icons/svg/book.svg' }), locate);

      await pickImageThroughSheet(locate, 'titan-player-sheet', '.portrait .image button');

      // Persisted, not merely assigned in memory.
      await expect.poll(() => page.evaluate((src) => new Function(`return (${src})()`)()._source.img, locate))
         .toBe(NEW_IMAGE);
      expect(await readImageAfterReload(locate)).toBe(NEW_IMAGE);
   });

   test('item sheet portrait pick persists across a reload', async () => {
      const locate = await ensureDocument(page, 'Item', 'weapon', 'E2E Portrait Weapon');
      await page.evaluate((src) => new Function(`return (${src})()`)().update({ img: 'icons/svg/book.svg' }), locate);

      await pickImageThroughSheet(locate, 'titan-item-sheet', '.portrait button');

      // Persisted, not merely assigned in memory.
      await expect.poll(() => page.evaluate((src) => new Function(`return (${src})()`)()._source.img, locate))
         .toBe(NEW_IMAGE);
      expect(await readImageAfterReload(locate)).toBe(NEW_IMAGE);
   });
});
