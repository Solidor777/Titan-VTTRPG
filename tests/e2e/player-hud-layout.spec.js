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
/** @type {string} The fixture actor this file drives. */
const FIXTURE_NAME = 'HUD Frame Player';

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await deleteOrphanedTokens(page);
   await deleteFixtureActor(page, FIXTURE_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
      await game.settings.set('titan', 'playerHudLayout', {});
      await game.settings.set('titan', 'showFoundryHotbar', false);
      game.titan.playerHud.resetLayout();
   });
   await deleteFixtureActor(page, FIXTURE_NAME);
   await page?.close();
});

/**
 * Creates the fixture actor (if missing) with a controlled token, reusing an existing token
 * rather than stacking a new one per call.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<string>} The fixture actor's id.
 */
async function seedControlledActor(page) {
   await page.evaluate(async (name) => {
      if (!game.actors.getName(name)) {
         await Actor.create({ name, type: 'player' });
      }
   }, FIXTURE_NAME);

   /** @type {boolean} Whether the actor already has a drawn token on the viewed scene. */
   const hasToken = await page.evaluate((name) => {
      const actor = game.actors.getName(name);
      const token = canvas.tokens?.placeables.find((placeable) => placeable.actor?.id === actor.id);
      if (token) {
         token.control({ releaseOthers: true });
         game.titan.playerHud?.refresh();
         return true;
      }
      return false;
   }, FIXTURE_NAME);

   if (!hasToken) {
      await controlFixtureActorToken(page, {
         actorName: FIXTURE_NAME,
         fallbackSceneName: 'E2E Player HUD Scene',
      });
   }

   return page.evaluate((name) => game.actors.getName(name).id, FIXTURE_NAME);
}

test('edit-mode drag moves the portrait and persists anchors', async () => {
   await seedControlledActor(page);
   await page.evaluate(() => game.titan.playerHud.toggleEditMode());
   const frame = page.locator('[data-testid="player-hud-portrait"]');
   /** @type {object} The portrait box before the drag. */
   const box = await frame.boundingBox();
   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
   await page.mouse.down();
   await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 80, { steps: 8 });
   await page.mouse.up();
   await page.evaluate(() => game.titan.playerHud.toggleEditMode());

   /** @type {object} The portrait anchors persisted by the drag. */
   const stored = await page.evaluate(() => game.settings.get('titan', 'playerHudLayout').positions.portrait);
   expect(stored.dx).toBeGreaterThan(100);
   /** @type {object} The portrait box after the drag. */
   const after = await frame.boundingBox();
   expect(Math.abs(after.x - (box.x + 120))).toBeLessThanOrEqual(8);
   expect(Math.abs(after.y - (box.y - 80))).toBeLessThanOrEqual(8);
});

test('outside edit mode nothing drags', async () => {
   await seedControlledActor(page);
   const frame = page.locator('[data-testid="player-hud-portrait"]');
   /** @type {object} The portrait box before the gesture. */
   const box = await frame.boundingBox();
   /** @type {object} The stored layout before the gesture. */
   const storedBefore = await page.evaluate(() => game.settings.get('titan', 'playerHudLayout'));

   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
   await page.mouse.down();
   await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 - 60, { steps: 5 });
   await page.mouse.up();

   /** @type {object} The portrait box after the gesture. */
   const after = await frame.boundingBox();
   expect(Math.abs(after.x - box.x)).toBeLessThanOrEqual(1);
   /** @type {object} The stored layout after the gesture. */
   const storedAfter = await page.evaluate(() => game.settings.get('titan', 'playerHudLayout'));
   expect(storedAfter).toEqual(storedBefore);
});

test('a dragged position persists across a reload', async () => {
   await seedControlledActor(page);
   const frame = page.locator('[data-testid="player-hud-portrait"]');
   /** @type {object} The dragged portrait box before the reload. */
   const before = await frame.boundingBox();

   await page.reload();
   await page.evaluate(async () => {
      await titanWait(() => game.ready === true, { message: 'world ready after reload', timeout: 30000 });
   });
   await seedControlledActor(page);

   await expect.poll(
      async () => {
         /** @type {object | null} The portrait box after the reload. */
         const after = await frame.boundingBox();
         return after ? Math.abs(after.x - before.x) <= 8 && Math.abs(after.y - before.y) <= 8 : false;
      },
      { message: 'the dragged position survives a reload' },
   ).toBe(true);

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudLayout', {});
      game.titan.playerHud.resetLayout();
   });
});

test('minimize persists across remounts', async () => {
   await seedControlledActor(page);
   await page.locator('[data-testid="player-hud-portrait-minimize"]').click();
   await expect(page.locator('[data-testid="player-hud-portrait-restore"]')).toBeVisible();

   // Release and re-control: the changed selection key forces a full shell remount.
   await page.evaluate(() => {
      canvas.tokens.releaseAll();
      game.titan.playerHud.refresh();
   });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);
   await seedControlledActor(page);

   await expect(page.locator('[data-testid="player-hud-portrait-restore"]')).toBeVisible();
   await page.locator('[data-testid="player-hud-portrait-restore"]').click();
   await expect(page.locator('[data-testid="player-hud-bar-stamina"]')).toBeVisible();
});

test('the HUD anchors to the expanded sidebar edge and stays put when the sidebar toggles', async () => {
   await seedControlledActor(page);
   const menu = page.locator('[data-testid="player-hud-action-menu"]');

   // The HUD anchors to the LEFT of the sidebar at its EXPANDED width, so its position is independent
   // of the sidebar's collapse state (chat notifications still surface in the freed space).
   await page.evaluate(() => ui.sidebar.expand());
   /** @type {object} The menu box with the sidebar expanded. */
   const expanded = await menu.boundingBox();

   // Its right edge sits at (or left of) the expanded sidebar's left edge — never overlapping it.
   /** @type {number} The expanded sidebar's left edge. */
   const sidebarLeft = await page.evaluate(() => ui.sidebar.element.getBoundingClientRect().left);
   expect(expanded.x + expanded.width).toBeLessThanOrEqual(sidebarLeft + 1);

   // Collapsing the sidebar must NOT move the menu.
   await page.evaluate(() => ui.sidebar.collapse());
   await expect.poll(
      async () => {
         /** @type {object | null} The menu box after collapse. */
         const box = await menu.boundingBox();
         return box ? Math.abs(box.x - expanded.x) <= 2 : false;
      },
      { message: 'the HUD stays put when the sidebar collapses', timeout: 10000 },
   ).toBe(true);

   // Re-expanding must also leave it in place.
   await page.evaluate(() => ui.sidebar.expand());
   await expect.poll(
      async () => {
         /** @type {object | null} The menu box after re-expand. */
         const box = await menu.boundingBox();
         return box ? Math.abs(box.x - expanded.x) <= 2 : false;
      },
      { message: 'the HUD stays put when the sidebar re-expands', timeout: 10000 },
   ).toBe(true);
});

test('a window resize clamps elements into the canvas rect', async () => {
   await seedControlledActor(page);
   await page.setViewportSize({ width: 900, height: 600 });

   await expect.poll(
      () => page.evaluate(() => {
         /** @type {number} The sidebar's current rendered width. */
         const sidebarWidth = ui.sidebar?.element?.getBoundingClientRect()?.width ?? 0;
         return Array.from(document.querySelectorAll('#titan-player-hud .hud-element, #titan-player-hud [data-testid^="player-hud-"]'))
            .filter((node) => node.dataset.testid?.match(/^player-hud-(portrait|action-menu|effects-panel)$/))
            .every((node) => {
               const box = node.getBoundingClientRect();
               return box.left >= -1 && box.top >= -1
                  && box.right <= (900 - sidebarWidth) + 1 && box.bottom <= 601;
            });
      }),
      { message: 'every HUD element clamps into the shrunken canvas rect', timeout: 10000 },
   ).toBe(true);

   await page.setViewportSize({ width: 1280, height: 720 });
});

test('the action menu defaults to the right of the portrait with a right-opening flyout', async () => {
   await seedControlledActor(page);

   // Restore factory defaults (empty stored settings → createDefaultHud* values).
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudLayout', {});
      await game.settings.set('titan', 'playerHudOptions', {});
      game.titan.playerHud.resetLayout();
      game.titan.playerHud.refresh({ force: true });
   });

   const portrait = page.locator('[data-testid="player-hud-portrait"]');
   const menu = page.locator('[data-testid="player-hud-action-menu"]');
   await expect(portrait).toBeVisible();
   await expect(menu).toBeVisible();

   /** @type {object} The portrait and action-menu bounding boxes. */
   const boxes = await page.evaluate(() => {
      const r = (sel) => {
         const b = document.querySelector(sel).getBoundingClientRect();
         return { left: Math.round(b.left), right: Math.round(b.right), bottom: Math.round(b.bottom), width: Math.round(b.width) };
      };
      return { portrait: r('[data-testid="player-hud-portrait"]'), menu: r('[data-testid="player-hud-action-menu"]') };
   });

   // The menu's left edge sits just to the right of the portrait's right edge, bottoms aligned.
   expect(boxes.menu.left).toBeGreaterThanOrEqual(boxes.portrait.right - 2);
   expect(boxes.menu.left - boxes.portrait.right).toBeLessThanOrEqual(24);
   expect(Math.abs(boxes.menu.bottom - boxes.portrait.bottom)).toBeLessThanOrEqual(2);

   // The flyout opens to the right: open a category and confirm its lane sits right of the category bar.
   await page.locator('[data-testid="player-hud-category-skills"]').click();
   await expect(page.locator('[data-testid="player-hud-flyout"]')).toBeVisible();
   /** @type {boolean} Whether the flyout lane is to the right of the categories bar. */
   const flyoutRight = await page.evaluate(() => {
      const cats = document.querySelector('#titan-player-hud .categories').getBoundingClientRect();
      const flyout = document.querySelector('[data-testid="player-hud-flyout"]').getBoundingClientRect();
      return flyout.left >= cats.right - 2;
   });
   expect(flyoutRight).toBe(true);
   await page.keyboard.press('Escape');
});

test('the edit toolbar reset restores default positions', async () => {
   await seedControlledActor(page);
   const frame = page.locator('[data-testid="player-hud-portrait"]');
   /** @type {object} The portrait box at its default position. */
   const defaultBox = await frame.boundingBox();

   await page.evaluate(() => game.titan.playerHud.toggleEditMode());
   await page.mouse.move(defaultBox.x + defaultBox.width / 2, defaultBox.y + defaultBox.height / 2);
   await page.mouse.down();
   await page.mouse.move(defaultBox.x + defaultBox.width / 2 - 200, defaultBox.y + defaultBox.height / 2 - 100, { steps: 5 });
   await page.mouse.up();

   await page.locator('[data-testid="player-hud-edit-reset"]').click();
   await expect.poll(
      async () => {
         /** @type {object | null} The portrait box after the reset. */
         const box = await frame.boundingBox();
         return box ? Math.abs(box.x - defaultBox.x) <= 2 && Math.abs(box.y - defaultBox.y) <= 2 : false;
      },
      { message: 'reset layout restores the default portrait position' },
   ).toBe(true);

   await page.locator('[data-testid="player-hud-edit-done"]').click();
   await expect(page.locator('[data-testid="player-hud-edit-toolbar"]')).toHaveCount(0);
});

test('the keybinding toggles edit mode', async () => {
   await seedControlledActor(page);
   await page.keyboard.press('Shift+H');
   await expect(page.locator('[data-testid="player-hud-edit-toolbar"]')).toBeVisible();
   await page.keyboard.press('Shift+H');
   await expect(page.locator('[data-testid="player-hud-edit-toolbar"]')).toHaveCount(0);
});

test('the settings app reset-all restores options and layout', async () => {
   await seedControlledActor(page);
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', { portrait: { style: 'wideStrip' } });
      game.titan.playerHud.layoutState.positions.portrait.dx = 700;
      game.titan.playerHud.layoutState.persist();
   });

   await page.evaluate(() => game.titan.playerHudSettings.render(true));
   await page.locator('[data-testid="player-hud-settings-reset-all"]').click();

   await expect.poll(
      () => page.evaluate(() => ({
         options: game.settings.get('titan', 'playerHudOptions'),
         portraitDx: game.titan.playerHud.layoutState.positions.portrait.dx,
      })),
      { message: 'reset-all restores stored options and live layout' },
   ).toEqual({ options: {}, portraitDx: 250 });
});

test('the hotbar is hidden by default and the setting shows it', async () => {
   await seedControlledActor(page);
   await expect(page.locator('#hotbar')).toBeHidden();

   await page.evaluate(async () => {
      await game.settings.set('titan', 'showFoundryHotbar', true);
   });
   await expect(page.locator('#hotbar')).toBeVisible();

   await page.evaluate(async () => {
      await game.settings.set('titan', 'showFoundryHotbar', false);
   });
   await expect(page.locator('#hotbar')).toBeHidden();
});
