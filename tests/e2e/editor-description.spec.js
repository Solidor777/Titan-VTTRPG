import { expect, test } from '@playwright/test';
import { ensureDocument, login } from './fixtures.js';

/**
 * Regression: the ProseMirror description editor must mount as a toggled, enriched editor that fills
 * its tab. Before the fix it mounted untoggled (no edit button) and was centered as a ~150px-tall flex
 * item in the full-height tab. This drives an ability item sheet (Description is its first tab) and
 * asserts the native <prose-mirror> element is toggled (exposes the edit button) and fills top-to-bottom.
 */
test('item description editor mounts toggled and fills the tab', async ({ page }) => {
   // Collected uncaught page errors fired during the render window.
   const errors = [];
   page.on('pageerror', (err) => {
      errors.push(err.message);
   });

   await login(page);

   // The TITAN system must be initialized before rendering any sheet.
   const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
      && !!CONFIG.Item?.dataModels?.ability);
   expect(systemReady, 'TITAN system initialized').toBe(true);

   // Ensure an ability item exists and render its sheet (Description is the default first tab).
   const locate = await ensureDocument(page, 'Item', 'ability', 'E2E Editor Ability');
   await page.evaluate(async (src) => {
      // Reconstruct the locator function from its stringified body and render the located sheet.
      const doc = new Function(`return (${src})()`)();
      await doc.sheet.render(true);
      await new Promise((resolve) => {
         setTimeout(resolve, 600);
      });
   }, locate);

   // Inspect the mounted <prose-mirror> element: it must exist, be toggled (edit button present), and
   // fill its container rather than collapse to the ~150px core minimum.
   const result = await page.evaluate(() => {
      // The first ProseMirror editor element on any open item sheet.
      const editor = globalThis.document.querySelector('.titan-item-sheet prose-mirror');
      if (!editor) {
         return { found: false };
      }
      return {
         found: true,
         toggled: editor.hasAttribute('toggled'),
         hasEditButton: !!editor.querySelector('button.toggle, button .fa-edit'),
         height: Math.round(editor.getBoundingClientRect().height),
      };
   });

   expect(result.found, 'prose-mirror element present on description tab').toBe(true);
   expect(result.toggled, 'editor mounted in toggled mode').toBe(true);
   expect(result.hasEditButton, 'toggled editor exposes the edit button').toBe(true);
   expect(result.height, 'editor fills the tab (px)').toBeGreaterThan(200);
   expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
});
