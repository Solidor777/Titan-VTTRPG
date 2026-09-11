import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, waitForAnimations } from './world.js';

/**
 * Regression: the standalone Active Effect sheet must render with usable content height. It shares
 * ItemSheetBase (which lays out with height: 100%), so it requires a definite window height; without
 * one the body collapses to the tab-button strip (~40px) and the tab content is unreachable.
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
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test('effect AE sheet renders with a non-collapsed content body', async () => {
   const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
      && !!CONFIG.Actor?.dataModels?.player);
   expect(systemReady, 'TITAN system initialized').toBe(true);

   // Ensure a host player actor carries an effect, then render its Active Effect sheet.
   await page.evaluate(async () => {
      const actor = game.actors.find((a) => a.type === 'player')
         ?? await Actor.create({
            name: 'Layout Host',
            type: 'player' 
         });
      let effect = actor.effects.find((e) => e.type === 'effect');
      if (!effect) {
         const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'Layout Effect',
               type: 'effect' 
            },
         ]);
         effect = created;
      }
      const app = await effect.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.titan-sheet > .body'),
         { message: 'sheet mounted' },
      );
   });

   // Measure the rendered sheet's body (the tab-content region). When the height chain collapses this
   // is ~40px (tab buttons only); a correctly sized sheet gives it substantial height.
   // The sheet mounts before it finishes sizing, so the height is measured only once it has settled.
   await waitForAnimations(page, '.titan-effect-sheet');

   const bodyHeight = await page.evaluate(() => {
      const root = globalThis.document.querySelector('.titan-effect-sheet');
      const body = root?.querySelector('.titan-sheet > .body');
      return body ? Math.round(body.getBoundingClientRect().height) : -1;
   });

   expect(bodyHeight, 'effect sheet body (tab content) height in px').toBeGreaterThan(200);
   expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
});

test('effect AE sheet renders the description in the inactive editor view', async () => {
   // A fresh effect with a description; the toggled editor must show the enriched text before any edit.
   await page.evaluate(async () => {
      const actor = game.actors.find((a) => a.type === 'player')
         ?? await Actor.create({
            name: 'Layout Host',
            type: 'player' 
         });
      await actor.effects.find((e) => e.name === 'Layout Described Effect')?.delete();
      const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'Layout Described Effect',
            type: 'effect',
            description: '<p>Blessed by the sun.</p>' 
         },
      ]);
      const app = await effect.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('prose-mirror .editor-content'),
         { message: 'description editor mounted' },
      );
   });

   const content = page.locator('.titan-effect-sheet prose-mirror .editor-content');
   await expect(content, 'inactive editor view shows the description').toHaveText('Blessed by the sun.');
   expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);

   await page.evaluate(async () => {
      const actor = game.actors.find((a) => a.type === 'player');
      await actor?.effects.find((e) => e.name === 'Layout Described Effect')?.delete();
   });
});
