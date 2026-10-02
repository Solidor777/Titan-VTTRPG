import path from 'node:path';
import { expect, test } from './harness.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { openSheetByUuid } from './fixtures.js';
import { readRegistry, record, writeRegistry } from './registry.js';
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
export async function openSidebarTab(page, tab) {
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
 * Creates a world Actor through the Actors tab.
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
 * Creates a world Item through the Items tab.
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
 * Creates a Scene through the Scenes tab. Core views a scene created while no scene is viewed (measured: a second
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
 * Opens a tab of a sheet by clicking its tab button. Scoped to the given sheet so another open TITAN sheet's tab strip
 * is never clicked.
 * @param {import('@playwright/test').Locator} sheet - The sheet's window element.
 * @param {string} label - The tab's visible label.
 * @returns {Promise<void>} Resolves once the tab button has been clicked.
 */
async function openTab(sheet, label) {
   await sheet.locator('.tab-list').getByText(label, { exact: true }).first().click();
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
 * Adds an owned Item to an Actor through the actor sheet: the Abilities or Spells tab's add button, or the
 * Inventory tab's add button and its item-type dialog; then renames the new item in its own sheet.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the actor that receives the item.
 * @param {string} type - The item subtype (`ability`, `spell`, `weapon`, `armor`, `shield`, `equipment`, `commodity`).
 * @param {string} name - The name to give the item.
 * @returns {Promise<string>} The owned item's id.
 */
export async function createOwnedItem(page, actorId, type, name) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, `Actor.${actorId}`);

   /** @type {string[]} The ids of the actor's items before the add. */
   const before = await page.evaluate((actorId) => game.actors.get(actorId).items.map((item) => item.id), actorId);
   if (type === 'ability') {
      await openTab(sheet, 'Abilities');
      await sheet.getByRole('button', { name: 'Add New Ability' }).click();
   }
   else if (type === 'spell') {
      await openTab(sheet, 'Spells');
      await sheet.getByRole('button', { name: 'Add New Spell' }).click();
   }
   else {
      await openTab(sheet, 'Inventory');
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
   /** @type {import('@playwright/test').Locator} The item's row in the actor sheet. */
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
 * Views a scene through its directory entry's context menu (the menu offers View only for a scene that is not
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
 * Activates a scene through its directory entry's context menu, so every client views it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} sceneId - The scene to activate.
 * @returns {Promise<void>} Resolves once the canvas has drawn the scene.
 */
export async function activateScene(page, sceneId) {
   await chooseSceneMenuEntry(page, sceneId, 'Activate');
   await waitForSceneDrawn(page, sceneId);
}

/**
 * Releases control of every token the way a user does: the Escape key, which core binds to releasing control. Measured
 * (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`): on a scene with `tokenVision` true, a GM who
 * controls one token sees a second token with `visible` false, and releasing control makes it `visible` true; with
 * `tokenVision` false the second token stays visible while the first is controlled. A token that is not visible takes
 * no pointer events.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing a drawn scene.
 * @returns {Promise<void>} Resolves once no token is controlled.
 */
async function releaseTokenControl(page) {
   if (await page.evaluate(() => canvas.tokens.controlled.length) === 0) {
      return;
   }
   await page.keyboard.press('Escape');
   await expect.poll(
      () => page.evaluate(() => canvas.tokens.controlled.length),
      { message: 'the Escape key released the controlled tokens' },
   ).toBe(0);
}

/** @type {number} The number of drop spots in a row of placed tokens. */
const TOKEN_COLUMNS = 7;

/** @type {number} The distance in pixels between the drop spots of two placed tokens. */
const TOKEN_SPACING = 130;

/**
 * Places a token for an actor by dragging the actor's directory entry onto a free spot near the centre of the
 * canvas, which core handles as an Actor drop (`TokenLayer#_onDropActorData`). The viewed scene must be drawn. Open
 * windows are closed first: one over the canvas centre would take the drop. The spots form a grid of
 * `TOKEN_COLUMNS` by `TOKEN_SPACING` pixels, filled row by row from the centre; a spot with a token on it (whatever
 * order the scene's tokens were placed or deleted in) is skipped, because tokens dropped on one spot stack and the
 * pointer reaches only the topmost. Measured at a 1920 by 1080 viewport
 * (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-2.log`): 34 tokens were placed, and the drop for the
 * 35th timed out (cause not determined).
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorId - The actor to place.
 * @returns {Promise<string>} The id of the placed token.
 */
export async function placeToken(page, actorId) {
   await closeAllApps(page);
   await releaseTokenControl(page);

   /** @type {string} The id of the viewed scene. */
   const sceneId = await page.evaluate(() => canvas.scene.id);

   /** @type {string[]} The ids of the scene's tokens before the drop. */
   const before = await page.evaluate(() => canvas.scene.tokens.map((token) => token.id));

   /** @type {import('@playwright/test').Locator} The actors tab. */
   const panel = await openSidebarTab(page, 'actors');

   /** @type {{x: number, y: number}} The first drop spot with no token on it, relative to the canvas element. */
   const spot = await page.evaluate(({ columns, spacing }) => {
      const board = document.querySelector('#board');

      /**
       * A drop spot.
       * @param {number} index - The spot's number, counted from the first spot.
       * @returns {{x: number, y: number}} The spot relative to the canvas element.
       */
      const position = (index) => ({
         x: board.clientWidth / 2 + ((index % columns) - Math.floor(columns / 2)) * spacing,
         y: board.clientHeight / 2 + Math.floor(index / columns) * spacing,
      });
      const outline = board.getBoundingClientRect();

      /**
       * The canvas coordinates of a drop spot.
       * @param {{x: number, y: number}} spot - A spot relative to the canvas element.
       * @returns {{x: number, y: number}} The point on the scene.
       */
      const onScene = (spot) => canvas.canvasCoordinatesFromClient({
         x: outline.left + spot.x,
         y: outline.top + spot.y,
      });
      const first = onScene(position(0));
      const next = onScene(position(1));

      // A token dropped on a spot snaps to the grid, so its centre lands within a grid cell of the spot; half the
      // distance between neighbouring spots separates "on this spot" from "on the next".
      const reach = Math.hypot(next.x - first.x, next.y - first.y) / 2;
      const centres = canvas.scene.tokens.map((token) => ({
         x: token.x + (token.width * canvas.grid.size) / 2,
         y: token.y + (token.height * canvas.grid.size) / 2,
      }));
      for (let index = 0; index < columns * 100; index++) {
         const candidate = position(index);
         if (candidate.y >= board.clientHeight) {
            break;
         }
         const point = onScene(candidate);
         if (!centres.some((centre) => Math.hypot(centre.x - point.x, centre.y - point.y) < reach)) {
            return candidate;
         }
      }
      throw new Error('There is no free drop spot left on the canvas.');
   }, {
      columns: TOKEN_COLUMNS,
      spacing: TOKEN_SPACING,
   });
   await panel.locator(`.directory-item.entry[data-entry-id="${actorId}"]`).dragTo(page.locator('#board'), {
      targetPosition: spot,
   });

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
 * Flips whether an actor's prototype token is linked, with the toggle button in the header of the actor's sheet.
 * Tokens placed afterwards take the new setting.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorId - The world actor.
 * @returns {Promise<boolean>} Whether the prototype token is linked afterwards.
 */
export async function toggleTokenLink(page, actorId) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, `Actor.${actorId}`);

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
 * Unlinks a placed token with the Unlink button in the header of its actor's sheet, which the double-click on the
 * token opened. The unlink is irreversible: the sheet closes and the token's own synthetic actor's sheet opens.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The linked token on the viewed scene.
 * @returns {Promise<void>} Resolves once the synthetic actor's sheet is open.
 */
export async function unlinkPlacedToken(page, tokenId) {
   await closeAllApps(page);
   await releaseTokenControl(page);

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
 * Creates a world compendium through the Compendium tab's Create button and its dialog.
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
 * Locks or unlocks a compendium with its directory entry's context menu. Does nothing but check the state when the
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
 * Copies a world document into an unlocked compendium by dragging its directory entry onto the pack's open
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
 * Picks a portrait through Foundry's own FilePicker: the sheet's portrait button opens it, the Core Data source is
 * chosen, the directory path is typed into its address bar, the file is clicked and the picker is confirmed.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {import('@playwright/test').Locator} sheet - The open sheet whose portrait button is clicked.
 * @param {string} fileName - A file in `icons/svg/` (`mystery-man.svg`, `book.svg`, ...).
 * @returns {Promise<void>} Resolves once the picker has closed.
 */
export async function pickPortrait(page, sheet, fileName) {
   await sheet.locator('.portrait button').first().click();

   /** @type {import('@playwright/test').Locator} Foundry's file picker. */
   const picker = page.locator('#file-picker');
   await expect(picker).toBeVisible();

   // `icons/svg/` is in Core Data; the picker opens on the source that holds the current image.
   /** @type {import('@playwright/test').Locator} The Core Data source tab. */
   const coreData = picker.locator('nav.tabs a[data-action="tab"][data-tab="public"]');
   if (!(await coreData.evaluate((tab) => tab.classList.contains('active')))) {
      await coreData.click();
      await expect(coreData).toHaveClass(/(^|\s)active(\s|$)/);
   }

   /** @type {import('@playwright/test').Locator} The picker's address bar. */
   const address = picker.locator('input[name="target"]');
   await address.fill('icons/svg');
   await address.press('Enter');
   await picker.locator(`[data-action="pickFile"][data-name="${fileName}"]`).click();
   await picker.locator('button[type="submit"]').click();
   await expect(picker).toHaveCount(0);
}

/**
 * Adds a world Item to an Actor by dragging the item's Items-tab entry onto the open actor sheet, which the sheet
 * handles as an Item drop (`TitanActorSheet#_onDropItem`).
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} itemId - The id of the world item.
 * @param {string} actorId - The id of the actor that receives a copy.
 * @returns {Promise<string>} The id of the owned copy.
 */
export async function dragItemOntoSheet(page, itemId, actorId) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, `Actor.${actorId}`);

   /** @type {string[]} The ids of the actor's items before the drop. */
   const before = await page.evaluate((actorId) => game.actors.get(actorId).items.map((item) => item.id), actorId);

   /** @type {import('@playwright/test').Locator} The items tab. */
   const panel = await openSidebarTab(page, 'items');
   await panel.locator(`.directory-item.entry[data-entry-id="${itemId}"]`).dragTo(sheet);

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
   }, { message: 'the drop onto the sheet created one owned item' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'Item',
      id,
      parent: `Actor.${actorId}`,
      createdBy: currentSpec(),
   });
   return id;
}

/**
 * Adds an Active Effect to an Actor through the Effects tab's add button, renames it in its own sheet and, when
 * asked, sets its duration type in the sheet header.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the actor that receives the effect.
 * @param {string} name - The name to give the effect.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.duration] - The duration type to choose in the header (`permanent`, `turnStart`, ...).
 * @returns {Promise<string>} The effect's id.
 */
export async function addEffect(page, actorId, name, { duration } = {}) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, `Actor.${actorId}`);

   /** @type {string[]} The ids of the actor's effects before the add. */
   const before = await page.evaluate(
      (actorId) => game.actors.get(actorId).effects.map((effect) => effect.id),
      actorId,
   );
   await openTab(sheet, 'Effects');
   await sheet.getByRole('button', { name: 'Add New Effect' }).click();

   /** @type {string[]} The ids that appeared on the actor. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         ({ actorId, before }) => game.actors.get(actorId).effects
            .filter((effect) => !before.includes(effect.id))
            .map((effect) => effect.id),
         {
            actorId,
            before,
         },
      );
      return added.length;
   }, { message: 'the add button created one effect' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'ActiveEffect',
      id,
      parent: `Actor.${actorId}`,
      createdBy: currentSpec(),
   });

   // The new effect carries a default name; the effect sheet's name field renames it.
   await sheet.locator(`[data-effect-id="${id}"]`).getByRole('button', { name: 'Edit Item' }).click();

   /** @type {import('@playwright/test').Locator} The effect sheet's element. */
   const effectSheet = page.locator(`.application[id$="ActiveEffect-${id}"]`);
   await expect(effectSheet).toBeVisible();
   await effectSheet.locator('.document-name input').fill(name);
   await effectSheet.locator('.document-name input').blur();
   await expect.poll(
      () => page.evaluate(({ actorId, id }) => game.actors.get(actorId).effects.get(id).name, {
         actorId,
         id,
      }),
      { message: 'the effect sheet renamed the effect' },
   ).toBe(name);
   if (duration !== undefined) {
      await selectTitanOption(
         page,
         effectSheet.locator('.stat', { hasText: 'Duration Type' }).locator('[role="combobox"]'),
         duration,
      );
      await expect.poll(
         () => page.evaluate(
            ({ actorId, id }) => game.actors.get(actorId).effects.get(id).system.duration.type,
            {
               actorId,
               id,
            },
         ),
         { message: 'the duration select changed the duration type' },
      ).toBe(duration);
   }
   await closeWindow(effectSheet);
   return id;
}

/**
 * Adds a check to a document that carries checks (an item or an effect) through the Checks tab's add button and
 * fills the row's inputs.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} documentUuid - The uuid of the item or effect.
 * @param {object} [fields] - The row's inputs to fill.
 * @param {string} [fields.label] - Text typed into the new row's label input.
 * @returns {Promise<void>} Resolves once the check is stored with its label.
 */
export async function addCheck(page, documentUuid, { label } = {}) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);

   /** @type {number} The number of checks before the add. */
   const before = await page.evaluate(async (uuid) => (await fromUuid(uuid)).system.check.length, documentUuid);
   await openTab(sheet, 'Checks');
   await sheet.getByRole('button', { name: 'Add Check' }).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.check.length, documentUuid),
      { message: 'the add button created one check' },
   ).toBe(before + 1);
   if (label !== undefined) {
      /** @type {import('@playwright/test').Locator} The new row's label input. */
      const input = sheet.locator('.check .header .label input').nth(before);
      await input.fill(label);
      await input.blur();
      await expect.poll(
         async () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.check.at(-1).label, documentUuid),
         { message: 'the label input stored the check label' },
      ).toBe(label);
   }
}

/**
 * Adds a rules element to a document that carries them (an item or an effect) through the Rules Elements tab's
 * add button and fills the new row's controls. A new row is a flat modifier; any other operation is chosen in the
 * row's operation select first.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} documentUuid - The uuid of the item or effect.
 * @param {object} element - What the row holds.
 * @param {string} [element.operation] - The operation (`conditionalCheckModifier`, `flatModifier`, ...).
 * @param {string} [element.modifierType] - A conditional check modifier's modifier type.
 * @param {string} [element.checkType] - A conditional check modifier's check type.
 * @param {string} [element.selector] - A conditional check modifier's selector.
 * @param {number} [element.advantageLevel] - A conditional Advantage modifier's level (`-2`, `-1`, `1`, `2`).
 * @param {number} [element.value] - The value input of a modifier that has one.
 * @returns {Promise<void>} Resolves once the row holds the requested fields.
 */
export async function addRulesElement(page, documentUuid, element) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);

   /** @type {number} The number of rules elements before the add. */
   const before = await page.evaluate(
      async (uuid) => (await fromUuid(uuid)).system.rulesElement.length,
      documentUuid,
   );
   await openTab(sheet, 'Rules Elements');
   await sheet.locator('.add-entry-button button').click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.rulesElement.length, documentUuid),
      { message: 'the add button created one rules element' },
   ).toBe(before + 1);

   /** @type {import('@playwright/test').Locator} The new row. */
   const row = sheet.locator('.rules-element').nth(before);

   /**
    * Reads one field of the new row's stored element.
    * @param {string} field - The element field.
    * @returns {Promise<*>} The stored value.
    */
   const stored = (field) => page.evaluate(
      async ({ uuid, index, field }) => (await fromUuid(uuid)).system.rulesElement[index][field],
      {
         uuid: documentUuid,
         index: before,
         field,
      },
   );

   if (element.operation !== undefined && element.operation !== 'flatModifier') {
      await selectTitanOption(page, row.locator('.operation [role="combobox"]'), element.operation);
      await expect.poll(() => stored('operation'), { message: 'the operation select changed the operation' })
         .toBe(element.operation);
   }

   for (const [field, testId] of [
      [
         'modifierType',
         'ccm-modifier-type',
      ],
      [
         'checkType',
         'ccm-check-type',
      ],
      [
         'selector',
         'ccm-selector',
      ],
   ]) {
      if (element[field] !== undefined) {
         await selectTitanOption(page, row.getByTestId(testId), element[field]);
         await expect.poll(() => stored(field), { message: `the ${testId} select stored ${field}` })
            .toBe(element[field]);
      }
   }
   if (element.advantageLevel !== undefined) {
      await selectTitanOption(page, row.getByTestId('ccm-advantage-level'), element.advantageLevel);
      await expect.poll(() => stored('value'), { message: 'the level select stored the Advantage level' })
         .toBe(element.advantageLevel);
   }
   if (element.value !== undefined) {
      /** @type {import('@playwright/test').Locator} The value input. */
      const input = row.getByTestId('ccm-value');
      await input.fill(String(element.value));
      await input.blur();
      await expect.poll(() => stored('value'), { message: 'the value input stored the value' }).toBe(element.value);
   }
}

/**
 * Adds a custom trait to an item through the sidebar's Add Custom Trait button and its dialog.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} itemUuid - The uuid of the item that receives the trait.
 * @param {string} name - Text typed into the dialog's name input.
 * @returns {Promise<void>} Resolves once the trait is stored.
 */
export async function addCustomTrait(page, itemUuid, name) {
   /** @type {import('@playwright/test').Locator} The item's sheet. */
   const sheet = await openSheetByUuid(page, itemUuid);
   await sheet.getByText('Add Custom Trait', { exact: true }).first().click();

   /** @type {import('@playwright/test').Locator} The Add Custom Trait dialog. */
   const dialog = page.locator('.titan-add-custom-item-trait-dialog');
   await expect(dialog).toBeVisible();
   await dialog.locator('input').first().fill(name);
   await dialog.locator('.buttons .button button').first().click();
   await expect(dialog).toHaveCount(0);
   await expect.poll(
      () => page.evaluate(
         async (uuid) => (await fromUuid(uuid)).system.customTrait.map((trait) => trait.name),
         itemUuid,
      ),
      { message: 'the dialog stored the custom trait' },
   ).toContain(name);
}

/**
 * Adds an attack to a weapon through the Attacks tab's add button.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} weaponUuid - The uuid of the weapon that receives the attack.
 * @returns {Promise<void>} Resolves once the attack is stored.
 */
export async function addAttack(page, weaponUuid) {
   /** @type {import('@playwright/test').Locator} The weapon's sheet. */
   const sheet = await openSheetByUuid(page, weaponUuid);

   /** @type {number} The number of attacks before the add. */
   const before = await page.evaluate(async (uuid) => (await fromUuid(uuid)).system.attack.length, weaponUuid);
   await openTab(sheet, 'Attacks');
   await sheet.getByRole('button', { name: 'Add Attack' }).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.attack.length, weaponUuid),
      { message: 'the add button created one attack' },
   ).toBe(before + 1);
}

/**
 * Enables a standard aspect on a spell through the Standard Aspects tab's toggle button, then sets the aspect's
 * options and resistance check in the controls the toggle reveals.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} spellUuid - The uuid of the spell that receives the aspect.
 * @param {string} label - The aspect's key (`range`, `duration`, `inflictCondition`, ...).
 * @param {object} [settings] - What to set once the aspect is enabled.
 * @param {string|number} [settings.initialValue] - The value to choose in the aspect's initial value select.
 * @param {string[]} [settings.options] - Option toggles to switch on (`stunned`, ...).
 * @param {string} [settings.resistanceCheck] - The resistance check to choose (`resilience`, ...).
 * @returns {Promise<void>} Resolves once the aspect is stored with the settings.
 */
export async function enableAspect(page, spellUuid, label, { initialValue, options = [], resistanceCheck } = {}) {
   /** @type {import('@playwright/test').Locator} The spell's sheet. */
   const sheet = await openSheetByUuid(page, spellUuid);
   await openTab(sheet, 'Standard Aspects');

   /** @type {string} The aspect's localized name, which its toggle button shows. */
   const text = await page.evaluate((label) => game.i18n.localize(`LOCAL.${label}.text`), label);

   // The sidebar lists the enabled aspects with the same class, so the block is looked up inside the tab.
   /** @type {import('@playwright/test').Locator} The aspect's block. */
   const aspect = sheet.locator('.standard-aspects-tab .aspect')
      .filter({ has: page.getByText(text, { exact: true }) })
      .first();
   await aspect.locator('button').first().click();

   /**
    * Reads the stored aspect.
    * @returns {Promise<object|undefined>} The aspect, once the spell holds it.
    */
   const stored = () => page.evaluate(
      async ({ uuid, label }) => (await fromUuid(uuid)).system.aspect.find((entry) => entry.label === label),
      {
         uuid: spellUuid,
         label,
      },
   );
   await expect.poll(async () => !!(await stored()), { message: `the toggle enabled ${label}` }).toBe(true);
   if (initialValue !== undefined) {
      await selectTitanOption(page, aspect.locator('[role="combobox"]').first(), initialValue);
      await expect.poll(async () => (await stored()).initialValue, { message: 'the select stored the initial value' })
         .toBe(initialValue);
   }
   for (const option of options) {
      await aspect.getByTestId(`spell-aspect-option-${label}-${option}`).click();
      await expect.poll(async () => (await stored()).option, { message: `the toggle switched on ${option}` })
         .toContain(option);
   }
   if (resistanceCheck !== undefined) {
      await selectTitanOption(page, aspect.locator('[role="combobox"]').last(), resistanceCheck);
      await expect.poll(async () => (await stored()).resistanceCheck, { message: 'the select stored the resistance' })
         .toBe(resistanceCheck);
   }
}

/**
 * Adds a custom aspect to a spell through the Custom Aspects tab's add button.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} spellUuid - The uuid of the spell that receives the custom aspect.
 * @returns {Promise<void>} Resolves once the custom aspect is stored.
 */
export async function addCustomAspect(page, spellUuid) {
   /** @type {import('@playwright/test').Locator} The spell's sheet. */
   const sheet = await openSheetByUuid(page, spellUuid);

   /** @type {number} The number of custom aspects before the add. */
   const before = await page.evaluate(async (uuid) => (await fromUuid(uuid)).system.customAspect.length, spellUuid);
   await openTab(sheet, 'Custom Aspects');
   await sheet.getByRole('button', { name: 'Add Custom Aspect' }).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.customAspect.length, spellUuid),
      { message: 'the add button created one custom aspect' },
   ).toBe(before + 1);
}

/**
 * Creates a blank effect in an editable effect pack with the Effect Tray's create button and renames it in the sheet
 * the create opens.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} packId - The pack's collection id; the pack is an unlocked `ActiveEffect` pack.
 * @param {string} name - The name to give the effect.
 * @returns {Promise<string>} The effect's id.
 */
export async function createTrayEffect(page, packId, name) {
   await openSidebarTab(page, 'titanEffects');
   await page.locator('[data-testid="effect-tray-pack-select"]').selectOption(packId);

   /** @type {string[]} The ids the pack's index holds before the create. */
   const before = await page.evaluate(
      async (packId) => (await game.packs.get(packId).getIndex()).map((entry) => entry._id),
      packId,
   );
   await page.locator('[data-testid="effect-tray-new"]').click();

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
   }, { message: 'the tray create button created one effect in the pack' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'ActiveEffect',
      id,
      packId,
      createdBy: currentSpec(),
   });

   // The create opened the new effect's sheet; its name field renames the effect.
   /** @type {import('@playwright/test').Locator} The effect's sheet window. */
   const effectSheet = page.locator(`.application[id$="ActiveEffect-${id}"]`);
   await expect(effectSheet).toBeVisible();
   await effectSheet.locator('.document-name input').fill(name);
   await effectSheet.locator('.document-name input').blur();
   await expect.poll(
      () => page.evaluate(async ({ packId, id }) => (await game.packs.get(packId).getDocument(id)).name, {
         packId,
         id,
      }),
      { message: 'the effect sheet renamed the pack effect' },
   ).toBe(name);
   await closeWindow(effectSheet);
   return id;
}

/**
 * The prefix of every shared fixture's name; the census finds the fixtures by the `E2E ` prefix.
 * @type {string}
 */
const SHARED_PREFIX = 'E2E Shared ';

/**
 * Builds the flow of a shared world item: `createWorldItem` makes it, and the optional shaping flow adds what the
 * fixture needs (a check, a custom trait, aspects).
 * @param {string} type - The item subtype.
 * @param {string} label - The title-cased type label of the fixture's name.
 * @param {(page: import('@playwright/test').Page, uuid: string) => Promise<void>} [shape] - Extra flows.
 * @returns {(page: import('@playwright/test').Page) => Promise<string>} The fixture's flow.
 */
function sharedItem(type, label, shape) {
   return async (page) => {
      /** @type {string} The new item's id. */
      const id = await createWorldItem(page, {
         name: `${SHARED_PREFIX}${label}`,
         type,
      });
      await shape?.(page, `Item.${id}`);
      return id;
   };
}

/**
 * The number of entries in each list of the bulk fixture: abilities, checks on the equipment and rules elements on the
 * effect. Measured at the default zoom (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-3.log`): 30
 * abilities overflow the actor sheet's Abilities tab (1976 px of content in 563 px). The checks list and the rules
 * elements list were not measured.
 * @type {number}
 */
export const BULK_COUNT = 30;

/**
 * The shared fixtures a flow can build, by key. `shared` runs the flow of a key that is not on the list. Items are
 * world items; `roller`, `situationalActor` and `bulkActor` own copies. The two effects live on `effectHost`, so the
 * `player` stays free of effects and items.
 * @type {Record<string, (page: import('@playwright/test').Page) => Promise<string>>}
 */
export const SHARED_FIXTURES = {
   player: (page) => createActor(page, {
      name: `${SHARED_PREFIX}Player`,
      type: 'player',
   }),
   npc: (page) => createActor(page, {
      name: `${SHARED_PREFIX}NPC`,
      type: 'npc',
   }),
   weapon: sharedItem('weapon', 'Weapon'),
   ability: sharedItem('ability', 'Ability', (page, uuid) => addCheck(page, uuid, { label: 'E2E Shared Check' })),
   spell: sharedItem('spell', 'Spell', async (page, uuid) => {
      await addCustomTrait(page, uuid, 'Void');
      await enableAspect(page, uuid, 'range', { initialValue: 10 });
      await enableAspect(page, uuid, 'duration');
      await enableAspect(page, uuid, 'inflictCondition', {
         options: ['stunned'],
         resistanceCheck: 'resilience',
      });
   }),
   armor: sharedItem('armor', 'Armor'),
   shield: sharedItem('shield', 'Shield'),
   equipment: sharedItem('equipment', 'Equipment'),
   commodity: sharedItem('commodity', 'Commodity'),
   effectHost: (page) => createActor(page, {
      name: `${SHARED_PREFIX}Effect Host`,
      type: 'player',
   }),
   effect: async (page) => addEffect(page, await shared(page, 'effectHost'), `${SHARED_PREFIX}Effect`),
   conditionalEffect: async (page) => {
      /** @type {string} The host actor's id. */
      const hostId = await shared(page, 'effectHost');

      /** @type {string} The new effect's id. */
      const id = await addEffect(page, hostId, `${SHARED_PREFIX}Conditional Effect`, { duration: 'permanent' });
      await addRulesElement(page, `Actor.${hostId}.ActiveEffect.${id}`, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         checkType: 'any',
         selector: 'any',
         value: 1,
      });
      return id;
   },
   roller: async (page) => {
      /** @type {string} The new actor's id. */
      const id = await createActor(page, {
         name: `${SHARED_PREFIX}Roller`,
         type: 'player',
      });
      for (const key of [
         'weapon',
         'spell',
         'ability',
      ]) {
         await dragItemOntoSheet(page, await shared(page, key), id);
      }
      return id;
   },
   situationalActor: async (page) => {
      /** @type {string} The new actor's id. */
      const id = await createActor(page, {
         name: `${SHARED_PREFIX}Situational Actor`,
         type: 'player',
      });

      /** @type {string} The id of the ability that carries the rules elements. */
      const abilityId = await createOwnedItem(page, id, 'ability', 'E2E Situational Ability');

      /** @type {string} The ability's uuid. */
      const uuid = `Actor.${id}.Item.${abilityId}`;
      await addRulesElement(page, uuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         value: 2,
      });
      await addRulesElement(page, uuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'advantage',
         advantageLevel: 1,
      });
      await addRulesElement(page, uuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         selector: 'situation',
         value: 1,
      });
      return id;
   },
   bulkActor: async (page) => {
      /** @type {string} The new actor's id. */
      const id = await createActor(page, {
         name: `${SHARED_PREFIX}Bulk Actor`,
         type: 'player',
      });
      for (let index = 0; index < BULK_COUNT; index++) {
         await createOwnedItem(page, id, 'ability', `E2E Bulk Ability ${index}`);
      }

      /** @type {string} The equipment that holds the long check list. */
      const equipmentId = await createOwnedItem(page, id, 'equipment', 'E2E Bulk Equipment');
      for (let index = 0; index < BULK_COUNT; index++) {
         await addCheck(page, `Actor.${id}.Item.${equipmentId}`, { label: `E2E Bulk Check ${index}` });
      }

      /** @type {string} The effect that holds the long rules element list. */
      const effectId = await addEffect(page, id, 'E2E Bulk Effect');
      for (let index = 0; index < BULK_COUNT; index++) {
         await addRulesElement(page, `Actor.${id}.ActiveEffect.${effectId}`, {});
      }
      return id;
   },
   scene: async (page) => {
      /** @type {string} The new scene's id. */
      const id = await createScene(page, { name: `${SHARED_PREFIX}Scene` });
      await viewScene(page, id);
      return id;
   },
   trayPack: async (page) => {
      /** @type {string} The new pack's collection id. */
      const packId = await createCompendium(page, {
         label: `${SHARED_PREFIX}Tray Pack`,
         type: 'ActiveEffect',
      });
      await createTrayEffect(page, packId, 'E2E Tray Effect');
      return packId;
   },
};

/**
 * Whether a recorded document still resolves in the world.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {import('./registry.js').RegistryDocument} entry - The recorded document.
 * @returns {Promise<boolean>} True when the document exists.
 */
export async function resolves(page, entry) {
   return page.evaluate(async ({ documentName, id, parent, packId }) => {
      if (documentName === 'Compendium') {
         return game.packs.has(id);
      }
      if (packId) {
         return game.packs.get(packId)?.index.has(id) ?? false;
      }
      if (parent) {
         /** @type {foundry.abstract.Document|null} The embedding document. */
         const embedder = await fromUuid(parent);
         return embedder?.getEmbeddedCollection(documentName).has(id) ?? false;
      }
      return game.collections.get(documentName)?.has(id) ?? false;
   }, entry);
}

/**
 * Returns the id of a shared fixture: the one on the list when it still resolves, otherwise a new one made by the
 * fixture's flow and recorded under the key. Shared fixtures are never deleted mid-run, so a spec may rely on one
 * existing but not on what an earlier spec left in it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} key - The fixture name, a key of `SHARED_FIXTURES`.
 * @returns {Promise<string>} The fixture's document id.
 */
export async function shared(page, key) {
   /** @type {(page: import('@playwright/test').Page) => Promise<string>|undefined} The fixture's flow. */
   const create = SHARED_FIXTURES[key];
   if (!create) {
      throw new Error(`There is no shared fixture "${key}"; the keys are ${Object.keys(SHARED_FIXTURES).join(', ')}.`);
   }

   /** @type {import('./registry.js').RegistryDocument|undefined} The fixture's entry, when one is on the list. */
   const existing = readRegistry().documents.find((entry) => entry.key === key);
   if (existing && await resolves(page, existing)) {
      return existing.id;
   }

   /** @type {string} The id of the document the flow made, which the flow has recorded. */
   const id = await create(page);

   // A stale entry of the key (a fixture a test deleted) gives up the key, so the lookup finds the new one.
   /** @type {import('./registry.js').Registry} The list, with the flow's entry. */
   const registry = readRegistry();
   for (const entry of registry.documents) {
      if (entry.key === key) {
         delete entry.key;
      }
   }
   registry.documents.find((entry) => entry.id === id).key = key;
   writeRegistry(registry);
   return id;
}

/**
 * Returns the uuid of a shared fixture (see `shared`), for opening its sheet or reading it with `fromUuid`.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} key - The fixture name, a key of `SHARED_FIXTURES`.
 * @returns {Promise<string>} The fixture's uuid.
 */
export async function sharedUuid(page, key) {
   /** @type {string} The fixture's document id. */
   const id = await shared(page, key);

   /** @type {import('./registry.js').RegistryDocument} The fixture's entry on the list. */
   const entry = readRegistry().documents.find((candidate) => candidate.key === key && candidate.id === id);
   if (entry.documentName === 'Compendium') {
      return `Compendium.${entry.id}`;
   }
   if (entry.packId) {
      return `Compendium.${entry.packId}.${entry.documentName}.${entry.id}`;
   }
   if (entry.parent) {
      return `${entry.parent}.${entry.documentName}.${entry.id}`;
   }
   return `${entry.documentName}.${entry.id}`;
}
