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

/**
 * @typedef {object} SeedFolderSpec
 * One folder to seed in the world pack.
 * @property {string} name - The folder name.
 * @property {string} [parent] - The name of an earlier-seeded parent folder; omitted for a top-level folder.
 * @property {number} [sort] - An explicit manual sort value.
 * @property {string[]} [effects] - Names of effects to create inside the folder.
 */

/**
 * Deletes every world-pack effect and folder whose name starts with the prefix, deepest folders first.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string} prefix - The shared name prefix of the seeded documents.
 * @returns {Promise<void>} Resolves once they are gone.
 */
async function deletePrefixed(page, prefix) {
   await page.evaluate(async (namePrefix) => {
      const pack = game.packs.get('world.e2e-tray-effects');
      const effectIds = (await pack.getDocuments())
         .filter((effect) => effect.name.startsWith(namePrefix))
         .map((effect) => effect.id);
      if (effectIds.length) {
         await ActiveEffect.deleteDocuments(effectIds, { pack: pack.collection });
      }
      const depth = (folder) => (folder.folder ? 1 + depth(folder.folder) : 0);
      const folders = pack.folders.filter((folder) => folder.name.startsWith(namePrefix))
         .sort((a, b) => depth(b) - depth(a));
      for (const folder of folders) {
         await pack.folders.get(folder.id)?.delete();
      }
   }, prefix);
}

/**
 * Seeds folders (and effects inside them) in the world pack, in order, after deleting any documents left
 * over from a previous run under the same prefix.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string} prefix - The shared name prefix of the seeded documents.
 * @param {SeedFolderSpec[]} specs - The folders to create, parents before children.
 * @returns {Promise<void>} Resolves once every folder and effect exists.
 */
async function seedFolders(page, prefix, specs) {
   await deletePrefixed(page, prefix);
   await page.evaluate(async (folderSpecs) => {
      const pack = game.packs.get('world.e2e-tray-effects');
      const created = new Map();
      for (const spec of folderSpecs) {
         const folder = await Folder.create({
            name: spec.name,
            type: 'ActiveEffect',
            folder: spec.parent ? created.get(spec.parent).id : null,
            ...(spec.sort === undefined ? {} : { sort: spec.sort }),
         }, { pack: pack.collection });
         created.set(spec.name, folder);
         for (const effectName of spec.effects ?? []) {
            await ActiveEffect.create({
               name: effectName,
               type: 'effect',
               folder: folder.id,
            }, { pack: pack.collection });
         }
      }
   }, specs);
}

/**
 * Reads a world-pack folder's parent folder name, or null for a top-level folder.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string} name - The exact name of the folder to look up.
 * @returns {Promise<string | null | undefined>} The parent's name, null at the top level, or undefined when
 * the folder does not exist.
 */
function folderParentName(page, name) {
   return page.evaluate((folderName) => {
      const folder = game.packs.get('world.e2e-tray-effects').folders.find((f) => f.name === folderName);
      return folder ? (folder.folder?.name ?? null) : undefined;
   }, name);
}

/**
 * Locates a tray folder header by folder name.
 * @param {import('@playwright/test').Page | import('@playwright/test').Locator} scope - Where to search.
 * @param {string} name - The exact folder name.
 * @returns {import('@playwright/test').Locator} The folder header locator.
 */
function trayFolderHeader(scope, name) {
   return trayFolder(scope, name).locator(':scope > [data-testid="effect-tray-folder-header"]');
}

/**
 * Opens a tray folder's context menu and returns the menu's entry labels.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string} name - The exact name of the folder whose header is right-clicked.
 * @returns {Promise<string[]>} The trimmed labels of the visible menu entries.
 */
async function openFolderMenu(page, name) {
   await trayFolderHeader(page, name).click({ button: 'right' });
   const items = page.locator('#context-menu li.context-item');
   await expect(items.first()).toBeVisible();
   return (await items.allInnerTexts()).map((text) => text.trim());
}

/**
 * Localizes a list of core or system keys in the page.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string[]} keys - The localization keys.
 * @returns {Promise<string[]>} The localized strings, in key order.
 */
function localizeAll(page, keys) {
   return page.evaluate((list) => list.map((key) => game.i18n.localize(key)), keys);
}

/**
 * Reads the names of the tray's top-level folders in display order.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<string[]>} The names, top to bottom.
 */
function topLevelFolderNames(page) {
   return page.locator('[data-testid="effect-tray-list"] > [data-testid="effect-tray-folder"] '
      + '> [data-testid="effect-tray-folder-header"] .folder-name').allInnerTexts();
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

   test('dragging a folder onto an expanded folder nests it inside that folder', async () => {
      await seedFolders(page, 'E2E DnD', [
         { name: 'E2E DnD Target' },
         { name: 'E2E DnD Mover' },
      ]);
      await openTray(page);
      await selectTrayPack(page);

      // The mover starts as a top-level folder.
      await expect(trayFolder(page, 'E2E DnD Mover')).toBeVisible();
      expect(await topLevelFolderNames(page)).toContain('E2E DnD Mover');
      expect(await folderParentName(page, 'E2E DnD Mover')).toBeNull();

      // Core nests a folder dropped on an expanded folder; expand the target first.
      const target = trayFolder(page, 'E2E DnD Target');
      await expandTrayFolder(target);

      // A drag entering a folder highlights it with core's drop-target style; the drag ending clears it.
      const targetName = trayFolderHeader(page, 'E2E DnD Target').locator('.folder-name');
      /**
       * Reads the folder name's computed font size and 120% of its header's (core's drop-target size).
       * @param {HTMLElement} element - The folder name element.
       * @returns {{ name: number, highlighted: number }} The current and the drop-target font sizes in px.
       */
      const readSizes = (element) => ({
         name: parseFloat(getComputedStyle(element).fontSize),
         highlighted: parseFloat(getComputedStyle(element.parentElement).fontSize) * 1.2,
      });
      const resting = await targetName.evaluate(readSizes);
      expect(resting.name, 'the resting name is not already at the drop-target size').not.toBeCloseTo(
         resting.highlighted,
         1,
      );
      await trayFolderHeader(page, 'E2E DnD Target').dispatchEvent('dragenter');
      await expect(target).toHaveClass(/(^|\s)droptarget(\s|$)/);
      const highlighted = await targetName.evaluate(readSizes);
      expect(highlighted.name, 'core scales the drop target name to 120%').toBeCloseTo(highlighted.highlighted, 1);
      await page.evaluate(() => window.dispatchEvent(new DragEvent('dragend')));
      await expect(target).not.toHaveClass(/(^|\s)droptarget(\s|$)/);

      await trayFolderHeader(page, 'E2E DnD Mover').dragTo(trayFolderHeader(page, 'E2E DnD Target'));

      await expect
         .poll(() => folderParentName(page, 'E2E DnD Mover'), { message: 'the mover is nested in the target' })
         .toBe('E2E DnD Target');
      await expect
         .poll(() => topLevelFolderNames(page), { message: 'the mover leaves the top level' })
         .not.toContain('E2E DnD Mover');
      const nested = trayFolder(target.locator(':scope > .subdirectory'), 'E2E DnD Mover');
      await expect(nested).toBeVisible();
      await expect(nested).toHaveAttribute('data-folder-depth', '2');

      await deletePrefixed(page, 'E2E DnD');
   });

   test('dragging a folder onto a collapsed folder sorts it before that folder', async () => {
      // Top-level folders follow the pack's sorting mode; manual mode shows the sort order being changed.
      const initialMode = await page.evaluate(() => game.packs.get('world.e2e-tray-effects').sortingMode);
      if (initialMode !== 'm') {
         await page.evaluate(() => game.packs.get('world.e2e-tray-effects').toggleSortingMode());
      }
      await seedFolders(page, 'E2E Sort', [
         {
            name: 'E2E Sort Alpha',
            sort: 100000,
         },
         {
            name: 'E2E Sort Beta',
            sort: 200000,
         },
      ]);
      await openTray(page);
      await selectTrayPack(page);

      // Beta starts after Alpha.
      await expect(trayFolder(page, 'E2E Sort Beta')).toBeVisible();
      /** @type {string[]} The seeded folders in their initial display order. */
      const before = (await topLevelFolderNames(page)).filter((name) => name.startsWith('E2E Sort'));
      expect(before).toEqual([
         'E2E Sort Alpha',
         'E2E Sort Beta',
      ]);

      await trayFolderHeader(page, 'E2E Sort Beta').dragTo(trayFolderHeader(page, 'E2E Sort Alpha'));

      // Beta now sorts before Alpha and stays at the top level.
      await expect
         .poll(
            async () => (await topLevelFolderNames(page)).filter((name) => name.startsWith('E2E Sort')),
            { message: 'the dropped folder sorts before the collapsed target' },
         )
         .toEqual([
            'E2E Sort Beta',
            'E2E Sort Alpha',
         ]);
      expect(await folderParentName(page, 'E2E Sort Beta')).toBeNull();

      await deletePrefixed(page, 'E2E Sort');
      if (initialMode !== 'm') {
         await page.evaluate(() => game.packs.get('world.e2e-tray-effects').toggleSortingMode());
      }
   });

   test('folder nesting stops at the pack folder depth limit', async () => {
      // Compendium packs allow one level less than world directories.
      await seedFolders(page, 'E2E Depth', [
         { name: 'E2E Depth One' },
         {
            name: 'E2E Depth Two',
            parent: 'E2E Depth One',
         },
         {
            name: 'E2E Depth Three',
            parent: 'E2E Depth Two',
         },
         { name: 'E2E Depth Tall' },
         {
            name: 'E2E Depth Tall Child',
            parent: 'E2E Depth Tall',
         },
      ]);
      expect(await page.evaluate(() => game.packs.get('world.e2e-tray-effects').maxFolderDepth)).toBe(3);
      await openTray(page);
      await selectTrayPack(page);
      for (const name of [
         'E2E Depth One',
         'E2E Depth Two',
         'E2E Depth Three',
      ]) {
         await expandTrayFolder(trayFolder(page, name));
      }

      // A depth-2 folder offers a subfolder; a folder at the depth limit does not.
      await expect(trayFolderHeader(page, 'E2E Depth Two').locator('[data-testid="effect-tray-folder-create-folder"]'))
         .toBeVisible();
      await expect(trayFolder(page, 'E2E Depth Three')).toHaveAttribute('data-folder-depth', '3');
      await expect(trayFolderHeader(page, 'E2E Depth Three')
         .locator('[data-testid="effect-tray-folder-create-folder"]')).toHaveCount(0);

      // Nesting a two-level folder under depth 2 would reach depth 4: core refuses with an error.
      const message = await page.evaluate(() => game.i18n.format('FOLDER.ExceededMaxDepth', { depth: 3 }));
      await trayFolderHeader(page, 'E2E Depth Tall').dragTo(trayFolderHeader(page, 'E2E Depth Two'));
      await expect(page.locator('#notifications .notification.error', { hasText: message })).toBeVisible();
      expect(await folderParentName(page, 'E2E Depth Tall')).toBeNull();

      await deletePrefixed(page, 'E2E Depth');
   });

   test('the folder context menu offers the core compendium folder entries, gated by the pack lock', async () => {
      await seedFolders(page, 'E2E Menu', [{ name: 'E2E Menu Folder' }]);
      await openTray(page);
      await selectTrayPack(page);

      const [
         edit,
         createTable,
         remove,
         deleteAll,
         ownership,
         exportLabel,
      ] = await localizeAll(page, [
         'FOLDER.Edit',
         'FOLDER.CreateTable',
         'FOLDER.Remove',
         'FOLDER.Delete',
         'OWNERSHIP.Configure',
         'FOLDER.Export',
      ]);
      const rename = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayRenameFolder.text'));

      // Unlocked: every core compendium folder entry plus Rename; never Configure Ownership or Export.
      const unlocked = await openFolderMenu(page, 'E2E Menu Folder');
      expect(unlocked).toEqual([
         edit,
         rename,
         createTable,
         remove,
         deleteAll,
      ]);
      expect(unlocked).not.toContain(ownership);
      expect(unlocked).not.toContain(exportLabel);
      await page.evaluate(() => ui.context?.close({ animate: false }));
      await expect(page.locator('#context-menu')).toHaveCount(0);

      // Locked: only the entry that changes no pack data remains.
      await page.locator('[data-testid="effect-tray-lock"]').first().click();
      await expect
         .poll(() => page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked))
         .toBe(true);
      expect(await openFolderMenu(page, 'E2E Menu Folder')).toEqual([createTable]);
      await page.evaluate(() => ui.context?.close({ animate: false }));
      await page.locator('[data-testid="effect-tray-lock"]').first().click();
      await expect
         .poll(() => page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked))
         .toBe(false);

      await deletePrefixed(page, 'E2E Menu');
   });

   test('Remove Folder deletes the folder and moves its contents up a level', async () => {
      await seedFolders(page, 'E2E Remove', [
         {
            name: 'E2E Remove Parent',
            effects: ['E2E Remove Effect'],
         },
         {
            name: 'E2E Remove Child',
            parent: 'E2E Remove Parent',
         },
      ]);
      await openTray(page);
      await selectTrayPack(page);
      expect(await folderParentName(page, 'E2E Remove Child')).toBe('E2E Remove Parent');

      await openFolderMenu(page, 'E2E Remove Parent');
      const [removeLabel] = await localizeAll(page, ['FOLDER.Remove']);
      await page.locator('#context-menu li.context-item', { hasText: removeLabel }).click();
      await page.locator('.application.dialog button[data-action="yes"]').click();

      // The folder is gone; its subfolder and its effect now sit at the pack root.
      await expect(trayFolder(page, 'E2E Remove Parent')).toHaveCount(0);
      await expect
         .poll(() => folderParentName(page, 'E2E Remove Child'), { message: 'the subfolder moves up a level' })
         .toBeNull();
      await expect
         .poll(() => page.evaluate(async () => {
            const pack = game.packs.get('world.e2e-tray-effects');
            const effect = (await pack.getDocuments()).find((e) => e.name === 'E2E Remove Effect');
            return effect ? (effect.folder?.id ?? effect.folder ?? null) : 'missing';
         }), { message: 'the effect survives and moves up a level' })
         .toBeNull();
      await expect(page.locator('[data-testid="effect-tray-list"] > [data-testid="effect-tray-row"]', {
         hasText: 'E2E Remove Effect',
      })).toBeVisible();

      await deletePrefixed(page, 'E2E Remove');
   });

   test('Delete All deletes the folder with its subfolders and effects', async () => {
      await seedFolders(page, 'E2E Purge', [
         {
            name: 'E2E Purge Parent',
            effects: ['E2E Purge Effect'],
         },
         {
            name: 'E2E Purge Child',
            parent: 'E2E Purge Parent',
            effects: ['E2E Purge Nested Effect'],
         },
      ]);
      await openTray(page);
      await selectTrayPack(page);
      await expect(trayFolder(page, 'E2E Purge Parent')).toBeVisible();

      await openFolderMenu(page, 'E2E Purge Parent');
      const [deleteLabel] = await localizeAll(page, ['FOLDER.Delete']);
      await page.locator('#context-menu li.context-item', { hasText: deleteLabel }).click();
      await page.locator('.application.dialog button[data-action="yes"]').click();

      await expect(trayFolder(page, 'E2E Purge Parent')).toHaveCount(0);
      await expect
         .poll(() => page.evaluate(async () => {
            const pack = game.packs.get('world.e2e-tray-effects');
            return {
               folders: pack.folders.filter((f) => f.name.startsWith('E2E Purge')).length,
               effects: (await pack.getDocuments()).filter((e) => e.name.startsWith('E2E Purge')).length,
            };
         }), { message: 'the folder, its subfolder, and both effects are deleted' })
         .toEqual({
            folders: 0,
            effects: 0,
         });
   });

   test('Create Rollable Table builds a world table from the folder effects', async () => {
      await page.evaluate(async () => {
         for (const table of game.tables.filter((t) => t.name === 'E2E Table Folder')) {
            await table.delete();
         }
      });
      await seedFolders(page, 'E2E Table', [
         {
            name: 'E2E Table Folder',
            effects: [
               'E2E Table Effect A',
               'E2E Table Effect B',
            ],
         },
      ]);
      await openTray(page);
      await selectTrayPack(page);
      expect(await page.evaluate(() => game.tables.some((t) => t.name === 'E2E Table Folder'))).toBe(false);

      await openFolderMenu(page, 'E2E Table Folder');
      const [createLabel] = await localizeAll(page, ['FOLDER.CreateTable']);
      await page.locator('#context-menu li.context-item', { hasText: createLabel }).click();
      await page.locator('.application.dialog button[data-action="yes"]').click();

      await expect
         .poll(() => page.evaluate(() => {
            const table = game.tables.find((t) => t.name === 'E2E Table Folder');
            return table ? table.results.map((r) => r.name).sort() : null;
         }), { message: 'the table holds one result per folder effect' })
         .toEqual([
            'E2E Table Effect A',
            'E2E Table Effect B',
         ]);

      await page.evaluate(async () => {
         for (const table of game.tables.filter((t) => t.name === 'E2E Table Folder')) {
            await table.delete();
         }
      });
      await deletePrefixed(page, 'E2E Table');
   });

   test('dragging an effect onto a folder moves it into that folder', async () => {
      await seedFolders(page, 'E2E Move', [{ name: 'E2E Move Folder' }]);
      await page.evaluate(async () => {
         await ActiveEffect.create(
            {
               name: 'E2E Move Effect',
               type: 'effect',
            },
            { pack: 'world.e2e-tray-effects' },
         );
      });
      await openTray(page);
      await selectTrayPack(page);

      const rootRow = page.locator('[data-testid="effect-tray-list"] > [data-testid="effect-tray-row"]', {
         hasText: 'E2E Move Effect',
      });
      await expect(rootRow).toBeVisible();
      await rootRow.dragTo(trayFolderHeader(page, 'E2E Move Folder'));

      await expect(rootRow).toHaveCount(0);
      await expandTrayFolder(trayFolder(page, 'E2E Move Folder'));
      await expect(trayFolder(page, 'E2E Move Folder').locator('[data-testid="effect-tray-row"]', {
         hasText: 'E2E Move Effect',
      })).toBeVisible();

      await deletePrefixed(page, 'E2E Move');
   });

   test('stashing an actor effect onto a folder copies it into that folder', async () => {
      await deleteFixtureActor(page, 'E2E Folder Stash Source');
      await seedFolders(page, 'E2E Stash', [{ name: 'E2E Stash Folder' }]);
      await page.evaluate(async () => {
         const actor = await Actor.create({
            name: 'E2E Folder Stash Source',
            type: 'player',
         });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Stash Folder Effect',
               type: 'effect',
            },
         ]);
      });
      await openTray(page);
      await selectTrayPack(page);
      await expect(trayFolder(page, 'E2E Stash Folder')).toBeVisible();

      // Drop the actor's effect drag data on the folder header.
      await page.evaluate(() => {
         const actor = game.actors.getName('E2E Folder Stash Source');
         const effect = [...actor.effects].find((e) => e.name === 'E2E Stash Folder Effect');
         const folderId = game.packs.get('world.e2e-tray-effects').folders.find((f) => f.name === 'E2E Stash Folder')
            .id;
         const header = ui.titanEffects.element.querySelector(`[data-folder-id="${folderId}"] > .folder-header`);
         const dataTransfer = new DataTransfer();
         dataTransfer.setData('text/plain', JSON.stringify(effect.toDragData()));
         header.dispatchEvent(new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer,
         }));
      });

      await expect
         .poll(() => page.evaluate(async () => {
            const pack = game.packs.get('world.e2e-tray-effects');
            const copy = (await pack.getDocuments()).find((e) => e.name === 'E2E Stash Folder Effect');
            if (!copy) {
               return 'missing';
            }
            const folderId = copy.folder?.id ?? copy.folder ?? null;
            return folderId ? pack.folders.get(folderId)?.name : null;
         }), { message: 'the copy lands in the folder it was dropped on' })
         .toBe('E2E Stash Folder');

      await deletePrefixed(page, 'E2E Stash');
      await deleteFixtureActor(page, 'E2E Folder Stash Source');
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
