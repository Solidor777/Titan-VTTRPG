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
/** @type {string} The single fixture actor this file drives. */
const FIXTURE_NAME = 'HUD Portrait Player';

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
   // Restore HUD settings mutated by these tests, then remove the fixture.
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
      await game.settings.set('titan', 'playerHudLayout', {});
   });
   await deleteFixtureActor(page, FIXTURE_NAME);
   await page?.close();
});

/**
 * Creates the fixture actor (if missing) of the given type with a controlled token, reusing an
 * existing token rather than stacking a new one per call.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {object} [params] - Seed parameters.
 * @param {string} [params.type] - The actor type ('player' or 'npc').
 * @returns {Promise<string>} The fixture actor's id.
 */
async function seedControlledActor(page, { type = 'player' } = {}) {
   /** @type {boolean} Whether an actor of the requested type already exists under the fixture name. */
   const matches = await page.evaluate(({ name, type }) => {
      return game.actors.getName(name)?.type === type;
   }, { name: FIXTURE_NAME, type });

   if (!matches) {
      await deleteFixtureActor(page, FIXTURE_NAME);
      await page.evaluate(async ({ name, type }) => {
         await Actor.create({ name, type });
      }, { name: FIXTURE_NAME, type });
   }

   /** @type {boolean} Whether the actor already has a drawn token on the viewed scene. */
   const hasToken = await page.evaluate(({ name }) => {
      const actor = game.actors.getName(name);
      const token = canvas.tokens?.placeables.find((placeable) => placeable.actor?.id === actor.id);
      if (token) {
         token.control({ releaseOthers: true });
         game.titan.playerHud?.refresh();
         return true;
      }
      return false;
   }, { name: FIXTURE_NAME });

   if (!hasToken) {
      await controlFixtureActorToken(page, {
         actorName: FIXTURE_NAME,
         fallbackSceneName: 'E2E Player HUD Scene',
      });
   }

   return page.evaluate((name) => game.actors.getName(name).id, FIXTURE_NAME);
}

test('editing the stamina bar persists to the actor', async () => {
   const actorId = await seedControlledActor(page);
   const input = page.locator('[data-testid="player-hud-bar-stamina-input"]');
   await input.fill('4');
   await input.press('Enter');
   await expect.poll(
      () => page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, actorId),
      { message: 'stamina persists from the HUD bar' },
   ).toBe(4);
});

test('the bar max value is as wide as the 2-digit current-value input', async () => {
   await seedControlledActor(page);

   /** @type {object} The rendered widths of the current-value input and the max-value label. */
   const widths = await page.evaluate(() => {
      const w = (sel) => Math.round(document.querySelector(sel).getBoundingClientRect().width);
      return {
         input: w('[data-testid="player-hud-bar-stamina-input"]'),
         max: w('[data-testid="player-hud-bar-stamina-max"]'),
      };
   });

   expect(Math.abs(widths.max - widths.input)).toBeLessThanOrEqual(1);
});

test('all three portrait styles render', async () => {
   await seedControlledActor(page);
   for (const style of ['panelCard', 'wideStrip', 'roundToken']) {
      await page.evaluate(async (style) => {
         await game.settings.set('titan', 'playerHudOptions', { portrait: { style } });
      }, style);
      await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
      await expect(page.locator('[data-testid="player-hud-bar-stamina"]')).toHaveCount(style === 'roundToken' ? 0 : 1);
   }

   // The round token hides the inline bars behind a click-to-open popover.
   await page.locator('[data-testid="player-hud-round-portrait"]').click();
   await expect(page.locator('[data-testid="player-hud-bars-popover"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-bar-stamina"]')).toBeVisible();

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
   });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
});

test('spend resolve decrements resolve by 1', async () => {
   const actorId = await seedControlledActor(page);

   // Resolve max is derived from attributes, so fill to whatever the engine computed and assert
   // the relative decrement instead of fighting the derivation.
   /** @type {number} The fixture's derived resolve maximum (must afford one spend). */
   const max = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      await actor.update({ system: { resource: { resolve: { value: actor.system.resource.resolve.max } } } });
      return actor.system.resource.resolve.max;
   }, actorId);
   expect(max).toBeGreaterThanOrEqual(1);

   await page.locator('[data-testid="player-hud-spend-resolve"]').click();
   await expect.poll(
      () => page.evaluate((id) => game.actors.get(id).system.resource.resolve.value, actorId),
      { message: 'resolve decrements via the HUD button' },
   ).toBe(max - 1);
});

test('short rest restores stamina to max', async () => {
   const actorId = await seedControlledActor(page);
   await page.evaluate(async (id) => {
      await game.actors.get(id).update({ system: { resource: { stamina: { value: 1 } } } });
   }, actorId);
   await page.locator('[data-testid="player-hud-short-rest"]').click();
   await expect.poll(
      () => page.evaluate((id) => {
         const actor = game.actors.get(id);
         return actor.system.resource.stamina.value === actor.system.resource.stamina.max;
      }, actorId),
      { message: 'short rest restores stamina' },
   ).toBe(true);
});

test('long rest restores stamina and resolve to max', async () => {
   const actorId = await seedControlledActor(page);
   await page.evaluate(async (id) => {
      await game.actors.get(id).update({
         system: { resource: { stamina: { value: 1 }, resolve: { value: 0 } } },
      });
   }, actorId);
   await page.locator('[data-testid="player-hud-long-rest"]').click();
   await expect.poll(
      () => page.evaluate((id) => {
         const actor = game.actors.get(id);
         return actor.system.resource.stamina.value === actor.system.resource.stamina.max
            && actor.system.resource.resolve.value === actor.system.resource.resolve.max;
      }, actorId),
      { message: 'long rest restores stamina and resolve' },
   ).toBe(true);
});

test('remove combat effects deletes a turn-start effect', async () => {
   const actorId = await seedControlledActor(page);
   await page.evaluate(async (id) => {
      await game.actors.get(id).createEmbeddedDocuments('ActiveEffect', [{
         name: 'HUD Combat Effect',
         type: 'effect',
         system: { duration: { type: 'turnStart', remaining: 2 } },
      }]);
   }, actorId);
   await expect.poll(
      () => page.evaluate((id) => game.actors.get(id).effects.size, actorId),
      { message: 'the combat effect is seeded' },
   ).toBe(1);

   await page.locator('[data-testid="player-hud-remove-combat-effects"]').click();
   await expect.poll(
      () => page.evaluate((id) => game.actors.get(id).effects.size, actorId),
      { message: 'the combat effect is removed' },
   ).toBe(0);
});

test('inspiration toggles for players and is absent for NPCs', async () => {
   const actorId = await seedControlledActor(page);
   /** @type {boolean} The inspiration flag before the toggle. */
   const before = await page.evaluate((id) => game.actors.get(id).system.inspiration, actorId);
   await page.locator('[data-testid="player-hud-toggle-inspiration"]').click();
   await expect.poll(
      () => page.evaluate((id) => game.actors.get(id).system.inspiration, actorId),
      { message: 'inspiration flips via the HUD button' },
   ).toBe(!before);

   await seedControlledActor(page, { type: 'npc' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-toggle-inspiration"]')).toHaveCount(0);
});

test('minimize chip collapses and restores the portrait', async () => {
   await seedControlledActor(page);
   await expect(page.locator('[data-testid="player-hud-bar-stamina"]')).toBeVisible();

   await page.locator('[data-testid="player-hud-portrait-minimize"]').click();
   await expect(page.locator('[data-testid="player-hud-portrait-restore"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-bar-stamina"]')).toHaveCount(0);

   await page.locator('[data-testid="player-hud-portrait-restore"]').click();
   await expect(page.locator('[data-testid="player-hud-bar-stamina"]')).toBeVisible();
});
