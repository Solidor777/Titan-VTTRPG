import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

test.describe('effect tray sidebar tab', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.ui?.titanEffects);
      expect(ready, 'TITAN system + titanEffects tab must be registered').toBe(true);

      // Seed a world ActiveEffect compendium with one effect for the tray to browse (idempotent).
      await page.evaluate(async () => {
         let pack = game.packs.get('world.e2e-tray-effects');
         if (!pack) {
            pack = await CompendiumCollection.createCompendium({
               type: 'ActiveEffect',
               label: 'E2E Tray Effects',
               name: 'e2e-tray-effects',
            });
         }
         const existing = (await pack.getDocuments()).find((e) => e.name === 'E2E Tray Effect');
         if (!existing) {
            await ActiveEffect.create(
               {
                  name: 'E2E Tray Effect',
                  type: 'effect',
               },
               { pack: pack.collection },
            );
         }
      });
   });

   test('the titanEffects tab is registered and its panel mounts', async ({ page }) => {
      // The tab class is registered on CONFIG.ui and added to the Sidebar tab list.
      const registered = await page.evaluate(() => {
         const inTabs = 'titanEffects' in foundry.applications.sidebar.Sidebar.TABS;
         const hasClass = !!CONFIG.ui.titanEffects;
         return inTabs && hasClass;
      });
      expect(registered, 'titanEffects must be in Sidebar.TABS and CONFIG.ui').toBe(true);

      // Activate the tab and confirm the Svelte panel mounted with our marker.
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      });
      await expect(page.locator('[data-testid="effect-tray"]').first()).toBeVisible();
      expect(errors, `uncaught errors mounting the tray:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the dropdown lists ActiveEffect packs and browsing shows seeded effects', async ({ page }) => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      });

      // The pack select offers the seeded world pack.
      const options = await page.locator('[data-testid="effect-tray-pack-select"] option')
         .allTextContents();
      expect(options.join(' ')).toContain('E2E Tray Effects');

      // Select the seeded world pack via the mounted select element, dispatching a change event so
      // the Svelte onchange handler fires regardless of the harness's native-select behavior.
      await page.evaluate(async () => {
         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => {
            setTimeout(resolve, 400);
         });
      });

      // Selecting the world pack lists its seeded effect.
      await expect(
         page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' }).first(),
      ).toBeVisible();
   });

   test('Apply copies the effect onto the controlled token actor', async ({ page }) => {
      // Create an actor + token on the active scene and control it.
      await page.evaluate(async () => {
         const stale = game.actors.getName('E2E Tray Target');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Tray Target', type: 'player' });
         const scene = game.scenes.active ?? (await Scene.create({ name: 'E2E Tray Scene', active: true }));
         const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
            await actor.getTokenDocument({ x: 100, y: 100 }),
         ]);
         // Poll until the placeable is rendered on the canvas, then control it. A fixed delay races
         // canvas readiness and can no-op when the placeable is not yet drawn.
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
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 400);
         });
      });

      // Select the seeded world pack via the mounted select element, dispatching a change event so
      // the Svelte onchange handler fires regardless of the harness's native-select behavior.
      await page.evaluate(async () => {
         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => {
            setTimeout(resolve, 400);
         });
      });

      await page.locator('[data-testid="effect-tray-apply"]').first().click();
      await page.waitForTimeout(400);

      const applied = await page.evaluate(() => {
         const actor = game.actors.getName('E2E Tray Target');
         return [...actor.effects].some((e) => e.name === 'E2E Tray Effect');
      });
      expect(applied, 'the effect must be copied onto the controlled token actor').toBe(true);
   });
});
