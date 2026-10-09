import path from 'node:path';
import { expect, test } from './harness.js';
import { DURATION_PERMANENT } from '~/system/DurationTypes.js';
import { clickSheetTab, clickTabButton, commitText } from './actions.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { openSheetByUuid } from './fixtures.js';
import { readRegistry, record, recordHotbar, writeRegistry } from './registry.js';
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
 * Reads the ids of the directory entries (documents, folders or compendium packs) that show a name. A creation
 * compares the ids before and after to tell the new entry from older entries of the same name, which a repeated
 * `beforeAll` leaves behind when a failed test restarts its worker.
 * @param {import('@playwright/test').Locator} panel - The directory's panel.
 * @param {'entry' | 'folder' | 'compendium'} kind - Whether to read document entries, folders or compendium packs.
 * @param {string} name - The name the entries show.
 * @returns {Promise<string[]>} The ids of the entries that show exactly the name.
 */
function readEntryIds(panel, kind, name) {
   /** @type {Record<string, {name: string, id: string}>} The element holding the name and the id attribute, by kind. */
   const parts = {
      entry: {
         name: '.entry-name',
         id: 'data-entry-id',
      },
      folder: {
         name: 'header .folder-name',
         id: 'data-folder-id',
      },
      compendium: {
         name: '.entry-name strong',
         id: 'data-pack',
      },
   };
   return panel.locator(`.directory-item.${kind}`).evaluateAll(
      (elements, { part, name }) => elements
         .filter((element) => {
            /** @type {Element|null} The element that holds the entry's name. */
            const label = element.querySelector(part.name);
            return label?.textContent.replace(/\s+/g, ' ').trim() === name;
         })
         .map((element) => element.getAttribute(part.id)),
      {
         part: parts[kind],
         name,
      },
   );
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
 * @param {object} recording - How the new document is recorded and awaited.
 * @param {string} recording.documentName - The document class name recorded on the running list.
 * @param {(id: string) => Promise<void>} [recording.whenCreated] - Awaited once the document is recorded and the dialog
 * is closed; the wait for what core does after the create.
 * @returns {Promise<string>} The id of the new document, read from its directory entry.
 */
async function createFromDirectory(page, tab, name, type, folderId, { documentName, whenCreated }) {
   /** @type {import('@playwright/test').Locator} The directory's panel. */
   const panel = await openSidebarTab(page, tab);

   /** @type {string[]} The ids of the entries that already show the name. */
   const known = await readEntryIds(panel, 'entry', name);
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

   // One wait per event, in the order the events happen. Page-side marks from the click on OK, in two runs of 20
   // first-scene creations with no CPU throttle (median, maximum): entry 18.5 (24) and 21.5 (27) ms, dialog gone 332.5
   // (358) and 333.5 (347) ms, canvas ready 392 (423) and 392 (408) ms; at throttle 4 the dialog went at 358 and 356.5
   // ms and the canvas was ready at 921 and 890 ms. The document is recorded as soon as its id is known, so a later
   // failed wait cannot leave it unrecorded.
   /** @type {string[]} The ids of the new entries that show the name. */
   let added = [];
   await expect.poll(async () => {
      added = (await readEntryIds(panel, 'entry', name)).filter((entryId) => !known.includes(entryId));
      return added.length;
   }, { message: `the directory shows one new entry named ${name}` }).toBe(1);

   /** @type {string} The new document's id. */
   const [id] = added;
   record({
      documentName,
      id,
      createdBy: currentSpec(),
   });
   await expect(dialog).toHaveCount(0);
   await whenCreated?.(id);
   return id;
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
   return createFromDirectory(page, 'actors', name, type, folderId, { documentName: 'Actor' });
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
   return createFromDirectory(page, 'items', name, type, folderId, { documentName: 'Item' });
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

   /** @type {string[]} The ids of the folders that already show the name. */
   const known = await readEntryIds(panel, 'folder', name);
   await config.locator('input[name="name"]').fill(name);
   await config.locator('button[type="submit"]').click();

   // The entry shows once the create resolved; the window closes after the create resolved and its close transition
   // ended, so it is checked after the folder is recorded.
   /** @type {string[]} The ids of the new folders that show the name. */
   let added = [];
   await expect.poll(async () => {
      added = (await readEntryIds(panel, 'folder', name)).filter((folderId) => !known.includes(folderId));
      return added.length;
   }, { message: `the directory shows one new folder named ${name}` }).toBe(1);

   /** @type {string} The new folder's id. */
   const [id] = added;
   record({
      documentName: 'Folder',
      id,
      createdBy: currentSpec(),
   });
   await expect(config).toHaveCount(0);
   await settle(page);
   return id;
}

/**
 * Creates a Scene through the Scenes tab. Core activates a scene created while no scene is active (read: core
 * `Scene._preCreateOperation` tests `game.scenes.active`) and the activation views and draws it, so then the flow
 * waits for the canvas to finish drawing the new scene.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {object} options - What to create.
 * @param {string} options.name - The display name; it starts with `E2E ` so the census finds the scene.
 * @returns {Promise<string>} The scene's id.
 */
export async function createScene(page, { name }) {
   /** @type {boolean} Whether a scene was active before the creation. */
   const activeBefore = await page.evaluate(() => !!game.scenes.active);

   return createFromDirectory(page, 'scenes', name, undefined, undefined, {
      documentName: 'Scene',
      whenCreated: async (sceneId) => {
         if (!activeBefore) {
            await waitForSceneDrawn(page, sceneId);
         }
      },
   });
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

   /** @type {import('@playwright/test').Locator} The Inventory tab's item-type dialog; TitanDialog suffixes its id. */
   const inventoryDialog = page.locator(`[id^="add-inventory-item-dialog-${actorId}"]`);
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
      await expect(inventoryDialog).toBeVisible();
      await selectTitanOption(page, inventoryDialog.locator('[role="combobox"]'), type);
      await inventoryDialog.getByRole('button', { name: 'Add New Item' }).click();
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
   if (type !== 'ability' && type !== 'spell') {
      await expect(inventoryDialog).toHaveCount(0);
   }

   // The new row slides in (`transition:slide`); its Edit Item button is clicked next, so the slide must end first.
   await settle(page, { transitions: true });

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
 * Waits at most 1000 ms for the canvas to finish drawing a scene, on core's `canvasReady` hook. In 20 first-scene
 * creations each at CPU throttle 4, a frame-aligned wait and a 50 ms polling wait first saw the finished state a
 * median of 358.5 and 364.5 ms after the hook ran (median of the per-creation differences), and 2 of the 20
 * frame-aligned waits lasted longer than 1000 ms; the wait on the hook ended a median of 47 ms after the hook
 * (maximum 51 ms) and the longest of its 20 waits lasted 552 ms. The lag is the same for both polling intervals, so
 * it is not the interval; that a main thread busy after the hook causes it is inferred, not measured.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} sceneId - The scene being drawn.
 * @returns {Promise<void>} Resolves once the scene is drawn.
 */
async function waitForSceneDrawn(page, sceneId) {
   await page.evaluate(
      ({ sceneId, timeout }) => new Promise((resolve, reject) => {
         /**
          * Whether the canvas has finished drawing the scene.
          * @returns {boolean} True when the canvas is ready and shows the scene.
          */
         const drawn = () => canvas.ready && canvas.scene?.id === sceneId;
         if (drawn()) {
            resolve();
            return;
         }

         // The check and the registration run in one task, so a draw that ends later always calls the hook.
         /** @type {number} The id of the `canvasReady` listener. */
         const hookId = Hooks.on('canvasReady', () => {
            if (drawn()) {
               clearTimeout(timer);
               Hooks.off('canvasReady', hookId);
               resolve();
            }
         });

         /** @type {number} The timer that rejects the wait after the ceiling. */
         const timer = setTimeout(() => {
            Hooks.off('canvasReady', hookId);
            reject(new Error(`The canvas did not finish drawing scene ${sceneId} within ${timeout} ms.`));
         }, timeout);
      }),
      {
         sceneId,
         timeout: 1000,
      },
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
 * Releases control of every token the way a user does: the Escape key, which core binds to releasing control. On a
 * scene with `tokenVision` true (measured in a probe run), a GM who controls one token sees a second token with
 * `visible` false, and releasing control makes it `visible` true; with `tokenVision` false the second token stays
 * visible while the first is controlled. A token that is not visible takes no pointer events.
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
 * pointer reaches only the topmost. A spot that another element covers, such as a chat notification over the canvas, is
 * skipped too: the pointer would wait for the cover to go (measured in a full run: the element at the drop spot of a
 * 1.5 s drag in `sheet-header.spec.js` was a `.chat-message` in `#chat-notifications`). Measured at a 1920 by 1080
 * viewport in a probe run: 34 tokens were placed, and the drop for the 35th timed out (cause not determined).
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

         // A spot under another element (a chat notification, a window) is skipped: the drop takes effect only where
         // the pointer reaches the canvas.
         /** @type {Element | null} The element the pointer reaches at the spot. */
         const topmost = document.elementFromPoint(outline.left + candidate.x, outline.top + candidate.y);
         /** @type {boolean} Whether the pointer at the spot reaches the canvas. */
         const reachesCanvas = topmost === board;
         if (reachesCanvas && !centres.some((centre) => Math.hypot(centre.x - point.x, centre.y - point.y) < reach)) {
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
 * Closes the open windows, lets the pointer enter and leave the token, releases control of every token and moves the
 * pointer onto a placed token the way a user does: the canvas processes a click only on a hovered token, and a pointer
 * that has rested where the token appeared (the drop of the placing drag) raises no hover. The chat tab is made the
 * active sidebar tab first: while another tab is active, a posted chat message shows as a card over the canvas for 5 s
 * (`ChatLog.NOTIFY_DURATION`), and the card takes the pointer from a token under it.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @returns {Promise<{x: number, y: number}>} The token's centre in client (page) coordinates.
 */
async function hoverToken(page, tokenId) {
   await closeAllApps(page);
   await showChatLog(page);

   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await page.evaluate((tokenId) => {
      const token = canvas.scene.tokens.get(tokenId).object;
      return canvas.clientCoordinatesFromCanvas(token.center);
   }, tokenId);

   // Read: the release of control sets the token's hover flag false without touching its interaction manager's state
   // (`PlaceableObject#_onRelease`, `placeable-object.mjs:786`), and the manager skips a pointer-over while that state
   // is not NONE (`#handlePointerOver`, `mouse-handler.mjs:405-411`). Inferred, not established: a release while the
   // manager is in the hover state leaves it there when the pointer-out that resets the state does not reach the
   // manager, and the next pointer-over is then skipped. The pointer enters and leaves the token before the release so
   // that a pointer-out arrives while the token is still hovered; `restOnToken` then requires the state NONE.
   await page.mouse.move(centre.x, centre.y, { steps: 5 });
   await page.mouse.move(centre.x + 200, centre.y);
   await releaseTokenControl(page);
   await restOnToken(page, tokenId, centre);
   return centre;
}

/**
 * Moves the pointer onto a placed token from outside it and waits until its interaction manager has left the hover
 * state, the canvas shows the token hovered and its last press is older than the double-click time. A token's
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
   await expect.poll(
      () => page.evaluate((tokenId) => {
         /** @type {Record<string, number>} The interaction states. */
         const states = foundry.canvas.interaction.MouseInteractionManager.INTERACTION_STATES;
         return canvas.scene.tokens.get(tokenId).object.mouseInteractionManager.state === states.NONE;
      }, tokenId),
      { message: 'the pointer-out left the interaction manager of the token in the state NONE' },
   ).toBe(true);
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
 * Clicks a condition's control in the token HUD: a right click on the hovered token opens the HUD and its Status
 * Effects palette lists every condition.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {string} statusId - The condition's status id (`blinded`, `offBalance`, ...).
 * @returns {Promise<{x: number, y: number}>} The token's centre in client (page) coordinates.
 */
async function clickConditionControl(page, tokenId, statusId) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId);
   await page.mouse.click(centre.x, centre.y, { button: 'right' });

   /** @type {import('@playwright/test').Locator} The token HUD. */
   const hud = page.locator('#token-hud');
   await expect(hud).toBeVisible();
   await hud.locator('[data-action="togglePalette"][data-palette="effects"]').click();
   await hud.locator(`.effect-control[data-status-id="${statusId}"]`).click();
   return centre;
}

/**
 * Closes the token HUD after a condition click. A left click on the token closes the HUD (read:
 * `PlaceableObject#_onClickLeft`, `placeable-object.mjs:1220`) and leaves the token controlled. The pointer is on the
 * HUD's palette, so it re-enters the token before the click.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {{x: number, y: number}} centre - The token's centre in client (page) coordinates.
 * @returns {Promise<void>} Resolves once the HUD is hidden.
 */
async function closeTokenHud(page, tokenId, centre) {
   await restOnToken(page, tokenId, centre);
   await page.mouse.click(centre.x, centre.y);
   await expect(page.locator('#token-hud')).toBeHidden();
}

/**
 * Turns a condition on or off through the token HUD: a click on a condition's control toggles it on the token's
 * actor. A left click on the token closes the HUD again and leaves the token controlled.
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
   const centre = await clickConditionControl(page, tokenId, statusId);
   await expect.poll(isActive, { message: `the HUD turned ${statusId} ${active ? 'on' : 'off'}` }).toBe(active);
   await settle(page);
   await closeTokenHud(page, tokenId, centre);
}

/**
 * Tries to turn a condition on through the token HUD for an actor that refuses it. The refusal is a warning
 * notification, which is the positive edge that the creation was decided; the flow reads its text and dismisses it
 * with a click, as a user does, so it does not cover the token.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {string} statusId - The condition's status id (`blinded`, `offBalance`, ...).
 * @returns {Promise<string>} The refusal notification's text.
 */
export async function applyConditionRefused(page, tokenId, statusId) {
   /** @type {import('@playwright/test').Locator} The refusal notification. */
   const notice = page.locator('#notifications .notification.warning', { hasText: /is immune to/i });
   await expect(notice, 'no refusal notice is showing before the click').toHaveCount(0);

   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await clickConditionControl(page, tokenId, statusId);
   await expect(notice).toHaveCount(1);

   /** @type {string} The refusal notification's text. */
   const text = (await notice.innerText()).trim();
   await notice.click();
   await expect(notice).toHaveCount(0);
   await closeTokenHud(page, tokenId, centre);
   return text;
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
 * Opens the sheet of a placed unlinked token's synthetic actor with a double-click on the token.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The unlinked token on the viewed scene.
 * @returns {Promise<import('@playwright/test').Locator>} The synthetic actor's sheet; its element id carries the
 * token's uuid.
 */
export async function openPlacedTokenSheet(page, tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId);
   await page.mouse.dblclick(centre.x, centre.y);

   /** @type {import('@playwright/test').Locator} The sheet the double-click opened. */
   const sheet = page.locator(`.application.titan-document-sheet[id*="Token-${tokenId}"]`);
   await expect(sheet).toBeVisible();
   return sheet;
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

   /** @type {string[]} The ids of the packs that already show the label. */
   const known = await readEntryIds(panel, 'compendium', label);
   await dialog.locator('#create-compendium-label').fill(label);
   await dialog.locator('select#create-compendium-type').selectOption(type);
   await dialog.locator('button[data-action="ok"]').click();

   // The entry shows once the create resolved; the dialog closes after the create resolved and its close transition
   // ended, so it is checked after the pack is recorded.
   /** @type {string[]} The ids of the new packs that show the label. */
   let added = [];
   await expect.poll(async () => {
      added = (await readEntryIds(panel, 'compendium', label)).filter((packId) => !known.includes(packId));
      return added.length;
   }, { message: `the directory shows one new pack labelled ${label}` }).toBe(1);

   /** @type {string} The pack's collection id. */
   const [packId] = added;
   record({
      documentName: 'Compendium',
      id: packId,
      createdBy: currentSpec(),
   });
   await expect(dialog).toHaveCount(0);
   await settle(page);
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
   const [id] = added;
   record({
      documentName: await page.evaluate(({ packId }) => game.packs.get(packId).documentName, { packId }),
      id,
      packId,
      createdBy: currentSpec(),
   });
   await settle(page);
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
   const [id] = added;
   record({
      documentName: 'Item',
      id,
      parent: `Actor.${actorId}`,
      createdBy: currentSpec(),
   });
   await settle(page);
   return id;
}

/**
 * Adds an Active Effect to an Actor through the Effects tab's add button, renames it in its own sheet and, when
 * asked, sets its duration type in the sheet header.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorId - The id of the actor that receives the effect.
 * @param {string} name - The name to give the effect.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.tokenId] - The id of a placed unlinked token on the viewed scene: the effect is added on the
 * sheet of that token's synthetic actor, which the token's double-click opens, instead of on the world actor.
 * @param {string} [options.duration] - The duration type to choose in the header (`permanent`, `turnStart`, ...).
 * @param {number} [options.remaining] - The value to type into the header's Remaining input.
 * @param {number} [options.initiative] - The value to type into the header's initiative input of an `initiative`
 * duration.
 * @returns {Promise<string>} The effect's id.
 */
export async function addEffect(page, actorId, name, { duration, remaining, initiative, tokenId } = {}) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = tokenId === undefined
      ? await openSheetByUuid(page, `Actor.${actorId}`)
      : await openPlacedTokenSheet(page, tokenId);

   /** @type {string[]} The ids of the actor's effects before the add. */
   const before = await page.evaluate(
      ({ actorId, tokenId }) => {
         /** @type {TitanActor} The token's synthetic actor, or the world actor. */
         const actor = tokenId ? canvas.scene.tokens.get(tokenId).actor : game.actors.get(actorId);
         return actor.effects.map((effect) => effect.id);
      },
      {
         actorId,
         tokenId,
      },
   );
   await openTab(sheet, 'Effects');
   await sheet.getByRole('button', { name: 'Add New Effect' }).click();

   /** @type {string[]} The ids that appeared on the actor. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         ({ actorId, tokenId, before }) => {
            /** @type {TitanActor} The token's synthetic actor, or the world actor. */
            const actor = tokenId ? canvas.scene.tokens.get(tokenId).actor : game.actors.get(actorId);
            return actor.effects.filter((effect) => !before.includes(effect.id)).map((effect) => effect.id);
         },
         {
            actorId,
            tokenId,
            before,
         },
      );
      return added.length;
   }, { message: 'the add button created one effect' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'ActiveEffect',
      id,
      parent: tokenId === undefined
         ? `Actor.${actorId}`
         : await page.evaluate((tokenId) => canvas.scene.tokens.get(tokenId).actor.uuid, tokenId),
      createdBy: currentSpec(),
   });

   // The new row slides in (`transition:slide`); its Edit Item button is clicked next, so the slide must end first.
   await settle(page, { transitions: true });

   // The new effect carries a default name; the effect sheet's name field renames it.
   await sheet.locator(`[data-effect-id="${id}"]`).getByRole('button', { name: 'Edit Item' }).click();

   /** @type {import('@playwright/test').Locator} The effect sheet's element. */
   const effectSheet = page.locator(`.application[id$="ActiveEffect-${id}"]`);
   await expect(effectSheet).toBeVisible();
   await commitText(effectSheet.locator('.document-name input'), name);
   await expect.poll(
      () => page.evaluate(({ actorId, tokenId, id }) => {
         /** @type {TitanActor} The token's synthetic actor, or the world actor. */
         const actor = tokenId ? canvas.scene.tokens.get(tokenId).actor : game.actors.get(actorId);
         return actor.effects.get(id).name;
      }, {
         actorId,
         tokenId,
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
            ({ actorId, tokenId, id }) => {
               /** @type {TitanActor} The token's synthetic actor, or the world actor. */
               const actor = tokenId ? canvas.scene.tokens.get(tokenId).actor : game.actors.get(actorId);
               return actor.effects.get(id).system.duration.type;
            },
            {
               actorId,
               tokenId,
               id,
            },
         ),
         { message: 'the duration select changed the duration type' },
      ).toBe(duration);
   }

   /**
    * Types a number into a header input of the effect sheet and waits until the effect stores it.
    * @param {import('@playwright/test').Locator} input - The header's number input.
    * @param {number} value - The value to type.
    * @param {string} field - The `system.duration` field the input writes.
    * @returns {Promise<void>} Resolves once the effect stores the value.
    */
   const typeDuration = async (input, value, field) => {
      await commitText(input, String(value));
      await expect.poll(
         () => page.evaluate(
            ({ actorId, tokenId, id, field }) => {
               /** @type {TitanActor} The token's synthetic actor, or the world actor. */
               const actor = tokenId ? canvas.scene.tokens.get(tokenId).actor : game.actors.get(actorId);
               return actor.effects.get(id).system.duration[field];
            },
            {
               actorId,
               tokenId,
               id,
               field,
            },
         ),
         { message: `the header input stored the duration ${field}` },
      ).toBe(value);
   };
   if (initiative !== undefined) {
      await typeDuration(effectSheet.locator('.stat:not(:has(.label)) input'), initiative, 'initiative');
   }
   if (remaining !== undefined) {
      await typeDuration(
         effectSheet.locator('.stat', { hasText: 'Remaining' }).locator('input'),
         remaining,
         'remaining',
      );
   }
   await closeWindow(effectSheet);
   return id;
}

/**
 * Locates the icon of the active toggle on an effect's row in an actor sheet's Effects tab: the unchecked box turns the
 * effect on, the checked box turns it off.
 * @param {import('@playwright/test').Locator} sheet - The actor's sheet.
 * @param {string} effectId - The id of the actor's effect.
 * @param {boolean} active - Whether the toggle is the one that makes the effect active (true) or inactive (false).
 * @returns {import('@playwright/test').Locator} The toggle's icon.
 */
export function effectActiveToggle(sheet, effectId, active) {
   return sheet.locator(`[data-effect-id="${effectId}"]`).locator(active ? 'i.fa-square' : 'i.fa-square-check');
}

/**
 * Locates the state icon inside the active toggle of a Player HUD effect (a row's detail or a tray popout): the checked
 * box shows an active effect, the unchecked box an inactive one.
 * @param {import('@playwright/test').Locator} toggle - The HUD effect's active toggle button.
 * @param {boolean} active - Whether the icon is the one an active effect shows (true) or an inactive one (false).
 * @returns {import('@playwright/test').Locator} The toggle's state icon.
 */
export function hudEffectToggleIcon(toggle, active) {
   return toggle.locator(active ? 'i.fa-square-check' : 'i.fa-square');
}

/**
 * Switches a permanent effect on or off with the active toggle of its row in the actor's Effects tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the actor whose Effects tab holds the toggle.
 * @param {string} effectUuid - The uuid of the actor's effect to switch.
 * @param {boolean} active - Whether the effect ends up active.
 * @returns {Promise<void>} Resolves once the effect is in the requested state.
 */
export async function setEffectActive(page, actorUuid, effectUuid, active) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await openTab(sheet, 'Effects');
   await settle(page, { transitions: true });

   await effectActiveToggle(sheet, effectUuid.split('.').at(-1), active).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.isActive, effectUuid),
      { message: `the active toggle left the effect ${active ? '' : 'in'}active` },
   ).toBe(active);
   await settle(page);
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

   /** @type {number} The number of checks the server holds before the add. */
   const before = (await readServerSystem(page, documentUuid)).check.length;
   await openTab(sheet, 'Checks');
   await sheet.getByRole('button', { name: 'Add Check' }).click();

   // The server holds the check once the update committed; the client model holds it at the click, before any update.
   await expect.poll(
      async () => (await readServerSystem(page, documentUuid)).check.length,
      { message: 'the server holds the new check' },
   ).toBe(before + 1);
   await settle(page);

   /**
    * Reads one field of the new check from the server.
    * @param {string} field - The check field.
    * @returns {Promise<*>} The stored value.
    */
   const stored = async (field) => (await readServerSystem(page, documentUuid)).check[before][field];

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
 * `any`), the Skill narrowing of a situation and the value; that of an immunity holds the selector (`condition` or
 * `effect`) and the key (a condition picker, or a typed effect name).
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
 * @param {string} [element.message] - The text of a Turn Message or Roll Message element, typed into the row's editor.
 * @returns {Promise<void>} Resolves once the row holds the requested fields.
 */
export async function addRulesElement(page, documentUuid, element) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);

   /** @type {number} The number of rules elements before the add. */
   const before = (await readServerSystem(page, documentUuid)).rulesElement.length;
   await openTab(sheet, 'Rules Elements');
   await sheet.locator('.add-entry-button button').click();
   await expect.poll(
      async () => (await readServerSystem(page, documentUuid)).rulesElement.length,
      { message: 'the add button created one rules element' },
   ).toBe(before + 1);
   await settle(page, { transitions: true });

   /** @type {import('@playwright/test').Locator} The new row. */
   const row = sheet.locator('.rules-element').nth(before);

   /**
    * Reads one field of the new row's element as the server stores it.
    * @param {string} field - The element field.
    * @returns {Promise<*>} The stored value.
    */
   const stored = async (field) => (await readServerSystem(page, documentUuid)).rulesElement[before][field];

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
   else if (element.operation === 'immunity') {
      if (element.selector !== undefined) {
         await selectTitanOption(page, row.getByTestId('immunity-selector'), element.selector);
         await expect.poll(() => stored('selector'), { message: 'the immunity selector stored the selector' })
            .toBe(element.selector);
      }
      if (element.key !== undefined) {
         if (element.selector === 'effect') {
            await commitText(row.locator('input[data-testid="immunity-key"]'), element.key);
         }
         else {
            await selectTitanOption(page, row.getByTestId('immunity-key'), element.key);
         }
         await expect.poll(() => stored('key'), { message: 'the immunity key control stored the key' })
            .toBe(element.key);
      }
   }
   else if (element.operation === 'turnMessage') {
      if (element.selector !== undefined) {
         await fill(0, 'selector', element.selector);
      }
   }
   else if (element.operation === 'fastHealing' || element.operation === 'persistentDamage') {
      // The turn the element fires on is the settings' selector (Persistent Damage repeats the operation select first).
      if (element.selector !== undefined) {
         await fill(element.operation === 'persistentDamage' ? 1 : 0, 'selector', element.selector);
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
   if (element.message !== undefined) {
      /** @type {import('@playwright/test').Locator} The row's message editor (Turn Message and Roll Message). */
      const editor = row.locator('.operation-settings .message prose-mirror');
      await editor.hover();
      await editor.locator('button.toggle').click();
      await editor.locator('[contenteditable="true"]').click();
      await page.keyboard.type(element.message);
      await editor.locator('[data-action="save"]').click();
      await expect(editor, 'the editor shows the saved message').toHaveClass(/inactive/);

      await expect.poll(
         async () => (await readServerSystem(page, documentUuid)).rulesElement[before].message,
         { message: 'the editor saved the message to the document' },
      ).toContain(element.message);
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
   await expect.poll(
      () => page.evaluate(
         async (uuid) => (await fromUuid(uuid)).system.customTrait.map((trait) => trait.name),
         documentUuid,
      ),
      { message: 'the dialog stored the custom trait' },
   ).toContain(name);
   await expect(dialog).toHaveCount(0);
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
   const before = (await readServerSystem(page, weaponUuid)).attack.length;
   await openTab(sheet, 'Attacks');
   await sheet.getByRole('button', { name: 'Add Attack' }).click();
   await expect.poll(
      async () => (await readServerSystem(page, weaponUuid)).attack.length,
      { message: 'the add button created one attack' },
   ).toBe(before + 1);
   await expect(sheet.locator('li.reorder-row'), 'the Attacks tab rendered the new row').toHaveCount(before + 1);
   await settle(page, { transitions: true });
}

/**
 * Types a number into the Range or Damage input of a weapon attack on the Attacks tab.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {number} index - The position of the attack.
 * @param {'range'|'damage'} field - The attack field to set.
 * @param {number} value - The number to type.
 * @returns {Promise<void>} Resolves once the weapon stores the value.
 */
export async function setAttackStat(page, weaponUuid, index, field, value) {
   /** @type {import('@playwright/test').Locator} The weapon's sheet. */
   const sheet = await openSheetByUuid(page, weaponUuid);
   await openTab(sheet, 'Attacks');

   /** @type {import('@playwright/test').Locator} The attack's row. */
   const row = sheet.locator('li.reorder-row').nth(index);

   /** @type {import('@playwright/test').Locator} The labelled field of the attack's settings. */
   const stat = row.locator('.field').filter({ hasText: field === 'range' ? 'Range' : 'Damage' }).first();
   await commitText(stat.locator('input').first(), value);
   await expect.poll(
      async () => (await readServerSystem(page, weaponUuid)).attack[index][field],
      { message: `the ${field} input stored the value` },
   ).toBe(value);
}

/**
 * Adds a custom trait to a weapon attack through the attack's Add Custom Trait button and its dialog.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {number} index - The position of the attack.
 * @param {string} name - Text typed into the dialog's name input.
 * @param {string} description - Text typed into the dialog's description area.
 * @returns {Promise<void>} Resolves once the attack stores the trait.
 */
export async function addAttackCustomTrait(page, weaponUuid, index, name, description) {
   /** @type {import('@playwright/test').Locator} The weapon's sheet. */
   const sheet = await openSheetByUuid(page, weaponUuid);
   await openTab(sheet, 'Attacks');
   await sheet.locator('li.reorder-row').nth(index).getByText('Add Custom Trait', { exact: true }).click();

   /** @type {import('@playwright/test').Locator} The Add Custom Trait dialog of the attack. */
   const dialog = page.locator('.application[id^="add-custom-attack-trait-dialog-"]');
   await expect(dialog).toBeVisible();
   await dialog.locator('input').first().fill(name);
   await dialog.locator('textarea').fill(description);
   await dialog.getByRole('button', { name: 'Add Trait' }).click();
   await expect.poll(
      () => page.evaluate(
         async ({ uuid, index }) => (await fromUuid(uuid)).system.attack[index].customTrait.map((trait) => trait.name),
         {
            uuid: weaponUuid,
            index,
         },
      ),
      { message: 'the dialog stored the custom trait on the attack' },
   ).toContain(name);
   await expect(dialog).toHaveCount(0);
   await settle(page);
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
   await expect.poll(count, { message: `the dialog stored the ${label} trait` }).toBe(before + 1);
   await expect(dialog, 'Apply Edits closes the dialog').toHaveCount(0);
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
    * Reads the aspect the server stores.
    * @returns {Promise<object|undefined>} The aspect, once the server holds it on the spell.
    */
   const stored = async () => (await readServerSystem(page, spellUuid)).aspect.find((entry) => entry.label === label);
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
   const before = (await readServerSystem(page, spellUuid)).customAspect.length;
   await openTab(sheet, 'Custom Aspects');
   await sheet.getByRole('button', { name: 'Add Custom Aspect' }).click();
   await expect.poll(
      async () => (await readServerSystem(page, spellUuid)).customAspect.length,
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
      async () => (await readServerSystem(page, actorUuid)).attribute[attribute].baseValue,
      { message: `the sheet input stored the ${attribute} base value` },
   ).toBe(value);
   await settle(page);
}

/**
 * Types a Resource's current value into the meter row of the actor sheet's sidebar.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the character.
 * @param {string} resource - The Resource (`stamina`, `resolve`, ...).
 * @param {number} value - The current value to type.
 * @returns {Promise<void>} Resolves once the actor stores the value.
 */
export async function setResource(page, actorUuid, resource, value) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);

   // The Resource's container holds a label row and a meter row; the meter row's first input is the current value.
   /** @type {import('@playwright/test').Locator} The Resource's current value input. */
   const input = sheet.locator(`.middle.${resource}`)
      .locator('xpath=ancestor::div[contains(@class, "container")][1]')
      .locator('.row').nth(1).locator('.side input').first();
   await commitText(input, String(value));
   await expect.poll(
      async () => (await readServerSystem(page, actorUuid)).resource[resource].value,
      { message: `the sheet input stored the ${resource} value` },
   ).toBe(value);
   await settle(page);
}

/**
 * Posts the chat card of an item or effect with the Send to Chat button of its sheet's window header.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} documentUuid - The uuid of the item or effect.
 * @returns {Promise<string>} The id of the chat message the button posted.
 */
export async function sendToChat(page, documentUuid) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);

   /** @type {string[]} The ids of the chat messages before the click. */
   const before = await page.evaluate(() => game.messages.map((message) => message.id));
   await sheet.locator('.window-header .send-to-chat-button').click();

   /** @type {string[]} The ids that appeared. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         (before) => game.messages.filter((message) => !before.includes(message.id)).map((message) => message.id),
         before,
      );
      return added.length;
   }, { message: 'the Send to Chat button posted one message' }).toBe(1);
   await settle(page);
   return added[0];
}

/**
 * Posts a plain chat message the way a user does: focuses the chat input, types the text and presses Enter.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} text - The text typed into the chat input.
 * @returns {Promise<string>} The id of the chat message the input posted.
 */
export async function typeChatMessage(page, text) {
   await showChatLog(page);

   /** @type {string[]} The ids of the chat messages before the message is sent. */
   const before = await page.evaluate(() => game.messages.map((message) => message.id));
   await page.locator('#chat-message').click();
   await page.keyboard.type(text);
   await page.keyboard.press('Enter');

   /** @type {string[]} The ids that appeared. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         (before) => game.messages.filter((message) => !before.includes(message.id)).map((message) => message.id),
         before,
      );
      return added.length;
   }, { message: 'Enter in the chat input posted one message' }).toBe(1);
   await settle(page);
   return added[0];
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
      async () => (await readServerSystem(page, actorUuid)).skill[skill].training.baseValue,
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
      async () => (await readServerSystem(page, actorUuid)).skill[skill].defaultAttribute,
      { message: `the row's select stored the ${skill} default attribute` },
   ).toBe(attribute);
   await settle(page);
}

/**
 * Sets whether an owned weapon, armor, shield or equipment item is equipped with the Equipped toggle of its row in the
 * Inventory tab, clicking only when the state differs (a collapsed row of an equipped weapon is expanded first).
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
      /** @type {import('@playwright/test').Locator} The item's row. */
      const row = sheet.locator(`[data-item-id="${itemId}"]`);

      /** @type {import('@playwright/test').Locator} The row's Equipped toggle. */
      const toggle = row.getByRole('button', { name: 'Equipped' }).first();

      // A collapsed weapon row shows its attack button in place of the toggle once the weapon is equipped; the toggle
      // is then inside the row's expanded content.
      if (await toggle.count() === 0) {
         await row.locator('.header .label .button button').first().click();
      }
      await toggle.click();
   }
   await expect.poll(read, { message: `the Equipped toggle left the item ${equipped ? '' : 'un'}equipped` })
      .toBe(equipped);
   await settle(page);
}

/**
 * Deletes an owned item with the Delete Item button of its row in a tab of the actor's sheet. The
 * `confirmDeletingItems` setting must be off, or the click opens a confirmation instead.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the actor.
 * @param {string} tab - The sheet tab that lists the item.
 * @param {string} itemUuid - The uuid of the owned item.
 * @returns {Promise<void>} Resolves once the item is gone.
 */
export async function deleteOwnedItem(page, actorUuid, tab, itemUuid) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await openTab(sheet, tab);
   await settle(page, { transitions: true });
   await sheet.locator(`[data-item-id="${itemUuid.split('.').at(-1)}"]`)
      .getByRole('button', { name: 'Delete Item' }).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)) === null, itemUuid),
      { message: 'the Delete Item button deleted the item' },
   ).toBe(true);
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
   const before = (await readServerSystem(page, weaponUuid)).attack.length;
   await openTab(sheet, 'Attacks');
   await settle(page, { transitions: true });
   await sheet.locator('li.reorder-row').nth(index).getByRole('button', {
      name: 'Delete',
      exact: true,
   }).click();
   await expect.poll(
      async () => (await readServerSystem(page, weaponUuid)).attack.length,
      { message: 'the delete button removed the attack' },
   ).toBe(before - 1);
   await settle(page, { transitions: true });
}

/**
 * Opens the Effect Tray's sidebar tab and selects a pack in its pack select.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} packId - The pack's collection id.
 * @returns {Promise<import('@playwright/test').Locator>} The tray's root element.
 */
export async function openTrayPack(page, packId) {
   await openSidebarTab(page, 'titanEffects');
   await page.locator('[data-testid="effect-tray-pack-select"]').selectOption(packId);
   await expect.poll(
      () => page.evaluate(() => game.settings.get('titan', 'effectTrayLastPack')),
      { message: 'the pack select stored the chosen pack' },
   ).toBe(packId);
   return page.locator('[data-testid="effect-tray"]');
}

/**
 * Creates a folder in an editable effect pack with the Effect Tray's Create Folder button (or an expanded folder's
 * create-folder control, for a subfolder) and renames it with the folder context menu's Rename Folder entry.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} packId - The pack's collection id; the pack is an unlocked `ActiveEffect` pack.
 * @param {string} name - The name to give the folder.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.parentId] - The id of the folder that receives the new folder; omitted for the pack root.
 * @returns {Promise<string>} The folder's id.
 */
export async function createTrayFolder(page, packId, name, { parentId } = {}) {
   await openTrayPack(page, packId);

   /** @type {string[]} The ids of the pack's folders before the create. */
   const before = await page.evaluate((packId) => game.packs.get(packId).folders.map((folder) => folder.id), packId);
   if (parentId === undefined) {
      await page.locator('[data-testid="effect-tray-new-folder"]').click();
   }
   else {
      /** @type {import('@playwright/test').Locator} The parent folder's item. */
      const parent = page.locator(`[data-testid="effect-tray-folder"][data-folder-id="${parentId}"]`);
      if (!(await parent.evaluate((element) => element.classList.contains('expanded')))) {
         await parent.locator(':scope > [data-testid="effect-tray-folder-header"]').click();
      }
      await parent.locator(':scope > [data-testid="effect-tray-folder-header"]')
         .locator('[data-testid="effect-tray-folder-create-folder"]')
         .click();
   }

   /** @type {string[]} The ids that appeared in the pack. */
   let added = [];
   await expect.poll(async () => {
      added = await page.evaluate(
         ({ packId, before }) => game.packs.get(packId).folders
            .filter((folder) => !before.includes(folder.id))
            .map((folder) => folder.id),
         {
            packId,
            before,
         },
      );
      return added.length;
   }, { message: 'the tray created one folder in the pack' }).toBe(1);
   const [id] = added;
   record({
      documentName: 'Folder',
      id,
      packId,
      createdBy: currentSpec(),
   });
   await settle(page);

   // The folder context menu's Rename Folder entry swaps the name for an input, which Enter commits.
   /** @type {import('@playwright/test').Locator} The new folder's header. */
   const header = page.locator(`[data-testid="effect-tray-folder"][data-folder-id="${id}"]`)
      .locator(':scope > [data-testid="effect-tray-folder-header"]');
   await header.click({ button: 'right' });
   /** @type {string} The tray's localized Rename Folder entry label. */
   const renameLabel = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayRenameFolder.text'));
   await chooseContextMenuEntry(page, page.locator('#context-menu li.context-item', { hasText: renameLabel }));

   /** @type {import('@playwright/test').Locator} The inline rename input. */
   const input = header.locator('[data-testid="effect-tray-folder-rename"]');
   await input.fill(name);
   await input.press('Enter');
   await expect.poll(
      () => page.evaluate(({ packId, id }) => game.packs.get(packId).folders.get(id).name, {
         packId,
         id,
      }),
      { message: 'the inline rename stored the folder name' },
   ).toBe(name);
   await settle(page);
   return id;
}

/**
 * Creates a blank effect in an editable effect pack with the Effect Tray's create button (or a folder's create-effect
 * control) and renames it in the sheet the create opens.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} packId - The pack's collection id; the pack is an unlocked `ActiveEffect` pack.
 * @param {string} name - The name to give the effect.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.folderId] - The id of the folder that receives the effect; omitted for the pack root.
 * @returns {Promise<string>} The effect's id.
 */
export async function createTrayEffect(page, packId, name, { folderId } = {}) {
   await openTrayPack(page, packId);

   /** @type {string[]} The ids the pack's index holds before the create. */
   const before = await page.evaluate(
      async (packId) => (await game.packs.get(packId).getIndex()).map((entry) => entry._id),
      packId,
   );
   await (folderId === undefined
      ? page.locator('[data-testid="effect-tray-new"]')
      : page.locator(`[data-testid="effect-tray-folder"][data-folder-id="${folderId}"]`)
         .locator(':scope > [data-testid="effect-tray-folder-header"]')
         .locator('[data-testid="effect-tray-folder-create-effect"]'))
      .click();

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
   await settle(page);

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
      /** @type {object[]} The client-pixel corners of each token. */
      const corners = tokenIds.map((id) => {
         /** @type {PIXI.Rectangle} The token's bounds in canvas coordinates. */
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

   /** @type {number} The numeric level, read from the client's ownership constant. */
   const value = await page.evaluate((level) => CONST.DOCUMENT_OWNERSHIP_LEVELS[level], level);
   await config.locator(`select[name="${userId}"]`).selectOption(String(value));
   await config.locator('button[type="submit"]').click();
   await expect.poll(
      () => page.evaluate(({ actorId, userId }) => game.actors.get(actorId).ownership[userId], {
         actorId,
         userId,
      }),
      { message: `the window stored ${level} for ${userName}` },
   ).toBe(value);
   await expect(config).toHaveCount(0);
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
   /** @type {string} The created combat's id. */
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
 * Drags an owned item's row from the actor sheet onto the first empty slot of the core hotbar, which opens the Create
 * Macro dialog. The core hotbar is hidden unless the client setting `showFoundryHotbar` is on, so the caller turns it
 * on first.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the actor that owns the item.
 * @param {string} itemId - The id of the owned item.
 * @returns {Promise<{dialog: import('@playwright/test').Locator, slot: number}>} The open dialog and the number of the
 * slot the macro will take.
 */
export async function openCreateMacroDialog(page, actorUuid, itemId) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);

   /** @type {string} The item's type, which decides the sheet tab that lists it. */
   const itemType = await page.evaluate(
      async ({ actorUuid, itemId }) => (await fromUuid(actorUuid)).items.get(itemId).type,
      {
         actorUuid,
         itemId,
      },
   );
   await openTab(sheet, {
      ability: 'Abilities',
      spell: 'Spells',
   }[itemType] ?? 'Inventory');
   await settle(page, { transitions: true });

   /** @type {import('@playwright/test').Locator} The first empty slot of the hotbar. */
   const slot = page.locator('#hotbar .slot.open').first();
   await expect(slot, 'the core hotbar shows an empty slot').toBeVisible();

   /** @type {number} The number the empty slot carries on the hotbar. */
   const slotNumber = Number(await slot.getAttribute('data-slot'));
   await sheet.locator(`[data-item-id="${itemId}"] [data-drag-handle]`).first().dragTo(slot);

   /** @type {import('@playwright/test').Locator} The Create Macro dialog. */
   const dialog = page.locator('.application.titan-dialog[id^="titan-create-macro-dialog-"]');
   await expect(dialog, 'the drop opened the Create Macro dialog').toBeVisible();
   return {
      dialog,
      slot: slotNumber,
   };
}

/**
 * Makes a hotbar macro of an owned item the way a user does: drags the item's row onto the first empty slot of the core
 * hotbar (`openCreateMacroDialog`), fills the Create Macro dialog and presses its Create Macro button. The macro and
 * its hotbar slot are recorded for the teardown.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} actorUuid - The uuid of the actor that owns the item.
 * @param {string} itemId - The id of the owned item.
 * @param {object} [options] - What the dialog is told.
 * @param {string} [options.name] - The macro's name, typed into the dialog's name input.
 * @param {string} [options.type] - The Macro Type to choose (`attackCheck`, `castingCheck`, `itemCheck`,
 * `toggleDocumentSheet`); the dialog's own default is kept when omitted.
 * @param {string} [options.idMethod] - The ID Method to choose (`uuid`, `name`, `documentId`); the dialog's default
 * is kept when omitted.
 * @returns {Promise<{macroId: string, slot: number}>} The macro and the hotbar slot that holds it.
 */
export async function createItemMacro(page, actorUuid, itemId, { name, type, idMethod } = {}) {
   /** @type {{dialog: import('@playwright/test').Locator, slot: number}} The open dialog and the slot it fills. */
   const { dialog, slot } = await openCreateMacroDialog(page, actorUuid, itemId);

   /**
    * Chooses a value in the select of one of the dialog's labelled rows.
    * @param {string} label - The row's label.
    * @param {string} value - The option's value.
    * @returns {Promise<void>} Resolves once the select shows the value.
    */
   const choose = async (label, value) => {
      await selectTitanOption(
         page,
         dialog.locator('.row', { has: page.getByText(label, { exact: true }) }).locator('[role="combobox"]'),
         value,
      );
   };
   if (name !== undefined) {
      await commitText(dialog.locator('.row').first().locator('input'), name);
   }
   if (type !== undefined) {
      await choose('Macro Type', type);
   }
   if (idMethod !== undefined) {
      await choose('ID Method', idMethod);
   }
   await dialog.getByRole('button', { name: 'Create Macro' }).click();

   /** @type {string} The id of the macro now in the slot. */
   let macroId;
   await expect.poll(async () => {
      macroId = await page.evaluate((slot) => game.user.hotbar[slot], slot);
      return macroId;
   }, { message: 'the dialog assigned the macro to the slot' }).toBeTruthy();
   record({
      documentName: 'Macro',
      id: macroId,
      createdBy: currentSpec(),
   });
   recordHotbar({
      userId: await page.evaluate(() => game.user.id),
      slot,
      macroId,
   });
   await expect(dialog, 'Create Macro closes the dialog').toHaveCount(0);
   await settle(page);
   return {
      macroId,
      slot,
   };
}

/**
 * Runs the macro in a hotbar slot with a click on the slot, as a user does.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {number} slot - The number of the hotbar slot that holds the macro.
 * @returns {Promise<void>} Resolves once the click is dispatched; the caller waits for the macro's effect.
 */
export async function runHotbarMacro(page, slot) {
   await page.locator(`#hotbar .slot.full[data-slot="${slot}"]`).click();
}

/**
 * Rolls initiative for every combatant of the active combat that has none, with the Combat Tracker's Roll All button.
 * The caller forces the dice (`forceDice`) to choose the turn order: the combatants roll in the order they joined.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @returns {Promise<void>} Resolves once every combatant of the active combat has an initiative.
 */
export async function rollInitiative(page) {
   await clickCombatControl(page, 'rollAll');
   await expect.poll(
      () => page.evaluate(() => game.combat.combatants.every((combatant) => combatant.initiative !== null)),
      { message: 'the Roll All button gave every combatant an initiative' },
   ).toBe(true);
   await settle(page);
}

/**
 * Presses one of the Combat Tracker's turn buttons and waits for the combat to move.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {'nextTurn'|'previousTurn'} action - The button's `data-action`.
 * @returns {Promise<void>} Resolves once the combat's round or turn differs from before the click.
 */
async function stepCombat(page, action) {
   /** @type {{round: number, turn: number}} The position before the click. */
   const before = await page.evaluate(() => ({
      round: game.combat.round,
      turn: game.combat.turn,
   }));
   await clickCombatControl(page, action);
   await expect.poll(
      () => page.evaluate(
         ({ round, turn }) => game.combat.round !== round || game.combat.turn !== turn,
         before,
      ),
      { message: `the ${action} button moved the combat` },
   ).toBe(true);
   await settle(page);
}

/**
 * Advances the active combat to the next turn with the Combat Tracker's Next Turn button. The start-of-turn updates and
 * reports run after the turn changes; the caller waits for the effect it asserts.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @returns {Promise<void>} Resolves once the combat's turn has changed.
 */
export async function nextTurn(page) {
   await stepCombat(page, 'nextTurn');
}

/**
 * Returns the active combat to the previous turn with the Combat Tracker's Previous Turn button.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @returns {Promise<void>} Resolves once the combat's turn has changed.
 */
export async function previousTurn(page) {
   await stepCombat(page, 'previousTurn');
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
 * effect. Measured in a probe run at every tested zoom with this many entries: the Abilities tab's scroll area is
 * 563 px high at 100% zoom and holds 788 px (225 px, 3.4 rows of 66 px, to scroll; the least of any zoom), the Checks
 * tab's area is 412 px and holds 4346 px, and the rules elements list's is 412 px and holds 1790 px. With 10 entries
 * the Abilities tab had 93 px (1.4 rows) to scroll at 100% zoom (the same probe with 10 entries); 12 was chosen over 10
 * for the margin: 225 px (3.4 rows) against 93 px (1.4 rows) at the tightest zoom. The sidebar's sections are not bulk
 * entries: 5 sections hold 872 px in an 855 px area (17 px) at 100% zoom and more at higher zooms (the same probe).
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
      const id = await addEffect(page, hostId, `${SHARED_PREFIX}Conditional Effect`, { duration: DURATION_PERMANENT });
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
 * Reads the data the server holds for a document. A client's own document carries an edit made through a bound
 * control before any update reaches the database, so a read through `fromUuid` cannot tell a saved edit from an unsaved
 * one; this asks the server (a read, not a document change). For an embedded document the query returned the first
 * sibling's data in place of the requested document's (probe-two.json: the second of two owned abilities, whose local
 * rules elements were empty, read the first ability's element), so the result is picked by id.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} uuid - The uuid of a world or embedded document.
 * @returns {Promise<object>} The document's stored data (`toObject()`).
 */
export function readServerDocument(page, uuid) {
   return page.evaluate(async (uuid) => {
      /** @type {foundry.abstract.Document} The client's document, which names the class and the parent to ask for. */
      const document = await fromUuid(uuid);

      /** @type {foundry.abstract.Document[]} The documents the server returns for the query. */
      const found = await CONFIG.DatabaseBackend.get(
         document.constructor,
         {
            query: { _id: document.id },
            parent: document.parent,
            pack: document.pack,
         },
         game.user,
      );
      return found.find((candidate) => candidate.id === document.id).toObject();
   }, uuid);
}

/**
 * Reads the `system` data the server holds for a document (see `readServerDocument`).
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} uuid - The uuid of a world or embedded document.
 * @returns {Promise<object>} The document's stored `system` data.
 */
export async function readServerSystem(page, uuid) {
   return (await readServerDocument(page, uuid)).system;
}

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
