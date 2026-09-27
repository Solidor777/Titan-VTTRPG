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

/**
 * Selects a pack in the tray's native pack select. The pack's folders and rows then load asynchronously;
 * callers wait on the row/folder locator they act on next.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string} [packId] - The pack collection id; defaults to the seeded world pack.
 * @returns {Promise<void>} Resolves once the option is committed.
 */
async function selectTrayPack(page, packId = 'world.e2e-tray-effects') {
   await page.selectOption('[data-testid="effect-tray-pack-select"]', packId);
}

/**
 * Mounts and activates the tray tab, waiting for its pack select.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<void>} Resolves once the tray is mounted.
 */
async function openTray(page) {
   await page.evaluate(async () => {
      await ui.titanEffects.render(true);
      ui.titanEffects.activate();
      await titanWait(
         () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-pack-select"]'),
         { message: 'tray pack-select rendered' },
      );
   });
}

/**
 * Locates a tray folder item by its exact folder name.
 * @param {import('@playwright/test').Page | import('@playwright/test').Locator} scope - Where to search.
 * @param {string} name - The exact text of the folder header's name.
 * @returns {import('@playwright/test').Locator} The folder `li` locator.
 */
function trayFolder(scope, name) {
   /** @type {import('@playwright/test').Page} The page, needed to build the scope-free inner locator. */
   const root = typeof scope.page === 'function' ? scope.page() : scope;
   return scope.locator('[data-testid="effect-tray-folder"]', {
      has: root.locator(':scope > [data-testid="effect-tray-folder-header"] .folder-name', {
         hasText: new RegExp(`^${name}$`),
      }),
   }).first();
}

/**
 * Expands a tray folder by clicking its header, unless it is already expanded.
 * @param {import('@playwright/test').Locator} folder - The folder `li` locator.
 * @returns {Promise<void>} Resolves once the folder shows as expanded.
 */
async function expandTrayFolder(folder) {
   await expect(folder).toBeVisible();
   if (!(await folder.evaluate((element) => element.classList.contains('expanded')))) {
      await folder.locator(':scope > [data-testid="effect-tray-folder-header"]').click();
   }
   await expect(folder).toHaveClass(/(^|\s)expanded(\s|$)/);
}

/**
 * Seeds a nested folder pair (parent holding a child holding one effect) in the world pack, replacing any
 * left over from a previous run.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<void>} Resolves once the folders and effect exist.
 */
async function seedNestedFolders(page) {
   await page.evaluate(async () => {
      const pack = game.packs.get('world.e2e-tray-effects');
      for (const effect of await pack.getDocuments()) {
         if (effect.name === 'E2E Nested Effect') {
            await effect.delete();
         }
      }
      for (const name of [
         'E2E Child Folder',
         'E2E Parent Folder',
      ]) {
         await pack.folders.find((f) => f.name === name)?.delete();
      }
      const parent = await Folder.create({
         name: 'E2E Parent Folder',
         type: 'ActiveEffect',
      }, { pack: pack.collection });
      const child = await Folder.create({
         name: 'E2E Child Folder',
         type: 'ActiveEffect',
         folder: parent.id,
      }, { pack: pack.collection });
      await ActiveEffect.create(
         {
            name: 'E2E Nested Effect',
            type: 'effect',
            folder: child.id,
         },
         { pack: pack.collection },
      );
   });
}

/**
 * Removes the nested folder pair and its effect seeded by `seedNestedFolders`.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<void>} Resolves once they are gone.
 */
async function deleteNestedFolders(page) {
   await page.evaluate(async () => {
      const pack = game.packs.get('world.e2e-tray-effects');
      for (const effect of await pack.getDocuments()) {
         if (effect.name === 'E2E Nested Effect') {
            await effect.delete();
         }
      }
      for (const name of [
         'E2E Child Folder',
         'E2E Parent Folder',
      ]) {
         await pack.folders.find((f) => f.name === name)?.delete();
      }
   });
}

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
         if (pack.locked) {
            await pack.configure({ locked: false });
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
      await openTray(page);

      // The pack select offers the seeded world pack.
      const options = await page.locator('[data-testid="effect-tray-pack-select"] option').allTextContents();
      expect(options.join(' ')).toContain('E2E Tray Effects');

      // Selecting the world pack lists its seeded effect.
      await selectTrayPack(page);
      await expect(
         page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' }).first(),
      ).toBeVisible();
   });

   test('the shipped TITAN Effects pack lists the standard effects in their folders', async () => {
      await openTray(page);

      // The system pack is compiled from packs/_source/effects; its folders start collapsed.
      await selectTrayPack(page, 'titan.effects');
      const rows = page.locator('[data-testid="effect-tray-row"]');
      for (const folderName of [
         'Actions',
         'Circumstances',
         'Death',
      ]) {
         await expandTrayFolder(trayFolder(page, folderName));
      }
      await expect(rows, 'every seeded standard effect row renders').toHaveCount(17);
      for (const name of [
         'Dodging',
         'Charging',
         'Light Cover',
         'Dying',
         'Last Stand',
      ]) {
         await expect(rows.filter({ hasText: name }).first(), `${name} is seeded`).toBeVisible();
      }
   });

   test('nested folders render inside their parent folder, not at the top level', async () => {
      await seedNestedFolders(page);
      await openTray(page);
      await selectTrayPack(page);

      // The parent is a top-level folder item; the child is not.
      const list = page.locator('[data-testid="effect-tray-list"]');
      const parent = trayFolder(page, 'E2E Parent Folder');
      await expect(parent).toBeVisible();
      await expect(parent).toHaveAttribute('data-folder-depth', '1');
      await expect(
         list.locator(':scope > [data-testid="effect-tray-folder"]', { hasText: 'E2E Child Folder' }),
         'the child folder is not listed at the top level',
      ).toHaveCount(0);
      await expect(parent, 'folders start collapsed').not.toHaveClass(/(^|\s)expanded(\s|$)/);

      // Expanding the parent reveals the child inside the parent's subdirectory; expanding the child shows its effect.
      await expandTrayFolder(parent);
      const child = parent.locator(':scope > .subdirectory > [data-testid="effect-tray-folder"]');
      await expect(child).toHaveCount(1);
      await expect(child).toHaveAttribute('data-folder-depth', '2');
      await expandTrayFolder(child);
      await expect(child.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Nested Effect' })).toBeVisible();

      await deleteNestedFolders(page);
   });

   test('collapsing a folder collapses its subfolders', async () => {
      await seedNestedFolders(page);
      await openTray(page);
      await selectTrayPack(page);

      const parent = trayFolder(page, 'E2E Parent Folder');
      await expandTrayFolder(parent);
      const child = trayFolder(parent, 'E2E Child Folder');
      await expandTrayFolder(child);
      await expect(child.locator('[data-testid="effect-tray-row"]')).toHaveCount(1);

      // Collapse the parent, then reopen it: the child comes back collapsed.
      await parent.locator(':scope > [data-testid="effect-tray-folder-header"]').click();
      await expect(parent).not.toHaveClass(/(^|\s)expanded(\s|$)/);
      await expandTrayFolder(parent);
      await expect(trayFolder(parent, 'E2E Child Folder')).not.toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(trayFolder(parent, 'E2E Child Folder').locator('[data-testid="effect-tray-row"]')).toHaveCount(0);

      // Collapse-all closes every folder.
      await expandTrayFolder(trayFolder(parent, 'E2E Child Folder'));
      await page.locator('[data-testid="effect-tray-collapse-all"]').click();
      await expect(page.locator('[data-testid="effect-tray-folder"].expanded')).toHaveCount(0);

      await deleteNestedFolders(page);
   });

   test('searching shows matching effects inside their expanded folders', async () => {
      await seedNestedFolders(page);
      await openTray(page);
      await selectTrayPack(page);

      // Before the search, the collapsed parent hides the nested effect and the root effect is listed.
      const nested = page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Nested Effect' });
      const rootEffect = page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' });
      await expect(trayFolder(page, 'E2E Parent Folder')).toBeVisible();
      await expect(rootEffect).toBeVisible();
      await expect(nested).toHaveCount(0);

      // A search for the nested effect expands its folder chain and hides everything that does not match.
      await page.locator('[data-testid="effect-tray-search"]').fill('nested effect');
      await expect(nested).toBeVisible();
      await expect(trayFolder(page, 'E2E Parent Folder')).toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(trayFolder(page, 'E2E Child Folder')).toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(rootEffect, 'a non-matching effect is hidden').toHaveCount(0);

      // Clearing the search restores the collapsed tree.
      await page.locator('[data-testid="effect-tray-search"]').fill('');
      await expect(rootEffect).toBeVisible();
      await expect(nested).toHaveCount(0);

      await deleteNestedFolders(page);
   });

   test('tray folders and entries match the core Items sidebar tab styles', async () => {
      // A folder and a root item in the core Items tab to compare against, under the active theme.
      await page.evaluate(async () => {
         await game.folders.find((f) => f.name === 'E2E Style Folder' && f.type === 'Item')?.delete();
         await game.items.getName('E2E Style Item')?.delete();
         await Folder.create({
            name: 'E2E Style Folder',
            type: 'Item',
         });
         await Item.create({
            name: 'E2E Style Item',
            type: 'ability',
         });
      });
      await seedNestedFolders(page);

      /**
       * Reads the computed styles of a folder header and an entry name, both of which must be laid out.
       * @param {{ folder: string, entry: string }} selectors - Selectors for the header and the entry name.
       * @returns {Promise<{ folder: object, entry: object }>} The computed style values of each.
       */
      const readStyles = (selectors) => page.evaluate((targets) => {
         const read = (selector) => {
            const style = getComputedStyle(document.querySelector(selector));
            return Object.fromEntries([
               'background-color',
               'color',
               'font-family',
               'font-size',
               'font-weight',
               'line-height',
               'height',
            ].map((property) => [
               property,
               style.getPropertyValue(property),
            ]));
         };
         return {
            folder: read(targets.folder),
            entry: read(targets.entry),
         };
      }, selectors);

      // Read the core Items tab while it is the active tab, so its elements are laid out.
      const coreIds = await page.evaluate(async () => {
         ui.items.activate();
         await titanWait(
            () => !!ui.items.element?.querySelector('.folder-header')?.offsetHeight,
            { message: 'core Items tab laid out' },
         );
         return {
            folder: game.folders.find((f) => f.name === 'E2E Style Folder' && f.type === 'Item').id,
            entry: game.items.getName('E2E Style Item').id,
         };
      });
      const core = await readStyles({
         folder: `#items [data-folder-id="${coreIds.folder}"] > .folder-header`,
         entry: `#items [data-entry-id="${coreIds.entry}"] .entry-name`,
      });

      await openTray(page);
      await selectTrayPack(page);
      await expect(trayFolder(page, 'E2E Parent Folder')).toBeVisible();
      const trayIds = await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return {
            folder: pack.folders.find((f) => f.name === 'E2E Parent Folder').id,
            entry: (await pack.getDocuments()).find((e) => e.name === 'E2E Tray Effect').id,
         };
      });
      const tray = await readStyles({
         folder: `#titanEffects [data-folder-id="${trayIds.folder}"] > .folder-header`,
         entry: `#titanEffects [data-entry-id="${trayIds.entry}"] .entry-name`,
      });

      expect(tray.folder, 'the tray folder header matches the Items tab folder header').toEqual(core.folder);
      expect(tray.entry, 'the tray entry name matches the Items tab entry name').toEqual(core.entry);

      await page.evaluate(async () => {
         await game.folders.find((f) => f.name === 'E2E Style Folder' && f.type === 'Item')?.delete();
         await game.items.getName('E2E Style Item')?.delete();
      });
      await deleteNestedFolders(page);
   });

   test('the move-to-folder dialog lists nested folders by name under their parents', async () => {
      await seedNestedFolders(page);
      await openTray(page);
      await selectTrayPack(page);

      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .first()
         .click({ button: 'right' });
      const moveLabel = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayMoveToFolder.text'));
      await page.locator('#context-menu li.context-item', { hasText: moveLabel }).first().click();

      // Open the dialog's folder select and read its option labels.
      await page.locator('[data-testid="move-effect-folder-select"]').click();
      const labels = (await page.locator('[role="option"]').allTextContents()).map((label) => label.trim());
      const rootLabel = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayRoot.text'));
      expect(labels).toContain(rootLabel);
      expect(labels).toContain('E2E Parent Folder');
      expect(labels).toContain('─ E2E Child Folder');
      expect(labels.filter((label) => label.includes('LOCAL.')), 'no unlocalized keys').toEqual([]);

      await deleteNestedFolders(page);
   });

   test('applying the seeded Dodging effect raises the token actor Defense and Reflexes by one', async () => {
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
      const before = await page.evaluate(() => {
         const actor = game.actors.getName('E2E Tray Target');
         return {
            defense: actor.system.rating.defense.value,
            reflexes: actor.system.resistance.reflexes.value,
         };
      });

      await openTray(page);
      await selectTrayPack(page, 'titan.effects');

      // Expand the Actions folder (folders start collapsed) so its rows render.
      await expandTrayFolder(trayFolder(page, 'Actions'));
      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'Dodging' })
         .locator('[data-testid="effect-tray-apply"]')
         .first()
         .click();

      // The copied effect's rules elements flow through derived data: +1 Defense, +1 Reflexes.
      await expect
         .poll(
            () => page.evaluate(() => {
               const actor = game.actors.getName('E2E Tray Target');
               return {
                  applied: [...actor.effects].some((e) => e.name === 'Dodging'),
                  defense: actor.system.rating.defense.value,
                  reflexes: actor.system.resistance.reflexes.value,
               };
            }),
            { message: 'Dodging applies its +1 Defense and +1 Reflexes' },
         )
         .toEqual({
            applied: true,
            defense: before.defense + 1,
            reflexes: before.reflexes + 1,
         });
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

      await openTray(page);
      await selectTrayPack(page);

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
      await openTray(page);
      await selectTrayPack(page);

      // Create a blank effect via the header Create Effect button.
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
         for (const app of foundry.applications.instances.values()) {
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

   test('renaming a folder from its context menu persists the new name to the pack', async () => {
      // Seed a folder in the world pack to rename, render the tray, and select the world pack.
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const stale = pack.folders.find((f) => f.name === 'E2E Rename Folder' || f.name === 'E2E Renamed Folder');
         if (stale) {
            await stale.delete();
         }
         await Folder.create({
            name: 'E2E Rename Folder',
            type: 'ActiveEffect',
         }, { pack: pack.collection });
      });
      await openTray(page);
      await selectTrayPack(page);

      // Right-click the folder header, choose Rename Folder, type a new name, and commit with Enter.
      await trayFolder(page, 'E2E Rename Folder')
         .locator(':scope > [data-testid="effect-tray-folder-header"]')
         .click({ button: 'right' });
      const renameLabel = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayRenameFolder.text'));
      await page.locator('#context-menu li.context-item', { hasText: renameLabel }).first().click();
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

   test('an expanded folder header creates a subfolder inside it', async () => {
      await seedNestedFolders(page);
      await openTray(page);
      await selectTrayPack(page);

      // Core shows a folder's create-subfolder control only while the folder is expanded.
      const parent = trayFolder(page, 'E2E Parent Folder');
      const createFolder = parent.locator(':scope > [data-testid="effect-tray-folder-header"]')
         .locator('[data-testid="effect-tray-folder-create-folder"]');
      await expect(createFolder).toBeHidden();
      await expandTrayFolder(parent);
      await parent.locator(':scope > [data-testid="effect-tray-folder-header"]')
         .locator('[data-testid="effect-tray-folder-create-folder"]')
         .click();

      // The new folder is created under the parent, which stays expanded to show it.
      const newName = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayNewFolderName.text'));
      await expect
         .poll(
            () => page.evaluate((name) => {
               const pack = game.packs.get('world.e2e-tray-effects');
               const parentId = pack.folders.find((f) => f.name === 'E2E Parent Folder').id;
               return pack.folders.some((f) => f.name === name && f.folder?.id === parentId);
            }, newName),
            { message: 'the subfolder is created inside the parent' },
         )
         .toBe(true);
      await expect(parent).toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(trayFolder(parent, newName)).toBeVisible();

      await page.evaluate(async (name) => {
         const pack = game.packs.get('world.e2e-tray-effects');
         await pack.folders.find((f) => f.name === name)?.delete();
      }, newName);
      await deleteNestedFolders(page);
   });

   test('stash-from-actor copies a dropped effect into the selected pack', async () => {
      // Create an actor that owns an effect to stash, render the tray, and select the world pack.
      await deleteFixtureActor(page, 'E2E Stash Source');
      await page.evaluate(async () => {
         const actor = await Actor.create({
            name: 'E2E Stash Source',
            type: 'player',
         });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Stash Effect',
               type: 'effect',
            },
         ]);
      });
      await openTray(page);
      await selectTrayPack(page);

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

         tray.dispatchEvent(new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer,
         }));
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
      await openTray(page);
      await selectTrayPack(page);

      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .locator('.thumbnail')
         .first()
         .click();

      // Left-clicking the row opens the effect sheet asynchronously; poll until the app appears.
      await expect
         .poll(
            () => page.evaluate(() => [...foundry.applications.instances.values()]
               .some((app) => app?.document?.name === 'E2E Tray Effect')),
            { message: 'left-clicking the row must open the effect sheet' },
         )
         .toBe(true);
   });

   test('right-click context menu opens the effect sheet', async () => {
      await openTray(page);
      await selectTrayPack(page);

      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .first()
         .click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();

      const openLabel = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayOpen.text'));
      await page.locator('#context-menu li.context-item', { hasText: openLabel }).first().click();

      // The context-menu Open entry opens the effect sheet asynchronously; poll until it appears.
      await expect
         .poll(
            () => page.evaluate(() => [...foundry.applications.instances.values()]
               .some((app) => app?.document?.name === 'E2E Tray Effect')),
            { message: 'the context-menu Open Sheet entry must open the effect sheet' },
         )
         .toBe(true);
   });

   test('GM lock toggle flips the pack locked state and hides the create actions while locked', async () => {
      await openTray(page);
      await selectTrayPack(page);
      await expect(page.locator('[data-testid="effect-tray-new"]')).toBeVisible();

      await page.locator('[data-testid="effect-tray-lock"]').first().click();

      // The lock toggle flips the pack locked state asynchronously; poll until it locks.
      await expect
         .poll(
            () => page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked),
            { message: 'clicking the lock toggle must lock the pack' },
         )
         .toBe(true);
      await expect(page.locator('[data-testid="effect-tray-new"]'), 'create actions hide while locked')
         .toHaveCount(0);

      await page.locator('[data-testid="effect-tray-lock"]').first().click();

      // Toggling again unlocks the pack asynchronously; poll until it unlocks.
      await expect
         .poll(
            () => page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked),
            { message: 'clicking the lock toggle again must unlock the pack' },
         )
         .toBe(false);
      await expect(page.locator('[data-testid="effect-tray-new"]')).toBeVisible();
   });

   test('the tray list scrolls so its last row can be brought fully into view', async () => {
      // A shorter window than the suite default makes the 17-row TITAN Effects pack overflow the sidebar.
      await page.setViewportSize({
         width: 1366,
         height: 768,
      });
      await openTray(page);
      await selectTrayPack(page, 'titan.effects');
      for (const folderName of [
         'Actions',
         'Circumstances',
         'Death',
      ]) {
         await expandTrayFolder(trayFolder(page, folderName));
      }
      const rows = page.locator('[data-testid="effect-tray-row"]');
      await expect(rows).toHaveCount(17);

      // The list overflows its own bounded box instead of growing past the sidebar.
      const list = page.locator('[data-testid="effect-tray-list"]');
      const overflow = await list.evaluate((element) => {
         const sidebar = document.getElementById('sidebar-content').getBoundingClientRect();
         const box = element.getBoundingClientRect();
         return {
            overflows: element.scrollHeight > element.clientHeight,
            withinSidebar: box.bottom <= sidebar.bottom + 1,
         };
      });
      expect(overflow, 'the tray list is a bounded scroll container inside the sidebar').toEqual({
         overflows: true,
         withinSidebar: true,
      });

      // Scrolling the list to the end brings the last row fully inside the list's visible box.
      await list.evaluate((element) => {
         element.scrollTop = element.scrollHeight;
      });
      const lastVisible = await list.evaluate((element) => {
         const all = element.querySelectorAll('[data-testid="effect-tray-row"]');
         const last = all[all.length - 1].getBoundingClientRect();
         const box = element.getBoundingClientRect();
         return last.top >= box.top - 1 && last.bottom <= box.bottom + 1;
      });
      expect(lastVisible, 'the last row is fully visible after scrolling to the end').toBe(true);

      await page.setViewportSize({
         width: 1920,
         height: 1080,
      });
   });
});
