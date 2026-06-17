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
/** @type {string} The single-character fixture this file drives. */
const FIXTURE_NAME = 'HUD Effects Player';

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await deleteOrphanedTokens(page);

   // Start from a clean slate: a crashed prior run can leave stale fixtures behind.
   for (const name of [FIXTURE_NAME, 'HUD Effects Player 2']) {
      await deleteFixtureActor(page, name);
   }

   // Delete directly: the delete-confirmation dialog would intercept the remove control.
   await page.evaluate(async () => {
      await game.settings.set('titan', 'confirmDeletingEffects', false);
   });
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async () => {
      await game.settings.set('titan', 'confirmDeletingEffects', true);
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
 * Seeds the fixture with one 'stunned' condition and one duration-bearing effect (when absent).
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<{actorId: string, effectId: string}>} The fixture actor and effect ids.
 */
async function seedPanelFixture(page) {
   const actorId = await seedControlledActor(page, { name: FIXTURE_NAME });
   const effectId = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      if (!actor.statuses.has('stunned')) {
         await actor.toggleStatusEffect('stunned');
      }
      if (!actor.effects.getName('HUD Panel Effect')) {
         await actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'HUD Panel Effect',
            type: 'effect',
            description: '<p>Panel description body.</p>',
            system: { duration: { type: 'turnStart', remaining: 2 } },
         }]);
      }
      return actor.effects.getName('HUD Panel Effect').id;
   }, actorId);
   return { actorId, effectId };
}

test('the panel renders sections for conditions and effects', async () => {
   await seedPanelFixture(page);
   await expect(page.locator('[data-testid="player-hud-effects-panel"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-effect-row"]')).toHaveCount(2);
});

test('a row expands to its description and controls', async () => {
   await seedPanelFixture(page);
   await page.locator('[data-testid="player-hud-effect-row"]', { hasText: 'HUD Panel Effect' }).click();
   await expect(page.getByText('Panel description body.')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-effect-duration-up"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-effect-chat"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-effect-sheet"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-effect-delete"]')).toBeVisible();
});

test('the duration controls step the effect duration', async () => {
   const { actorId, effectId } = await seedPanelFixture(page);
   await page.locator('[data-testid="player-hud-effect-row"]', { hasText: 'HUD Panel Effect' }).click();

   await page.locator('[data-testid="player-hud-effect-duration-up"]').click();
   await expect.poll(
      () => page.evaluate(({ actorId, effectId }) => {
         return game.actors.get(actorId).effects.get(effectId).system.duration.remaining;
      }, { actorId, effectId }),
      { message: 'the duration increments from the panel' },
   ).toBe(3);

   await page.locator('[data-testid="player-hud-effect-duration-down"]').click();
   await expect.poll(
      () => page.evaluate(({ actorId, effectId }) => {
         return game.actors.get(actorId).effects.get(effectId).system.duration.remaining;
      }, { actorId, effectId }),
      { message: 'the duration decrements from the panel' },
   ).toBe(2);
});

test('send to chat creates the effect card', async () => {
   await seedPanelFixture(page);
   await page.locator('[data-testid="player-hud-effect-row"]', { hasText: 'HUD Panel Effect' }).click();
   await page.locator('[data-testid="player-hud-effect-chat"]').click();
   await expect.poll(
      () => page.evaluate(() => game.messages.contents.at(-1)?.type),
      { message: 'the effect card lands in chat', timeout: 10000 },
   ).toBe('effect');
});

test('open sheet opens the effect sheet', async () => {
   const { effectId } = await seedPanelFixture(page);
   await page.locator('[data-testid="player-hud-effect-row"]', { hasText: 'HUD Panel Effect' }).click();
   await page.locator('[data-testid="player-hud-effect-sheet"]').click();
   await expect.poll(
      () => page.evaluate((id) => {
         return Array.from(foundry.applications.instances.values())
            .some((app) => app.document?.id === id);
      }, effectId),
      { message: 'the effect sheet opens from the panel' },
   ).toBe(true);
});

test('remove deletes the effect', async () => {
   const { actorId, effectId } = await seedPanelFixture(page);
   const row = page.locator('[data-testid="player-hud-effect-row"]', { hasText: 'HUD Panel Effect' });
   await expect(row).toBeVisible();
   await row.click();

   await page.locator('[data-testid="player-hud-effect-delete"]').click();
   await expect.poll(
      () => page.evaluate(({ actorId, effectId }) => {
         return game.actors.get(actorId).effects.get(effectId) ?? null;
      }, { actorId, effectId }),
      { message: 'the effect is deleted from the panel' },
   ).toBe(null);
   await expect(row).toHaveCount(0);
});

test('the icon tray style shows a popout that Escape dismisses', async () => {
   await seedPanelFixture(page);
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', { effectsPanel: { style: 'tray' } });
   });

   const icons = page.locator('[data-testid="player-hud-effect-icon"]');
   await expect(icons.first()).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-effect-row"]')).toHaveCount(0);

   await icons.last().click();
   await expect(page.locator('[data-testid="player-hud-effect-popout"]')).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page.locator('[data-testid="player-hud-effect-popout"]')).toHaveCount(0);

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
   });
});

test('the panel body scrolls when content exceeds its size', async () => {
   const { actorId } = await seedPanelFixture(page);
   await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      /** @type {Array<object>} Bulk effect payloads to overflow the panel body. */
      const payloads = [];
      for (let index = 0; index < 12; index++) {
         const name = `HUD Bulk Effect ${index}`;
         if (!actor.effects.getName(name)) {
            payloads.push({ name, type: 'effect' });
         }
      }
      if (payloads.length > 0) {
         await actor.createEmbeddedDocuments('ActiveEffect', payloads);
      }
   }, actorId);

   await expect(page.locator('[data-testid="player-hud-effect-row"]')).toHaveCount(14);
   await expect.poll(
      () => page.evaluate(() => {
         const body = document.querySelector('[data-testid="player-hud-effects-panel"] [class*="body"]');
         return !!body && body.scrollHeight > body.clientHeight;
      }),
      { message: 'the panel body overflows into a scrollbar' },
   ).toBe(true);
});

test('an edit-mode resize persists the panel size', async () => {
   await seedPanelFixture(page);

   /** @type {{width: number, height: number}} The panel size before the resize drag. */
   const before = await page.evaluate(() => {
      game.titan.playerHud.toggleEditMode();
      return { ...game.titan.playerHud.layoutState.effectsPanelSize };
   });

   const handle = page.locator('[data-testid="player-hud-effects-panel-resize"]');
   await expect(handle).toBeVisible();
   /** @type {object} The resize handle's box. */
   const box = await handle.boundingBox();
   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
   await page.mouse.down();
   await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 5 });
   await page.mouse.up();
   await page.evaluate(() => game.titan.playerHud.toggleEditMode());

   await expect.poll(
      () => page.evaluate(() => game.settings.get('titan', 'playerHudLayout').effectsPanelSize?.width),
      { message: 'the resized width persists to the layout setting' },
   ).toBe(before.width + 60);
   await expect.poll(
      () => page.evaluate(() => game.settings.get('titan', 'playerHudLayout').effectsPanelSize?.height),
      { message: 'the resized height persists to the layout setting' },
   ).toBe(before.height + 40);

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudLayout', {});
      game.titan.playerHud.resetLayout();
   });
});

test('group selection hides the panel', async () => {
   await seedPanelFixture(page);
   await expect(page.locator('[data-testid="player-hud-effects-panel"]')).toBeVisible();

   await seedControlledActor(page, { name: 'HUD Effects Player 2', releaseOthers: false });
   await expect(page.locator('[data-testid="player-hud-effects-panel"]')).toHaveCount(0);
});
