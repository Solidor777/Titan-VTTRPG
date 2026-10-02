import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   controlFixtureActorToken,
   deleteFixtureActor,
   deleteOrphanedTokens,
   newestMessageType,
} from './world.js';

/**
 * The roll path of the expanded Effect HUD row: the embedded check's button rolls through the HUD's 'sheetDocument'
 * actor bridge and posts an item check message. The check tags that surface renders, and the character sheet's and
 * the item sheet's, are compared in `character-sheet-rows.spec.js`.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Check Parity Actor';

/** @type {string} Name of the seeded effect-subtype Active Effect carrying the same check config. */
const EFFECT_NAME = 'E2E Parity Effect';

/** @type {string} Label of the effect's seeded check (rendered on its ItemCheckButton). */
const EFFECT_CHECK_LABEL = 'E2E Parity Effect Check';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string|undefined} Id of the scene created by the HUD token fallback (removed in afterAll). */
let fallbackSceneId;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // One-time sweep of orphaned fixture tokens left behind by prior runs.
   await deleteOrphanedTokens(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('Effect HUD check roll', () => {
   // Build a fresh fixture actor owning one effect that carries a complete check, then default the gating setting off.
   test.beforeEach(async () => {
      // Precondition: the TITAN system must have initialized before any sheet or HUD interaction.
      /** @type {boolean} Whether the TITAN system finished initializing in the shared page. */
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before the parity walk. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);

      // Remove any stale fixture (and its scene tokens) from a prior run or a prior test.
      await deleteFixtureActor(page, ACTOR_NAME);

      // Seed the fresh player actor and its effect-subtype Active Effect.
      await page.evaluate(async ({ actorName, effectName, effectCheck }) => {
         const actor = await Actor.create({
            name: actorName,
            type: 'player',
         });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               disabled: false,
               system: {
                  check: [effectCheck],
               },
            },
         ]);

         // Default the gating setting off so roll clicks post straight to chat.
         await game.settings.set('titan', 'getCheckOptions', 'never');
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
         effectCheck: buildCheck(EFFECT_CHECK_LABEL, 'e2e-parity-effect-check'),
      });
   });

   // Unconditionally restore the gating setting: a mid-test failure must not leak `getCheckOptions`
   // into later tests or spec files (house pattern per attack-tags.spec.js).
   test.afterEach(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', 'never');
      });
   });

   // In-file final-state hygiene (house pattern): re-assert the suite's test-default setting and
   // remove the fixture actor (and its scene token) once the describe completes. The setting is
   // client-scope and this spec's browser context is file-local, so nothing crosses spec files.
   // Inner-scope after-hooks run before the file-level page close, so `page` is still open.
   test.afterAll(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', 'never');
      });
      await deleteFixtureActor(page, ACTOR_NAME);

      // Remove the fallback scene when a HUD case had to create one (the shared world normally has
      // an active scene, so this is usually a no-op).
      if (fallbackSceneId) {
         await page.evaluate(async (sceneId) => {
            await game.scenes.get(sceneId)?.delete();
         }, fallbackSceneId);
      }
   });

   /**
    * Mounts the Effect HUD for the fixture actor and expands its single effect row. HUD rows hold
    * local collapsed expand state and the HUD is freshly resolved per test, so the row is known to
    * mount collapsed — this is the only header click.
    * @returns {Promise<import('@playwright/test').Locator>} The mounted HUD panel locator.
    */
   async function openExpandedHudRow() {
      // Close any open sheets first: the HUD is fixed-position in the bottom-right corner, and an
      // overlapping AppV2 window could intercept its clicks on a long shared-page session.
      await closeAllApps(page);

      // Precondition: the HUD controller must be attached at ready — without a controlled token a
      // GM-login HUD null-resolves and every "renders" assertion would pass falsely.
      /** @type {boolean} Whether the TITAN player HUD controller exists on the game object. */
      const hudReady = await page.evaluate(() => typeof game.titan?.playerHud !== 'undefined');
      expect(hudReady, 'TITAN player HUD controller must be attached at ready').toBe(true);

      // Place and control the fixture token (throws if the placeable never draws); remember the
      // first fallback-created scene so afterAll can remove it from the world.
      /** @type {string|null} The fallback scene's id when this call had to create one, else null. */
      const createdSceneId = await controlFixtureActorToken(page, {
         actorName: ACTOR_NAME,
         fallbackSceneName: 'E2E Check Parity Scene',
      });
      if (createdSceneId && !fallbackSceneId) {
         fallbackSceneId = createdSceneId;
      }

      /** @type {import('@playwright/test').Locator} The mounted effects panel. */
      const panel = page.locator('[data-testid="player-hud-effects-panel"]');
      await expect(panel, 'effects panel mounts for the controlled token actor').toBeVisible();

      // POSITIVE signal first: the header must show the seeded effect before the expander click.
      /** @type {import('@playwright/test').Locator} The effect row; its header button toggles expansion. */
      const rowHeader = panel.locator('[data-testid="player-hud-effect-row"]');
      await expect(rowHeader.locator('.name'), 'HUD row header shows the seeded effect').toHaveText(EFFECT_NAME);
      await rowHeader.click();
      return panel;
   }

   test('Effect HUD check roll posts an itemCheck message', async () => {
      /** @type {import('@playwright/test').Locator} The mounted HUD panel with its row expanded. */
      const panel = await openExpandedHudRow();

      // POSITIVE signal first: the embedded check's roll button renders in the expanded row.
      /** @type {import('@playwright/test').Locator} The HUD row's embedded check roll button. */
      const checkButton = panel.getByRole('button').filter({ hasText: EFFECT_CHECK_LABEL }).first();
      await expect(checkButton, 'expanded HUD row renders the embedded check').toBeVisible();

      // ROLL: with the check-options dialog gated off (seeded), the click rolls through the HUD's
      // 'sheetDocument' actor bridge and posts the itemCheck subtype.
      /** @type {number} The world message count before the roll click. */
      const beforeRoll = await page.evaluate(() => game.messages.size);
      await checkButton.click();
      await expect
         .poll(
            () => newestMessageType(page, beforeRoll),
            { message: 'HUD check roll posts an itemCheck message' },
         )
         .toBe('itemCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
