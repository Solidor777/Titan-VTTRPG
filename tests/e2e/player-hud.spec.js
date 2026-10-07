import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login } from './fixtures.js';
import {
   activateScene,
   addCheck,
   addCombatant,
   addEffect,
   applyCondition,
   controlPlacedToken,
   controlPlacedTokens,
   createActor,
   createCombat,
   createScene,
   endCombat,
   placeToken,
   setDescription,
   setOwnership,
   startCombat,
   viewScene,
} from './flows.js';
import { withClients } from './multiClient.js';
import { getSetting, setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps, reloadWorld, waitForAnimations } from './world.js';

/**
 * The Player HUD on one scene of flow-made actors and tokens: the portrait (bars, rests, resolve, inspiration, the
 * three styles, minimizing), which tokens make it show or hide, its layout (edit mode drags, anchors to the sidebar,
 * clamping, reset, the settings window, the hotbar), the action menu's default place, and the effects panel (rows,
 * duration steps, send to chat, the sheet, Remove with and without confirmation, the icon tray, scrolling, resizing).
 * Settings are client settings; they return to their defaults after each test. The reload test runs last.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The scene the tokens stand on. */
let sceneId;
/** @type {string} A second scene with no token. */
let emptySceneId;
/** @type {string} The id of the player actor the HUD tests drive. */
let playerId;
/** @type {string} The id of the second player actor, for group selections and effects it holds alone. */
let player2Id;
/** @type {string} The id of the NPC actor. */
let npcId;
/** @type {Record<string, string>} The ids of the placed tokens, by `player`, `player2` and `npc`. */
const tokenIds = {};

/** @type {string} Name of the effect the panel tests read. */
const PANEL_EFFECT = 'E2E HUD Panel Effect';
/** @type {string} The description typed into the panel effect. */
const PANEL_DESCRIPTION = 'Panel description body.';
/** @type {string} Label of the check on the panel effect. */
const PANEL_CHECK = 'E2E HUD Panel Check';
/** @type {string} Selector of the confirmation dialog of an effect delete. */
const CONFIRMATION = '.application.titan-dialog[id^="titan-confirmation-dialog"]';

/**
 * Selects an element of the Player HUD by its test id.
 * @param {string} id - The test id.
 * @returns {import('@playwright/test').Locator} The element.
 */
function hud(id) {
   return page.locator(`[data-testid="${id}"]`);
}

/**
 * Returns the HUD settings to their defaults, leaves edit mode (which keeps the mounted HUD whatever is selected) and
 * returns the viewport to its configured size.
 * @returns {Promise<void>} Resolves once the HUD shows its default options and layout.
 */
async function resetHud() {
   await page.setViewportSize({
      width: 1920,
      height: 1080,
   });
   await setClientSetting(page, 'playerHudOptions', {});
   await setClientSetting(page, 'playerHudLayout', {});
   await setClientSetting(page, 'showFoundryHotbar', false);
   await setClientSetting(page, 'enablePlayerHud', true);
   await setClientSetting(page, 'confirmDeletingEffects', true);
   await page.evaluate(() => {
      game.titan.playerHud.layoutState.editMode = false;
      game.titan.playerHud.resetLayout();
   });
}

/**
 * Takes control of the player's token, which shows the HUD of the player.
 * @param {string} [key] - Which placed token: `player`, `player2` or `npc`.
 * @returns {Promise<void>} Resolves once the token is the only controlled token.
 */
async function control(key = 'player') {
   await controlPlacedToken(page, tokenIds[key]);
}

/**
 * Releases control of every token with the Escape key, core's release binding.
 * @returns {Promise<void>} Resolves once no token is controlled.
 */
async function releaseControl() {
   await page.keyboard.press('Escape');
   await expect.poll(
      () => page.evaluate(() => canvas.tokens.controlled.length),
      { message: 'the Escape key released the controlled tokens' },
   ).toBe(0);
}

/**
 * Toggles the HUD's layout edit mode with its keybinding and waits for the toolbar to follow.
 * @param {boolean} on - Whether edit mode is on afterwards.
 * @returns {Promise<void>} Resolves once the toolbar shows the new state.
 */
async function toggleEditMode(on) {
   await page.keyboard.press('Shift+H');
   await expect(hud('player-hud-edit-toolbar')).toHaveCount(on ? 1 : 0);
   await waitForAnimations(page, '#titan-player-hud');
}

/**
 * Drags a HUD element by its frame while edit mode is on.
 * @param {string} testId - The element's test id.
 * @param {number} dx - Horizontal distance in pixels.
 * @param {number} dy - Vertical distance in pixels.
 * @returns {Promise<{x: number, y: number, width: number, height: number}>} The element's box before the drag.
 */
async function dragElement(testId, dx, dy) {
   /** @type {{x: number, y: number, width: number, height: number}} The element's box before the drag. */
   const box = await hud(testId).boundingBox();
   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
   await page.mouse.down();
   await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
   await page.mouse.up();
   return box;
}

/**
 * Reads a value of the player actor.
 * @param {string} path - The data path below `system`.
 * @param {string} [actorId] - The actor; the HUD player by default.
 * @returns {Promise<*>} The value.
 */
function readActor(path, actorId = playerId) {
   return page.evaluate(
      ({ path, actorId }) => foundry.utils.getProperty(game.actors.get(actorId).system, path),
      {
         path,
         actorId,
      },
   );
}

/**
 * Types a number into a bar input of the portrait and waits until the actor stores it.
 * @param {string} resource - `stamina`, `resolve` or `wounds`.
 * @param {number} value - The value to enter.
 * @returns {Promise<void>} Resolves once the actor holds the value.
 */
async function setBar(resource, value) {
   await commitText(hud(`player-hud-bar-${resource}-input`), value);
   await expect.poll(
      () => readActor(`resource.${resource}.value`),
      { message: `the ${resource} bar stored ${value}` },
   ).toBe(value);
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await setClientSetting(page, 'getCheckOptions', 'never');

   // Two scenes: the tokens' and an empty one. The tokens' scene is viewed last, so the HUD's canvas is its own.
   sceneId = await createScene(page, { name: 'E2E HUD Scene' });
   emptySceneId = await createScene(page, { name: 'E2E HUD Empty Scene' });
   await viewScene(page, sceneId);

   // The actors are made in the Actors tab, and a drag from the directory places each token, next to each other
   // in this order so that a selection rectangle can take two of them.
   playerId = await createActor(page, {
      name: 'E2E HUD Player',
      type: 'player',
   });
   player2Id = await createActor(page, {
      name: 'E2E HUD Player 2',
      type: 'player',
   });
   npcId = await createActor(page, {
      name: 'E2E HUD NPC',
      type: 'npc',
   });
   tokenIds.player = await placeToken(page, playerId);
   tokenIds.player2 = await placeToken(page, player2Id);
   tokenIds.npc = await placeToken(page, npcId);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   await resetHud();
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('portrait', () => {
   test('editing the stamina bar persists to the actor', async () => {
      await control();
      await setBar('stamina', 2);
   });

   test('the bar max value is as wide as the 2-digit current-value input', async () => {
      await control();

      /** @type {object} The rendered widths of the current-value input and the max-value label. */
      const widths = await page.evaluate(() => {
         const width = (selector) => Math.round(document.querySelector(selector).getBoundingClientRect().width);
         return {
            input: width('[data-testid="player-hud-bar-stamina-input"]'),
            max: width('[data-testid="player-hud-bar-stamina-max"]'),
         };
      });
      expect(Math.abs(widths.max - widths.input)).toBeLessThanOrEqual(1);
   });

   test('all three portrait styles render', async () => {
      await control();
      for (const style of [
         'panelCard',
         'wideStrip',
         'roundToken',
      ]) {
         await setClientSetting(page, 'playerHudOptions', { portrait: { style } });
         await expect(hud('player-hud-portrait')).toBeVisible();
         await expect(hud('player-hud-bar-stamina')).toHaveCount(style === 'roundToken' ? 0 : 1);
      }

      // The round token hides the inline bars behind a click-to-open popover.
      await hud('player-hud-round-portrait').click();
      await expect(hud('player-hud-bars-popover')).toBeVisible();
      await expect(hud('player-hud-bar-stamina')).toBeVisible();

      await setClientSetting(page, 'playerHudOptions', {});
      await expect(hud('player-hud-portrait')).toBeVisible();
   });

   test('spend resolve decrements resolve by 1', async () => {
      await control();

      // Resolve max is derived from attributes, so fill to whatever the engine computed and assert the relative
      // decrement instead of fighting the derivation.
      /** @type {number} The player's derived resolve maximum (must afford one spend). */
      const max = await readActor('resource.resolve.max');
      expect(max).toBeGreaterThanOrEqual(1);
      await setBar('resolve', max);

      await hud('player-hud-spend-resolve').click();
      await expect.poll(() => readActor('resource.resolve.value'), { message: 'resolve decrements via the button' })
         .toBe(max - 1);
   });

   test('short rest restores stamina to max', async () => {
      await control();
      await setBar('stamina', 1);
      await hud('player-hud-short-rest').click();
      await expect.poll(
         async () => (await readActor('resource.stamina.value')) === (await readActor('resource.stamina.max')),
         { message: 'short rest restores stamina' },
      ).toBe(true);
   });

   test('long rest restores stamina and resolve to max', async () => {
      await control();
      await setBar('stamina', 1);
      await setBar('resolve', 0);
      await hud('player-hud-long-rest').click();
      await expect.poll(
         async () => (await readActor('resource.stamina.value')) === (await readActor('resource.stamina.max'))
            && (await readActor('resource.resolve.value')) === (await readActor('resource.resolve.max')),
         { message: 'long rest restores stamina and resolve' },
      ).toBe(true);
   });

   test('remove combat effects deletes a turn-start effect', async () => {
      await addEffect(page, playerId, 'E2E HUD Combat Effect', { duration: 'turnStart' });
      await closeAllApps(page);
      await control();
      expect(await page.evaluate((id) => game.actors.get(id).effects.size, playerId), 'the effect is there').toBe(1);

      await hud('player-hud-remove-combat-effects').click();
      await expect.poll(
         () => page.evaluate((id) => game.actors.get(id).effects.size, playerId),
         { message: 'the combat effect is removed' },
      ).toBe(0);
   });

   test('inspiration toggles for players and is absent for NPCs', async () => {
      await control();
      /** @type {boolean} The inspiration flag before the toggle. */
      const before = await readActor('inspiration');
      await hud('player-hud-toggle-inspiration').click();
      await expect.poll(() => readActor('inspiration'), { message: 'inspiration flips via the button' })
         .toBe(!before);
      await hud('player-hud-toggle-inspiration').click();
      await expect.poll(() => readActor('inspiration'), { message: 'inspiration flips back' }).toBe(before);

      await control('npc');
      await expect(hud('player-hud-portrait')).toBeVisible();
      await expect(hud('player-hud-toggle-inspiration')).toHaveCount(0);
   });

   test('minimize chip collapses and restores the portrait', async () => {
      await control();
      await expect(hud('player-hud-bar-stamina')).toBeVisible();

      await hud('player-hud-portrait-minimize').click();
      await expect(hud('player-hud-portrait-restore')).toBeVisible();
      await expect(hud('player-hud-bar-stamina')).toHaveCount(0);

      await hud('player-hud-portrait-restore').click();
      await expect(hud('player-hud-bar-stamina')).toBeVisible();
   });
});

test.describe('visibility', () => {
   test('GM sees the portrait for a single selected character', async () => {
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();
   });

   test('GM with no selection shows no HUD elements', async () => {
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();

      await releaseControl();
      await expect(hud('player-hud-portrait')).toHaveCount(0);
   });

   test('NPC selection shows the portrait without the inspiration button', async () => {
      await control('npc');
      await expect(hud('player-hud-portrait')).toBeVisible();
      await expect(hud('player-hud-toggle-inspiration')).toHaveCount(0);
      await expect(hud('player-hud-spend-resolve')).toBeVisible();
   });

   test('group selection hides the portrait', async () => {
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();

      await controlPlacedTokens(page, [
         tokenIds.player,
         tokenIds.player2,
      ]);
      await expect(hud('player-hud-portrait')).toHaveCount(0);
   });

   test('master disable unmounts the HUD and re-enable restores it', async () => {
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();

      await setClientSetting(page, 'enablePlayerHud', false);
      await expect(hud('player-hud-portrait')).toHaveCount(0);

      await setClientSetting(page, 'enablePlayerHud', true);
      await expect(hud('player-hud-portrait')).toBeVisible();
   });

   test('per-element disable hides only that element', async () => {
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();

      await setClientSetting(page, 'playerHudOptions', { portrait: { enabled: false } });
      await expect(hud('player-hud-portrait')).toHaveCount(0);
      await expect(hud('player-hud-action-menu')).toBeVisible();

      await setClientSetting(page, 'playerHudOptions', {});
      await expect(hud('player-hud-portrait')).toBeVisible();
   });

   test('combat-only hides the portrait outside combat and shows it during combat', async () => {
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();

      await setClientSetting(page, 'playerHudOptions', { portrait: { combatOnly: true } });
      await expect(hud('player-hud-portrait')).toHaveCount(0);

      // The combat belongs to the viewed scene, so it becomes the active combat the HUD's gate reads.
      await createCombat(page);
      await addCombatant(page, tokenIds.player);
      await startCombat(page);
      await expect(hud('player-hud-portrait')).toBeVisible();

      await endCombat(page);
      await expect(hud('player-hud-portrait')).toHaveCount(0);
   });

   test('switching to a tokenless scene hides the HUD; returning restores it', async () => {
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();

      await viewScene(page, emptySceneId);
      await expect(hud('player-hud-portrait')).toHaveCount(0);

      await viewScene(page, sceneId);
      await control();
      await expect(hud('player-hud-portrait')).toBeVisible();
   });

   test('player with no selection falls back to an owned token on the scene', async ({ browser }) => {
      await setOwnership(page, player2Id, 'E2E Player 1', 'OWNER');

      // Players view the active scene. Core makes the first scene created in a world with no active scene the active
      // one (measured: scratch-scene-1.log); the Scenes tab's Activate entry covers a world that has one.
      if (!await page.evaluate((id) => game.scenes.get(id).active, sceneId)) {
         await activateScene(page, sceneId);
      }
      await withClients(browser, { player: 'E2E Player 1' }, async ({ player }) => {
         await expect(player.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
         expect(
            await player.evaluate(() => game.titan.playerHud.resolveActors().primary.name),
            'the HUD shows the owned actor',
         ).toBe('E2E HUD Player 2');
      });
   });
});

test.describe('layout', () => {
   test('edit-mode drag moves the portrait and persists anchors', async () => {
      await control();
      await toggleEditMode(true);

      // Entering edit mode re-frames the element; the drag starts from the box read after that transition.
      const before = await dragElement('player-hud-portrait', 120, -80);
      await toggleEditMode(false);

      /** @type {object} The portrait anchors persisted by the drag. */
      const stored = (await getSetting(page, 'playerHudLayout')).positions.portrait;
      expect(stored.dx).toBeGreaterThan(100);

      // Leaving edit mode re-frames the element again; the settled box is the one the drag produced.
      const after = await hud('player-hud-portrait').boundingBox();
      expect(Math.abs(after.x - (before.x + 120))).toBeLessThanOrEqual(8);
      expect(Math.abs(after.y - (before.y - 80))).toBeLessThanOrEqual(8);
   });

   test('outside edit mode nothing drags', async () => {
      await control();
      /** @type {object} The stored layout before the gesture. */
      const storedBefore = await getSetting(page, 'playerHudLayout');
      const box = await dragElement('player-hud-portrait', 100, -60);

      /** @type {object} The portrait box after the gesture. */
      const after = await hud('player-hud-portrait').boundingBox();
      expect(Math.abs(after.x - box.x)).toBeLessThanOrEqual(1);
      expect(await getSetting(page, 'playerHudLayout')).toEqual(storedBefore);
   });

   test('minimize persists across remounts', async () => {
      await control();
      await hud('player-hud-portrait-minimize').click();
      await expect(hud('player-hud-portrait-restore')).toBeVisible();

      // Release and re-control: the changed selection key forces a full shell remount.
      await releaseControl();
      await expect(hud('player-hud-portrait')).toHaveCount(0);
      await control();

      await expect(hud('player-hud-portrait-restore')).toBeVisible();
      await hud('player-hud-portrait-restore').click();
      await expect(hud('player-hud-bar-stamina')).toBeVisible();
   });

   test('the HUD anchors to the expanded sidebar edge and stays put when the sidebar toggles', async () => {
      await control();
      const menu = hud('player-hud-action-menu');

      // The HUD anchors to the LEFT of the sidebar at its EXPANDED width, so its position is independent of the
      // sidebar's collapse state (chat notifications still surface in the freed space).
      await page.evaluate(() => ui.sidebar.expand());

      // The sidebar expands through a transition and the HUD re-anchors to its settled edge, so both the menu box and
      // the sidebar edge below are read only once that motion has finished.
      await waitForAnimations(page, 'body');

      /** @type {object} The menu box with the sidebar expanded. */
      const expanded = await menu.boundingBox();

      // Its right edge sits at (or left of) the expanded sidebar's left edge, never overlapping it.
      /** @type {number} The expanded sidebar's left edge. */
      const sidebarLeft = await page.evaluate(() => ui.sidebar.element.getBoundingClientRect().left);
      expect(expanded.x + expanded.width).toBeLessThanOrEqual(sidebarLeft + 1);

      // Collapsing the sidebar must NOT move the menu.
      await page.evaluate(() => ui.sidebar.collapse());
      await expect.poll(
         async () => Math.abs((await menu.boundingBox()).x - expanded.x) <= 2,
         { message: 'the HUD stays put when the sidebar collapses' },
      ).toBe(true);

      // Re-expanding must also leave it in place.
      await page.evaluate(() => ui.sidebar.expand());
      await expect.poll(
         async () => Math.abs((await menu.boundingBox()).x - expanded.x) <= 2,
         { message: 'the HUD stays put when the sidebar re-expands' },
      ).toBe(true);
   });

   test('the layout rect ends exactly at the expanded sidebar edge and does not move on collapse', async () => {
      await control();

      /**
       * Reads the HUD layout rect's right edge and the sidebar's left edge once the sidebar's motion has finished.
       * @returns {Promise<{rectRight: number, sidebarLeft: number}>} The two edges in pixels.
       */
      const edges = async () => {
         await waitForAnimations(page, 'body');
         await page.evaluate(() => window.dispatchEvent(new Event('resize')));
         return page.evaluate(() => {
            const rect = game.titan.playerHud.layoutState.rect;
            return {
               rectRight: rect.left + rect.width,
               sidebarLeft: Math.round(ui.sidebar.element.getBoundingClientRect().left),
            };
         });
      };
      await page.evaluate(() => ui.sidebar.expand());
      const expanded = await edges();
      await page.evaluate(() => ui.sidebar.collapse());
      const collapsed = await edges();

      // The rect's right edge sits exactly at the expanded sidebar's left edge.
      expect(expanded.rectRight).toBe(expanded.sidebarLeft);

      // Collapsing does not move the rect, even though the collapsed sidebar rail now sits well to its right.
      expect(collapsed.rectRight).toBe(expanded.rectRight);
      expect(collapsed.sidebarLeft).toBeGreaterThan(collapsed.rectRight);
   });

   test('a window resize clamps elements into the canvas rect', async () => {
      await control();
      await page.setViewportSize({
         width: 900,
         height: 600,
      });

      await expect.poll(
         () => page.evaluate(() => {
            /** @type {number} The sidebar's current rendered width. */
            const sidebarWidth = ui.sidebar?.element?.getBoundingClientRect()?.width ?? 0;
            const selector = '#titan-player-hud .hud-element, #titan-player-hud [data-testid^="player-hud-"]';

            return Array.from(document.querySelectorAll(selector))
               .filter((node) => node.dataset.testid?.match(/^player-hud-(portrait|action-menu|effects-panel)$/))
               .every((node) => {
                  const box = node.getBoundingClientRect();
                  return box.left >= -1 && box.top >= -1
                     && box.right <= (900 - sidebarWidth) + 1 && box.bottom <= 601;
               });
         }),
         { message: 'every HUD element clamps into the shrunken canvas rect' },
      ).toBe(true);
   });

   test('the action menu defaults to the right of the portrait with a right-opening flyout', async () => {
      await control();
      const portrait = hud('player-hud-portrait');
      const menu = hud('player-hud-action-menu');
      await expect(portrait).toBeVisible();
      await expect(menu).toBeVisible();

      // Visibility precedes the settled position, so the elements are measured only once still.
      await waitForAnimations(page, '#titan-player-hud');

      /** @type {object} The portrait and action-menu bounding boxes. */
      const boxes = {
         portrait: await portrait.boundingBox(),
         menu: await menu.boundingBox(),
      };

      // The menu's left edge sits just to the right of the portrait's right edge, bottoms aligned.
      expect(boxes.menu.x).toBeGreaterThanOrEqual(boxes.portrait.x + boxes.portrait.width - 2);
      expect(boxes.menu.x - (boxes.portrait.x + boxes.portrait.width)).toBeLessThanOrEqual(24);
      expect(Math.abs((boxes.menu.y + boxes.menu.height) - (boxes.portrait.y + boxes.portrait.height)))
         .toBeLessThanOrEqual(2);

      // The flyout opens to the right: open a category and confirm its lane sits right of the category bar.
      await hud('player-hud-category-skills').click();
      await expect(hud('player-hud-flyout')).toBeVisible();

      // The flyout slides into its lane; measuring before that finishes reads a mid-slide position.
      await waitForAnimations(page, '#titan-player-hud');
      const flyout = await hud('player-hud-flyout').boundingBox();
      const categories = await page.locator('#titan-player-hud .categories').boundingBox();
      expect(flyout.x).toBeGreaterThanOrEqual(categories.x + categories.width - 2);
      await page.keyboard.press('Escape');
   });

   test('the edit toolbar reset restores default positions', async () => {
      await control();
      const frame = hud('player-hud-portrait');
      /** @type {object} The portrait box at its default position. */
      const defaultBox = await frame.boundingBox();

      await toggleEditMode(true);
      await dragElement('player-hud-portrait', -200, -100);
      await expect.poll(
         async () => Math.abs((await frame.boundingBox()).x - defaultBox.x) > 100,
         { message: 'the drag moved the portrait' },
      ).toBe(true);

      await hud('player-hud-edit-reset').click();
      await expect.poll(
         async () => {
            /** @type {object} The portrait box after the reset. */
            const box = await frame.boundingBox();
            return Math.abs(box.x - defaultBox.x) <= 2 && Math.abs(box.y - defaultBox.y) <= 2;
         },
         { message: 'reset layout restores the default portrait position' },
      ).toBe(true);

      await hud('player-hud-edit-done').click();
      await expect(hud('player-hud-edit-toolbar')).toHaveCount(0);
   });

   test('the keybinding toggles edit mode', async () => {
      await control();
      await toggleEditMode(true);
      await toggleEditMode(false);
   });

   test('the settings app reset-all restores options and layout', async () => {
      await control();
      await setClientSetting(page, 'playerHudOptions', { portrait: { style: 'wideStrip' } });
      await toggleEditMode(true);
      await dragElement('player-hud-portrait', 150, 0);
      expect(
         await page.evaluate(() => game.titan.playerHud.layoutState.positions.portrait.dx),
         'the drag moved the portrait away from its default anchor',
      ).not.toBe(250);

      // The edit toolbar's settings button opens the HUD settings window.
      await hud('player-hud-edit-settings').click();
      await hud('player-hud-settings-reset-all').click();

      await expect.poll(
         () => page.evaluate(() => ({
            options: game.settings.get('titan', 'playerHudOptions'),
            portraitDx: game.titan.playerHud.layoutState.positions.portrait.dx,
         })),
         { message: 'reset-all restores stored options and live layout' },
      ).toEqual({
         options: {},
         portraitDx: 250,
      });

      // The toolbar's Done button leaves edit mode.
      await closeAllApps(page);
      await hud('player-hud-edit-done').click();
      await expect(hud('player-hud-edit-toolbar')).toHaveCount(0);
   });

   test('the hotbar is hidden by default and the setting shows it', async () => {
      await control();
      await expect(page.locator('#hotbar')).toBeHidden();

      await setClientSetting(page, 'showFoundryHotbar', true);
      await expect(page.locator('#hotbar')).toBeVisible();

      await setClientSetting(page, 'showFoundryHotbar', false);
      await expect(page.locator('#hotbar')).toBeHidden();
   });
});

test.describe('effects panel', () => {
   /** @type {string} The id of the panel effect on the HUD player. */
   let panelEffectId;
   /** @type {string} The uuid of the panel effect. */
   let panelEffectUuid;

   /** @type {import('@playwright/test').Locator} The panel effect's row. */
   const panelRow = () => hud('player-hud-effect-row').filter({ hasText: PANEL_EFFECT });

   /**
    * Expands a row of the panel when it is collapsed, and waits until its header offers Collapse.
    * @param {import('@playwright/test').Locator} row - The row.
    * @returns {Promise<import('@playwright/test').Locator>} The expanded row.
    */
   async function expandRow(row) {
      /** @type {import('@playwright/test').Locator} The header button of a collapsed row. */
      const collapsed = row.getByRole('button', { name: /: Expand$/ });
      if (await collapsed.count() > 0) {
         await collapsed.click();
      }
      await expect(row.getByRole('button', { name: /: Collapse$/ }), 'the row is expanded').toBeVisible();
      return row;
   }

   test.beforeAll(async () => {
      // The player carries Stunned (from the Token HUD) and one effect with a description and a check.
      await viewScene(page, sceneId);
      await applyCondition(page, tokenIds.player, 'stunned');
      panelEffectId = await addEffect(page, playerId, PANEL_EFFECT);
      panelEffectUuid = `Actor.${playerId}.ActiveEffect.${panelEffectId}`;
      await setDescription(page, panelEffectUuid, PANEL_DESCRIPTION);
      await addCheck(page, panelEffectUuid, { label: PANEL_CHECK });
      await closeAllApps(page);
   });

   test('the panel renders sections for conditions and effects', async () => {
      await control();
      await expect(hud('player-hud-effects-panel')).toBeVisible();
      await expect(hud('player-hud-effect-row')).toHaveCount(2);
   });

   test('a row expands to its description and controls', async () => {
      await control();
      const row = await expandRow(panelRow());
      await expect(row.getByText(PANEL_DESCRIPTION)).toBeVisible();
      for (const id of [
         'duration-up',
         'chat',
         'sheet',
         'delete',
      ]) {
         await expect(row.locator(`[data-testid="player-hud-effect-${id}"]`)).toBeVisible();
      }
   });

   test('the duration controls step the effect duration', async () => {
      await control();
      /** @type {number} The effect's remaining duration before the steps. */
      const remaining = await page.evaluate(
         (uuid) => fromUuid(uuid).then((effect) => effect.system.duration.remaining),
         panelEffectUuid,
      );
      /** @type {() => Promise<number>} Reads the remaining duration. */
      const read = () => page.evaluate(
         (uuid) => fromUuid(uuid).then((effect) => effect.system.duration.remaining),
         panelEffectUuid,
      );
      const row = await expandRow(panelRow());

      await row.locator('[data-testid="player-hud-effect-duration-up"]').click();
      await expect.poll(read, { message: 'the duration increments from the panel' }).toBe(remaining + 1);

      await row.locator('[data-testid="player-hud-effect-duration-down"]').click();
      await expect.poll(read, { message: 'the duration decrements from the panel' }).toBe(remaining);
   });

   test('send to chat creates the effect card', async () => {
      await control();
      const row = await expandRow(panelRow());
      await row.locator('[data-testid="player-hud-effect-chat"]').click();
      await expect.poll(
         () => page.evaluate(() => game.messages.contents.at(-1)?.type),
         { message: 'the effect card lands in chat' },
      ).toBe('effect');
   });

   test('open sheet opens the effect sheet', async () => {
      await control();
      const row = await expandRow(panelRow());
      await row.locator('[data-testid="player-hud-effect-sheet"]').click();
      await expect.poll(
         () => page.evaluate((id) => {
            return Array.from(foundry.applications.instances.values()).some((app) => app.document?.id === id);
         }, panelEffectId),
         { message: 'the effect sheet opens from the panel' },
      ).toBe(true);
   });

   test('the row header updates in place when the effect is renamed in its sheet', async () => {
      await control();
      const row = await expandRow(panelRow());
      await expect(row.getByText(PANEL_DESCRIPTION)).toBeVisible();
      await expect(
         row.getByRole('button').filter({ hasText: PANEL_CHECK }).first(),
         'the expanded row renders the embedded check',
      ).toBeVisible();

      // The name field of the effect sheet, which the row's sheet button opens, renames the effect; the row header
      // follows in place, and the description still showing proves the row did not remount (its expanded state is
      // local to the row).
      await row.locator('[data-testid="player-hud-effect-sheet"]').click();
      const sheet = page.locator(`.application[id$="ActiveEffect-${panelEffectId}"]`);
      await expect(sheet).toBeVisible();
      const renamed = `${PANEL_EFFECT} Renamed`;
      try {
         await commitText(sheet.locator('.document-name input'), renamed);
         await expect(hud('player-hud-effect-row').locator('.name').filter({ hasText: renamed }))
            .toHaveText(renamed);
         await expect(
            hud('player-hud-effects-panel').getByText(PANEL_DESCRIPTION),
            'the row stays expanded across the rename',
         ).toBeVisible();
      }
      finally {
         await commitText(sheet.locator('.document-name input'), PANEL_EFFECT);
      }
      await expect(panelRow().locator('.name')).toHaveText(PANEL_EFFECT);
   });

   test('the embedded check of an expanded row rolls through the HUD and posts an item check', async () => {
      await control();
      const button = (await expandRow(panelRow())).getByRole('button').filter({ hasText: PANEL_CHECK }).first();
      await expect(button, 'the expanded row renders the embedded check').toBeVisible();

      /** @type {number} The chat message count before the roll. */
      const before = await page.evaluate(() => game.messages.size);
      await button.click();
      await expect.poll(
         () => page.evaluate((count) => game.messages.contents.slice(count).map((message) => message.type), before),
         { message: 'the HUD check roll posts an itemCheck message' },
      ).toEqual(['itemCheck']);
   });

   test('remove deletes the effect when deletions are not confirmed', async () => {
      const id = await addEffect(page, playerId, 'E2E HUD Removable Effect');
      await closeAllApps(page);
      await setClientSetting(page, 'confirmDeletingEffects', false);
      await control();

      const row = hud('player-hud-effect-row').filter({ hasText: 'E2E HUD Removable Effect' });
      await expect(row).toBeVisible();
      await expandRow(row);
      await row.locator('[data-testid="player-hud-effect-delete"]').click();
      await expect.poll(
         () => page.evaluate(({ actorId, id }) => game.actors.get(actorId).effects.has(id), {
            actorId: playerId,
            id,
         }),
         { message: 'the effect is deleted from the panel' },
      ).toBe(false);
      await expect(row).toHaveCount(0);
   });

   test('remove asks first when deletions are confirmed, and Cancel keeps the effect', async () => {
      const id = await addEffect(page, playerId, 'E2E HUD Kept Effect');
      await closeAllApps(page);
      await control();

      const row = hud('player-hud-effect-row').filter({ hasText: 'E2E HUD Kept Effect' });
      await expandRow(row);
      await row.locator('[data-testid="player-hud-effect-delete"]').click();

      /** @type {import('@playwright/test').Locator} The confirmation dialog the Remove button opened. */
      const dialog = page.locator(CONFIRMATION);
      await expect(dialog, 'the confirmation dialog opens').toBeVisible();
      expect(
         await page.evaluate(({ actorId, id }) => game.actors.get(actorId).effects.has(id), {
            actorId: playerId,
            id,
         }),
         'the effect waits for the answer',
      ).toBe(true);
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog, 'Cancel closes the dialog').toHaveCount(0);
      expect(
         await page.evaluate(({ actorId, id }) => game.actors.get(actorId).effects.has(id), {
            actorId: playerId,
            id,
         }),
         'Cancel keeps the effect',
      ).toBe(true);
      await expect(row, 'the row stays').toHaveCount(1);
   });

   test('the owner-gated remove confirms through, and the panel hides once the actor has no effects', async () => {
      const id = await addEffect(page, player2Id, 'E2E HUD Lone Effect');
      await closeAllApps(page);
      await control('player2');

      await expect(hud('player-hud-portrait'), 'the HUD shows the second player').toContainText('E2E HUD Player 2');
      await expect(hud('player-hud-effects-panel')).toBeVisible();
      const row = await expandRow(hud('player-hud-effect-row'));
      await row.locator('[data-testid="player-hud-effect-delete"]').click();

      /** @type {import('@playwright/test').Locator} The confirmation dialog the Remove button opened. */
      const dialog = page.locator(CONFIRMATION);
      await expect(dialog, 'the confirmation dialog opens').toBeVisible();
      await dialog.getByRole('button', { name: 'Delete Effect' }).click();
      await expect.poll(
         () => page.evaluate(({ actorId, id }) => game.actors.get(actorId).effects.has(id), {
            actorId: player2Id,
            id,
         }),
         { message: 'the confirmed delete removed the effect' },
      ).toBe(false);

      // With its only entry gone the panel hides entirely.
      await expect(hud('player-hud-effects-panel')).toHaveCount(0);
   });

   test('the icon tray style shows a popout that Escape dismisses', async () => {
      await control();
      await setClientSetting(page, 'playerHudOptions', { effectsPanel: { style: 'tray' } });

      const icons = hud('player-hud-effect-icon');
      await expect(icons.first()).toBeVisible();
      await expect(hud('player-hud-effect-row')).toHaveCount(0);

      await icons.last().click();
      await expect(hud('player-hud-effect-popout')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(hud('player-hud-effect-popout')).toHaveCount(0);
   });

   test('the group selection hides the panel', async () => {
      await control();
      await expect(hud('player-hud-effects-panel')).toBeVisible();

      await controlPlacedTokens(page, [
         tokenIds.player,
         tokenIds.player2,
      ]);
      await expect(hud('player-hud-effects-panel')).toHaveCount(0);
   });

   test('an edit-mode resize persists the panel size', async () => {
      await control();
      await toggleEditMode(true);

      /** @type {{width: number, height: number}} The panel size before the resize drag. */
      const before = await page.evaluate(() => ({ ...game.titan.playerHud.layoutState.effectsPanelSize }));
      const handle = hud('player-hud-effects-panel-resize');
      await expect(handle).toBeVisible();

      // Edit mode reveals the handle through a transition; the drag starts from the settled box.
      await waitForAnimations(page, '#titan-player-hud');

      /** @type {object} The resize handle's box. */
      const box = await handle.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 5 });
      await page.mouse.up();
      await toggleEditMode(false);

      await expect.poll(
         async () => (await getSetting(page, 'playerHudLayout')).effectsPanelSize?.width,
         { message: 'the resized width persists to the layout setting' },
      ).toBe(before.width + 60);
      await expect.poll(
         async () => (await getSetting(page, 'playerHudLayout')).effectsPanelSize?.height,
         { message: 'the resized height persists to the layout setting' },
      ).toBe(before.height + 40);
   });

   test('the panel body scrolls when content exceeds its size', async () => {
      for (let index = 0; index < 12; index++) {
         await addEffect(page, playerId, `E2E HUD Bulk Effect ${index}`);
      }
      await closeAllApps(page);
      await control();

      await expect(hud('player-hud-effect-row')).toHaveCount(
         await page.evaluate((id) => game.actors.get(id).effects.size, playerId),
      );
      await expect.poll(
         () => page.evaluate(() => {
            const body = document.querySelector('[data-testid="player-hud-effects-panel"] [class*="body"]');
            return !!body && body.scrollHeight > body.clientHeight;
         }),
         { message: 'the panel body overflows into a scrollbar' },
      ).toBe(true);
   });
});

test.describe('after a reload', () => {
   test('a dragged position persists across a reload', async () => {
      test.setTimeout(120_000);
      await control();
      await toggleEditMode(true);
      await dragElement('player-hud-portrait', 150, -80);
      await toggleEditMode(false);

      /** @type {object} The dragged portrait box before the reload. */
      const before = await hud('player-hud-portrait').boundingBox();
      expect(before, 'the portrait is shown').not.toBeNull();

      await reloadWorld(page);
      await control();

      await expect.poll(
         async () => {
            /** @type {object | null} The portrait box after the reload. */
            const after = await hud('player-hud-portrait').boundingBox();
            return after ? Math.abs(after.x - before.x) <= 8 && Math.abs(after.y - before.y) <= 8 : false;
         },
         { message: 'the dragged position survives a reload' },
      ).toBe(true);
   });
});

