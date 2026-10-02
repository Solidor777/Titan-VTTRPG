import path from 'node:path';
import { expect, test } from './harness.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { openSheetTab } from './fixtures.js';
import { record } from './registry.js';
import { selectTitanOption } from './select.js';
import { closeAllApps } from './world.js';

// One exported async function per real Foundry user flow. Each flow drives the DOM the way a user does (sidebar
// buttons, dialogs, sheet controls, drags), reads the id of what it made from the DOM, records it on the running list
// (`registry.js`) and returns it. Reads through the API are unrestricted; the flows never create, update or delete a
// document through it.

/**
 * The spec file that made a document, recorded with it.
 * @returns {string} The base name of the running spec file.
 */
function currentSpec() {
   return path.basename(test.info().file);
}

/**
 * Builds a pattern matching text that is exactly the given string, for locators that match substrings by default.
 * @param {string} text - The text to match.
 * @returns {RegExp} The anchored pattern.
 */
function exactText(text) {
   return new RegExp(`^${RegExp.escape(text)}$`);
}

/**
 * Opens a sidebar tab the way a user does: clicking its tab button, which also expands the collapsed sidebar. Clicking
 * the tab that is already open changes nothing.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} tab - The tab name (`actors`, `items`, `scenes`, `compendium`, ...).
 * @returns {Promise<import('@playwright/test').Locator>} The tab's panel.
 */
async function openSidebarTab(page, tab) {
   await page.locator(`#sidebar [data-action="tab"][data-group="primary"][data-tab="${tab}"]`).click();

   /** @type {import('@playwright/test').Locator} The tab's panel. */
   const panel = page.locator(`#sidebar section.tab#${tab}`);
   await expect(panel).toHaveClass(/\bactive\b/);
   return panel;
}

/**
 * Creates a document of the directory's kind through the directory's Create button and the core creation dialog.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} tab - The sidebar tab of the directory (`actors`, `items`, `scenes`).
 * @param {string} name - The new document's name.
 * @param {string} [type] - The document subtype to choose in the dialog; omitted for kinds with no subtype.
 * @returns {Promise<string>} The id of the new document, read from its directory entry.
 */
async function createFromDirectory(page, tab, name, type) {
   /** @type {import('@playwright/test').Locator} The directory's panel. */
   const panel = await openSidebarTab(page, tab);
   await panel.locator('header.directory-header [data-action="createEntry"]').click();

   /** @type {import('@playwright/test').Locator} The core creation dialog. */
   const dialog = page.locator('dialog.application.dialog:has(.dialog-content input[name="name"])');
   await dialog.locator('input[name="name"]').fill(name);
   if (type !== undefined) {
      await dialog.locator('select[name="type"]').selectOption(type);
   }
   await dialog.locator('button[data-action="ok"]').click();
   await expect(dialog).toHaveCount(0);

   /** @type {import('@playwright/test').Locator} The directory entry of the new document. */
   const entry = panel.locator('.directory-item.entry', {
      has: page.locator('.entry-name', { hasText: exactText(name) }),
   });
   await expect(entry).toHaveCount(1);
   return (await entry.getAttribute('data-entry-id'));
}

/**
 * A1: creates a world Actor through the Actors tab.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {object} options - What to create.
 * @param {string} options.name - The display name; it starts with `E2E ` so the census finds the actor.
 * @param {string} options.type - The actor subtype (`player` or `npc`).
 * @returns {Promise<string>} The actor's id.
 */
export async function createActor(page, { name, type }) {
   /** @type {string} The new actor's id. */
   const id = await createFromDirectory(page, 'actors', name, type);
   record({
      documentName: 'Actor',
      id,
      createdBy: currentSpec(),
   });
   return id;
}

/**
 * A6: creates a world Item through the Items tab.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {object} options - What to create.
 * @param {string} options.name - The display name; it starts with `E2E ` so the census finds the item.
 * @param {string} options.type - The item subtype (`weapon`, `ability`, ...).
 * @returns {Promise<string>} The item's id.
 */
export async function createWorldItem(page, { name, type }) {
   /** @type {string} The new item's id. */
   const id = await createFromDirectory(page, 'items', name, type);
   record({
      documentName: 'Item',
      id,
      createdBy: currentSpec(),
   });
   return id;
}

/**
 * S1: creates a Scene through the Scenes tab. Core views a scene created while no scene is viewed (measured: a second
 * scene created while one is viewed is not viewed), so the flow then waits for the canvas to finish drawing it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {object} options - What to create.
 * @param {string} options.name - The display name; it starts with `E2E ` so the census finds the scene.
 * @returns {Promise<string>} The scene's id.
 */
export async function createScene(page, { name }) {
   /** @type {boolean} Whether a scene was viewed before the creation. */
   const hadViewedScene = await page.evaluate(() => !!game.scenes.viewed);

   /** @type {string} The new scene's id. */
   const id = await createFromDirectory(page, 'scenes', name);
   record({
      documentName: 'Scene',
      id,
      createdBy: currentSpec(),
   });
   if (!hadViewedScene) {
      await waitForSceneDrawn(page, id);
   }
   return id;
}

/**
 * Opens a document's sheet by uuid (a read-side render, not a document change) and waits until it is on screen.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} documentName - The document class name, as it appears in the sheet's element id (`Actor`, `Item`).
 * @param {string} uuid - The document's uuid.
 * @returns {Promise<import('@playwright/test').Locator>} The sheet's element.
 */
async function openSheet(page, documentName, uuid) {
   await page.evaluate(async (uuid) => (await fromUuid(uuid)).sheet.render({ force: true }), uuid);

   /** @type {import('@playwright/test').Locator} The sheet's element; AppV2 ids end in `<DocumentName>-<id>`. */
   const sheet = page.locator(`.application[id$="${documentName}-${uuid.split('.').at(-1)}"]`);
   await expect(sheet).toBeVisible();
   return sheet;
}

/**
 * Closes an application window with its header close button.
 * @param {import('@playwright/test').Locator} application - The application's element.
 * @returns {Promise<void>} Resolves once the window is gone.
 */
async function closeWindow(application) {
   await application.locator('header.window-header [data-action="close"]').click();
   await expect(application).toHaveCount(0);
}

/**
 * A2: adds an owned Item to an Actor through the actor sheet: the Abilities or Spells tab's add button, or the
 * Inventory tab's add button and its item-type dialog; then renames the new item in its own sheet.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the actor that receives the item.
 * @param {string} type - The item subtype (`ability`, `spell`, `weapon`, `armor`, `shield`, `equipment`, `commodity`).
 * @param {string} name - The name to give the item.
 * @returns {Promise<string>} The owned item's id.
 */
export async function createOwnedItem(page, actorId, type, name) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheet(page, 'Actor', `Actor.${actorId}`);

   /** @type {string[]} The ids of the actor's items before the add. */
   const before = await page.evaluate((actorId) => game.actors.get(actorId).items.map((item) => item.id), actorId);
   if (type === 'ability') {
      await openSheetTab(page, 'Abilities');
      await sheet.getByRole('button', { name: 'Add New Ability' }).click();
   }
   else if (type === 'spell') {
      await openSheetTab(page, 'Spells');
      await sheet.getByRole('button', { name: 'Add New Spell' }).click();
   }
   else {
      await openSheetTab(page, 'Inventory');
      await sheet.getByRole('button', { name: 'Add New Item' }).click();

      /** @type {import('@playwright/test').Locator} The item-type dialog; TitanDialog suffixes the id it is given. */
      const dialog = page.locator(`[id^="add-inventory-item-dialog-${actorId}"]`);
      await expect(dialog).toBeVisible();
      await selectTitanOption(page, dialog.locator('[role="combobox"]'), type);
      await dialog.getByRole('button', { name: 'Add New Item' }).click();
      await expect(dialog).toHaveCount(0);
   }

   /** @type {string[]} The ids that appeared on the actor. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         ({ actorId, before }) => game.actors.get(actorId).items
            .filter((item) => !before.includes(item.id))
            .map((item) => item.id),
         {
            actorId,
            before,
         },
      );
      return added.length;
   }, { message: 'the add button created one owned item' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'Item',
      id,
      parent: `Actor.${actorId}`,
      createdBy: currentSpec(),
   });

   // The new item carries a default name; the item sheet's name field renames it.
   /** @type {import('@playwright/test').Locator} The item's sheet, opened from its row's Edit button. */
   const row = sheet.locator(`[data-item-id="${id}"]`);
   await row.getByRole('button', { name: 'Edit Item' }).click();

   /** @type {import('@playwright/test').Locator} The item sheet's element. */
   const itemSheet = page.locator(`.application[id$="Item-${id}"]`);
   await expect(itemSheet).toBeVisible();
   await itemSheet.locator('.document-name input').fill(name);
   await itemSheet.locator('.document-name input').blur();
   await expect.poll(
      () => page.evaluate(({ actorId, id }) => game.actors.get(actorId).items.get(id).name, {
         actorId,
         id,
      }),
      { message: 'the item sheet renamed the owned item' },
   ).toBe(name);
   await closeWindow(itemSheet);
   return id;
}

/**
 * Chooses an entry of a scene directory entry's context menu, opened with a right click.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} sceneId - The scene whose entry is clicked.
 * @param {string} label - The menu entry's label (`View`, `Activate`).
 * @returns {Promise<void>} Resolves once the menu has closed.
 */
async function chooseSceneMenuEntry(page, sceneId, label) {
   /** @type {import('@playwright/test').Locator} The scenes tab. */
   const panel = await openSidebarTab(page, 'scenes');
   await panel.locator(`.directory-item.entry[data-entry-id="${sceneId}"]`).click({ button: 'right' });
   await chooseContextMenuEntry(
      page,
      page.locator('#context-menu li.context-item', { hasText: exactText(label) }),
   );
}

/**
 * Waits until the canvas has finished drawing a scene.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} sceneId - The scene being drawn.
 * @returns {Promise<void>} Resolves once the scene is drawn.
 */
async function waitForSceneDrawn(page, sceneId) {
   await page.waitForFunction(
      (sceneId) => canvas.ready && canvas.scene?.id === sceneId,
      sceneId,
      { timeout: 30_000 },
   );
}

/**
 * S1: views a scene through its directory entry's context menu (the menu offers View only for a scene that is not
 * already the viewed one, so a viewed scene is only awaited).
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} sceneId - The scene to view.
 * @returns {Promise<void>} Resolves once the canvas has drawn the scene.
 */
export async function viewScene(page, sceneId) {
   // The menu offers View only for a scene that is not the viewed one.
   if (await page.evaluate((sceneId) => game.scenes.viewed?.id === sceneId, sceneId)) {
      await waitForSceneDrawn(page, sceneId);
      return;
   }
   await chooseSceneMenuEntry(page, sceneId, 'View');
   await waitForSceneDrawn(page, sceneId);
}

/**
 * S1: activates a scene through its directory entry's context menu, so every client views it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} sceneId - The scene to activate.
 * @returns {Promise<void>} Resolves once the canvas has drawn the scene.
 */
export async function activateScene(page, sceneId) {
   await chooseSceneMenuEntry(page, sceneId, 'Activate');
   await waitForSceneDrawn(page, sceneId);
}

/**
 * T1: places a token for an actor by dragging the actor's directory entry onto the centre of the canvas, which core
 * handles as an Actor drop (`TokenLayer#_onDropActorData`). The viewed scene must be drawn. Open windows are closed
 * first: one over the canvas centre would take the drop.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorId - The actor to place.
 * @returns {Promise<string>} The id of the placed token.
 */
export async function placeToken(page, actorId) {
   await closeAllApps(page);

   /** @type {string} The id of the viewed scene. */
   const sceneId = await page.evaluate(() => canvas.scene.id);

   /** @type {string[]} The ids of the scene's tokens before the drop. */
   const before = await page.evaluate(() => canvas.scene.tokens.map((token) => token.id));

   /** @type {import('@playwright/test').Locator} The actors tab. */
   const panel = await openSidebarTab(page, 'actors');
   await panel.locator(`.directory-item.entry[data-entry-id="${actorId}"]`).dragTo(page.locator('#board'));

   /** @type {string[]} The ids that appeared on the scene. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         (before) => canvas.scene.tokens.filter((token) => !before.includes(token.id)).map((token) => token.id),
         before,
      );
      return added.length;
   }, { message: 'the drop onto the canvas placed one token' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'Token',
      id,
      parent: `Scene.${sceneId}`,
      sceneId,
      createdBy: currentSpec(),
   });
   return id;
}

/**
 * T2: flips whether an actor's prototype token is linked, with the toggle button in the header of the actor's sheet.
 * Tokens placed afterwards take the new setting.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorId - The world actor.
 * @returns {Promise<boolean>} Whether the prototype token is linked afterwards.
 */
export async function toggleTokenLink(page, actorId) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheet(page, 'Actor', `Actor.${actorId}`);

   /** @type {boolean} Whether the prototype token was linked. */
   const linked = await page.evaluate((actorId) => game.actors.get(actorId).prototypeToken.actorLink, actorId);
   await sheet.locator('.toggle-token-linked-button').click();
   await expect.poll(
      () => page.evaluate((actorId) => game.actors.get(actorId).prototypeToken.actorLink, actorId),
      { message: 'the toggle flipped the prototype token link' },
   ).toBe(!linked);
   return !linked;
}

/**
 * T2: unlinks a placed token with the Unlink button in the header of its actor's sheet, which the double-click on the
 * token opened. The unlink is irreversible: the sheet closes and the token's own synthetic actor's sheet opens.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The linked token on the viewed scene.
 * @returns {Promise<void>} Resolves once the synthetic actor's sheet is open.
 */
export async function unlinkPlacedToken(page, tokenId) {
   await closeAllApps(page);

   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await page.evaluate((tokenId) => {
      const token = canvas.scene.tokens.get(tokenId).object;
      return canvas.clientCoordinatesFromCanvas(token.center);
   }, tokenId);

   // A user moves the pointer onto the token before clicking it: the canvas processes a click only on a hovered token,
   // and a pointer that has rested where the token appeared (the drop of the placing drag) raises no hover.
   await page.mouse.move(centre.x + 200, centre.y);
   await page.mouse.move(centre.x, centre.y, { steps: 5 });
   await expect.poll(
      () => page.evaluate((tokenId) => canvas.scene.tokens.get(tokenId).object.hover, tokenId),
      { message: 'the pointer hovers the token' },
   ).toBe(true);
   await page.mouse.dblclick(centre.x, centre.y);

   /** @type {import('@playwright/test').Locator} The sheet the double-click opened. */
   const sheet = page.locator('.application.titan-document-sheet', { has: page.locator('.unlink-token-button') });
   await sheet.locator('.unlink-token-button').click();
   await expect.poll(
      () => page.evaluate((tokenId) => canvas.scene.tokens.get(tokenId).actorLink, tokenId),
      { message: 'the Unlink button unlinked the token' },
   ).toBe(false);

   // The reopened sheet is the token's synthetic actor's: its element id carries the token's uuid.
   await expect(page.locator(`.application.titan-document-sheet[id*="Token-${tokenId}"]`)).toBeVisible();
}

/**
 * Opens a directory tab and returns the entry of a world document in it.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} tab - The sidebar tab of the directory (`actors`, `items`, `scenes`).
 * @param {string} documentId - The id the entry carries in `data-entry-id`.
 * @returns {Promise<import('@playwright/test').Locator>} The entry's list item in the open tab.
 */
export async function directoryEntry(page, tab, documentId) {
   /** @type {import('@playwright/test').Locator} The directory's panel. */
   const panel = await openSidebarTab(page, tab);
   return panel.locator(`.directory-item.entry[data-entry-id="${documentId}"]`);
}

/**
 * Returns a world compendium's entry in the Compendium tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} packId - The pack's collection id (`world.<name>`).
 * @returns {Promise<import('@playwright/test').Locator>} The pack's list item in the Compendium tab.
 */
async function packEntry(page, packId) {
   /** @type {import('@playwright/test').Locator} The compendium directory's panel. */
   const panel = await openSidebarTab(page, 'compendium');
   return panel.locator(`.directory-item.compendium[data-pack="${packId}"]`);
}

/**
 * P1: creates a world compendium through the Compendium tab's Create button and its dialog.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {object} options - What to create.
 * @param {string} options.label - The display label; it starts with `E2E ` so the census finds the pack.
 * @param {string} options.type - The document type it holds (`Actor`, `Item`, `Scene`, ...).
 * @returns {Promise<string>} The pack's collection id (`world.<name>`).
 */
export async function createCompendium(page, { label, type }) {
   /** @type {import('@playwright/test').Locator} The compendium directory's panel. */
   const panel = await openSidebarTab(page, 'compendium');
   await panel.locator('header.directory-header [data-action="createEntry"]').click();

   /** @type {import('@playwright/test').Locator} The creation dialog. */
   const dialog = page.locator('dialog.application.dialog#create-compendium');
   await dialog.locator('#create-compendium-label').fill(label);
   await dialog.locator('select#create-compendium-type').selectOption(type);
   await dialog.locator('button[data-action="ok"]').click();
   await expect(dialog).toHaveCount(0);

   /** @type {import('@playwright/test').Locator} The new pack's directory entry. */
   const entry = panel.locator('.directory-item.compendium', {
      has: page.locator('.entry-name strong', { hasText: exactText(label) }),
   });
   await expect(entry).toHaveCount(1);

   /** @type {string} The pack's collection id. */
   const packId = await entry.getAttribute('data-pack');
   record({
      documentName: 'Compendium',
      id: packId,
      createdBy: currentSpec(),
   });
   return packId;
}

/**
 * P1: locks or unlocks a compendium with its directory entry's context menu. Does nothing but check the state when the
 * pack is already in it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} packId - The pack's collection id.
 * @param {boolean} locked - The state to leave the pack in.
 * @returns {Promise<void>} Resolves once the pack is in the requested state.
 */
export async function setCompendiumLocked(page, packId, locked) {
   /** @type {boolean} Whether the pack is locked now. */
   const current = await page.evaluate((packId) => game.packs.get(packId).locked, packId);
   if (current !== locked) {
      /** @type {import('@playwright/test').Locator} The pack's directory entry. */
      const entry = await packEntry(page, packId);
      await entry.click({ button: 'right' });
      await chooseContextMenuEntry(
         page,
         page.locator('#context-menu li.context-item', { hasText: exactText(locked ? 'Lock' : 'Unlock') }),
      );
   }
   await expect.poll(
      () => page.evaluate((packId) => game.packs.get(packId).locked, packId),
      { message: 'the context menu changed the pack lock' },
   ).toBe(locked);
}

/**
 * P3: copies a world document into an unlocked compendium by dragging its directory entry onto the pack's open
 * window, which core handles as a drop of the document into the pack (`DocumentDirectory#_handleDroppedEntry`).
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {import('@playwright/test').Locator} entryLocator - The world document's directory entry, visible.
 * @param {string} packId - The unlocked pack's collection id.
 * @returns {Promise<string>} The id of the document the pack now holds.
 */
export async function putInPack(page, entryLocator, packId) {
   /** @type {string[]} The ids the pack's index holds before the drop. */
   const before = await page.evaluate(
      async (packId) => (await game.packs.get(packId).getIndex()).map((entry) => entry._id),
      packId,
   );

   // Opening the pack's window is clicking its entry in the Compendium tab.
   /** @type {import('@playwright/test').Locator} The pack's entry. */
   const entry = await packEntry(page, packId);
   await entry.locator('a.entry-name').click();

   /** @type {import('@playwright/test').Locator} The pack's popout window, opened by the entry click. */
   const packWindow = page.locator(`.application.compendium-directory[id="Compendium-${packId.replaceAll('.', '_')}"]`);
   await expect(packWindow).toBeVisible();

   // Opening the pack switched the sidebar to the Compendium tab; the dragged entry's own tab is shown again.
   await openSidebarTab(page, await entryLocator.evaluate((element) => element.closest('section.tab').id));
   await entryLocator.dragTo(packWindow.locator('.directory-list'));

   /** @type {string[]} The ids that appeared in the pack. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         async ({ packId, before }) => (await game.packs.get(packId).getIndex())
            .filter((entry) => !before.includes(entry._id))
            .map((entry) => entry._id),
         {
            packId,
            before,
         },
      );
      return added.length;
   }, { message: 'the drop copied one document into the pack' }).toBe(1);
   const [id] = added;
   record({
      documentName: await page.evaluate(({ packId }) => game.packs.get(packId).documentName, { packId }),
      id,
      packId,
      createdBy: currentSpec(),
   });
   await closeWindow(packWindow);
   return id;
}

/**
 * The shared fixtures a flow can build, by key. `registry.js` `shared` runs the flow of a key that is not on the list.
 * @type {Record<string, (page: import('@playwright/test').Page) => Promise<string>>}
 */
export const SHARED_FIXTURES = {
   player: (page) => createActor(page, {
      name: 'E2E Shared Player',
      type: 'player',
   }),
   npc: (page) => createActor(page, {
      name: 'E2E Shared NPC',
      type: 'npc',
   }),
};
