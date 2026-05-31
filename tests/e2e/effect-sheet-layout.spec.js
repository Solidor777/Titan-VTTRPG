import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Regression: the standalone Active Effect sheet must render with usable content height. It shares
 * ItemSheetBase (which lays out with height: 100%), so it requires a definite window height; without
 * one the body collapses to the tab-button strip (~40px) and the tab content is unreachable.
 */
test('effect AE sheet renders with a non-collapsed content body', async ({ page }) => {
   const errors = [];
   page.on('pageerror', (err) => {
      errors.push(err.message);
   });

   await login(page);

   const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
      && !!CONFIG.Actor?.dataModels?.player);
   expect(systemReady, 'TITAN system initialized').toBe(true);

   // Ensure a host player actor carries an effect, then render its Active Effect sheet.
   await page.evaluate(async () => {
      const actor = game.actors.find((a) => a.type === 'player')
         ?? await Actor.create({ name: 'Layout Host', type: 'player' });
      let effect = actor.effects.find((e) => e.type === 'effect');
      if (!effect) {
         const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [
            { name: 'Layout Effect', type: 'effect' },
         ]);
         effect = created;
      }
      await effect.sheet.render(true);
      await new Promise((resolve) => {
         setTimeout(resolve, 600);
      });
   });

   // Measure the rendered sheet's body (the tab-content region). When the height chain collapses this
   // is ~40px (tab buttons only); a correctly sized sheet gives it substantial height.
   const bodyHeight = await page.evaluate(() => {
      const root = globalThis.document.querySelector('.titan-effect-sheet');
      const body = root?.querySelector('.titan-sheet > .body');
      return body ? Math.round(body.getBoundingClientRect().height) : -1;
   });

   expect(bodyHeight, 'effect sheet body (tab content) height in px').toBeGreaterThan(200);
   expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
});
