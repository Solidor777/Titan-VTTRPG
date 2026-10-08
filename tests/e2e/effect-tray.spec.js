import path from 'node:path';
import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addEffect,
   controlPlacedToken,
   createActor,
   createCompendium,
   createFolder,
   createTrayEffect,
   createTrayFolder,
   createWorldItem,
   openSidebarTab,
   openTrayPack,
   placeToken,
   shared,
   viewScene,
} from './flows.js';
import { withClients } from './multiClient.js';
import { record } from './registry.js';
import { settle } from './settle.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * The Effect Tray sidebar tab on packs and documents made through real flows: each test's pack is made in the
 * Compendium tab, its folders and effects with the tray's own controls, its Apply targets are tokens placed by
 * dragging an actor onto the canvas, and an effect is stashed by dragging its row out of an actor sheet. The packs
 * and every document in them are on the running list and go with the suite-end teardown.
 */

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
 * Makes an empty effect pack in the Compendium tab and selects it in the tray.
 * @param {string} title - The words that name the pack after the `E2E Tray ` prefix; unique within the run.
 * @returns {Promise<string>} The pack's collection id.
 */
async function freshTrayPack(title) {
   /** @type {string} The new pack's collection id. */
   const packId = await createCompendium(page, {
      label: `E2E Tray ${title}`,
      type: 'ActiveEffect',
   });
   await openTrayPack(page, packId);
   return packId;
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
 * Locates a tray folder header by folder name.
 * @param {import('@playwright/test').Page | import('@playwright/test').Locator} scope - Where to search.
 * @param {string} name - The exact folder name.
 * @returns {import('@playwright/test').Locator} The folder header locator.
 */
function trayFolderHeader(scope, name) {
   return trayFolder(scope, name).locator(':scope > [data-testid="effect-tray-folder-header"]');
}

/**
 * Locates a tray row by the effect's name.
 * @param {import('@playwright/test').Page | import('@playwright/test').Locator} scope - Where to search.
 * @param {string} name - The text the row holds.
 * @returns {import('@playwright/test').Locator} The row locator.
 */
function trayRow(scope, name) {
   return scope.locator('[data-testid="effect-tray-row"]', { hasText: name });
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
 * Reads the names of the tray's top-level folders in display order.
 * @returns {Promise<string[]>} The names, top to bottom.
 */
function topLevelFolderNames() {
   return page.locator('[data-testid="effect-tray-list"] > [data-testid="effect-tray-folder"] '
      + '> [data-testid="effect-tray-folder-header"] .folder-name').allInnerTexts();
}

/**
 * Reads a pack folder's parent folder name, or null for a top-level folder.
 * @param {string} packId - The pack's collection id.
 * @param {string} name - The exact name of the folder to look up.
 * @returns {Promise<string | null | undefined>} The parent's name, null at the top level, or undefined when the
 * folder does not exist.
 */
function folderParentName(packId, name) {
   return page.evaluate(({ packId, name }) => {
      /** @type {Folder | undefined} The folder with the name. */
      const folder = game.packs.get(packId).folders.find((candidate) => candidate.name === name);
      return folder ? (folder.folder?.name ?? null) : undefined;
   }, {
      packId,
      name,
   });
}

/**
 * Reads the name of the folder a pack effect sits in.
 * @param {string} packId - The pack's collection id.
 * @param {string} effectName - The effect's exact name.
 * @returns {Promise<string | null | 'missing'>} The folder's name, null for the pack root, or `missing` when the pack
 * holds no effect of the name.
 */
function effectFolderName(packId, effectName) {
   return page.evaluate(async ({ packId, effectName }) => {
      /** @type {CompendiumCollection} The pack. */
      const pack = game.packs.get(packId);

      /** @type {object | undefined} The effect of the name. */
      const effect = (await pack.getDocuments()).find((candidate) => candidate.name === effectName);
      if (!effect) {
         return 'missing';
      }

      /** @type {string | null} The id of the folder the effect sits in. */
      const folderId = effect.folder?.id ?? effect.folder ?? null;
      return folderId ? pack.folders.get(folderId)?.name : null;
   }, {
      packId,
      effectName,
   });
}

/**
 * Opens a tray folder's context menu and returns the menu's entry labels.
 * @param {string} name - The exact name of the folder whose header is right-clicked.
 * @returns {Promise<string[]>} The trimmed labels of the visible menu entries.
 */
async function openFolderMenu(name) {
   await trayFolderHeader(page, name).click({ button: 'right' });

   /** @type {import('@playwright/test').Locator} The menu's entries. */
   const items = page.locator('#context-menu li.context-item');
   await expect(items.first()).toBeVisible();
   return (await items.allInnerTexts()).map((text) => text.trim());
}

/**
 * Localizes a list of core or system keys in the page.
 * @param {string[]} keys - The localization keys.
 * @returns {Promise<string[]>} The localized strings, in key order.
 */
function localizeAll(keys) {
   return page.evaluate((list) => list.map((key) => game.i18n.localize(key)), keys);
}

/**
 * Reads the localized label of an effect-tray string.
 * @param {string} key - The key without the `LOCAL.` prefix and `.text` suffix.
 * @returns {Promise<string>} The label.
 */
function trayLabel(key) {
   return page.evaluate((key) => game.i18n.localize(`LOCAL.${key}.text`), key);
}

/**
 * Reads an actor's effect names.
 * @param {string} actorId - The actor's id.
 * @returns {Promise<string[]>} The names of the actor's effects.
 */
function actorEffectNames(actorId) {
   return page.evaluate((actorId) => game.actors.get(actorId).effects.map((effect) => effect.name), actorId);
}

/**
 * Reads the system pack's top-level folder names and its effect-subtype count. The tray shows only the effect subtype
 * of a system pack.
 * @returns {Promise<{folders: string[], effects: number}>} The names and the count.
 */
function systemPackContents() {
   return page.evaluate(async () => {
      /** @type {CompendiumCollection} The shipped effects pack. */
      const pack = game.packs.get('titan.effects');

      /** @type {Collection<string, object>} The pack's index with each entry's type. */
      const index = await pack.getIndex({ fields: ['type'] });
      return {
         folders: pack.folders.filter((folder) => !folder.folder).map((folder) => folder.name),
         effects: index.filter((entry) => entry.type === 'effect').length,
      };
   });
}

/**
 * Locates the tray's pack lock toggle.
 * @returns {import('@playwright/test').Locator} The toggle.
 */
function lockToggle() {
   return page.locator('[data-testid="effect-tray-lock"]').first();
}

/**
 * Reads whether a pack is locked.
 * @param {string} packId - The pack's collection id.
 * @returns {Promise<boolean>} True when the pack is locked.
 */
function packLocked(packId) {
   return page.evaluate((packId) => game.packs.get(packId).locked, packId);
}

/**
 * Locates the confirmation dialog of the tray's effect deletion.
 * @returns {import('@playwright/test').Locator} The dialog.
 */
function confirmationDialog() {
   return page.locator('.application.titan-dialog[id^="titan-confirmation-dialog"]');
}

test.describe('the pack list and the shipped pack', () => {
   test('the titanEffects tab is registered and its panel mounts', async () => {
      // The tab class is registered on CONFIG.ui and added to the Sidebar tab list.
      /** @type {boolean} Whether the tab is in the sidebar's tab list and the UI configuration. */
      const registered = await page.evaluate(() => 'titanEffects' in foundry.applications.sidebar.Sidebar.TABS
         && !!CONFIG.ui.titanEffects);
      expect(registered, 'titanEffects must be in Sidebar.TABS and CONFIG.ui').toBe(true);

      // Clicking the tab mounts the Svelte panel.
      await openSidebarTab(page, 'titanEffects');
      await expect(page.locator('[data-testid="effect-tray"]').first()).toBeVisible();
      expect(errors, `uncaught errors mounting the tray:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the dropdown lists ActiveEffect packs and browsing shows seeded effects', async () => {
      /** @type {string} The shared tray pack's collection id; the pack holds one effect. */
      const packId = await shared(page, 'trayPack');
      await openTrayPack(page, packId);

      // The pack select offers the pack, labelled as the Compendium tab shows it.
      /** @type {string} The pack's label. */
      const label = await page.evaluate((packId) => game.packs.get(packId).metadata.label, packId);
      await expect(page.locator('[data-testid="effect-tray-pack-select"] option', { hasText: label })).toHaveCount(1);

      // Selecting the pack lists its effect.
      await expect(trayRow(page, 'E2E Tray Effect').first()).toBeVisible();
   });

   test('the shipped TITAN Effects pack lists the standard effects in their folders', async () => {
      await openTrayPack(page, 'titan.effects');

      // The system pack is compiled from packs/_source/effects; its folders start collapsed.
      /** @type {{folders: string[], effects: number}} The shipped pack's top-level folders and effect count. */
      const contents = await systemPackContents();
      expect(contents.effects, 'the shipped pack holds effects').toBeGreaterThan(0);
      expect(contents.folders.length, 'the shipped pack holds folders').toBeGreaterThan(0);
      for (const folderName of contents.folders) {
         await expandTrayFolder(trayFolder(page, folderName));
      }
      await expect(trayRow(page, ''), 'every effect of the pack renders a row').toHaveCount(contents.effects);
      for (const name of [
         'Dodging',
         'Charging',
         'Light Cover',
         'Dying',
         'Last Stand',
      ]) {
         await expect(trayRow(page, name).first(), `${name} is seeded`).toBeVisible();
      }
   });
});

test.describe('the folder tree of a nested pack', () => {
   /** @type {{packId: string, parentId: string, childId: string, rootEffectId: string}} The pack the tests read. */
   let nested;

   test.beforeAll(async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Nested');
      /** @type {string} The effect at the pack root. */
      const rootEffectId = await createTrayEffect(page, packId, 'E2E Tray Effect');
      /** @type {string} The top-level folder. */
      const parentId = await createTrayFolder(page, packId, 'E2E Parent Folder');
      /** @type {string} The folder inside the top-level folder. */
      const childId = await createTrayFolder(page, packId, 'E2E Child Folder', { parentId });
      await createTrayEffect(page, packId, 'E2E Nested Effect', { folderId: childId });
      nested = {
         packId,
         parentId,
         childId,
         rootEffectId,
      };
      await closeAllApps(page);
   });

   test.beforeEach(async () => {
      await openTrayPack(page, nested.packId);
      await page.locator('[data-testid="effect-tray-collapse-all"]').click();
      await expect(page.locator('[data-testid="effect-tray-folder"].expanded')).toHaveCount(0);
   });

   test('nested folders render inside their parent folder, not at the top level', async () => {
      // The parent is a top-level folder item; the child is not.
      /** @type {import('@playwright/test').Locator} The tray's list. */
      const list = page.locator('[data-testid="effect-tray-list"]');
      /** @type {import('@playwright/test').Locator} The parent folder. */
      const parent = trayFolder(page, 'E2E Parent Folder');
      await expect(parent).toBeVisible();
      await expect(parent).toHaveAttribute('data-folder-depth', '1');
      await expect(
         list.locator(':scope > [data-testid="effect-tray-folder"]', { hasText: 'E2E Child Folder' }),
         'the child folder is not listed at the top level',
      ).toHaveCount(0);
      await expect(parent, 'folders are collapsed after Collapse All').not.toHaveClass(/(^|\s)expanded(\s|$)/);

      // Expanding the parent reveals the child inside the parent's subdirectory; expanding the child shows its effect.
      await expandTrayFolder(parent);

      /** @type {import('@playwright/test').Locator} The child folder inside the parent. */
      const child = parent.locator(':scope > .subdirectory > [data-testid="effect-tray-folder"]');
      await expect(child).toHaveCount(1);
      await expect(child).toHaveAttribute('data-folder-depth', '2');
      await expandTrayFolder(child);
      await expect(trayRow(child, 'E2E Nested Effect')).toBeVisible();
   });

   test('collapsing a folder collapses its subfolders', async () => {
      /** @type {import('@playwright/test').Locator} The parent folder. */
      const parent = trayFolder(page, 'E2E Parent Folder');
      await expandTrayFolder(parent);

      /** @type {import('@playwright/test').Locator} The child folder. */
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
      await expect(page.locator('[data-testid="effect-tray-folder"].expanded')).toHaveCount(2);
      await page.locator('[data-testid="effect-tray-collapse-all"]').click();
      await expect(page.locator('[data-testid="effect-tray-folder"].expanded')).toHaveCount(0);
   });

   test('searching shows matching effects inside their expanded folders', async () => {
      // Before the search, the collapsed parent hides the nested effect and the root effect is listed.
      /** @type {import('@playwright/test').Locator} The nested effect's row. */
      const nestedRow = trayRow(page, 'E2E Nested Effect');
      /** @type {import('@playwright/test').Locator} The root effect's row. */
      const rootRow = trayRow(page, 'E2E Tray Effect');
      await expect(trayFolder(page, 'E2E Parent Folder')).toBeVisible();
      await expect(rootRow).toBeVisible();
      await expect(nestedRow).toHaveCount(0);

      // A search for the nested effect expands its folder chain and hides everything that does not match.
      await page.locator('[data-testid="effect-tray-search"]').fill('nested effect');
      await expect(nestedRow).toBeVisible();
      await expect(trayFolder(page, 'E2E Parent Folder')).toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(trayFolder(page, 'E2E Child Folder')).toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(rootRow, 'a non-matching effect is hidden').toHaveCount(0);

      // Clearing the search restores the collapsed tree.
      await page.locator('[data-testid="effect-tray-search"]').fill('');
      await expect(rootRow).toBeVisible();
      await expect(nestedRow).toHaveCount(0);
   });

   test('tray folders and entries match the core Items sidebar tab styles', async () => {
      // A folder and a root item in the core Items tab to compare against, under the active theme.
      /** @type {string} The Items-tab folder's id. */
      const coreFolderId = await createFolder(page, 'items', 'E2E Style Folder');
      /** @type {string} The Items-tab item's id. */
      const coreEntryId = await createWorldItem(page, {
         name: 'E2E Style Item',
         type: 'ability',
      });

      /**
       * Reads the computed styles of a folder header and an entry name, both of which must be laid out.
       * @param {{ folder: string, entry: string }} selectors - Selectors for the header and the entry name.
       * @returns {Promise<{ folder: object, entry: object }>} The computed style values of each.
       */
      const readStyles = (selectors) => page.evaluate((targets) => {
         /**
          * Reads the style properties the two tabs must share.
          * @param {string} selector - The element's selector.
          * @returns {object} The property values by name.
          */
         const read = (selector) => {
            /** @type {CSSStyleDeclaration} The element's computed style. */
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
      await openSidebarTab(page, 'items');
      await expect(page.locator(`#items [data-folder-id="${coreFolderId}"] > .folder-header`)).toBeVisible();
      await expect(page.locator(`#items [data-entry-id="${coreEntryId}"] .entry-name`)).toBeVisible();

      /** @type {{ folder: object, entry: object }} The core tab's computed styles. */
      const core = await readStyles({
         folder: `#items [data-folder-id="${coreFolderId}"] > .folder-header`,
         entry: `#items [data-entry-id="${coreEntryId}"] .entry-name`,
      });

      await openTrayPack(page, nested.packId);
      await expect(trayFolder(page, 'E2E Parent Folder')).toBeVisible();
      await expect(trayRow(page, 'E2E Tray Effect')).toBeVisible();

      /** @type {{ folder: object, entry: object }} The tray's computed styles. */
      const tray = await readStyles({
         folder: `#titanEffects [data-folder-id="${nested.parentId}"] > .folder-header`,
         entry: `#titanEffects [data-entry-id="${nested.rootEffectId}"] .entry-name`,
      });

      expect(tray.folder, 'the tray folder header matches the Items tab folder header').toEqual(core.folder);
      expect(tray.entry, 'the tray entry name matches the Items tab entry name').toEqual(core.entry);
   });

   test('the move-to-folder dialog lists nested folders by name under their parents', async () => {
      await trayRow(page, 'E2E Tray Effect').first().click({ button: 'right' });
      await chooseContextMenuEntry(
         page,
         page.locator('#context-menu li.context-item', { hasText: await trayLabel('effectTrayMoveToFolder') }).first(),
      );

      // Open the dialog's folder select and read its option labels.
      await page.locator('[data-testid="move-effect-folder-select"]').click();
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      /** @type {string[]} The option labels. */
      const labels = (await page.locator('[role="option"]').allTextContents()).map((label) => label.trim());
      expect(labels).toContain(await trayLabel('effectTrayRoot'));
      expect(labels).toContain('E2E Parent Folder');
      expect(labels).toContain('─ E2E Child Folder');
      expect(labels.filter((label) => label.includes('LOCAL.')), 'no unlocalized keys').toEqual([]);
   });
});

test.describe('Apply to Target', () => {
   /** @type {string} The id of the scene the tokens are placed on. */
   let sceneId;

   test.beforeAll(async () => {
      sceneId = await shared(page, 'scene');
   });

   /**
    * Makes a player actor, places its token on the shared scene and takes control of the token.
    * @param {string} name - The actor's name.
    * @returns {Promise<string>} The actor's id.
    */
   async function controlledTarget(name) {
      await viewScene(page, sceneId);

      /** @type {string} The actor's id. */
      const actorId = await createActor(page, {
         name,
         type: 'player',
      });
      await controlPlacedToken(page, await placeToken(page, actorId));
      return actorId;
   }

   test('applying the seeded Dodging effect raises the token actor Defense and Reflexes by one', async () => {
      /** @type {string} The target actor's id. */
      const actorId = await controlledTarget('E2E Tray Dodging Target');

      /** @type {{defense: number, reflexes: number}} The target's derived values before the Apply. */
      const before = await page.evaluate((actorId) => {
         /** @type {TitanActor} The target. */
         const actor = game.actors.get(actorId);
         return {
            defense: actor.system.rating.defense.value,
            reflexes: actor.system.resistance.reflexes.value,
         };
      }, actorId);

      await openTrayPack(page, 'titan.effects');

      // Expand the Actions folder (folders start collapsed) so its rows render.
      await expandTrayFolder(trayFolder(page, 'Actions'));
      await trayRow(page, 'Dodging').locator('[data-testid="effect-tray-apply"]').first().click();

      // The copied effect's rules elements flow through derived data: +1 Defense, +1 Reflexes.
      await expect
         .poll(
            () => page.evaluate((actorId) => {
               /** @type {TitanActor} The target. */
               const actor = game.actors.get(actorId);
               return {
                  applied: [...actor.effects].some((effect) => effect.name === 'Dodging'),
                  defense: actor.system.rating.defense.value,
                  reflexes: actor.system.resistance.reflexes.value,
               };
            }, actorId),
            { message: 'Dodging applies its +1 Defense and +1 Reflexes' },
         )
         .toEqual({
            applied: true,
            defense: before.defense + 1,
            reflexes: before.reflexes + 1,
         });
   });

   test('Apply copies the effect onto the controlled token actor', async () => {
      /** @type {string} The target actor's id. */
      const actorId = await controlledTarget('E2E Tray Apply Target');
      expect(await actorEffectNames(actorId), 'the target starts with no effect').toEqual([]);

      await openTrayPack(page, await shared(page, 'trayPack'));

      // Scope the Apply click to the pack effect's own row.
      await trayRow(page, 'E2E Tray Effect').locator('[data-testid="effect-tray-apply"]').first().click();

      // Apply copies the effect onto the controlled token actor asynchronously; poll until it lands.
      await expect
         .poll(
            () => actorEffectNames(actorId),
            { message: 'the effect must be copied onto the controlled token actor' },
         )
         .toEqual(['E2E Tray Effect']);
   });
});

test.describe('creating, renaming and deleting', () => {
   test('create and delete round-trip in the selected world pack', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Round Trip');
      /** @type {string} The localized name of a new effect. */
      const newName = await trayLabel('effectTrayNewName');

      // Create a blank effect via the header Create Effect button.
      await page.locator('[data-testid="effect-tray-new"]').click();
      await expect
         .poll(
            () => page.evaluate(async ({ packId, newName }) => (await game.packs.get(packId).getDocuments())
               .filter((effect) => effect.name === newName).length, {
               packId,
               newName,
            }),
            { message: 'a blank new effect must be created in the pack' },
         )
         .toBe(1);
      await settle(page);

      // Close the sheet the create opened so it does not cover the tray.
      await page.locator('.application[id*="ActiveEffect-"] header [data-action="close"]').click();
      await expect(page.locator('.application[id*="ActiveEffect-"]')).toHaveCount(0);

      // Delete it through the row's context menu and the confirmation dialog.
      await expect(trayRow(page, newName)).toHaveCount(1);
      await trayRow(page, newName).click({ button: 'right' });
      await chooseContextMenuEntry(
         page,
         page.locator('#context-menu li.context-item', { hasText: await trayLabel('effectTrayDelete') }),
      );
      await expect(confirmationDialog()).toBeVisible();
      await confirmationDialog().getByRole('button', { name: await trayLabel('effectTrayDelete') }).click();
      await expect(trayRow(page, newName)).toHaveCount(0);
      await expect
         .poll(
            () => page.evaluate(async ({ packId, newName }) => (await game.packs.get(packId).getDocuments())
               .filter((effect) => effect.name === newName).length, {
               packId,
               newName,
            }),
            { message: 'the created effect must be deletable from the pack' },
         )
         .toBe(0);
   });

   test('renaming a folder from its context menu persists the new name to the pack', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Rename Folder');
      /** @type {string} The localized name of a new folder. */
      const newName = await trayLabel('effectTrayNewFolderName');

      // The flow creates the folder with the Create Folder button, then renames it with the folder context menu's
      // Rename Folder entry and Enter.
      /** @type {string} The folder's id. */
      const folderId = await createTrayFolder(page, packId, 'E2E Renamed Folder');

      /** @type {string[]} The pack's folder names after the rename. */
      const names = await page.evaluate(
         (packId) => game.packs.get(packId).folders.map((folder) => folder.name),
         packId,
      );
      expect(names).toEqual(['E2E Renamed Folder']);
      expect(names).not.toContain(newName);
      await expect(trayFolder(page, 'E2E Renamed Folder')).toHaveAttribute('data-folder-id', folderId);
      await expect(page.locator('[data-testid="effect-tray-folder-header"] .folder-name', { hasText: newName }))
         .toHaveCount(0);
   });

   test('an expanded folder header creates a subfolder inside it', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Subfolder');
      /** @type {string} The top-level folder's id. */
      const parentId = await createTrayFolder(page, packId, 'E2E Parent Folder');

      // Core shows a folder's create-subfolder control only while the folder is expanded.
      /** @type {import('@playwright/test').Locator} The folder. */
      const parent = trayFolder(page, 'E2E Parent Folder');
      /** @type {import('@playwright/test').Locator} The folder's create-subfolder control. */
      const createControl = parent.locator(':scope > [data-testid="effect-tray-folder-header"]')
         .locator('[data-testid="effect-tray-folder-create-folder"]');
      await page.locator('[data-testid="effect-tray-collapse-all"]').click();
      await expect(parent).not.toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(createControl).toBeHidden();
      await expandTrayFolder(parent);
      await createControl.click();

      // The new folder is created under the parent, which stays expanded to show it.
      /** @type {string} The localized name of a new folder. */
      const newName = await trayLabel('effectTrayNewFolderName');
      await expect
         .poll(
            () => page.evaluate(({ packId, newName, parentId }) => game.packs.get(packId).folders
               .some((folder) => folder.name === newName && folder.folder?.id === parentId), {
               packId,
               newName,
               parentId,
            }),
            { message: 'the subfolder is created inside the parent' },
         )
         .toBe(true);
      await expect(parent).toHaveClass(/(^|\s)expanded(\s|$)/);
      await expect(trayFolder(parent, newName)).toBeVisible();
   });
});

test.describe('dragging within the tray', () => {
   test('dragging a folder onto an expanded folder nests it inside that folder', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Nest Drag');
      await createTrayFolder(page, packId, 'E2E DnD Target');
      await createTrayFolder(page, packId, 'E2E DnD Mover');

      // The mover starts as a top-level folder.
      await expect(trayFolder(page, 'E2E DnD Mover')).toBeVisible();
      expect(await topLevelFolderNames()).toContain('E2E DnD Mover');
      expect(await folderParentName(packId, 'E2E DnD Mover')).toBeNull();

      // Core nests a folder dropped on an expanded folder; expand the target first.
      /** @type {import('@playwright/test').Locator} The target folder. */
      const target = trayFolder(page, 'E2E DnD Target');
      await expandTrayFolder(target);

      // A drag entering a folder highlights it with core's drop-target style; the drag ending clears it.
      /** @type {import('@playwright/test').Locator} The target's name. */
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

      /** @type {{ name: number, highlighted: number }} The sizes before the drag enters. */
      const resting = await targetName.evaluate(readSizes);
      expect(resting.name, 'the resting name is not already at the drop-target size').not.toBeCloseTo(
         resting.highlighted,
         1,
      );
      await trayFolderHeader(page, 'E2E DnD Target').dispatchEvent('dragenter');
      await expect(target).toHaveClass(/(^|\s)droptarget(\s|$)/);

      /** @type {{ name: number, highlighted: number }} The sizes while the drag is over the folder. */
      const highlighted = await targetName.evaluate(readSizes);
      expect(highlighted.name, 'core scales the drop target name to 120%').toBeCloseTo(highlighted.highlighted, 1);
      await page.evaluate(() => window.dispatchEvent(new DragEvent('dragend')));
      await expect(target).not.toHaveClass(/(^|\s)droptarget(\s|$)/);

      await trayFolderHeader(page, 'E2E DnD Mover').dragTo(trayFolderHeader(page, 'E2E DnD Target'));

      await expect
         .poll(() => folderParentName(packId, 'E2E DnD Mover'), { message: 'the mover is nested in the target' })
         .toBe('E2E DnD Target');
      await expect
         .poll(() => topLevelFolderNames(), { message: 'the mover leaves the top level' })
         .not.toContain('E2E DnD Mover');

      /** @type {import('@playwright/test').Locator} The mover inside the target. */
      const nestedMover = trayFolder(target.locator(':scope > .subdirectory'), 'E2E DnD Mover');
      await expect(nestedMover).toBeVisible();
      await expect(nestedMover).toHaveAttribute('data-folder-depth', '2');
   });

   test('dragging a folder onto a collapsed folder sorts it before that folder', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Sort Drag');

      // Top-level folders follow the pack's sorting mode; the tray's sort button switches to manual mode, which shows
      // the sort order being changed.
      /** @type {() => Promise<string>} Reads the pack's sorting mode. */
      const sortingMode = () => page.evaluate((packId) => game.packs.get(packId).sortingMode, packId);
      if (await sortingMode() !== 'm') {
         await page.locator('[data-testid="effect-tray-sort"]').click();
      }
      await expect.poll(sortingMode, { message: 'the sort button switched the pack to manual mode' }).toBe('m');
      await createTrayFolder(page, packId, 'E2E Sort Alpha');
      await createTrayFolder(page, packId, 'E2E Sort Beta');

      // Beta starts after Alpha.
      await expect(trayFolder(page, 'E2E Sort Beta')).toBeVisible();
      await expect(trayFolder(page, 'E2E Sort Alpha')).toBeVisible();
      expect(await topLevelFolderNames()).toEqual([
         'E2E Sort Alpha',
         'E2E Sort Beta',
      ]);

      await trayFolderHeader(page, 'E2E Sort Beta').dragTo(trayFolderHeader(page, 'E2E Sort Alpha'));

      // Beta now sorts before Alpha and stays at the top level.
      await expect
         .poll(() => topLevelFolderNames(), { message: 'the dropped folder sorts before the collapsed target' })
         .toEqual([
            'E2E Sort Beta',
            'E2E Sort Alpha',
         ]);
      expect(await folderParentName(packId, 'E2E Sort Beta')).toBeNull();
   });

   test('folder nesting stops at the pack folder depth limit', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Depth Limit');

      // Compendium packs allow one level less than world directories.
      /** @type {string} The depth-1 folder. */
      const oneId = await createTrayFolder(page, packId, 'E2E Depth One');
      /** @type {string} The depth-2 folder. */
      const twoId = await createTrayFolder(page, packId, 'E2E Depth Two', { parentId: oneId });
      await createTrayFolder(page, packId, 'E2E Depth Three', { parentId: twoId });
      /** @type {string} The top-level folder that gets a child. */
      const tallId = await createTrayFolder(page, packId, 'E2E Depth Tall');
      await createTrayFolder(page, packId, 'E2E Depth Tall Child', { parentId: tallId });
      expect(await page.evaluate((packId) => game.packs.get(packId).maxFolderDepth, packId)).toBe(3);
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
      /** @type {string} Core's refusal message. */
      const message = await page.evaluate(() => game.i18n.format('FOLDER.ExceededMaxDepth', { depth: 3 }));
      await trayFolderHeader(page, 'E2E Depth Tall').dragTo(trayFolderHeader(page, 'E2E Depth Two'));
      await expect(page.locator('#notifications .notification.error', { hasText: message })).toBeVisible();
      expect(await folderParentName(packId, 'E2E Depth Tall')).toBeNull();
   });

   test('dragging an effect onto a folder moves it into that folder', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Move Drag');
      await createTrayFolder(page, packId, 'E2E Move Folder');
      await createTrayEffect(page, packId, 'E2E Move Effect');

      /** @type {import('@playwright/test').Locator} The effect's row at the pack root. */
      const rootRow = page.locator('[data-testid="effect-tray-list"] > [data-testid="effect-tray-row"]', {
         hasText: 'E2E Move Effect',
      });
      await expect(rootRow).toBeVisible();
      await rootRow.dragTo(trayFolderHeader(page, 'E2E Move Folder'));

      await expect(rootRow).toHaveCount(0);
      await expandTrayFolder(trayFolder(page, 'E2E Move Folder'));
      await expect(trayRow(trayFolder(page, 'E2E Move Folder'), 'E2E Move Effect')).toBeVisible();
      expect(await effectFolderName(packId, 'E2E Move Effect')).toBe('E2E Move Folder');
   });
});

test.describe('stashing an actor effect', () => {
   /**
    * Makes an actor with one effect and opens its sheet on the Effects tab.
    * @param {string} actorName - The actor's name.
    * @param {string} effectName - The effect's name.
    * @returns {Promise<import('@playwright/test').Locator>} The effect's row in the sheet.
    */
   async function openActorEffectRow(actorName, effectName) {
      /** @type {string} The actor's id. */
      const actorId = await createActor(page, {
         name: actorName,
         type: 'player',
      });
      /** @type {string} The effect's id. */
      const effectId = await addEffect(page, actorId, effectName);

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
      await clickSheetTab(sheet, 'Effects');

      /** @type {import('@playwright/test').Locator} The effect's row. */
      const row = sheet.locator(`[data-effect-id="${effectId}"]`);
      await expect(row).toBeVisible();
      return row;
   }

   test('stashing an actor effect onto a folder copies it into that folder', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Stash Folder');
      await createTrayFolder(page, packId, 'E2E Stash Folder');

      /** @type {import('@playwright/test').Locator} The actor's effect row in its sheet. */
      const row = await openActorEffectRow('E2E Folder Stash Source', 'E2E Stash Folder Effect');
      await openTrayPack(page, packId);
      await expect(trayFolder(page, 'E2E Stash Folder')).toBeVisible();

      // Drag the row's grip from the sheet onto the folder header in the tray.
      await row.locator('[data-drag-handle]').first().dragTo(trayFolderHeader(page, 'E2E Stash Folder'));

      await expect
         .poll(() => effectFolderName(packId, 'E2E Stash Folder Effect'), {
            message: 'the copy lands in the folder it was dropped on',
         })
         .toBe('E2E Stash Folder');
   });

   test('stash-from-actor copies a dropped effect into the selected pack', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Stash Pack');

      /** @type {import('@playwright/test').Locator} The actor's effect row in its sheet. */
      const row = await openActorEffectRow('E2E Stash Source', 'E2E Stash Effect');
      await openTrayPack(page, packId);

      // Drag the row's grip from the sheet onto the tray's empty list.
      await row.locator('[data-drag-handle]').first()
         .dragTo(page.locator('[data-testid="effect-tray-empty"]'));

      // The drop copies the effect into the selected pack asynchronously; poll until the copy lands.
      await expect
         .poll(
            () => effectFolderName(packId, 'E2E Stash Effect'),
            { message: 'the dropped effect must be copied into the selected pack at its root' },
         )
         .toBeNull();
      await expect(trayRow(page, 'E2E Stash Effect')).toBeVisible();
   });
});

test.describe('opening a row and locking', () => {
   /** @type {string} The shared tray pack's collection id. */
   let packId;
   /** @type {string} The id of the shared pack's effect. */
   let effectId;

   test.beforeAll(async () => {
      packId = await shared(page, 'trayPack');
      effectId = await page.evaluate(async (packId) => (await game.packs.get(packId).getIndex())
         .find((entry) => entry.name === 'E2E Tray Effect')._id, packId);
   });

   test('left-clicking a row opens the effect sheet', async () => {
      await openTrayPack(page, packId);
      await trayRow(page, 'E2E Tray Effect').locator('.thumbnail').first().click();
      await expect(page.locator(`.application[id$="ActiveEffect-${effectId}"]`)).toBeVisible();
   });

   test('right-click context menu opens the effect sheet', async () => {
      await openTrayPack(page, packId);
      await trayRow(page, 'E2E Tray Effect').first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      await chooseContextMenuEntry(
         page,
         page.locator('#context-menu li.context-item', { hasText: await trayLabel('effectTrayOpen') }).first(),
      );
      await expect(page.locator(`.application[id$="ActiveEffect-${effectId}"]`)).toBeVisible();
   });

   test('GM lock toggle flips the pack locked state and hides the create actions while locked', async () => {
      /** @type {string} The pack's collection id. */
      const ownPackId = await freshTrayPack('Lock Toggle');
      await expect(page.locator('[data-testid="effect-tray-new"]')).toBeVisible();

      await lockToggle().click();
      await expect
         .poll(() => packLocked(ownPackId), { message: 'clicking the lock toggle must lock the pack' })
         .toBe(true);
      await expect(page.locator('[data-testid="effect-tray-new"]'), 'create actions hide while locked')
         .toHaveCount(0);

      await lockToggle().click();
      await expect
         .poll(() => packLocked(ownPackId), { message: 'clicking the lock toggle again must unlock the pack' })
         .toBe(false);
      await expect(page.locator('[data-testid="effect-tray-new"]')).toBeVisible();
   });
});

test.describe('the folder context menu', () => {
   test('the folder context menu offers the core compendium folder entries, gated by the pack lock', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Folder Menu');
      await createTrayFolder(page, packId, 'E2E Menu Folder');

      /** @type {string[]} The localized labels of the core entries. */
      const [
         edit,
         createTable,
         remove,
         deleteAll,
         ownership,
         exportLabel,
      ] = await localizeAll([
         'FOLDER.Edit',
         'FOLDER.CreateTable',
         'FOLDER.Remove',
         'FOLDER.Delete',
         'OWNERSHIP.Configure',
         'FOLDER.Export',
      ]);
      /** @type {string} The tray's own Rename Folder label. */
      const rename = await trayLabel('effectTrayRenameFolder');

      // Unlocked: every core compendium folder entry plus Rename; never Configure Ownership or Export.
      /** @type {string[]} The unlocked menu's entries. */
      const unlocked = await openFolderMenu('E2E Menu Folder');
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
      await lockToggle().click();
      await expect.poll(() => packLocked(packId)).toBe(true);
      expect(await openFolderMenu('E2E Menu Folder')).toEqual([createTable]);
      await page.evaluate(() => ui.context?.close({ animate: false }));
      await lockToggle().click();
      await expect.poll(() => packLocked(packId)).toBe(false);
   });

   test('Remove Folder deletes the folder and moves its contents up a level', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Remove Folder');
      /** @type {string} The folder that gets removed. */
      const parentId = await createTrayFolder(page, packId, 'E2E Remove Parent');
      await createTrayFolder(page, packId, 'E2E Remove Child', { parentId });
      await createTrayEffect(page, packId, 'E2E Remove Effect', { folderId: parentId });
      expect(await folderParentName(packId, 'E2E Remove Child')).toBe('E2E Remove Parent');

      await openFolderMenu('E2E Remove Parent');

      /** @type {string[]} The localized Remove Folder label. */
      const [removeLabel] = await localizeAll(['FOLDER.Remove']);
      await chooseContextMenuEntry(page, page.locator('#context-menu li.context-item', { hasText: removeLabel }));

      // The dialog opens where core's directory opens it: 770px left of the viewport's right edge.
      /** @type {import('@playwright/test').Locator} The Remove Folder confirmation dialog. */
      const dialog = page.locator('.application.dialog');
      await expect(dialog).toBeVisible();

      /** @type {{left: number, viewport: number}} The dialog's left edge and the viewport width. */
      const placement = await dialog.evaluate((element) => ({
         left: element.getBoundingClientRect().left,
         viewport: window.innerWidth,
      }));
      expect(placement.left).toBe(placement.viewport - 770);
      await dialog.locator('button[data-action="yes"]').click();

      // The folder is gone; its subfolder and its effect now sit at the pack root.
      await expect(trayFolder(page, 'E2E Remove Parent')).toHaveCount(0);
      await expect
         .poll(() => folderParentName(packId, 'E2E Remove Child'), { message: 'the subfolder moves up a level' })
         .toBeNull();
      await expect
         .poll(() => effectFolderName(packId, 'E2E Remove Effect'), {
            message: 'the effect survives and moves up a level',
         })
         .toBeNull();
      await expect(page.locator('[data-testid="effect-tray-list"] > [data-testid="effect-tray-row"]', {
         hasText: 'E2E Remove Effect',
      })).toBeVisible();
   });

   test('Delete All deletes the folder with its subfolders and effects', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Delete All');
      /** @type {string} The folder that gets deleted. */
      const parentId = await createTrayFolder(page, packId, 'E2E Purge Parent');
      /** @type {string} The subfolder. */
      const childId = await createTrayFolder(page, packId, 'E2E Purge Child', { parentId });
      await createTrayEffect(page, packId, 'E2E Purge Effect', { folderId: parentId });
      await createTrayEffect(page, packId, 'E2E Purge Nested Effect', { folderId: childId });
      await expect(trayFolder(page, 'E2E Purge Parent')).toBeVisible();

      await openFolderMenu('E2E Purge Parent');

      /** @type {string[]} The localized Delete All label. */
      const [deleteLabel] = await localizeAll(['FOLDER.Delete']);
      await chooseContextMenuEntry(page, page.locator('#context-menu li.context-item', { hasText: deleteLabel }));
      await page.locator('.application.dialog button[data-action="yes"]').click();

      await expect(trayFolder(page, 'E2E Purge Parent')).toHaveCount(0);
      await expect
         .poll(() => page.evaluate(async (packId) => {
            /** @type {CompendiumCollection} The pack. */
            const pack = game.packs.get(packId);
            return {
               folders: pack.folders.size,
               effects: (await pack.getDocuments()).length,
            };
         }, packId), { message: 'the folder, its subfolder, and both effects are deleted' })
         .toEqual({
            folders: 0,
            effects: 0,
         });
   });

   test('Create Rollable Table builds a world table from the folder effects', async () => {
      /** @type {string} The pack's collection id. */
      const packId = await freshTrayPack('Rollable Table');
      /** @type {string} The folder the table is built from. */
      const folderId = await createTrayFolder(page, packId, 'E2E Table Folder');
      await createTrayEffect(page, packId, 'E2E Table Effect A', { folderId });
      await createTrayEffect(page, packId, 'E2E Table Effect B', { folderId });
      expect(await page.evaluate(() => game.tables.some((table) => table.name === 'E2E Table Folder'))).toBe(false);

      await openFolderMenu('E2E Table Folder');

      /** @type {string[]} The localized Create Rollable Table label. */
      const [createLabel] = await localizeAll(['FOLDER.CreateTable']);
      await chooseContextMenuEntry(page, page.locator('#context-menu li.context-item', { hasText: createLabel }));
      await page.locator('.application.dialog button[data-action="yes"]').click();

      await expect
         .poll(() => page.evaluate(() => {
            /** @type {RollTable | undefined} The table named for the folder. */
            const table = game.tables.find((candidate) => candidate.name === 'E2E Table Folder');
            return table ? table.results.map((result) => result.name).sort() : null;
         }), { message: 'the table holds one result per folder effect' })
         .toEqual([
            'E2E Table Effect A',
            'E2E Table Effect B',
         ]);

      // The core folder action made the table, so the running list receives it here.
      record({
         documentName: 'RollTable',
         id: await page.evaluate(() => game.tables.getName('E2E Table Folder').id),
         createdBy: path.basename(test.info().file),
      });
   });
});

test.describe('the tray list', () => {
   test('the tray list scrolls so its last row can be brought fully into view', async () => {
      // A shorter window than the suite default makes the shipped pack overflow the sidebar.
      await page.setViewportSize({
         width: 1366,
         height: 768,
      });
      try {
         await openTrayPack(page, 'titan.effects');

         /** @type {{folders: string[], effects: number}} The shipped pack's top-level folders and effect count. */
         const contents = await systemPackContents();
         for (const folderName of contents.folders) {
            await expandTrayFolder(trayFolder(page, folderName));
         }

         /** @type {import('@playwright/test').Locator} The tray's rows. */
         const rows = page.locator('[data-testid="effect-tray-row"]');
         await expect(rows).toHaveCount(contents.effects);

         // The list overflows its own bounded box instead of growing past the sidebar.
         /** @type {import('@playwright/test').Locator} The tray's list. */
         const list = page.locator('[data-testid="effect-tray-list"]');
         /** @type {{overflows: boolean, withinSidebar: boolean}} Whether the list scrolls and stays in the sidebar. */
         const overflow = await list.evaluate((element) => {
            /** @type {DOMRect} The sidebar content's box. */
            const sidebar = document.getElementById('sidebar-content').getBoundingClientRect();

            /** @type {DOMRect} The list's box. */
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

         /** @type {boolean} Whether the last row is inside the list's visible box. */
         const lastVisible = await list.evaluate((element) => {
            /** @type {NodeListOf<Element>} Every row in the list. */
            const all = element.querySelectorAll('[data-testid="effect-tray-row"]');

            /** @type {DOMRect} The last row's box. */
            const last = all[all.length - 1].getBoundingClientRect();

            /** @type {DOMRect} The list's box. */
            const box = element.getBoundingClientRect();
            return last.top >= box.top - 1 && last.bottom <= box.bottom + 1;
         });
         expect(lastVisible, 'the last row is fully visible after scrolling to the end').toBe(true);
      }
      finally {
         await page.setViewportSize({
            width: 1920,
            height: 1080,
         });
      }
   });
});

/**
 * Locates a client's tray pack-select options.
 * @param {import('@playwright/test').Page} client - The client page.
 * @returns {import('@playwright/test').Locator} The options of the tray's pack select.
 */
function trayPackOptions(client) {
   return client.locator('[data-testid="effect-tray-pack-select"] option');
}

/**
 * Reads the label of a client's selected tray pack.
 * @param {import('@playwright/test').Page} client - The client page.
 * @returns {Promise<string>} The selected option's text.
 */
function selectedTrayPackLabel(client) {
   return client.locator('[data-testid="effect-tray-pack-select"]')
      .evaluate((select) => select.options[select.selectedIndex]?.textContent.trim());
}

/**
 * Reads a pack's top-level folder names and root effect names as the tray lists them, sorted. TITAN system packs list
 * only effect-subtype Active Effects (`EffectTrayState#refresh`); the pack used here holds no other subtype.
 * @param {import('@playwright/test').Page} client - The client page.
 * @param {string} packId - The pack's collection id.
 * @returns {Promise<{folders: string[], effects: string[]}>} The names the tray should list.
 */
function packListing(client, packId) {
   return client.evaluate(async (id) => {
      /** @type {CompendiumCollection} The compendium the tray should list. */
      const pack = game.packs.get(id);

      /** @type {Collection<string, object>} The pack's index with each entry's folder. */
      const index = await pack.getIndex({ fields: ['folder'] });
      return {
         folders: pack.folders.filter((folder) => !folder.folder).map((folder) => folder.name).sort(),
         effects: index.filter((entry) => !entry.folder).map((entry) => entry.name).sort(),
      };
   }, packId);
}

/**
 * Reads the top-level folder names and root effect names a client's tray lists, sorted.
 * @param {import('@playwright/test').Page} client - The client page.
 * @returns {Promise<{folders: string[], effects: string[]}>} The listed names.
 */
async function trayListing(client) {
   /** @type {import('@playwright/test').Locator} The tray's list. */
   const list = client.locator('[data-testid="effect-tray-list"]');
   return {
      folders: (await client.locator('[data-testid="effect-tray-list"] > [data-testid="effect-tray-folder"] '
         + '> [data-testid="effect-tray-folder-header"] .folder-name').allInnerTexts()).sort(),
      effects: (await list.locator(':scope > [data-testid="effect-tray-row"] .entry-name').allInnerTexts()).sort(),
   };
}

test('the tray follows a world compendium created and deleted in the Compendium directory, on both GM clients',
   async ({ browser }) => {
      /** @type {string} A pack label no earlier run used, so neither tray state can have read the pack at load. */
      const label = `E2E Tray Pack ${Date.now()}`;

      // A second GM client sees the pack change only through the `manageCompendium` socket.
      await withClients(browser, { second: 'E2E GM 2' }, async ({ second }) => {
         /** @type {string[]} Uncaught page errors on the second client. */
         const secondErrors = attachPageErrors(second);
         /** @type {import('@playwright/test').Page[]} The deleting client and the socket-receiving client. */
         const clients = [
            page,
            second,
         ];

         // Each tray is built before the pack exists, and does not offer it.
         for (const client of clients) {
            await openSidebarTab(client, 'titanEffects');
            await expect(trayPackOptions(client).filter({ hasText: label })).toHaveCount(0);
         }

         // Create the pack through the first client's Create Compendium dialog.
         /** @type {string} The created pack's collection id. */
         const packId = await createCompendium(page, {
            label,
            type: 'ActiveEffect',
         });
         await openSidebarTab(page, 'titanEffects');

         // Both trays offer the new pack. Selecting it lists it, and the new pack is empty.
         for (const client of clients) {
            await expect(trayPackOptions(client).filter({ hasText: label })).toHaveCount(1);
            await client.locator('[data-testid="effect-tray-pack-select"]').selectOption({ label });
            await expect.poll(() => selectedTrayPackLabel(client)).toBe(label);
            await expect(client.locator('[data-testid="effect-tray-empty"]')).toBeVisible();
         }

         // Delete the pack through the first client's directory context menu and its confirmation dialog.
         /** @type {string} The localized label of the directory's Delete Compendium entry. */
         const deleteLabel = await page.evaluate(() => game.i18n.localize('COMPENDIUM.Delete.Option'));
         await openSidebarTab(page, 'compendium');
         await page.locator(`#compendium .directory-item[data-pack="${packId}"]`).click({ button: 'right' });
         await chooseContextMenuEntry(page, page.locator('#context-menu .context-item', { hasText: deleteLabel }));
         await page.locator('.application.dialog button[data-action="yes"]').click();
         await openSidebarTab(page, 'titanEffects');

         // Neither tray offers the pack. Each selection falls back to the system effects pack, and each list reloads
         // with that pack's contents.
         for (const client of clients) {
            await expect.poll(() => client.evaluate((id) => !!game.packs.get(id), packId)).toBe(false);
            await expect(trayPackOptions(client).filter({ hasText: label })).toHaveCount(0);
            await expect.poll(() => selectedTrayPackLabel(client)).toBe('TITAN Effects');

            /** @type {{folders: string[], effects: string[]}} What the system effects pack holds. */
            const expected = await packListing(client, 'titan.effects');
            expect(expected.folders.length + expected.effects.length, 'the system effects pack is not empty')
               .toBeGreaterThan(0);
            await expect(client.locator('[data-testid="effect-tray-empty"]')).toHaveCount(0);
            await expect.poll(() => trayListing(client)).toEqual(expected);
         }

         // The deletion raised no page error, and core reported no error through `Hooks.onError`, on either client
         // (`attachPageErrors` collects both).
         expect(errors, `uncaught errors on the deleting client:\n${errors.join('\n')}`).toEqual([]);
         expect(secondErrors, `uncaught errors on the second client:\n${secondErrors.join('\n')}`).toEqual([]);
      });
   });
