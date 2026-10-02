import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, waitForAnimations } from './world.js';

/**
 * Regression: the standalone Active Effect sheet must render with usable content height. It shares
 * ItemSheetBase (which lays out with height: 100%), so it requires a definite window height; without
 * one the body collapses to the tab-button strip (~40px) and the tab content is unreachable.
 */

/** @type {string} The name of the spec's own host actor, unique to the run. */
const ACTOR_NAME = `E2E Layout Host ${Date.now()}`;

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the host actor the spec creates through the Actors directory. */
let actorId;

/**
 * Creates a player actor the way a user does: the Actors directory's Create Actor button, then the core creation
 * dialog's name and type fields and its confirm button.
 * @param {import('@playwright/test').Page} target - The logged-in page.
 * @param {string} name - The name of the new actor.
 * @returns {Promise<string>} The created actor's id.
 */
async function createActorThroughDirectory(target, name) {
   await target.locator('#sidebar nav.tabs [data-tab="actors"]').click();
   await target.locator('#actors [data-action="createEntry"]').click();

   /** @type {import('@playwright/test').Locator} The core document-creation dialog. */
   const dialog = target.locator('.application.dialog', { has: target.locator('select[name="type"]') });
   await dialog.locator('input[name="name"]').fill(name);
   await dialog.locator('select[name="type"]').selectOption('player');
   await dialog.locator('button[data-action="ok"]').click();
   await expect(dialog).toHaveCount(0);

   /** @type {string | undefined} The created actor's id, once the world collection holds it. */
   let id;
   await expect.poll(async () => {
      id = await target.evaluate((actorName) => game.actors.getName(actorName)?.id, name);
      return id;
   }, { message: 'the created actor is in the world' }).toBeTruthy();
   return id;
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   actorId = await createActorThroughDirectory(page, ACTOR_NAME);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.evaluate((id) => game.actors.get(id)?.delete(), actorId);
   await page?.close();
});

test('effect AE sheet renders with a non-collapsed content body', async () => {
   const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
      && !!CONFIG.Actor?.dataModels?.player);
   expect(systemReady, 'TITAN system initialized').toBe(true);

   // Give the spec's host actor an effect, then render its Active Effect sheet.
   await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'Layout Effect',
            type: 'effect',
         },
      ]);
      const app = await effect.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.titan-sheet > .body'),
         { message: 'sheet mounted' },
      );
   }, actorId);

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
   await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'Layout Described Effect',
            type: 'effect',
            description: '<p>Blessed by the sun.</p>',
         },
      ]);
      const app = await effect.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('prose-mirror .editor-content'),
         { message: 'description editor mounted' },
      );
   }, actorId);

   const content = page.locator('.titan-effect-sheet prose-mirror .editor-content');
   await expect(content, 'inactive editor view shows the description').toHaveText('Blessed by the sun.');
   expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
});
