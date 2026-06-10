import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   clearChat,
   closeAllApps,
   controlFixtureActorToken,
   deleteFixtureActor,
   deleteOrphanedTokens,
} from './world.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // One-time sweep of orphaned fixture tokens left behind by prior runs (TODO #18).
   await deleteOrphanedTokens(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

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
   // Remove any stale fixture (and its tokens) so the controlled actor is deterministic.
   await deleteFixtureActor(page, options.name);

   // Create the actor, then place and control its token (throws if the placeable never draws).
   await page.evaluate(async (name) => {
      await Actor.create({
         name,
         type: 'player',
      });
   }, options.name);
   await controlFixtureActorToken(page, {
      actorName: options.name,
      fallbackSceneName: 'E2E HUD Scene',
   });

   // Seed the requested effect and condition, then refresh the HUD over the seeded content.
   await page.evaluate(async ({ name, addEffect, addCondition }) => {
      const actor = game.actors.getName(name);
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
   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan?.effectHud !== 'undefined');
      expect(ready, 'TITAN effect HUD controller must be attached at ready').toBe(true);
   });

   test('renders conditions and effects for the controlled token actor', async () => {
      await setupControlledActor(page, { name: 'HUD Test Actor', addEffect: true, addCondition: true });

      // The panel mounts and shows the effect (the row name span; the icon alt is an attribute, not text).
      const panel = page.locator('#titan-effect-hud .titan-effect-hud');
      await expect(panel).toBeVisible();
      await expect(panel.getByText('HUD Test Effect')).toBeVisible();

      // Expanding the effect row reveals its description.
      await panel.getByText('HUD Test Effect').click();
      await expect(panel.getByText('HUD description body.')).toBeVisible();
   });

   test('hides when the controlled actor has no effects or conditions', async () => {
      // Seed an effect first and prove the panel shows for this controlled actor. This guards against
      // a false pass: a bare toHaveCount(0) also succeeds when the actor silently fails to resolve
      // (HUD never mounts) — so we assert presence, then remove the content and assert the hide.
      await setupControlledActor(page, { name: 'HUD Empty Actor', addEffect: true });
      const panel = page.locator('#titan-effect-hud .titan-effect-hud');
      await expect(panel).toBeVisible();

      // Removing every effect empties the actor; the bridge-driven HUD must then hide its panel.
      await page.evaluate(async () => {
         const actor = game.actors.getName('HUD Empty Actor');
         await actor.deleteEmbeddedDocuments('ActiveEffect', actor.effects.map((effect) => effect.id));
      });
      await expect(panel).toHaveCount(0);
   });

   test('unmounts when the enableEffectHud setting is turned off', async () => {
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
