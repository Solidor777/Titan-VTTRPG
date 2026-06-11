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
/** @type {string[]} Fixture actor names created by this file, deleted in afterAll. */
const fixtureNames = [];

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await deleteOrphanedTokens(page);

   // Start from a clean slate: a crashed prior run can leave stale fixtures with duplicate items.
   for (const name of ['HUD Layout Player', 'HUD Layout Player 2']) {
      await deleteFixtureActor(page, name);
   }
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
      await game.settings.set('titan', 'playerHudLayout', {});
      game.titan.playerHud.resetLayout();
   });
   for (const name of fixtureNames) {
      await deleteFixtureActor(page, name);
   }
   await page?.close();
});

/**
 * Creates a character actor (if missing) with a controlled token on the active scene, reusing an
 * existing token rather than stacking a new one per call.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {object} params - Seed parameters.
 * @param {string} params.name - The actor and token name.
 * @param {boolean} [params.releaseOthers] - Whether controlling releases other tokens.
 * @returns {Promise<string>} The actor's id.
 */
async function seedControlledActor(page, { name, releaseOthers = true }) {
   if (!fixtureNames.includes(name)) {
      fixtureNames.push(name);
   }
   await page.evaluate(async ({ name }) => {
      if (!game.actors.getName(name)) {
         await Actor.create({ name, type: 'player' });
      }
   }, { name });

   /** @type {boolean} Whether the actor already has a drawn token on the viewed scene. */
   const hasToken = await page.evaluate(({ name, releaseOthers }) => {
      const actor = game.actors.getName(name);
      const token = canvas.tokens?.placeables.find((placeable) => placeable.actor?.id === actor.id);
      if (token) {
         token.control({ releaseOthers });
         game.titan.playerHud?.refresh();
         return true;
      }
      return false;
   }, { name, releaseOthers });

   if (!hasToken) {
      await controlFixtureActorToken(page, {
         actorName: name,
         fallbackSceneName: 'E2E Player HUD Scene',
         releaseOthers,
      });
   }

   return page.evaluate((name) => game.actors.getName(name).id, name);
}

/**
 * Patches the action-menu options.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {object} patch - The actionMenu options patch.
 * @returns {Promise<void>} Resolves once the setting write lands.
 */
async function setMenuOptions(page, patch) {
   await page.evaluate(async (patch) => {
      const current = game.settings.get('titan', 'playerHudOptions') ?? {};
      await game.settings.set('titan', 'playerHudOptions',
         foundry.utils.mergeObject(current, { actionMenu: patch }, { inplace: false }));
   }, patch);
}

/**
 * Polls until two locators' bounding boxes satisfy a comparison on one axis — element measures
 * settle via ResizeObserver a frame after remounts, so one-shot box snapshots race the layout.
 * @param {import('@playwright/test').Locator} first - The locator whose edge is compared.
 * @param {import('@playwright/test').Locator} second - The reference locator.
 * @param {Function} compare - Receives (firstBox, secondBox) and reports whether they satisfy the expected arrangement.
 * @param {string} message - The poll failure message.
 * @returns {Promise<void>} Resolves once the arrangement holds.
 */
async function expectBoxes(first, second, compare, message) {
   await expect.poll(
      async () => {
         /** @type {object | null} The first locator's box. */
         const firstBox = await first.boundingBox();
         /** @type {object | null} The second locator's box. */
         const secondBox = await second.boundingBox();
         return !!firstBox && !!secondBox && compare(firstBox, secondBox);
      },
      { message },
   ).toBe(true);
}

/**
 * Opens a category's cascade, dismissing any cascade left open by an earlier step first
 * (clicking an already-open category would toggle it closed).
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {string} key - The category key to open.
 * @returns {Promise<void>} Resolves once the flyout is visible.
 */
async function openCategory(page, key) {
   if (await page.locator('[data-testid="player-hud-flyout"]').count() > 0) {
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="player-hud-flyout"]')).toHaveCount(0);
   }
   await page.locator(`[data-testid="player-hud-category-${key}"]`).click();
   await expect(page.locator('[data-testid="player-hud-flyout"]')).toBeVisible();
}

/**
 * Seeds the single-actor fixture with one equipped weapon (so the weapons category renders) and
 * controls its token.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<string>} The fixture weapon's id.
 */
async function seedWeaponFixture(page) {
   const actorId = await seedControlledActor(page, { name: 'HUD Layout Player' });
   return page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      if (!actor.items.getName('HUD Layout Blade')) {
         await actor.createEmbeddedDocuments('Item', [{
            name: 'HUD Layout Blade',
            type: 'weapon',
            system: { equipped: true },
         }]);
      }
      return actor.items.getName('HUD Layout Blade').id;
   }, actorId);
}

test('vertical layout stacks categories in a column; horizontal in a row', async () => {
   await seedControlledActor(page, { name: 'HUD Layout Player' });
   const skills = page.locator('[data-testid="player-hud-category-skills"]');
   const resistances = page.locator('[data-testid="player-hud-category-resistances"]');

   /** @type {{x: number, y: number}} Skills button box under the vertical layout. */
   let skillsBox = await skills.boundingBox();
   /** @type {{x: number, y: number}} Resistances button box under the vertical layout. */
   let resistancesBox = await resistances.boundingBox();
   expect(Math.abs(skillsBox.x - resistancesBox.x)).toBeLessThan(2);
   expect(resistancesBox.y).toBeGreaterThan(skillsBox.y);

   await setMenuOptions(page, { layout: 'horizontal' });
   skillsBox = await skills.boundingBox();
   resistancesBox = await resistances.boundingBox();
   expect(Math.abs(skillsBox.y - resistancesBox.y)).toBeLessThan(2);
   expect(resistancesBox.x).toBeGreaterThan(skillsBox.x);

   await setMenuOptions(page, { layout: 'vertical' });
});

test('sub-options expand to the configured side and lanes never overlap', async () => {
   await seedControlledActor(page, { name: 'HUD Layout Player' });
   const flyout = page.locator('[data-testid="player-hud-flyout"]');
   const skills = page.locator('[data-testid="player-hud-category-skills"]');

   // Park the menu mid-screen so the flyout has room on every side: the vertical offset leaves a
   // full flyout's height of space both above AND below the bar for the horizontal-layout steps.
   await page.evaluate(() => {
      game.titan.playerHud.layoutState.positions.actionMenu = {
         anchorX: 'left',
         anchorY: 'bottom',
         dx: 450,
         dy: 320,
      };
   });

   // Vertical, sub-options left (the default): the flyout lane ends before the bar begins.
   await openCategory(page, 'skills');
   await expectBoxes(flyout, skills,
      (flyoutBox, barBox) => flyoutBox.x + flyoutBox.width <= barBox.x + 1,
      'vertical-left: the flyout lane ends before the bar');

   // Vertical, sub-options right: the flyout lane begins after the bar ends.
   await setMenuOptions(page, { directions: { vertical: { subOptions: 'right' } } });
   await openCategory(page, 'skills');
   await expectBoxes(flyout, skills,
      (flyoutBox, barBox) => flyoutBox.x >= barBox.x + barBox.width - 1,
      'vertical-right: the flyout lane begins after the bar');

   // Horizontal, sub-options up: the flyout sits fully above the bar.
   await setMenuOptions(page, {
      layout: 'horizontal',
      directions: { vertical: { subOptions: 'left' }, horizontal: { subOptions: 'up' } },
   });
   await openCategory(page, 'skills');
   await expectBoxes(flyout, skills,
      (flyoutBox, barBox) => flyoutBox.y + flyoutBox.height <= barBox.y + 1,
      'horizontal-up: the flyout sits above the bar');

   // Horizontal, sub-options down: the flyout sits fully below the bar.
   await setMenuOptions(page, { directions: { horizontal: { subOptions: 'down' } } });
   await openCategory(page, 'skills');
   await expectBoxes(flyout, skills,
      (flyoutBox, barBox) => flyoutBox.y >= barBox.y + barBox.height - 1,
      'horizontal-down: the flyout sits below the bar');

   // Reset to defaults (vertical layout, sub-options left) so the next test does not inherit the
   // 'right' direction set above, and re-dock the menu at its default corner.
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
      game.titan.playerHud.layoutState.positions.actionMenu = {
         anchorX: 'right',
         anchorY: 'bottom',
         dx: 16,
         dy: 16,
      };
   });
});

test('sub-buttons form a third disjoint lane', async () => {
   const weaponId = await seedWeaponFixture(page);
   await openCategory(page, 'weapons');
   const subOption = page.locator(`[data-testid="player-hud-sub-option-weapons-${weaponId}"]`);
   await subOption.hover();

   const subButton = page.locator(`[data-testid="player-hud-sub-button-${weaponId}-open-sheet"]`);
   await expect(subButton).toBeVisible();

   /** @type {object} The sub-button lane probe box. */
   const buttonBox = await subButton.boundingBox();
   /** @type {object} The sub-option lane box. */
   const flyoutBox = await page.locator('[data-testid="player-hud-flyout"]').boundingBox();
   /** @type {object} The category lane probe box. */
   const barBox = await page.locator('[data-testid="player-hud-category-weapons"]').boundingBox();

   // The default cascade runs right-to-left: sub-buttons end before the sub-options begin, which
   // in turn end before the category bar begins.
   expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(flyoutBox.x + 1);
   expect(flyoutBox.x + flyoutBox.width).toBeLessThanOrEqual(barBox.x + 1);
});

test('the configured direction is honored at the screen edge (no auto-flip)', async () => {
   await seedWeaponFixture(page);

   // Park the menu against the LEFT edge the way an edit-mode drag would. The configured direction
   // is authoritative, so the default left cascade keeps opening left rather than flipping away.
   await page.evaluate(() => {
      game.titan.playerHud.layoutState.positions.actionMenu = {
         anchorX: 'left',
         anchorY: 'bottom',
         dx: 8,
         dy: 16,
      };
   });
   await openCategory(page, 'skills');
   await expectBoxes(
      page.locator('[data-testid="player-hud-flyout"]'),
      page.locator('[data-testid="player-hud-category-skills"]'),
      (flyoutBox, barBox) => flyoutBox.x + flyoutBox.width <= barBox.x + 1,
      'no flip: the flyout opens to the configured (left) side even at the left edge',
   );

   await page.evaluate(() => {
      game.titan.playerHud.layoutState.positions.actionMenu = {
         anchorX: 'right',
         anchorY: 'bottom',
         dx: 16,
         dy: 16,
      };
   });
});

test('long lists window and wheel-scroll', async () => {
   await seedControlledActor(page, { name: 'HUD Layout Player' });
   await setMenuOptions(page, { windowSize: 5 });
   await openCategory(page, 'skills');

   const subOptions = page.locator('[data-testid^="player-hud-sub-option-skills-"]');
   await expect(subOptions).toHaveCount(5);
   await expect(page.locator('[data-testid="player-hud-flyout-down"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-flyout-up"]')).toHaveCount(0);

   /** @type {string} The first visible skill before scrolling. */
   const firstBefore = await subOptions.first().getAttribute('data-testid');
   await page.locator('[data-testid="player-hud-flyout"]').hover();
   await page.mouse.wheel(0, 120);
   await expect(subOptions.first()).not.toHaveAttribute('data-testid', firstBefore);
   await expect(page.locator('[data-testid="player-hud-flyout-up"]')).toBeVisible();

   await setMenuOptions(page, { windowSize: 8 });
});

test('per-category disable removes the category', async () => {
   await seedControlledActor(page, { name: 'HUD Layout Player' });
   await expect(page.locator('[data-testid="player-hud-category-skills"]')).toBeVisible();

   await setMenuOptions(page, { categories: { skills: false } });
   await expect(page.locator('[data-testid="player-hud-category-skills"]')).toHaveCount(0);
   await expect(page.locator('[data-testid="player-hud-category-resistances"]')).toBeVisible();

   await setMenuOptions(page, { categories: { skills: true } });
   await expect(page.locator('[data-testid="player-hud-category-skills"]')).toBeVisible();
});

test('group mode shows only the three group categories', async () => {
   await seedWeaponFixture(page);
   await seedControlledActor(page, { name: 'HUD Layout Player 2', releaseOthers: false });

   await expect(page.locator('[data-testid="player-hud-category-skills"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-category-resistances"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-category-utility"]')).toBeVisible();
   await expect(page.locator('[data-testid^="player-hud-category-"]')).toHaveCount(3);
});
