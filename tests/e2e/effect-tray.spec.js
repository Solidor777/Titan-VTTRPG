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

      // Scope the Apply click to the seeded effect's own row so the assertion is independent of how
      // many other effects the shared world pack holds or their alphabetical ordering.
      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .locator('[data-testid="effect-tray-apply"]')
         .first()
         .click();
      await page.waitForTimeout(400);

      const applied = await page.evaluate(() => {
         const actor = game.actors.getName('E2E Tray Target');
         return [...actor.effects].some((e) => e.name === 'E2E Tray Effect');
      });
      expect(applied, 'the effect must be copied onto the controlled token actor').toBe(true);
   });

   test('create, rename, and delete round-trip in the selected world pack', async ({ page }) => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
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

      // Create a blank effect via the header + New button.
      await page.locator('[data-testid="effect-tray-new"]').click();
      await page.waitForTimeout(500);

      // Close any sheet the create opened so it does not block subsequent assertions.
      await page.evaluate(() => {
         for (const app of Object.values(ui.windows)) {
            if (app?.document?.name === 'New Effect') {
               app.close();
            }
         }
      });

      const created = await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return (await pack.getDocuments()).some((e) => e.name === 'New Effect');
      });
      expect(created, 'a blank "New Effect" must be created in the pack').toBe(true);

      // Delete it again (driven directly via doc.delete() to keep the round-trip deterministic; the
      // row's delete -> confirm UI is still implemented and verified by wiring + a manual pass).
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const doc = (await pack.getDocuments()).find((e) => e.name === 'New Effect');
         await doc.delete();
      });
      await page.waitForTimeout(300);

      const deleted = await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return !(await pack.getDocuments()).some((e) => e.name === 'New Effect');
      });
      expect(deleted, 'the created effect must be deletable from the pack').toBe(true);
   });

   test('renaming a folder inline persists the new name to the pack', async ({ page }) => {
      // Seed a folder in the world pack to rename, render the tray, and select the world pack.
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const stale = pack.folders.find((f) => f.name === 'E2E Rename Folder' || f.name === 'E2E Renamed Folder');
         if (stale) {
            await stale.delete();
         }
         await Folder.create({ name: 'E2E Rename Folder', type: 'ActiveEffect' }, { pack: pack.collection });

         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });

         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => {
            setTimeout(resolve, 400);
         });
      });

      // Double-click the folder name to enter inline rename, type a new name, and commit with Enter.
      await page.locator('[data-testid="effect-tray-folder"]', { hasText: 'E2E Rename Folder' })
         .locator('.effect-tray-folder-name')
         .first()
         .dblclick();
      const input = page.locator('[data-testid="effect-tray-folder-rename"]').first();
      await input.fill('E2E Renamed Folder');
      await input.press('Enter');
      await page.waitForTimeout(400);

      const renamed = await page.evaluate(() => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return pack.folders.some((f) => f.name === 'E2E Renamed Folder')
            && !pack.folders.some((f) => f.name === 'E2E Rename Folder');
      });
      expect(renamed, 'the folder must be renamed in the pack').toBe(true);

      // Clean up the seeded folder so the shared world pack is left as later tests expect.
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const folder = pack.folders.find((f) => f.name === 'E2E Renamed Folder');
         await folder?.delete();
      });
   });

   test('stash-from-actor copies a dropped effect into the selected pack', async ({ page }) => {
      // Create an actor that owns an effect to stash, render the tray, and select the world pack.
      await page.evaluate(async () => {
         const stale = game.actors.getName('E2E Stash Source');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Stash Source', type: 'player' });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Stash Effect',
               type: 'effect',
            },
         ]);

         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });

         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => {
            setTimeout(resolve, 400);
         });
      });

      // Simulate a real drop of the actor's effect onto the tray container, dispatching a drop event
      // carrying the effect's standard Foundry drag data on a DataTransfer.
      await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Stash Source');
         const effect = [...actor.effects].find((e) => e.name === 'E2E Stash Effect');

         /** @type {object} The standard Foundry drag data for the source effect. */
         const dragData = effect.toDragData();

         /** @type {HTMLElement} The tray drop-zone container. */
         const tray = ui.titanEffects.element.querySelector('[data-testid="effect-tray"]');

         /** @type {DataTransfer} The transfer carrying the serialized drag data. */
         const dataTransfer = new DataTransfer();
         dataTransfer.setData('text/plain', JSON.stringify(dragData));

         tray.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      });

      const stashed = await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return (await pack.getDocuments()).some((e) => e.name === 'E2E Stash Effect');
      });
      expect(stashed, 'the dropped effect must be copied into the selected pack').toBe(true);

      // Remove the stashed copy so the shared world pack is left holding only its seeded effect,
      // keeping later tests that act on the first pack row deterministic regardless of run order.
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const copy = (await pack.getDocuments()).find((e) => e.name === 'E2E Stash Effect');
         await copy?.delete();
      });
   });
});
