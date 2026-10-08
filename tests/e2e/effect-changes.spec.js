import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { addEffect, createActor } from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The core `changes` field of TITAN's Active Effects, driven through core's own Active Effect Config sheet: its Add
 * change button, its form and its change rows. TITAN has no changes editor, so the config sheet is opened by script
 * (as another module could); every edit after that goes through its controls. Locked in: the button stores core's
 * initial change (type `add`, phase `initial`) and the sheet renders it; saving leaves the priority unset and the
 * sheet shows each type's default as the priority placeholder; a malformed change type is rejected. Core applies
 * the per-type default priority only on builds whose `ActiveEffect#prepareBaseData` reads `.defaultPriority`
 * (14.368); the 14.364 build the e2e server runs prepares 0, so the applied order is not asserted.
 *
 * The documents come from flows: one player actor and one effect made through the Effects tab.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The actor that owns the effect, by id. */
let actorId;
/** @type {string} The effect, by id. */
let effectId;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   actorId = await createActor(page, {
      name: 'E2E Changes Actor',
      type: 'player',
   });
});

test.beforeEach(async () => {
   effectId = await addEffect(page, actorId, 'E2E Changes Effect');
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads the stored changes of the effect.
 * @returns {Promise<object[]>} The effect's stored `system.changes`.
 */
function storedChanges() {
   return page.evaluate(
      ({ actorId, effectId }) => game.actors.get(actorId).effects.get(effectId).toObject().system.changes,
      {
         actorId,
         effectId,
      },
   );
}

/**
 * Opens core's Active Effect Config sheet on the effect, on its Changes tab.
 * @returns {Promise<import('@playwright/test').Locator>} The config sheet's element.
 */
async function openConfig() {
   await page.evaluate(async ({ actorId, effectId }) => {
      const sheet = new foundry.applications.sheets.ActiveEffectConfig({
         document: game.actors.get(actorId).effects.get(effectId),
      });
      await sheet.render({ force: true });
      await sheet.changeTab('changes', 'sheet');
   }, {
      actorId,
      effectId,
   });

   /** @type {import('@playwright/test').Locator} The config sheet's element. */
   const config = page.locator('.application.active-effect-config');
   await expect(config).toBeVisible();
   return config;
}

test.describe('core changes on a TITAN effect', () => {
   test('the Add change button stores core\'s initial change and the config sheet renders it', async () => {
      /** @type {import('@playwright/test').Locator} The config sheet. */
      const config = await openConfig();
      const rows = config.locator('ol[data-changes] li');
      await expect(rows).toHaveCount(0);

      // Two presses: the first change must render, and the second press re-renders the sheet around it.
      await config.locator('[data-action="addChange"]').click();
      await expect(rows).toHaveCount(1);
      await config.locator('[data-action="addChange"]').click();
      await expect(rows).toHaveCount(2);

      const changes = await storedChanges();
      expect(changes).toHaveLength(2);
      for (const change of changes) {
         expect(change.type).toBe('add');
         expect(change.phase).toBe('initial');
      }
      expect(errors).toEqual([]);
   });

   test('saving leaves the priority unset and the sheet shows each type\'s default priority', async () => {
      /** @type {import('@playwright/test').Locator} The config sheet. */
      const config = await openConfig();
      await config.locator('[data-action="addChange"]').click();
      await expect(config.locator('ol[data-changes] li')).toHaveCount(1);
      await config.locator('[data-action="addChange"]').click();
      await expect(config.locator('ol[data-changes] li')).toHaveCount(2);
      await config.locator('[name="system.changes.0.key"]').fill('system.rating.awareness.mod.static');
      await config.locator('[name="system.changes.0.value"]').fill('3');
      await config.locator('[name="system.changes.1.key"]').fill('system.rating.awareness.mod.static');
      await config.locator('[name="system.changes.1.value"]').fill('2');
      await config.locator('[name="system.changes.1.type"]').selectOption('multiply');
      await config.locator('button[type="submit"]').click();
      await expect.poll(async () => (await storedChanges()).map((change) => change.type)).toEqual([
         'add',
         'multiply',
      ]);

      // A priority the user did not type stays unset (null); core's per-type default fills it at preparation on
      // builds that read `.defaultPriority` (14.368), and the running 14.364 prepares 0.
      const changes = await storedChanges();
      expect(changes.map((change) => change.priority ?? null)).toEqual([
         null,
         null,
      ]);

      // The reopened sheet shows core's default priority of each type as the priority input's placeholder.
      /** @type {import('@playwright/test').Locator} The reopened config sheet. */
      const reopened = await openConfig();
      await expect(reopened.locator('[name="system.changes.0.priority"]')).toHaveAttribute('placeholder', '20');
      await expect(reopened.locator('[name="system.changes.1.priority"]')).toHaveAttribute('placeholder', '10');
      expect(errors).toEqual([]);
   });

   test('a malformed change type is rejected and a well-formed one is stored', async () => {
      // A change from core's Add change button gives the rejection a stored value to leave in place.
      /** @type {import('@playwright/test').Locator} The config sheet. */
      const config = await openConfig();
      await config.locator('[data-action="addChange"]').click();
      await expect(config.locator('ol[data-changes] li')).toHaveCount(1);
      expect((await storedChanges()).map((change) => change.type)).toEqual(['add']);
      await closeAllApps(page);

      // The update path is the only way to submit a malformed type: core's sheet offers a fixed list of types.
      const typesAfterBadUpdate = await page.evaluate(async ({ actorId, effectId }) => {
         const effect = game.actors.get(actorId).effects.get(effectId);
         try {
            await effect.update({
               'system.changes': [{
                  key: 'name',
                  type: 'not a valid type!',
                  phase: 'initial',
                  value: 'x',
               }],
            });
         } catch (error) {
            // Rejection may throw or resolve without storing; the stored types below decide.
         }
         return effect.toObject().system.changes.map((change) => change.type);
      }, {
         actorId,
         effectId,
      });
      expect(typesAfterBadUpdate).toEqual(['add']);

      // Presence: a well-formed replacement is stored, so the rejection above was the type check and not a dead path.
      await page.evaluate(async ({ actorId, effectId }) => {
         await game.actors.get(actorId).effects.get(effectId).update({
            'system.changes': [{
               key: 'name',
               type: 'override',
               phase: 'initial',
               value: 'x',
            }],
         });
      }, {
         actorId,
         effectId,
      });
      await expect.poll(async () => (await storedChanges()).map((change) => change.type)).toEqual(['override']);
   });
});
