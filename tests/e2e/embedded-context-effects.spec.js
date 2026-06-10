import { expect, test } from '@playwright/test';
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
 * Embedded-context conversion lock (Stage 1, effects family): effect rows on the character sheet
 * (CharacterSheetEffect* leaves) and the Effect HUD (EffectHudRow) read the effect through the
 * id-keyed EmbeddedDocumentProvider ('document' context) and the owning actor through the
 * never-shadowed 'sheetDocument' context. This spec locks the conversion across both surfaces:
 * in-place reactivity of context-sourced reads (row name, DurationTag, HUD row header — the header
 * is NEWLY reactive; it used to read a static prop) and the functional paths routed through the two
 * contexts (toggle active, send to chat, embedded check roll, confirm-gated delete).
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Embedded Context Actor';

/** @type {string} Name of the seeded effect-subtype Active Effect. */
const EFFECT_NAME = 'E2E Context Effect';

/** @type {string} The effect name written through the live document in the sheet reactivity case. */
const SHEET_RENAMED_NAME = 'E2E Context Effect Renamed';

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

/** @type {string} Localized `sendToChat` label (lang/en.json `sendToChat.text`): the send button's aria-label. */
const SEND_TO_CHAT_LABEL = 'Send to Chat';

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
         await game.settings.set('titan', 'getCheckOptions', false);
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
         await game.settings.set('titan', 'getCheckOptions', false);
         await game.settings.set('titan', 'confirmDeletingEffects', false);
      });
   });

   // In-file final-state hygiene (house pattern): re-assert the suite's test-default settings and
   // remove the fixture actor (and its scene token) once the describe completes. The settings are
   // client-scope and this spec's browser context is file-local, so nothing crosses spec files —
   // note the test default for confirmDeletingEffects (false) differs from its registered default
   // (true). Inner-scope after-hooks run before the file-level page close, so `page` is still open.
   test.afterAll(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
         await game.settings.set('titan', 'confirmDeletingEffects', false);
      });
      await deleteFixtureActor(page, ACTOR_NAME);
   });

   /**
    * Opens the fixture actor's character sheet, activates the Effects tab, and expands the single
    * effect row. The expander state is keyed by the effect id and the fixture is re-created each
    * test, so the row is known to seed collapsed — this is the only expander click.
    * @returns {Promise<import('@playwright/test').Locator>} The expanded effect row locator.
    */
   async function openCharacterSheetEffectRow() {
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ACTOR_NAME);

      // Activate the Effects tab; the row click below auto-waits for the rendered row.
      await page.getByText('Effects', { exact: true }).first().click();

      // Scope under the open sheet root: the always-mounted effects tray also emits [data-effect-id]
      // rows, so a page-global locator would collide once the tray's compendium pack has content.
      /** @type {import('@playwright/test').Locator} The effect's list row (the only seeded effect). */
      const row = page.locator('.application.titan-document-sheet [data-effect-id]').first();
      await row.locator('.header .label .button button').first().click();
      return row;
   }

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

   test('effect row name and DurationTag update in place through the embedded bridge', async () => {
      /** @type {import('@playwright/test').Locator} The expanded effect row. */
      const row = await openCharacterSheetEffectRow();

      // The row's header name (rendered inside the expand button) reads through the embedded bridge.
      /** @type {import('@playwright/test').Locator} The row-header name element. */
      const name = row.locator('.header .label .name');

      // The footer DurationTag carries a stable data-testid; its `.value` children are, in DOM
      // order, the localized type then the remaining count.
      /** @type {import('@playwright/test').Locator} The footer DurationTag root. */
      const durationTag = row.getByTestId('effect-row-duration');
      /** @type {import('@playwright/test').Locator} The DurationTag's localized type value. */
      const durationType = durationTag.locator('.value').first();
      /** @type {import('@playwright/test').Locator} The DurationTag's remaining-count value. */
      const durationRemaining = durationTag.locator('.value').last();

      // INITIAL rendered state: the seeded name and the turnStart/1 duration.
      await expect(name, 'initial effect name renders').toHaveText(EFFECT_NAME);
      await expect(durationType, 'initial duration type renders').toHaveText('Turn Start');
      await expect(durationRemaining, 'initial duration remaining renders').toHaveText('1');

      // Rename and re-shape the duration IN PLACE through the live document (no tab switch, no
      // re-expand): both reads must re-resolve through the actor subscription.
      await page.evaluate(async ({ actorName, newName }) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({
            name: newName,
            system: {
               duration: {
                  type: 'turnEnd',
                  remaining: 3,
               },
            },
         });
      }, {
         actorName: ACTOR_NAME,
         newName: SHEET_RENAMED_NAME,
      });

      // The context-sourced name and DurationTag update in place.
      await expect(name, 'effect name updates in place').toHaveText(SHEET_RENAMED_NAME);
      await expect(durationType, 'duration type updates in place').toHaveText('Turn End');
      await expect(durationRemaining, 'duration remaining updates in place').toHaveText('3');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('effect row functional sweep: toggle, send to chat, check roll, confirm-gated delete', async () => {
      /** @type {import('@playwright/test').Locator} The expanded effect row. */
      const row = await openCharacterSheetEffectRow();

      // TOGGLE ACTIVE: the checkmark icon is the toggle's rendered state (the only square icon in the
      // row); the click bubbles to its button and must flip the underlying system.isActive.
      await expect(row.locator('i.fa-square-check'), 'effect starts active (checked)').toHaveCount(1);
      await row.locator('i.fa-square-check').click();
      await expect(row.locator('i.fa-square'), 'toggle renders unchecked after the flip').toHaveCount(1);
      await expect
         .poll(
            () => page.evaluate((actorName) => {
               return game.actors.getName(actorName).effects.contents[0].system.isActive;
            }, ACTOR_NAME),
            { message: 'toggle-active click flips system.isActive' },
         )
         .toBe(false);

      // SEND TO CHAT: the row's send button posts an effect-subtype message.
      /** @type {number} The world message count before the send-to-chat click. */
      const beforeSend = await page.evaluate(() => game.messages.size);
      await row.getByRole('button', { name: SEND_TO_CHAT_LABEL }).click();
      await expect
         .poll(() => newestMessageType(page, beforeSend), { message: 'send-to-chat posts an effect message' })
         .toBe('effect');

      // CHECK ROLL: with the check-options dialog gated off (seeded), the embedded check's button
      // rolls straight through the shared item-check engine and posts an itemCheck message.
      /** @type {number} The world message count before the check-roll click. */
      const beforeRoll = await page.evaluate(() => game.messages.size);
      await row.getByRole('button').filter({ hasText: CHECK_LABEL }).first().click();
      await expect
         .poll(() => newestMessageType(page, beforeRoll), { message: 'check roll posts an itemCheck message' })
         .toBe('itemCheck');

      // DELETE with confirmation ON: the row's delete button must mount the confirm dialog instead
      // of deleting outright; confirming completes the deletion.
      await confirmEffectDeletion(row.getByRole('button', { name: DELETE_EFFECT_LABEL }));

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('HUD row header updates in place and the owner-gated delete confirms through', async () => {
      // Precondition: the HUD controller must be attached at ready.
      /** @type {boolean} Whether the TITAN effect HUD controller exists on the game object. */
      const hudReady = await page.evaluate(() => typeof game.titan?.effectHud !== 'undefined');
      expect(hudReady, 'TITAN effect HUD controller must be attached at ready').toBe(true);

      await controlFixtureActorToken(page, {
         actorName: ACTOR_NAME,
         fallbackSceneName: 'E2E Embedded Context Scene',
      });

      /** @type {import('@playwright/test').Locator} The mounted HUD panel. */
      const panel = page.locator('#titan-effect-hud .titan-effect-hud');
      await expect(panel, 'HUD panel mounts for the controlled token actor').toBeVisible();

      // The row header shows the seeded name; rows mount collapsed, so this is the only expander
      // click (clicking the header toggles the row open).
      /** @type {import('@playwright/test').Locator} The effect row's header button. */
      const rowHeader = panel.locator('.row .row-header');
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
