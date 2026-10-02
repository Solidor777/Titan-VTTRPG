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
} from './world.js';

/**
 * The Effect HUD row (EffectHudRow) reads the effect through the id-keyed EmbeddedDocumentProvider ('document'
 * context) and the owning actor through the never-shadowed 'sheetDocument' context: its header updates in place
 * when the effect is renamed, and its owner-gated delete button confirms through. The character sheet's effect
 * rows are covered by `character-sheet-rows.spec.js`.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Embedded Context Actor';

/** @type {string} Name of the seeded effect-subtype Active Effect. */
const EFFECT_NAME = 'E2E Context Effect';

/** @type {string} The effect name written through the live document in the HUD reactivity case. */
const HUD_RENAMED_NAME = 'E2E Context Effect HUD Renamed';

/** @type {string} The seeded effect's rich-text description HTML. */
const EFFECT_DESCRIPTION = '<p>Embedded-context effect description body.</p>';

/** @type {string} The rendered text of the seeded description (for getByText assertions). */
const EFFECT_DESCRIPTION_TEXT = 'Embedded-context effect description body.';

/** @type {string} Label of the seeded embedded check (rendered on its ItemCheckButton). */
const CHECK_LABEL = 'E2E Context Check';

/** @type {string} Localized `deleteEffect` label: the delete buttons' aria-label AND the dialog confirm button. */
const DELETE_EFFECT_LABEL = 'Delete Effect';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

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

test.describe('embedded-context effects family', () => {
   // Build a fresh fixture actor with one effect carrying a description, a non-permanent duration,
   // and a complete embedded check, then default the gating settings off.
   test.beforeEach(async () => {
      // Precondition: the TITAN system must have initialized before any sheet or HUD interaction.
      /** @type {boolean} Whether the TITAN system finished initializing in the shared page. */
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before the effects walk. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);

      // Remove any stale fixture (and its scene tokens) from a prior run or a prior test.
      await deleteFixtureActor(page, ACTOR_NAME);

      // Seed a fresh player actor owning one effect-subtype Active Effect; the COMPLETE check entry
      // is built by the shared buildCheck factory (unopposed, unresisted, and free for this spec).
      await page.evaluate(async ({ actorName, effectName, effectDescription, check }) => {
         const actor = await Actor.create({
            name: actorName,
            type: 'player',
         });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               disabled: false,
               description: effectDescription,
               system: {
                  duration: {
                     type: 'turnStart',
                     remaining: 1,
                  },
                  check: [check],
               },
            },
         ]);

         // Default the gating settings off; the cases that need a gate flip it explicitly.
         await game.settings.set('titan', 'getCheckOptions', 'never');
         await game.settings.set('titan', 'confirmDeletingEffects', false);
      }, {
         actorName: ACTOR_NAME,
         effectName: EFFECT_NAME,
         effectDescription: EFFECT_DESCRIPTION,
         check: buildCheck(CHECK_LABEL, 'e2ec0d7e-e2ec-4d7e-8d7e-e2ec0d7ee2ec', {
            opposedCheck: {
               attribute: 'body',
               enabled: false,
               skill: 'athletics',
            },
            resistanceCheck: 'none',
            resolveCost: 0,
         }),
      });
   });

   // Unconditionally restore the gating settings: a mid-test failure after a gate is enabled must not
   // leak `getCheckOptions`/`confirmDeletingEffects` into later tests or spec files (house pattern per
   // attack-tags.spec.js).
   test.afterEach(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', 'never');
         await game.settings.set('titan', 'confirmDeletingEffects', false);
      });
   });

   // In-file final-state hygiene (house pattern): re-assert the suite's test-default settings and
   // remove the fixture actor (and its scene token) once the describe completes. The settings are
   // client-scope and this spec's browser context is file-local, so nothing crosses spec files —
   // note both test defaults differ from the registered defaults: getCheckOptions is `never`
   // (registered `situational`) and confirmDeletingEffects is false (registered true). Inner-scope
   // after-hooks run before the file-level page close, so `page` is still open.
   test.afterAll(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', 'never');
         await game.settings.set('titan', 'confirmDeletingEffects', false);
      });
      await deleteFixtureActor(page, ACTOR_NAME);
   });

   /**
    * Drives the confirm-gated delete path from a surface's delete button: enables the
    * confirmDeletingEffects gate, clicks the button, asserts the confirm dialog mounts while the
    * effect survives, then confirms and waits for the deletion to land on the fixture actor.
    * @param {import('@playwright/test').Locator} deleteButton - The surface's effect-delete button.
    * @returns {Promise<void>} Resolves once the effect is confirmed deleted from the fixture actor.
    */
   async function confirmEffectDeletion(deleteButton) {
      // Enable the confirmation gate so the click must route through the dialog.
      await page.evaluate(async () => {
         await game.settings.set('titan', 'confirmDeletingEffects', true);
      });
      await deleteButton.click();

      /** @type {import('@playwright/test').Locator} The mounted TitanDialog window. */
      const dialog = page.locator('.application.titan-dialog');
      await expect(dialog.first(), 'confirm-delete dialog mounts').toBeVisible();

      // POSITIVE signal first (dialog visible above), so this survival read cannot pass falsely.
      /** @type {boolean} Whether the effect still exists while the confirmation is pending. */
      const survives = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).effects.contents.length === 1;
      }, ACTOR_NAME);
      expect(survives, 'effect survives until the dialog is confirmed').toBe(true);

      // Confirming deletes the effect through safeDeleteEffect.
      await dialog.getByRole('button', { name: DELETE_EFFECT_LABEL }).first().click();
      await expect
         .poll(
            () => page.evaluate((actorName) => {
               return game.actors.getName(actorName).effects.contents.length;
            }, ACTOR_NAME),
            { message: 'confirm click deletes the effect' },
         )
         .toBe(0);
   }

   test('HUD row header updates in place and the owner-gated delete confirms through', async () => {
      // Precondition: the HUD controller must be attached at ready.
      /** @type {boolean} Whether the TITAN player HUD controller exists on the game object. */
      const hudReady = await page.evaluate(() => typeof game.titan?.playerHud !== 'undefined');
      expect(hudReady, 'TITAN player HUD controller must be attached at ready').toBe(true);

      await controlFixtureActorToken(page, {
         actorName: ACTOR_NAME,
         fallbackSceneName: 'E2E Embedded Context Scene',
      });

      /** @type {import('@playwright/test').Locator} The mounted effects panel. */
      const panel = page.locator('[data-testid="player-hud-effects-panel"]');
      await expect(panel, 'effects panel mounts for the controlled token actor').toBeVisible();

      // The row header shows the seeded name; rows mount collapsed, so this is the only expander
      // click (clicking the header toggles the row open).
      /** @type {import('@playwright/test').Locator} The effect row; its header button toggles expansion. */
      const rowHeader = panel.locator('[data-testid="player-hud-effect-row"]');
      await expect(rowHeader.locator('.name'), 'HUD row header shows the seeded name').toHaveText(EFFECT_NAME);
      await rowHeader.click();

      // The expanded row reveals the context-sourced description and the embedded check button.
      await expect(panel.getByText(EFFECT_DESCRIPTION_TEXT), 'expanded row shows the description').toBeVisible();
      await expect(
         panel.getByRole('button').filter({ hasText: CHECK_LABEL }).first(),
         'expanded row renders the embedded check',
      ).toBeVisible();

      // REGRESSION LOCK: rename through the live document. The header name/img are context-sourced —
      // NEW behavior from the conversion; they used to read a static prop — so the header must update
      // IN PLACE. The still-visible description proves the row did not remount (a remount would reset
      // its local isExpanded state and collapse the row).
      await page.evaluate(async ({ actorName, newName }) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({ name: newName });
      }, {
         actorName: ACTOR_NAME,
         newName: HUD_RENAMED_NAME,
      });
      await expect(rowHeader.locator('.name'), 'HUD row header updates in place').toHaveText(HUD_RENAMED_NAME);
      await expect(panel.getByText(EFFECT_DESCRIPTION_TEXT), 'row stays expanded across the rename').toBeVisible();

      // DELETE through the HUD's owner-gated button (the GM owns the fixture actor, so the
      // DocumentOwnerIconButton is enabled) with confirmation ON: the dialog mounts, the effect
      // survives until confirmed, and confirming deletes it.
      await confirmEffectDeletion(panel.getByRole('button', { name: DELETE_EFFECT_LABEL }));

      // With its only entry gone, the bridge-driven panel hides entirely (anchored by the earlier
      // visibility assertions, so this cannot pass on a never-mounted HUD).
      await expect(panel, 'HUD panel hides once the actor has no effects').toHaveCount(0);

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
