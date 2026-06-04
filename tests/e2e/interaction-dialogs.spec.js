import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Interaction-path walk: dialog-render smoke. For each dialog reachable in normal play this suite
 * triggers it through its real entry point (an actor/item API method or a directory context-menu
 * action), then asserts the dialog window mounts with zero uncaught page errors.
 *
 * Confirmed against source:
 * All TITAN dialogs extend `TitanDialog` (an ApplicationV2) whose constructor stamps the classes
 * `['titan', 'titan-dialog', ...]`, so the rendered window root is `.application.titan-dialog`.
 * Check-options dialog: gated by the `getCheckOptions` setting; `requestAttributeCheck` routes to
 * `_createAttributeCheckDialog` -> `new AttributeCheckDialog(...).render(true)` when the setting is on.
 * Confirm-delete-item dialog: gated by the `confirmDeletingItems` setting; `requestItemDeletion`
 * routes to `new ConfirmDeleteItemDialog(...).render(true)`.
 * Add/Edit custom-trait dialogs: `TitanItem#addCustomTrait()` / `TitanItem#editCustomTrait(idx)`.
 * Edit-UUID dialog: reachable only from the Actors-directory context menu ("Edit UUID"), which
 * calls `onEditDocumentUUID(actor)` -> `new EditUUIDDialog(actor).render(true)`.
 */

// The window selector shared by every TitanDialog-derived window.
const DIALOG_SELECTOR = '.application.titan-dialog';

/**
 * Drive a roll/dialog interaction inside the world and report any uncaught page errors.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string} evalSrc - Stringified async function body executed in the Foundry runtime.
 * @returns {Promise<string[]>} The list of uncaught page-error messages observed.
 */
async function triggerInWorld(page, evalSrc) {
   // Collected uncaught page errors fired during the trigger window.
   const errors = [];
   page.on('pageerror', (err) => {
      errors.push(err.message);
   });

   // Execute the trigger source inside the world; Node-side assertions handle the settle.
   await page.evaluate(async (src) => {
      await new Function(`return (async () => { ${src} })();`)();
   }, evalSrc);

   return errors;
}

test.describe('v14 interaction dialogs', () => {
   // Log in and build a fresh fixture actor with the owned items / traits each dialog needs.
   test.beforeEach(async ({ page }) => {
      // Capture uncaught page errors from the very start so a fatal system-load break is reported
      // verbatim rather than surfacing as a downstream "not a function".
      const bootErrors = [];
      page.on('pageerror', (err) => {
         bootErrors.push(err.message);
      });

      await login(page);

      // Precondition: the TITAN system must have initialized for any dialog to be constructible.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before dialog walk. Captured page errors:\n${bootErrors.join('\n')}`,
      ).toBe(true);

      // Build (or rebuild) the E2E Dialog Actor and its fixtures inside the Foundry runtime.
      await page.evaluate(async () => {
         // Remove any stale fixture so each run starts from a clean, known state.
         const stale = game.actors.getName('E2E Dialog Actor');
         if (stale) {
            await stale.delete();
         }

         // The fixture actor used as the source for every dialog trigger.
         const actor = await Actor.create({ name: 'E2E Dialog Actor', type: 'player' });

         // An owned equipment item that carries one custom trait (for the add/edit-trait dialogs)
         // and exists so it can be targeted by the confirm-delete dialog.
         await actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Dialog Item',
               type: 'equipment',
               system: {
                  customTrait: [
                     {
                        name: 'E2E Trait',
                        description: '',
                     },
                  ],
               },
            },
         ]);

         // An owned effect that exists so it can be targeted by the confirm-delete-effect dialog.
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Dialog Effect',
               type: 'effect',
               disabled: false,
            },
         ]);

         // Default the gating settings to off; each test flips the one it needs.
         await game.settings.set('titan', 'getCheckOptions', false);
         await game.settings.set('titan', 'confirmDeletingItems', false);
         await game.settings.set('titan', 'confirmDeletingEffects', false);
      });
   });

   // Close any open TitanDialog windows after each test so they do not leak across tests.
   test.afterEach(async ({ page }) => {
      await page.evaluate(async () => {
         for (const app of Object.values(ui.windows ?? {})) {
            if (app?.element?.classList?.contains('titan-dialog')) {
               await app.close();
            }
         }

         // v14 also tracks AppV2 windows in foundry.applications.instances.
         const instances = foundry.applications?.instances;
         if (instances) {
            for (const app of instances.values()) {
               if (app?.element?.classList?.contains('titan-dialog')) {
                  await app.close();
               }
            }
         }
      });
   });

   // Check-options dialog (forced via the getCheckOptions setting + requestAttributeCheck).
   test('check-options dialog mounts', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         await game.settings.set('titan', 'getCheckOptions', true);
         await actor.system.requestAttributeCheck({ attribute: 'body' });
      `);

      await expect(page.locator(DIALOG_SELECTOR).first()).toBeVisible();
      expect(errors, `uncaught errors during check-options dialog render:\n${errors.join('\n')}`).toEqual([]);
   });

   // Confirm-delete-item dialog (forced via the confirmDeletingItems setting + requestItemDeletion).
   test('confirm-delete-item dialog mounts', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         const item = actor.items.getName('E2E Dialog Item');
         await game.settings.set('titan', 'confirmDeletingItems', true);
         await actor.system.requestItemDeletion(item.id);
      `);

      await expect(page.locator(DIALOG_SELECTOR).first()).toBeVisible();
      expect(errors, `uncaught errors during confirm-delete dialog render:\n${errors.join('\n')}`).toEqual([]);
   });

   // Confirm-delete-effect dialog (forced via the confirmDeletingEffects setting + requestEffectDeletion).
   test('confirm-delete-effect dialog mounts', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         const effect = actor.effects.getName('E2E Dialog Effect');
         await game.settings.set('titan', 'confirmDeletingEffects', true);
         await actor.system.requestEffectDeletion(effect.id);
      `);

      await expect(page.locator(DIALOG_SELECTOR).first()).toBeVisible();

      // The effect must still exist while the confirmation is pending.
      const stillPresent = await page.evaluate(() =>
         !!game.actors.getName('E2E Dialog Actor').effects.getName('E2E Dialog Effect'));
      expect(stillPresent, 'effect is not deleted until the dialog is confirmed').toBe(true);
      expect(errors, `uncaught errors during confirm-delete-effect dialog render:\n${errors.join('\n')}`).toEqual([]);
   });

   // Immediate effect deletion when confirmation is disabled (requestEffectDeletion -> safeDeleteEffect).
   test('requestEffectDeletion deletes immediately when confirmation is disabled', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         const effect = actor.effects.getName('E2E Dialog Effect');
         await game.settings.set('titan', 'confirmDeletingEffects', false);
         await actor.system.requestEffectDeletion(effect.id);
      `);

      // No dialog should have mounted, and the effect should be gone.
      await expect(page.locator(DIALOG_SELECTOR)).toHaveCount(0);
      const gone = await page.evaluate(() =>
         !game.actors.getName('E2E Dialog Actor').effects.getName('E2E Dialog Effect'));
      expect(gone, 'effect deleted immediately with no confirmation').toBe(true);
      expect(errors, `uncaught errors during immediate effect deletion:\n${errors.join('\n')}`).toEqual([]);
   });

   // Add custom-trait dialog (TitanItem#addCustomTrait).
   test('add custom-trait dialog mounts', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         const item = actor.items.getName('E2E Dialog Item');
         item.addCustomTrait();
      `);

      await expect(page.locator(DIALOG_SELECTOR).first()).toBeVisible();
      expect(errors, `uncaught errors during add-custom-trait dialog render:\n${errors.join('\n')}`).toEqual([]);
   });

   // Edit custom-trait dialog (TitanItem#editCustomTrait against the seeded trait at index 0).
   test('edit custom-trait dialog mounts', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         const item = actor.items.getName('E2E Dialog Item');
         item.editCustomTrait(0);
      `);

      await expect(page.locator(DIALOG_SELECTOR).first()).toBeVisible();
      expect(errors, `uncaught errors during edit-custom-trait dialog render:\n${errors.join('\n')}`).toEqual([]);
   });

   // Edit-UUID dialog (reached through the Actors-directory "Edit UUID" context-menu action).
   test('edit-UUID dialog mounts', async ({ page }) => {
      // Collected uncaught page errors fired during the context-menu interaction.
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      // Open the Actors sidebar tab so the directory entry is in the DOM.
      await page.click('#sidebar-tabs [data-tab="actors"], #sidebar a[data-tab="actors"], nav#sidebar-tabs a[data-tab="actors"]');

      // Right-click the fixture actor's directory entry to open the context menu.
      const entry = page.locator('#actors .directory-item[data-entry-id]', { hasText: 'E2E Dialog Actor' }).first();
      await entry.scrollIntoViewIfNeeded();
      await entry.click({ button: 'right' });

      // Click the Edit-UUID entry in the context menu. The TITAN `getActorContextOptions` hook
      // (OnGetActorDirectoryEntryContext.js) labels it via the `editUUID` localization, which
      // resolves to "Edit Unique ID" in lang/en.json - not the literal "Edit UUID".
      await page.locator('#context-menu li.context-item, .context-menu .context-item', { hasText: 'Edit Unique ID' })
         .first()
         .click();

      // The dialog window appears once the AppV2 render + Svelte mount settle (auto-retried).
      await expect(page.locator(DIALOG_SELECTOR).first()).toBeVisible();
      expect(errors, `uncaught errors during edit-UUID dialog render:\n${errors.join('\n')}`).toEqual([]);
   });
});
