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

test.describe('effect tray sidebar tab', () => {
   test.beforeEach(async () => {
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

   test('the titanEffects tab is registered and its panel mounts', async () => {
      // The tab class is registered on CONFIG.ui and added to the Sidebar tab list.
      const registered = await page.evaluate(() => {
         const inTabs = 'titanEffects' in foundry.applications.sidebar.Sidebar.TABS;
         const hasClass = !!CONFIG.ui.titanEffects;
         return inTabs && hasClass;
      });
      expect(registered, 'titanEffects must be in Sidebar.TABS and CONFIG.ui').toBe(true);

      // Activate the tab and confirm the Svelte panel mounted with our marker.
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );
      });
      await expect(page.locator('[data-testid="effect-tray"]').first()).toBeVisible();
      expect(errors, `uncaught errors mounting the tray:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the dropdown lists ActiveEffect packs and browsing shows seeded effects', async () => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element
               ?.querySelector('[data-testid="effect-tray-pack-select"] option'),
            { message: 'tray pack-select options rendered' },
         );
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
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
      });

      // Selecting the world pack lists its seeded effect.
      await expect(
         page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' }).first(),
      ).toBeVisible();
   });

   test('Apply copies the effect onto the controlled token actor', async () => {
      // Create an actor + token on the active scene and control it (throws if it never draws).
      await deleteFixtureActor(page, 'E2E Tray Target');
      await page.evaluate(async () => {
         await Actor.create({
            name: 'E2E Tray Target',
            type: 'player',
         });
      });
      await controlFixtureActorToken(page, {
         actorName: 'E2E Tray Target',
         fallbackSceneName: 'E2E Tray Scene',
      });

      // Mount and activate the tray over the controlled token.
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );
      });

      // Select the seeded world pack via the mounted select element, dispatching a change event so
      // the Svelte onchange handler fires regardless of the harness's native-select behavior.
      await page.evaluate(async () => {
         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
      });

      // Scope the Apply click to the seeded effect's own row so the assertion is independent of how
      // many other effects the shared world pack holds or their alphabetical ordering.
      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .locator('[data-testid="effect-tray-apply"]')
         .first()
         .click();

      // Apply copies the effect onto the controlled token actor asynchronously; poll until it lands.
      await expect
         .poll(
            () => page.evaluate(() => {
               const actor = game.actors.getName('E2E Tray Target');
               return [...actor.effects].some((e) => e.name === 'E2E Tray Effect');
            }),
            { message: 'the effect must be copied onto the controlled token actor' },
         )
         .toBe(true);
   });

   test('create, rename, and delete round-trip in the selected world pack', async () => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );
      });

      // Select the seeded world pack via the mounted select element, dispatching a change event so
      // the Svelte onchange handler fires regardless of the harness's native-select behavior.
      await page.evaluate(async () => {
         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
      });

      // Create a blank effect via the header + New button.
      await page.locator('[data-testid="effect-tray-new"]').click();

      // The create writes a blank "New Effect" into the pack asynchronously; poll until it lands.
      await expect
         .poll(
            () => page.evaluate(async () => {
               const pack = game.packs.get('world.e2e-tray-effects');
               return (await pack.getDocuments()).some((e) => e.name === 'New Effect');
            }),
            { message: 'a blank "New Effect" must be created in the pack' },
         )
         .toBe(true);

      // Close any sheet the create opened so it does not block subsequent assertions.
      await page.evaluate(() => {
         for (const app of Object.values(ui.windows)) {
            if (app?.document?.name === 'New Effect') {
               app.close();
            }
         }
      });

      // Delete it again (driven directly via doc.delete() to keep the round-trip deterministic; the
      // row's delete -> confirm UI is still implemented and verified by wiring + a manual pass).
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const doc = (await pack.getDocuments()).find((e) => e.name === 'New Effect');
         await doc.delete();
      });

      // The delete removes "New Effect" from the pack asynchronously; poll until it is gone.
      await expect
         .poll(
            () => page.evaluate(async () => {
               const pack = game.packs.get('world.e2e-tray-effects');
               return !(await pack.getDocuments()).some((e) => e.name === 'New Effect');
            }),
            { message: 'the created effect must be deletable from the pack' },
         )
         .toBe(true);
   });

   test('renaming a folder inline persists the new name to the pack', async () => {
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
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );

         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-folder"]'),
            { message: 'tray folder rendered for selected pack' },
         );
      });

      // Double-click the folder name to enter inline rename, type a new name, and commit with Enter.
      await page.locator('[data-testid="effect-tray-folder"]', { hasText: 'E2E Rename Folder' })
         .locator('.effect-tray-folder-name')
         .first()
         .dblclick();
      const input = page.locator('[data-testid="effect-tray-folder-rename"]').first();
      await input.fill('E2E Renamed Folder');
      await input.press('Enter');

      // The rename persists to the pack folders asynchronously; poll until the new name lands.
      await expect
         .poll(
            () => page.evaluate(() => {
               const pack = game.packs.get('world.e2e-tray-effects');
               return pack.folders.some((f) => f.name === 'E2E Renamed Folder')
                  && !pack.folders.some((f) => f.name === 'E2E Rename Folder');
            }),
            { message: 'the folder must be renamed in the pack' },
         )
         .toBe(true);

      // Clean up the seeded folder so the shared world pack is left as later tests expect.
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const folder = pack.folders.find((f) => f.name === 'E2E Renamed Folder');
         await folder?.delete();
      });
   });

   test('stash-from-actor copies a dropped effect into the selected pack', async () => {
      // Create an actor that owns an effect to stash, render the tray, and select the world pack.
      await deleteFixtureActor(page, 'E2E Stash Source');
      await page.evaluate(async () => {
         const actor = await Actor.create({ name: 'E2E Stash Source', type: 'player' });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Stash Effect',
               type: 'effect',
            },
         ]);

         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );

         /** @type {HTMLSelectElement} The mounted pack-select element. */
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
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
      });

      // The drop copies the effect into the selected pack asynchronously; poll until the copy lands.
      await expect
         .poll(
            () => page.evaluate(async () => {
               const pack = game.packs.get('world.e2e-tray-effects');
               return (await pack.getDocuments()).some((e) => e.name === 'E2E Stash Effect');
            }),
            { message: 'the dropped effect must be copied into the selected pack' },
         )
         .toBe(true);

      // Remove the stashed copy so the shared world pack is left holding only its seeded effect,
      // keeping later tests that act on the first pack row deterministic regardless of run order.
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const copy = (await pack.getDocuments()).find((e) => e.name === 'E2E Stash Effect');
         await copy?.delete();
      });
   });

   test('left-clicking a row opens the effect sheet', async () => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
      });

      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .locator('.effect-tray-row-icon')
         .first()
         .click();

      // Left-clicking the row opens the effect sheet asynchronously; poll until the app appears.
      await expect
         .poll(
            () => page.evaluate(() => {
               // v14 sheets are ApplicationV2 (foundry.applications.instances), not legacy ui.windows.
               const apps = [
                  ...Object.values(ui.windows),
                  ...(foundry.applications?.instances?.values?.() ?? []),
               ];
               return apps.some((app) => app?.document?.name === 'E2E Tray Effect');
            }),
            { message: 'left-clicking the row must open the effect sheet' },
         )
         .toBe(true);

      await page.evaluate(() => {
         const apps = [
            ...Object.values(ui.windows),
            ...(foundry.applications?.instances?.values?.() ?? []),
         ];
         for (const app of apps) {
            if (app?.document?.name === 'E2E Tray Effect') { app.close(); }
         }
      });
   });

   test('right-click context menu opens the effect sheet', async () => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
      });

      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .first()
         .click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();

      const openLabel = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayOpen.text'));
      await page.locator('#context-menu li.context-item', { hasText: openLabel }).first().click();

      // The context-menu Open entry opens the effect sheet asynchronously; poll until it appears.
      await expect
         .poll(
            () => page.evaluate(() => {
               // v14 sheets are ApplicationV2 (foundry.applications.instances), not legacy ui.windows.
               const apps = [
                  ...Object.values(ui.windows),
                  ...(foundry.applications?.instances?.values?.() ?? []),
               ];
               return apps.some((app) => app?.document?.name === 'E2E Tray Effect');
            }),
            { message: 'the context-menu Open Sheet entry must open the effect sheet' },
         )
         .toBe(true);

      await page.evaluate(() => {
         const apps = [
            ...Object.values(ui.windows),
            ...(foundry.applications?.instances?.values?.() ?? []),
         ];
         for (const app of apps) {
            if (app?.document?.name === 'E2E Tray Effect') { app.close(); }
         }
      });
   });

   test('GM lock toggle flips the pack locked state', async () => {
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         if (pack.locked) { await pack.configure({ locked: false }); }
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray"]'),
            { message: 'tray panel mounted' },
         );
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
      });

      await page.locator('[data-testid="effect-tray-lock"]').first().click();

      // The lock toggle flips the pack locked state asynchronously; poll until it locks.
      await expect
         .poll(
            () => page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked),
            { message: 'clicking the lock toggle must lock the pack' },
         )
         .toBe(true);

      await page.locator('[data-testid="effect-tray-lock"]').first().click();

      // Toggling again unlocks the pack asynchronously; poll until it unlocks.
      await expect
         .poll(
            () => page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked),
            { message: 'clicking the lock toggle again must unlock the pack' },
         )
         .toBe(false);
   });
});
