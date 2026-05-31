import { test, expect } from '@playwright/test';
import { ensureDocument, login } from './fixtures.js';

/**
 * Render a document's sheet and open its AppV2 window-header controls dropdown,
 * returning the labels of the control entries that appear.
 *
 * v14 renders `_getHeaderControls()` entries inside the controls dropdown opened
 * by the header ellipsis button (`button[data-action="toggleControls"]`). The
 * opened menu lives at `#context-menu` with one `li.context-item` per entry.
 * @param {import('@playwright/test').Page} - page      The Playwright page to drive.
 * @param {string}                          - locateSrc Stringified locator returning the document.
 * @param {string}                          - sheetSelector CSS selector the rendered sheet must expose.
 * @returns {Promise<string[]>} The trimmed text labels of the dropdown control entries.
 */
async function openHeaderControls(page, locateSrc, sheetSelector) {
   // Locate the document and render its sheet inside the Foundry runtime.
   const appId = await page.evaluate(async (src) => {
      // Reconstruct the locator function from its stringified body.
      const doc = new Function(`return (${src})()`)();
      if (!doc) {
         return null;
      }
      const app = await doc.sheet.render(true);

      // Allow the Svelte mount and ApplicationV2 render cycle to settle.
      await new Promise((resolve) => {
         setTimeout(resolve, 500);
      });
      return app.id;
   }, locateSrc);

   // The fixture and its rendered sheet must exist. Use an attribute selector because the
   // ApplicationV2 element id can contain characters that are invalid in a CSS id selector.
   // The TITAN sheet class is applied to the frame element itself (same element as the id).
   expect(appId, 'document fixture not found in world').not.toBeNull();
   const sheet = page.locator(`[id="${appId}"]`);
   await expect(sheet).toBeVisible();
   await expect(sheet).toHaveClass(new RegExp(sheetSelector.replace('.', '')));

   // Open the window-header controls dropdown via the ellipsis button.
   const toggle = sheet.locator('button[data-action="toggleControls"]');
   await expect(toggle).toBeVisible();
   await toggle.click();

   // Read the labels of the rendered control entries from the controls menu.
   const menu = page.locator('#context-menu li.context-item');
   await expect(menu.first()).toBeVisible();
   return menu.allInnerTexts();
}

test.describe('v14 header controls', () => {
   // Log in before every surface so a single failure never poisons the rest.
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   // The player actor sheet exposes the Edit Token and Toggle-Link controls.
   test('player actor sheet exposes header controls', async ({ page }) => {
      // Ensure a player actor exists, then open its header controls dropdown.
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      const labels = (await openHeaderControls(page, locate, '.titan-player-sheet')).map((l) => l.trim());

      // The dynamic edit/link controls must be present (a directory actor shows both).
      expect(labels, `actor header controls:\n${labels.join('\n')}`).toContain('Edit Token');
      expect(labels, `actor header controls:\n${labels.join('\n')}`).toContain('Toggle Token Link');
   });

   // The item sheet exposes the Send to Chat control.
   test('weapon item sheet exposes header controls', async ({ page }) => {
      // Ensure a weapon item exists, then open its header controls dropdown.
      const locate = await ensureDocument(page, 'Item', 'weapon', 'E2E weapon');
      const labels = (await openHeaderControls(page, locate, '.titan-item-sheet')).map((l) => l.trim());

      // The Send to Chat control must be present.
      expect(labels, `item header controls:\n${labels.join('\n')}`).toContain('Send to Chat');
   });
});
