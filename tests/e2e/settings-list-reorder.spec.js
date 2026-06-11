import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Drives the per-kind `moveX` data mutators and asserts the array reorders (insertion-point
 * semantics) and re-renders in place. New weapons ship with default attack/check entries, so each
 * test clears the relevant array first for a deterministic start. The pointer drag itself is covered
 * by live smoke-tests; these specs lock the data-layer behaviour the drag actions call into.
 */

const WEAPON_NAME = 'E2E Reorder Weapon';
const SPELL_NAME = 'E2E Reorder Spell';

test.describe('settings-list reorder', () => {
   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, 'TITAN system failed to initialize').toBe(true);
   });

   test('moveRulesElement reorders the array (first to end)', async () => {
      const order = await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         await item.update({ system: { rulesElement: [] } });
         await item.system.addRulesElement();
         await item.system.addRulesElement();
         await item.system.addRulesElement();
         const before = item.system.rulesElement.map((e) => e.uuid);
         await item.system.moveRulesElement(0, 3);
         const after = item.system.rulesElement.map((e) => e.uuid);
         return { before, after };
      }, WEAPON_NAME);

      expect(order.before.length).toBe(3);
      expect(order.after).toEqual([order.before[1], order.before[2], order.before[0]]);
   });

   test('moveAttack reorders the array (first to end)', async () => {
      const order = await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         await item.update({ system: { attack: [] } });
         await item.system.addAttack();
         await item.system.addAttack();
         await item.system.addAttack();
         const before = item.system.attack.map((e) => e.uuid);
         await item.system.moveAttack(0, 3);
         const after = item.system.attack.map((e) => e.uuid);
         return { before, after };
      }, WEAPON_NAME);

      expect(order.before.length).toBe(3);
      expect(order.after).toEqual([order.before[1], order.before[2], order.before[0]]);
   });

   test('moveCheck reorders the array and keeps expansion state length aligned', async () => {
      const result = await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         await item.update({ system: { check: [] } });

         // Render first so the expansion store is seeded once, then add checks the way a user does —
         // each add grows the expansion array in step (matching real usage, not a lazy-sheet artifact).
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'weapon sheet mounted' },
         );

         await item.addCheck();
         await item.addCheck();
         await item.addCheck();

         const before = item.system.check.map((e) => e.uuid);
         await item.moveCheck(0, 3);
         const after = item.system.check.map((e) => e.uuid);

         // Read the expansion-array length from the live store.
         let expandedLength = -1;
         const unsub = app.applicationState.subscribe((data) => {
            expandedLength = data.tabs.checks.isExpanded.length;
         });
         unsub();

         return { before, after, expandedLength };
      }, WEAPON_NAME);

      expect(result.before.length).toBe(3);
      expect(result.after).toEqual([result.before[1], result.before[2], result.before[0]]);
      expect(result.expandedLength).toBe(3);
   });

   test('moveCustomAspect reorders the array (first to end)', async () => {
      const order = await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'spell' });
         await item.update({ system: { customAspect: [] } });
         await item.system.addCustomAspect();
         await item.system.addCustomAspect();
         await item.system.addCustomAspect();
         const before = item.system.customAspect.map((e) => e.uuid);
         await item.system.moveCustomAspect(0, 3);
         const after = item.system.customAspect.map((e) => e.uuid);
         return { before, after };
      }, SPELL_NAME);

      expect(order.before.length).toBe(3);
      expect(order.after).toEqual([order.before[1], order.before[2], order.before[0]]);
   });

   test('the rules-element rows render a drag handle', async () => {
      await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         await item.system.addRulesElement();
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'weapon sheet mounted' },
         );
      }, WEAPON_NAME);

      const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
      await page.locator('.tab-list').getByText(label, { exact: true }).click();
      await expect(page.locator('.rules-element .drag-handle').first(), 'grip handle renders').toBeVisible();
   });
});
