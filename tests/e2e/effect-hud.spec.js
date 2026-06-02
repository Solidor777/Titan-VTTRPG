import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Creates an actor with a controlled token on the active scene so the GM-login HUD resolves it
 * (the GM resolution ladder tracks the first selected token), optionally seeds an effect and a
 * condition, then refreshes the HUD. Mirrors the token-control setup used by the effect-tray spec.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {object} options - Setup options (passed verbatim into the page evaluate).
 * @param {string} options.name - The actor and token name; any stale actor of this name is removed first.
 * @param {boolean} [options.addEffect] - Whether to seed a 'HUD Test Effect' effect with a description.
 * @param {boolean} [options.addCondition] - Whether to toggle the 'stunned' condition on the actor.
 * @returns {Promise<void>} Resolves once the token is controlled, content seeded, and the HUD refreshed.
 */
async function setupControlledActor(page, options) {
   await page.evaluate(async ({ name, addEffect, addCondition }) => {
      // Remove any stale actor from a prior run so the controlled actor is deterministic.
      const stale = game.actors.getName(name);
      if (stale) {
         await stale.delete();
      }

      // Create the actor and place a token for it on the active scene.
      const actor = await Actor.create({ name, type: 'player' });
      const scene = game.scenes.active ?? (await Scene.create({ name: 'E2E HUD Scene', active: true }));
      const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
         await actor.getTokenDocument({ x: 100, y: 100 }),
      ]);

      // Poll until the placeable is drawn on the canvas, then control it. A fixed delay races canvas
      // readiness and can no-op when the placeable is not yet drawn.
      await new Promise((resolve) => {
         /** @type {number} The remaining poll attempts before giving up. */
         let attempts = 50;

         /** @type {number} The interval handle used to poll for the placeable. */
         const handle = setInterval(() => {
            attempts -= 1;
            if (tokenDoc.object || attempts <= 0) {
               clearInterval(handle);
               resolve();
            }
         }, 50);
      });
      tokenDoc.object?.control({ releaseOthers: true });

      // Seed the requested effect and condition.
      if (addEffect) {
         await actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'HUD Test Effect',
            type: 'effect',
            description: '<p>HUD description body.</p>',
         }]);
      }
      if (addCondition) {
         await actor.toggleStatusEffect('stunned');
      }

      game.titan.effectHud.refresh();
   }, options);
}

test.describe('native effect HUD', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan?.effectHud !== 'undefined');
      expect(ready, 'TITAN effect HUD controller must be attached at ready').toBe(true);
   });

   test('renders conditions and effects for the controlled token actor', async ({ page }) => {
      await setupControlledActor(page, { name: 'HUD Test Actor', addEffect: true, addCondition: true });

      // The panel mounts and shows the effect (the row name span; the icon alt is an attribute, not text).
      const panel = page.locator('#titan-effect-hud .titan-effect-hud');
      await expect(panel).toBeVisible();
      await expect(panel.getByText('HUD Test Effect')).toBeVisible();

      // Expanding the effect row reveals its description.
      await panel.getByText('HUD Test Effect').click();
      await expect(panel.getByText('HUD description body.')).toBeVisible();
   });

   test('hides when the controlled actor has no effects or conditions', async ({ page }) => {
      await setupControlledActor(page, { name: 'HUD Empty Actor' });

      // The actor resolves (its token is controlled) but has nothing to show, so no panel renders.
      await expect(page.locator('#titan-effect-hud .titan-effect-hud')).toHaveCount(0);
   });

   test('unmounts when the enableEffectHud setting is turned off', async ({ page }) => {
      await setupControlledActor(page, { name: 'HUD Toggle Actor', addEffect: true });
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
