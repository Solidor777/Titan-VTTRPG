import path from 'node:path';
import { expect, test } from './harness.js';
import { clickSheetTab, clickTabButton, commitText } from './actions.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { openSheetByUuid } from './fixtures.js';
import { readRegistry, record, writeRegistry } from './registry.js';
import { selectTitanOption } from './select.js';
import { settle } from './settle.js';
import { closeAllApps, showChatLog } from './world.js';

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
 * Creates a document of the directory's kind through the directory's Create button and the core creation dialog. A
 * document made for a folder uses that folder's own Create button, which creates it inside the folder.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} tab - The sidebar tab of the directory (`actors`, `items`, `scenes`).
 * @param {string} name - The new document's name.
 * @param {string} [type] - The document subtype to choose in the dialog; omitted for kinds with no subtype.
 * @param {string} [folderId] - The id of the folder that receives the document; omitted for the directory root.
 * @returns {Promise<string>} The id of the new document, read from its directory entry.
 */
async function createFromDirectory(page, tab, name, type, folderId) {
   /** @type {import('@playwright/test').Locator} The directory's panel. */
   const panel = await openSidebarTab(page, tab);
   await (folderId === undefined
      ? panel.locator('header.directory-header [data-action="createEntry"]')
      : panel.locator(`.directory-item.folder[data-folder-id="${folderId}"] > header [data-action="createEntry"]`))
      .click();

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
 * @param {string} [options.folderId] - The id of an Actor folder to create the actor in.
 * @returns {Promise<string>} The actor's id.
 */
export async function createActor(page, { name, type, folderId }) {
   /** @type {string} The new actor's id. */
   const id = await createFromDirectory(page, 'actors', name, type, folderId);
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
 * @param {string} [options.folderId] - The id of an Item folder to create the item in.
 * @returns {Promise<string>} The item's id.
 */
export async function createWorldItem(page, { name, type, folderId }) {
   /** @type {string} The new item's id. */
   const id = await createFromDirectory(page, 'items', name, type, folderId);
   record({
      documentName: 'Item',
      id,
      createdBy: currentSpec(),
   });
   return id;
}

/**
 * Creates a folder in a document directory through the directory's Create Folder button and the folder configuration
 * window.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} tab - The sidebar tab of the directory (`actors`, `items`).
 * @param {string} name - The folder's name; it starts with `E2E ` so the census finds the folder.
 * @returns {Promise<string>} The folder's id, read from its directory entry.
 */
export async function createFolder(page, tab, name) {
   /** @type {import('@playwright/test').Locator} The directory's panel. */
   const panel = await openSidebarTab(page, tab);
   await panel.locator('header.directory-header [data-action="createFolder"]').click();

   /** @type {import('@playwright/test').Locator} The folder configuration window. */
   const config = page.locator('.application.folder-config');
   await config.locator('input[name="name"]').fill(name);
   await config.locator('button[type="submit"]').click();
   await expect(config).toHaveCount(0);

   /** @type {import('@playwright/test').Locator} The directory entry of the new folder. */
   const entry = panel.locator('.directory-item.folder', {
      has: page.locator('header .folder-name', { hasText: exactText(name) }),
   });
   await expect(entry).toHaveCount(1);

   /** @type {string} The new folder's id. */
   const id = await entry.getAttribute('data-folder-id');
   record({
      documentName: 'Folder',
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
 * @returns {Promise<void>} Resolves once the tab is the active one.
 */
async function openTab(sheet, label) {
   await clickSheetTab(sheet, label);
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

   // The new row slides in (`transition:slide`); its Edit Item button is clicked next, so the slide must end first.
   await settle(page, { transitions: true });
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
   await commitText(itemSheet.locator('.document-name input'), name);
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
      { timeout: 1000 },
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
   // An open action-menu cascade consumes the first Escape (it closes the cascade and leaves control alone).
   /** @type {import('@playwright/test').Locator} The action-menu category buttons that hold an open cascade. */
   const openCascade = page.locator('[data-testid^="player-hud-category-"].active');
   if (await openCascade.count() > 0) {
      await page.keyboard.press('Escape');
      await expect(openCascade, 'the Escape key closed the open cascade').toHaveCount(0);
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
   await settle(page);
   return !linked;
}

/**
 * Closes the open windows, releases control of every token and moves the pointer onto a placed token the way a user
 * does: the canvas processes a click only on a hovered token, and a pointer that has rested where the token appeared
 * (the drop of the placing drag) raises no hover. The chat tab is made the active sidebar tab first: while another tab
 * is active, a posted chat message shows as a card over the canvas for 5 s (`ChatLog.NOTIFY_DURATION`), and the card
 * takes the pointer from a token under it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @returns {Promise<{x: number, y: number}>} The token's centre in client (page) coordinates.
 */
async function hoverToken(page, tokenId) {
   await closeAllApps(page);
   await showChatLog(page);
   await releaseTokenControl(page);

   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await page.evaluate((tokenId) => {
      const token = canvas.scene.tokens.get(tokenId).object;
      return canvas.clientCoordinatesFromCanvas(token.center);
   }, tokenId);
   await restOnToken(page, tokenId, centre);
   return centre;
}

/**
 * Moves the pointer onto a placed token from outside it and waits until the canvas shows the token hovered and its
 * last press is older than the double-click time. A token's
 * interaction manager handles a pointer-down only from its HOVER state on (read: `#handleLeftDown` and
 * `#handleRightDown`, `client/canvas/interaction/mouse-handler.mjs:474-475` and `565-566`, Foundry 14.364 at
 * `C:\FoundryVTT\V14\dev\foundry`), so the pointer re-enters the token whenever it has been elsewhere.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {{x: number, y: number}} centre - The token's centre in client (page) coordinates.
 * @returns {Promise<void>} Resolves once the token is hovered and a press on it is a single click.
 */
async function restOnToken(page, tokenId, centre) {
   await page.mouse.move(centre.x + 200, centre.y);
   await page.mouse.move(centre.x, centre.y, { steps: 5 });
   await expect.poll(
      () => page.evaluate((tokenId) => canvas.scene.tokens.get(tokenId).object.hover, tokenId),
      { message: 'the pointer hovers the token' },
   ).toBe(true);

   // The token's interaction manager reads a left or right press within `DOUBLE_CLICK_TIME_MS` of its last press, and
   // within `DOUBLE_CLICK_DISTANCE_PX` of where it was, as a double click (read: `#isDoubleClick`,
   // `client/canvas/interaction/mouse-handler.mjs:905-913`, Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`). The
   // double click opens the token's sheet and the single click's work (control, the HUD) does not run, so a press
   // that follows an earlier press on the token too soon is held back until that press is old enough.
   await page.evaluate(async (tokenId) => {
      /** @type {foundry.canvas.interaction.MouseInteractionManager} The token's interaction manager. */
      const manager = canvas.scene.tokens.get(tokenId).object.mouseInteractionManager;
      await titanWait(
         () => globalThis.performance.now() - Math.max(manager.lcTime, manager.rcTime)
            > foundry.canvas.interaction.MouseInteractionManager.DOUBLE_CLICK_TIME_MS,
         { message: 'the token\'s last press is older than the double-click time' },
      );
   }, tokenId);
}

/**
 * Takes control of a placed token with a click on it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @returns {Promise<void>} Resolves once the token is the only controlled token.
 */
export async function controlPlacedToken(page, tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId);
   await page.mouse.click(centre.x, centre.y);
   await expect.poll(
      () => page.evaluate(() => canvas.tokens.controlled.map((token) => token.id)),
      { message: 'the click took control of the token' },
   ).toEqual([tokenId]);
}

/**
 * Reads the ids of the tokens the logged-in user targets.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @returns {Promise<string[]>} The ids of the targeted tokens, in the order they were targeted.
 */
export async function targetedTokenIds(page) {
   return page.evaluate(() => [...game.user.targets].map((token) => token.id));
}

/**
 * Targets a placed token with core's Target key (T) while the pointer hovers it; Shift+T adds to the current targets
 * instead of replacing them. `game.user.targets` then holds the real Token object.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {object} [options] - Targeting options.
 * @param {boolean} [options.add] - Whether to keep the other targets.
 * @returns {Promise<void>} Resolves once the token is targeted.
 */
export async function targetPlacedToken(page, tokenId, { add = false } = {}) {
   await hoverToken(page, tokenId);
   await page.keyboard.press(add ? 'Shift+KeyT' : 'KeyT');
   await expect.poll(
      () => targetedTokenIds(page),
      { message: 'the Target key targeted the token' },
   ).toContain(tokenId);
}

/**
 * Releases every target with the Target key, one hovered token at a time.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the targeted tokens' scene.
 * @returns {Promise<void>} Resolves once the user targets no token.
 */
export async function releaseTargets(page) {
   for (const tokenId of await targetedTokenIds(page)) {
      await hoverToken(page, tokenId);
      await page.keyboard.press('KeyT');
      await expect.poll(
         () => targetedTokenIds(page),
         { message: 'the Target key released the token' },
      ).not.toContain(tokenId);
   }
}

/**
 * Turns a condition on or off through the token HUD: a right click on the hovered token opens the HUD, its Status
 * Effects palette lists every condition, and a click on a condition's control toggles it on the token's actor. A
 * left click on the token closes the HUD again and leaves the token controlled.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {string} statusId - The condition's status id (`blinded`, `offBalance`, ...).
 * @param {boolean} active - Whether the condition is on after the click.
 * @returns {Promise<void>} Resolves once the token's actor shows the requested state and the HUD is closed.
 */
async function toggleCondition(page, tokenId, statusId, active) {
   /**
    * Reads whether the token's actor carries the condition.
    * @returns {Promise<boolean>} True when the actor's statuses hold the condition.
    */
   const isActive = () => page.evaluate(
      ({ tokenId, statusId }) => canvas.scene.tokens.get(tokenId).actor.statuses.has(statusId),
      {
         tokenId,
         statusId,
      },
   );
   expect(await isActive(), `the condition ${statusId} is ${active ? 'off' : 'on'} before the click`).toBe(!active);

   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId);
   await page.mouse.click(centre.x, centre.y, { button: 'right' });

   /** @type {import('@playwright/test').Locator} The token HUD. */
   const hud = page.locator('#token-hud');
   await expect(hud).toBeVisible();
   await hud.locator('[data-action="togglePalette"][data-palette="effects"]').click();
   await hud.locator(`.effect-control[data-status-id="${statusId}"]`).click();
   await expect.poll(isActive, { message: `the HUD turned ${statusId} ${active ? 'on' : 'off'}` }).toBe(active);
   await settle(page);

   // A left click on the token closes the HUD (read: `PlaceableObject#_onClickLeft`, `placeable-object.mjs:1220`) and
   // leaves the token controlled. The pointer is on the HUD's palette, so it re-enters the token before the click.
   await restOnToken(page, tokenId, centre);
   await page.mouse.click(centre.x, centre.y);
   await expect(hud).toBeHidden();
}

/**
 * Turns a condition on for a placed token's actor through the token HUD.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {string} statusId - The condition's status id (`blinded`, `offBalance`, ...).
 * @returns {Promise<void>} Resolves once the token's actor carries the condition.
 */
export async function applyCondition(page, tokenId, statusId) {
   await toggleCondition(page, tokenId, statusId, true);
}

/**
 * Turns a condition off for a placed token's actor through the token HUD.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {string} statusId - The condition's status id (`blinded`, `offBalance`, ...).
 * @returns {Promise<void>} Resolves once the token's actor no longer carries the condition.
 */
export async function removeCondition(page, tokenId, statusId) {
   await toggleCondition(page, tokenId, statusId, false);
}

/**
 * Unlinks a placed token with the Unlink button in the header of its actor's sheet, which the double-click on the
 * token opened. The unlink is irreversible: the sheet closes and the token's own synthetic actor's sheet opens.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The linked token on the viewed scene.
 * @returns {Promise<void>} Resolves once the synthetic actor's sheet is open.
 */
export async function unlinkPlacedToken(page, tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId);
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
   await settle(page);
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
   await settle(page);
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

   // The address bar's Enter browses the directory and re-renders the file list (read: core `FilePicker#browse`), which
   // drops a file selected before it finishes, so the old list is marked and the pick waits for the marker to go.
   /** @type {import('@playwright/test').Locator} The picker's file list, marked until the browse replaces it. */
   const staleList = picker.locator('section.body[data-stale]');
   await picker.locator('section.body').evaluate((element) => {
      element.dataset.stale = 'true';
   });
   await expect(staleList, 'the file list is marked before the browse').toHaveCount(1);
   await address.press('Enter');
   await expect(staleList, 'the browse replaced the file list').toHaveCount(0);
   await picker.locator(`[data-action="pickFile"][data-name="${fileName}"]`).click();
   await picker.locator('button[type="submit"]').click();
   await expect(picker).toHaveCount(0);
   await settle(page);
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
   await settle(page);
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

   // The new row slides in (`transition:slide`); its Edit Item button is clicked next, so the slide must end first.
   await settle(page, { transitions: true });
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
   await commitText(effectSheet.locator('.document-name input'), name);
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
 * @param {number} [fields.resolveCost] - Value typed into the row's Resolve Cost input.
 * @param {string} [fields.resistanceCheck] - Resistance chosen in the row's Resistance Check select.
 * @param {boolean} [fields.opposed] - Whether to tick the row's Opposed Check box.
 * @param {boolean} [fields.isDamage] - Whether to tick the row's Damage box.
 * @param {number} [fields.initialValue] - Value typed into the Initial Value input the Damage box shows.
 * @param {string} [fields.damageReducedBy] - Option chosen in the Damage Reduced By select the Damage box shows.
 * @returns {Promise<void>} Resolves once the check is stored with its fields.
 */
export async function addCheck(
   page,
   documentUuid,
   { label, resolveCost, resistanceCheck, opposed, isDamage, initialValue, damageReducedBy } = {},
) {
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
   await settle(page);

   /**
    * Reads one field of the new check.
    * @param {string} field - The check field.
    * @returns {Promise<*>} The stored value.
    */
   const stored = (field) => page.evaluate(
      async ({ uuid, index, field }) => (await fromUuid(uuid)).system.check[index][field],
      {
         uuid: documentUuid,
         index: before,
         field,
      },
   );

   /** @type {import('@playwright/test').Locator} Every check row of the sheet. */
   const rows = sheet.locator('.check').filter({ has: page.locator('.header .label input') });
   /** @type {import('@playwright/test').Locator} The new check's row. */
   const row = rows.nth(before);

   // Waits until the sheet shows one row per stored check before the new row is edited.
   await expect(rows, 'the sheet rendered a row for every stored check').toHaveCount(before + 1);
   await settle(page, { transitions: true });
   if (label !== undefined) {
      /** @type {import('@playwright/test').Locator} The new row's label input. */
      const input = row.locator('.header .label input');
      await commitText(input, label);
      await expect.poll(() => stored('label'), { message: 'the label input stored the check label' }).toBe(label);
   }

   // The row's other settings sit in its expandable content, which mounts expanded.
   /**
    * Finds a field of the new row by its label.
    * @param {string} text - The field's label.
    * @returns {import('@playwright/test').Locator} The field's element.
    */
   const field = (text) => row.locator('.field').filter({ has: page.getByText(text, { exact: true }) }).first();
   if (resolveCost !== undefined) {
      /** @type {import('@playwright/test').Locator} The Resolve Cost input. */
      const input = field('Resolve Cost').locator('input');
      await commitText(input, String(resolveCost));
      await expect.poll(() => stored('resolveCost'), { message: 'the input stored the resolve cost' })
         .toBe(resolveCost);
   }
   if (resistanceCheck !== undefined) {
      await selectTitanOption(page, field('Resistance Check').locator('[role="combobox"]'), resistanceCheck);
      await expect.poll(() => stored('resistanceCheck'), { message: 'the select stored the resistance check' })
         .toBe(resistanceCheck);
   }
   if (opposed) {
      await field('Opposed Check').locator('button').click();
      await expect.poll(async () => (await stored('opposedCheck')).enabled, {
         message: 'the checkbox enabled the opposed check',
      }).toBe(true);
   }
   if (isDamage) {
      // The Damage field moves while the rows above it slide in; a click on a moving field retries until it stops.
      await settle(page, { transitions: true });
      await field('Damage').locator('button').click();
      await expect.poll(() => stored('isDamage'), { message: 'the checkbox ticked Damage' }).toBe(true);
   }
   if (initialValue !== undefined) {
      await commitText(field('Initial Value').locator('input'), String(initialValue));
      await expect.poll(() => stored('initialValue'), { message: 'the input stored the initial value' })
         .toBe(initialValue);
   }
   if (damageReducedBy !== undefined) {
      await selectTitanOption(page, field('Damage Reduced By').locator('[role="combobox"]'), damageReducedBy);
      await expect.poll(() => stored('damageReducedBy'), { message: 'the select stored Damage Reduced By' })
         .toBe(damageReducedBy);
   }
}

/**
 * Adds a rules element to a document that carries them (an item or an effect) through the Rules Elements tab's
 * add button and fills the new row's controls. A new row is a flat modifier; any other operation is chosen in the
 * row's operation select first. The operation settings are filled in the order their controls depend on each other (a
 * selector change resets the key, so the selector comes first).
 *
 * The settings row of a flat modifier, Multiply Base, Multiply Sum and Set Sum holds the selector, the key (a select
 * of the stats the selector names), the value input and, for the last three, the rounding or mode select; that of a
 * conditional rating modifier holds the rating, the selector and the key; that of a conditional check modifier holds
 * the modifier type, the check type, the selector, the key (a text input or a select, only when the selector is not
 * `any`), the Skill narrowing of a situation and the value.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} documentUuid - The uuid of the item or effect.
 * @param {object} element - What the row holds.
 * @param {string} [element.operation] - The operation (`conditionalCheckModifier`, `flatModifier`, ...).
 * @param {string} [element.modifierType] - A conditional check modifier's modifier type.
 * @param {string} [element.checkType] - A conditional check modifier's check type.
 * @param {string} [element.rating] - A conditional rating modifier's rating.
 * @param {string} [element.selector] - The selector of the element.
 * @param {string} [element.key] - The key of the element: chosen in a select or typed into a text input.
 * @param {string} [element.skill] - A conditional check modifier situation's Skill narrowing.
 * @param {number} [element.advantageLevel] - A conditional Advantage modifier's level (`-2`, `-1`, `1`, `2`).
 * @param {number} [element.value] - The value input of a modifier that has one.
 * @param {string} [element.rounding] - The rounding direction of a Multiply Base or Multiply Sum element.
 * @param {string} [element.mode] - The mode of a Set Sum element (`set`, `min`, `max`).
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
   await settle(page, { transitions: true });

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

   /** @type {import('@playwright/test').Locator} The select and text fields of the operation settings, in order. */
   const fields = row.locator('.operation-settings .field.select');

   /**
    * Fills a settings field that is a select or a text input, then waits until the element stores the value.
    * @param {number} position - The field's position among the settings' select fields.
    * @param {string} field - The stored element field the control writes.
    * @param {string} value - The value to choose or type.
    * @returns {Promise<void>} Resolves once the element stores the value.
    */
   const fill = async (position, field, value) => {
      /** @type {import('@playwright/test').Locator} The settings field. */
      const control = fields.nth(position);
      if (await control.locator('input').count() > 0) {
         await commitText(control.locator('input'), value);
      }
      else {
         await selectTitanOption(page, control.locator('[role="combobox"]'), value);
      }
      await expect.poll(() => stored(field), { message: `the control stored ${field}` }).toBe(value);
   };

   if (element.operation === 'conditionalCheckModifier') {
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

      // The key field follows the modifier type, the check type and the selector, and exists only for a selector other
      // than `any`.
      if (element.key !== undefined) {
         await fill(3, 'key', element.key);
      }
      if (element.skill !== undefined) {
         await selectTitanOption(page, row.getByTestId('ccm-situation-skill'), element.skill);
         await expect.poll(() => stored('skill'), { message: 'the Skill narrowing stored the Skill' })
            .toBe(element.skill);
      }
   }
   else if (element.operation === 'conditionalRatingModifier') {
      for (const [position, field] of [
         [
            0,
            'rating',
         ],
         [
            1,
            'selector',
         ],
         [
            2,
            'key',
         ],
      ]) {
         if (element[field] !== undefined) {
            await fill(position, field, element[field]);
         }
      }
   }
   else {
      // A flat modifier, Multiply Base, Multiply Sum or Set Sum: the selector, the key, and the select after the value.
      for (const [position, field] of [
         [
            0,
            'selector',
         ],
         [
            1,
            'key',
         ],
         [
            2,
            element.operation === 'setSum' ? 'mode' : 'rounding',
         ],
      ]) {
         if (element[field] !== undefined) {
            await fill(position, field, element[field]);
         }
      }
   }
   if (element.advantageLevel !== undefined) {
      await selectTitanOption(page, row.getByTestId('ccm-advantage-level'), element.advantageLevel);
      await expect.poll(() => stored('value'), { message: 'the level select stored the Advantage level' })
         .toBe(element.advantageLevel);
   }
   if (element.value !== undefined) {
      /** @type {import('@playwright/test').Locator} The value input. */
      const input = element.operation === 'conditionalCheckModifier'
         ? row.getByTestId('ccm-value')
         : row.locator('.operation-settings .field.number input');

      // A number input reads an entry that starts with an operator as a change to its current value (`-1` on 1 is 0),
      // so a negative value is typed in parentheses.
      await commitText(input, element.value < 0 ? `(${element.value})` : String(element.value));
      await expect.poll(() => stored('value'), { message: 'the value input stored the value' }).toBe(element.value);
   }
}

/**
 * Adds a custom trait to an item or effect through the sidebar's Add Custom Trait button and its dialog.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} documentUuid - The uuid of the item or effect that receives the trait.
 * @param {string} name - Text typed into the dialog's name input.
 * @param {string} [description] - Text typed into the dialog's description area.
 * @returns {Promise<void>} Resolves once the trait is stored.
 */
export async function addCustomTrait(page, documentUuid, name, description) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);
   await sheet.getByText('Add Custom Trait', { exact: true }).first().click();

   /** @type {import('@playwright/test').Locator} The Add Custom Trait dialog. */
   const dialog = page.locator('.titan-add-custom-item-trait-dialog');
   await expect(dialog).toBeVisible();
   await dialog.locator('input').first().fill(name);
   if (description !== undefined) {
      await dialog.locator('textarea').fill(description);
   }
   await dialog.locator('.buttons .button button').first().click();
   await expect(dialog).toHaveCount(0);
   await expect.poll(
      () => page.evaluate(
         async (uuid) => (await fromUuid(uuid)).system.customTrait.map((trait) => trait.name),
         documentUuid,
      ),
      { message: 'the dialog stored the custom trait' },
   ).toContain(name);
   await settle(page);
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
   await expect(sheet.locator('li.reorder-row'), 'the Attacks tab rendered the new row').toHaveCount(before + 1);
   await settle(page, { transitions: true });
}

/**
 * Adds a trait to a weapon attack, an armor or a shield through the sheet's Edit Traits button and its dialog.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} documentUuid - The uuid of the weapon, armor or shield.
 * @param {string} label - The trait's label in the dialog (`Penetrating`, `Heavy`, ...).
 * @param {object} [options] - Which trait list the dialog edits.
 * @param {number} [options.attackIndex] - The position of the weapon attack whose traits are edited.
 * @returns {Promise<void>} Resolves once the document stores the trait.
 */
export async function addTrait(page, documentUuid, label, { attackIndex } = {}) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);

   /**
    * Counts the traits of the list the dialog edits.
    * @returns {Promise<number>} The number of stored traits.
    */
   const count = () => page.evaluate(
      async ({ uuid, attackIndex }) => {
         /** @type {TitanItem} The weapon, armor or shield. */
         const item = await fromUuid(uuid);
         return (attackIndex === undefined ? item.system.trait : item.system.attack[attackIndex].trait).length;
      },
      {
         uuid: documentUuid,
         attackIndex,
      },
   );

   /** @type {number} The number of traits before the dialog. */
   const before = await count();

   /** @type {import('@playwright/test').Locator} The part of the sheet that holds the Edit Traits button. */
   let scope = sheet;
   if (attackIndex !== undefined) {
      await openTab(sheet, 'Attacks');
      scope = sheet.locator('.traits:has(.traits-header)').nth(attackIndex);
   }
   await scope.getByText('Edit Traits', { exact: true }).first().click();

   /** @type {import('@playwright/test').Locator} The Edit Traits dialog. */
   const dialog = page.locator('.application.titan-dialog', { has: page.getByRole('button', { name: 'Apply Edits' }) });
   await expect(dialog, 'the Edit Traits dialog opens').toBeVisible();
   await dialog.locator('li', { has: page.getByText(label, { exact: true }) }).locator('button').click();
   await dialog.getByRole('button', { name: 'Apply Edits' }).click();
   await expect(dialog, 'Apply Edits closes the dialog').toHaveCount(0);
   await expect.poll(count, { message: `the dialog stored the ${label} trait` }).toBe(before + 1);
   await settle(page);
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
   await settle(page);
   if (initialValue !== undefined) {
      await selectTitanOption(page, aspect.locator('[role="combobox"]').first(), initialValue);
      await expect.poll(async () => (await stored()).initialValue, { message: 'the select stored the initial value' })
         .toBe(initialValue);
   }
   for (const option of options) {
      await aspect.getByTestId(`spell-aspect-option-${label}-${option}`).click();
      await expect.poll(async () => (await stored()).option, { message: `the toggle switched on ${option}` })
         .toContain(option);
      await settle(page);
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
   await expect(sheet.locator('li.reorder-row'), 'the Custom Aspects tab rendered the new row').toHaveCount(before + 1);
   await settle(page, { transitions: true });
}

/**
 * Types an Attribute's base value into the actor sheet's header.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the character.
 * @param {string} attribute - The Attribute (`body`, `mind` or `soul`).
 * @param {number} value - The base value to type.
 * @returns {Promise<void>} Resolves once the actor stores the value.
 */
export async function setAttributeBase(page, actorUuid, attribute, value) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);

   // The Attribute's container holds its check button (classed with the Attribute) and the base and static inputs.
   /** @type {import('@playwright/test').Locator} The Attribute's base value input. */
   const input = sheet.locator(`.container:has(> .button > button.${attribute}) .stats input`).first();
   await commitText(input, value);
   await expect.poll(
      async () => page.evaluate(
         async ({ uuid, attribute }) => (await fromUuid(uuid)).system.attribute[attribute].baseValue,
         {
            uuid: actorUuid,
            attribute,
         },
      ),
      { message: `the sheet input stored the ${attribute} base value` },
   ).toBe(value);
   await settle(page);
}

/**
 * Types a Skill's Training base value into the actor sheet's Skills tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the character.
 * @param {string} skill - The Skill key (`dexterity`, `meleeWeapons`, ...).
 * @param {number} value - The Training base value to type.
 * @returns {Promise<void>} Resolves once the actor stores the value.
 */
export async function setSkillTraining(page, actorUuid, skill, value) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await openTab(sheet, 'Skills');

   /** @type {string} The Skill's localized name, which its row's check button shows. */
   const label = await page.evaluate((skill) => game.i18n.localize(`LOCAL.${skill}.text`), skill);

   // The row's first stat is Training: its first input is the base value, its second the static modifier.
   /** @type {import('@playwright/test').Locator} The Skill's row. */
   const row = sheet.locator('.skill', {
      has: page.locator('.check-button .label', { hasText: new RegExp(`^\\s*${RegExp.escape(label)}\\s*$`) }),
   });
   await commitText(row.locator('.stats .stat').first().locator('input').first(), value);
   await expect.poll(
      async () => page.evaluate(
         async ({ uuid, skill }) => (await fromUuid(uuid)).system.skill[skill].training.baseValue,
         {
            uuid: actorUuid,
            skill,
         },
      ),
      { message: `the sheet input stored the ${skill} Training base value` },
   ).toBe(value);
   await settle(page);
}

/**
 * Chooses the attribute a skill defaults to with the select in the skill's row of the Skills tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the actor.
 * @param {string} skill - The skill key (`athletics`, `meleeWeapons`, ...).
 * @param {string} attribute - The attribute key to choose (`body`, `mind`, `soul`).
 * @returns {Promise<void>} Resolves once the actor stores the attribute.
 */
export async function setSkillDefaultAttribute(page, actorUuid, skill, attribute) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await openTab(sheet, 'Skills');

   /** @type {string} The Skill's localized name, which its row's check button shows. */
   const label = await page.evaluate((skill) => game.i18n.localize(`LOCAL.${skill}.text`), skill);

   /** @type {import('@playwright/test').Locator} The Skill's row. */
   const row = sheet.locator('.skill', {
      has: page.locator('.check-button .label', { hasText: new RegExp(`^\\s*${RegExp.escape(label)}\\s*$`) }),
   });
   await selectTitanOption(page, row.locator('.attribute [role="combobox"]'), attribute);
   await expect.poll(
      async () => page.evaluate(
         async ({ uuid, skill }) => (await fromUuid(uuid)).system.skill[skill].defaultAttribute,
         {
            uuid: actorUuid,
            skill,
         },
      ),
      { message: `the row's select stored the ${skill} default attribute` },
   ).toBe(attribute);
   await settle(page);
}

/**
 * Sets whether an owned weapon, armor or shield is equipped with the Equipped toggle of its row in the Inventory tab,
 * clicking only when the state differs.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the actor that owns the item.
 * @param {string} itemId - The id of the owned item.
 * @param {boolean} equipped - The state to leave the item in.
 * @returns {Promise<void>} Resolves once the actor shows the state.
 */
export async function setEquipped(page, actorId, itemId, equipped) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
   await openTab(sheet, 'Inventory');
   await settle(page, { transitions: true });

   /**
    * Reads whether the item is equipped: armor and shield equip into an actor slot, the others set their own flag.
    * @returns {Promise<boolean>} True when it is.
    */
   const read = () => page.evaluate(({ actorId, itemId }) => {
      /** @type {Item} The owned item. */
      const item = game.actors.get(actorId).items.get(itemId);
      return item.type === 'armor' || item.type === 'shield'
         ? item.parent.system.equipped[item.type] === item.id
         : item.system.equipped;
   }, {
      actorId,
      itemId,
   });
   if (await read() !== equipped) {
      await sheet.locator(`[data-item-id="${itemId}"]`).getByRole('button', { name: 'Equipped' }).first().click();
   }
   await expect.poll(read, { message: `the Equipped toggle left the item ${equipped ? '' : 'un'}equipped` })
      .toBe(equipped);
   await settle(page);
}

/**
 * Deletes an attack of a weapon with the delete button of its row in the weapon sheet's Attacks tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {number} [index] - The position of the attack.
 * @returns {Promise<void>} Resolves once the weapon has one attack fewer.
 */
export async function deleteAttack(page, weaponUuid, index = 0) {
   /** @type {import('@playwright/test').Locator} The weapon's sheet. */
   const sheet = await openSheetByUuid(page, weaponUuid);

   /** @type {number} The number of attacks before the delete. */
   const before = await page.evaluate(async (uuid) => (await fromUuid(uuid)).system.attack.length, weaponUuid);
   await openTab(sheet, 'Attacks');
   await settle(page, { transitions: true });
   await sheet.locator('li.reorder-row').nth(index).getByRole('button', {
      name: 'Delete',
      exact: true,
   }).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.attack.length, weaponUuid),
      { message: 'the delete button removed the attack' },
   ).toBe(before - 1);
   await settle(page, { transitions: true });
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
   await settle(page);
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
   await commitText(effectSheet.locator('.document-name input'), name);
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
 * Types a description into the rich text editor of a document's sheet and saves it with the editor's save button.
 * The editor is on the sheet's first tab (an item's Description tab, an effect's sheet).
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} documentUuid - The uuid of the item or effect.
 * @param {string} text - The text to type; an `@UUID[...]{label}` link in it is enriched when the editor shows it.
 * @returns {Promise<import('@playwright/test').Locator>} The editor element, showing the saved description.
 */
export async function setDescription(page, documentUuid, text) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);
   await clickTabButton(sheet.locator('.tab-list button').first());

   /** @type {import('@playwright/test').Locator} The description editor element. */
   const editor = sheet.locator('prose-mirror');
   await editor.hover();
   await editor.locator('button.toggle').click();
   await editor.locator('[contenteditable="true"]').click();
   await page.keyboard.type(text);
   await editor.locator('[data-action="save"]').click();
   await expect(editor, 'the editor shows the saved description').toHaveClass(/inactive/);
   await settle(page);
   return editor;
}

/**
 * Takes control of several placed tokens with the canvas's selection rectangle: a pointer drag across empty canvas
 * controls every token inside the rectangle. The tokens must sit next to each other with no other token between them.
 * Control by Shift-click is not used: while one token is controlled, a second token on a scene with token vision is
 * not visible to the pointer (measured, see `placeToken`).
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the tokens' scene.
 * @param {string[]} tokenIds - The tokens to control.
 * @returns {Promise<void>} Resolves once exactly those tokens are controlled.
 */
export async function controlPlacedTokens(page, tokenIds) {
   await closeAllApps(page);
   await releaseTokenControl(page);

   /**
    * The rectangle around the tokens in client (page) coordinates, half a grid cell wider than the tokens.
    * @type {{left: number, top: number, right: number, bottom: number}}
    */
   const area = await page.evaluate((tokenIds) => {
      /** @type {number} Half of a grid cell in client pixels. */
      const margin = canvas.grid.size * canvas.stage.scale.x / 2;
      const corners = tokenIds.map((id) => {
         const bounds = canvas.scene.tokens.get(id).object.bounds;
         return {
            min: canvas.clientCoordinatesFromCanvas({
               x: bounds.left,
               y: bounds.top,
            }),
            max: canvas.clientCoordinatesFromCanvas({
               x: bounds.right,
               y: bounds.bottom,
            }),
         };
      });
      return {
         left: Math.min(...corners.map((corner) => corner.min.x)) - margin,
         top: Math.min(...corners.map((corner) => corner.min.y)) - margin,
         right: Math.max(...corners.map((corner) => corner.max.x)) + margin,
         bottom: Math.max(...corners.map((corner) => corner.max.y)) + margin,
      };
   }, tokenIds);
   await page.mouse.move(area.left, area.top);
   await page.mouse.down();
   await page.mouse.move(area.right, area.bottom, { steps: 8 });
   await page.mouse.up();
   await expect.poll(
      () => page.evaluate(() => canvas.tokens.controlled.map((token) => token.id).sort()),
      { message: 'the selection rectangle controlled exactly the tokens' },
   ).toEqual([...tokenIds].sort());
}

/**
 * The numeric values of the ownership levels the Configure Ownership window offers.
 * @type {Record<string, number>}
 */
const OWNERSHIP_LEVELS = {
   NONE: 0,
   LIMITED: 1,
   OBSERVER: 2,
   OWNER: 3,
};

/**
 * Sets one user's ownership level of a world actor in the Configure Ownership window the actor's directory entry opens.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} actorId - The world actor.
 * @param {string} userName - The display name of the user.
 * @param {'NONE'|'LIMITED'|'OBSERVER'|'OWNER'} level - The level to give the user.
 * @returns {Promise<void>} Resolves once the actor stores the level for the user.
 */
export async function setOwnership(page, actorId, userName, level) {
   /** @type {import('@playwright/test').Locator} The actors tab. */
   const panel = await openSidebarTab(page, 'actors');
   await panel.locator(`.directory-item.entry[data-entry-id="${actorId}"]`).click({ button: 'right' });
   await chooseContextMenuEntry(
      page,
      page.locator('#context-menu li.context-item', { hasText: exactText('Configure Ownership') }),
   );

   /** @type {import('@playwright/test').Locator} The Configure Ownership window. */
   const config = page.locator('.application.document-ownership');
   await expect(config).toBeVisible();

   /** @type {string} The id of the user whose level is set. */
   const userId = await page.evaluate((userName) => game.users.getName(userName).id, userName);
   await config.locator(`select[name="${userId}"]`).selectOption(String(OWNERSHIP_LEVELS[level]));
   await config.locator('button[type="submit"]').click();
   await expect(config).toHaveCount(0);
   await expect.poll(
      () => page.evaluate(({ actorId, userId }) => game.actors.get(actorId).ownership[userId], {
         actorId,
         userId,
      }),
      { message: `the window stored ${level} for ${userName}` },
   ).toBe(OWNERSHIP_LEVELS[level]);
   await settle(page);
}

/**
 * Creates a combat with the Combat Tracker's create button, which also makes it the active combat.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing a drawn scene.
 * @returns {Promise<string>} The combat's id.
 */
export async function createCombat(page) {
   /** @type {string[]} The ids of the combats before the create. */
   const before = await page.evaluate(() => game.combats.map((combat) => combat.id));
   await closeAllApps(page);

   /** @type {import('@playwright/test').Locator} The Combat Tracker. */
   const panel = await openSidebarTab(page, 'combat');
   await panel.locator('[data-action="createCombat"]').click();

   /** @type {string[]} The ids that appeared. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         (before) => game.combats.filter((combat) => !before.includes(combat.id)).map((combat) => combat.id),
         before,
      );
      return added.length;
   }, { message: 'the create button made one combat' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'Combat',
      id,
      createdBy: currentSpec(),
   });
   await expect.poll(
      () => page.evaluate(() => game.combat?.id),
      { message: 'the new combat is the active combat' },
   ).toBe(id);
   await settle(page);
   return id;
}

/**
 * Adds a placed token to the active combat with the Token HUD's combat button: a right click on the hovered token opens
 * the HUD, and a left click on the token closes it again.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @returns {Promise<void>} Resolves once the active combat holds a combatant for the token and the HUD is closed.
 */
export async function addCombatant(page, tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId);
   await page.mouse.click(centre.x, centre.y, { button: 'right' });

   /** @type {import('@playwright/test').Locator} The token HUD. */
   const hud = page.locator('#token-hud');
   await expect(hud).toBeVisible();
   await hud.locator('[data-action="combat"]').click();
   await expect.poll(
      () => page.evaluate(
         (tokenId) => game.combat.combatants.some((combatant) => combatant.tokenId === tokenId),
         tokenId,
      ),
      { message: 'the HUD added the token to the active combat' },
   ).toBe(true);
   await settle(page);
   await restOnToken(page, tokenId, centre);
   await page.mouse.click(centre.x, centre.y);
   await expect(hud).toBeHidden();
}

/**
 * Clicks one of the active combat's control buttons in the Combat Tracker.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} action - The button's `data-action` (`startCombat`, `endCombat`, ...).
 * @returns {Promise<void>} Resolves once the click is dispatched; the caller waits for its effect.
 */
async function clickCombatControl(page, action) {
   /** @type {import('@playwright/test').Locator} The Combat Tracker. */
   const panel = await openSidebarTab(page, 'combat');
   await panel.locator(`button.combat-control[data-action="${action}"]`).click();
}

/**
 * Starts the active combat with the Combat Tracker's Begin Combat button.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @returns {Promise<void>} Resolves once the active combat is started.
 */
export async function startCombat(page) {
   await clickCombatControl(page, 'startCombat');
   await expect.poll(
      () => page.evaluate(() => game.combat.started),
      { message: 'the Begin Combat button started the combat' },
   ).toBe(true);
   await settle(page);
}

/**
 * Ends the active combat with the Combat Tracker's End Combat button and its confirmation dialog, which deletes the
 * combat.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @returns {Promise<void>} Resolves once the combat is deleted.
 */
export async function endCombat(page) {
   /** @type {string} The id of the combat that ends. */
   const id = await page.evaluate(() => game.combat.id);
   await clickCombatControl(page, 'endCombat');
   await page.locator('dialog.application.dialog [data-action="yes"]').click();
   await expect.poll(
      () => page.evaluate((id) => game.combats.has(id), id),
      { message: 'the End Combat button deleted the combat' },
   ).toBe(false);
   await settle(page);
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
 * effect. Measured at every tested zoom with this many entries
 * (`.superpowers/sdd/test-suite-rewrite/phase-3/entry-count-measure-12.log`, local): the Abilities tab's scroll area is
 * 563 px high at 100% zoom and holds 788 px (225 px, 3.4 rows of 66 px, to scroll; the least of any zoom), the Checks
 * tab's area is 412 px and holds 4346 px, and the rules elements list's is 412 px and holds 1790 px. With 10 entries
 * the Abilities tab had 93 px (1.4 rows) to scroll at 100% zoom (`entry-count-measure-10.log`); 12 was chosen over 10
 * for the margin: 225 px (3.4 rows) against 93 px (1.4 rows) at the tightest zoom. The sidebar's sections are not bulk
 * entries: 5 sections hold 872 px in an 855 px area (17 px) at 100% zoom and more at higher zooms (the same logs,
 * `sidebar` rows).
 * @type {number}
 */
export const BULK_COUNT = 12;

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
