import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

test.describe('native effect HUD', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan?.effectHud !== 'undefined');
      expect(ready, 'TITAN effect HUD controller must be attached at ready').toBe(true);
   });

   test('renders conditions and effects for the assigned character', async ({ page }) => {
      // Create a player-owned character, assign it, give it one effect and toggle one condition.
      await page.evaluate(async () => {
         const actor = await Actor.create({ name: 'HUD Test Actor', type: 'player' });
         await game.user.update({ character: actor.id });
         await actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'HUD Test Effect',
            type: 'effect',
            description: '<p>HUD description body.</p>',
         }]);
         await actor.toggleStatusEffect('stunned');
         game.titan.effectHud.refresh();
      });

      // The panel mounts and shows both grouped sections.
      const panel = page.locator('#titan-effect-hud .titan-effect-hud');
      await expect(panel).toBeVisible();
      await expect(panel.getByText('HUD Test Effect')).toBeVisible();

      // Expanding the effect row reveals its description. Click the name text (inside the
      // row-header button) rather than the button by accessible name, since the row icon's
      // alt text duplicates the name and would make a by-name match ambiguous.
      await panel.getByText('HUD Test Effect').click();
      await expect(panel.getByText('HUD description body.')).toBeVisible();
   });

   test('hides when the assigned actor has no effects or conditions', async ({ page }) => {
      await page.evaluate(async () => {
         const actor = await Actor.create({ name: 'HUD Empty Actor', type: 'player' });
         await game.user.update({ character: actor.id });
         game.titan.effectHud.refresh();
      });
      // No .titan-effect-hud panel is rendered inside the container.
      await expect(page.locator('#titan-effect-hud .titan-effect-hud')).toHaveCount(0);
   });

   test('unmounts when the enableEffectHud setting is turned off', async ({ page }) => {
      await page.evaluate(async () => {
         const actor = await Actor.create({ name: 'HUD Toggle Actor', type: 'player' });
         await game.user.update({ character: actor.id });
         await actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'Toggle Effect',
            type: 'effect',
            description: '<p>Body.</p>',
         }]);
         game.titan.effectHud.refresh();
      });
      await expect(page.locator('#titan-effect-hud .titan-effect-hud')).toBeVisible();

      await page.evaluate(async () => {
         await game.settings.set('titan', 'enableEffectHud', false);
      });
      await expect(page.locator('#titan-effect-hud .titan-effect-hud')).toHaveCount(0);

      // Restore the default for suite hygiene.
      await page.evaluate(async () => {
         await game.settings.set('titan', 'enableEffectHud', true);
      });
   });
});
