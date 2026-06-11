import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { withClients } from './multiClient.js';
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

   // One-time sweep of orphaned fixture tokens left behind by prior runs.
   await deleteOrphanedTokens(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   for (const name of fixtureNames) {
      await deleteFixtureActor(page, name);
   }
   await page?.close();
});

/**
 * Creates a character actor (if missing) with a controlled token on the active scene. Reuses an
 * existing token for the actor rather than stacking a new one per call.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {object} params - Seed parameters.
 * @param {string} params.name - The actor and token name.
 * @param {string} [params.type] - The actor type ('player' or 'npc').
 * @param {boolean} [params.releaseOthers] - Whether controlling releases other tokens.
 * @returns {Promise<string>} The created actor's id.
 */
async function seedControlledActor(page, { name, type = 'player', releaseOthers = true }) {
   if (!fixtureNames.includes(name)) {
      fixtureNames.push(name);
   }
   await page.evaluate(async ({ name, type }) => {
      if (!game.actors.getName(name)) {
         await Actor.create({ name, type });
      }
   }, { name, type });

   /** @type {boolean} Whether the actor already has a drawn token on the viewed scene. */
   const hasToken = await page.evaluate(({ name }) => {
      const actor = game.actors.getName(name);
      const token = canvas.tokens?.placeables.find((placeable) => placeable.actor?.id === actor.id);
      if (token) {
         token.control({ releaseOthers: false });
         return true;
      }
      return false;
   }, { name, releaseOthers });

   if (hasToken) {
      if (releaseOthers) {
         await page.evaluate(({ name }) => {
            const actor = game.actors.getName(name);
            for (const token of [...canvas.tokens.controlled]) {
               if (token.actor?.id !== actor.id) {
                  token.release();
               }
            }
            game.titan.playerHud?.refresh();
         }, { name });
      }
      else {
         await page.evaluate(() => game.titan.playerHud?.refresh());
      }
   }
   else {
      await controlFixtureActorToken(page, {
         actorName: name,
         fallbackSceneName: 'E2E Player HUD Scene',
         releaseOthers,
      });
   }

   return page.evaluate((name) => game.actors.getName(name).id, name);
}

/**
 * Resets the Player HUD options setting to defaults and forces a refresh.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<void>} Resolves once the setting write lands.
 */
async function resetHudOptions(page) {
   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
   });
}

test('GM sees the portrait for a single selected character', async () => {
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
});

test('GM with no selection shows no HUD elements', async () => {
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();

   await page.evaluate(() => {
      canvas.tokens.releaseAll();
      game.titan.playerHud.refresh();
   });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);
});

test('NPC selection shows the portrait without the inspiration button', async () => {
   await seedControlledActor(page, { name: 'HUD Vis NPC', type: 'npc' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-toggle-inspiration"]')).toHaveCount(0);
   await expect(page.locator('[data-testid="player-hud-spend-resolve"]')).toBeVisible();
});

test('group selection hides the portrait', async () => {
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();

   await seedControlledActor(page, { name: 'HUD Vis Player 2', releaseOthers: false });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);
});

test('master disable unmounts the HUD and re-enable restores it', async () => {
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();

   await page.evaluate(() => game.settings.set('titan', 'enablePlayerHud', false));
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);

   await page.evaluate(() => game.settings.set('titan', 'enablePlayerHud', true));
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
});

test('per-element disable hides only that element', async () => {
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', { portrait: { enabled: false } });
   });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);

   await resetHudOptions(page);
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
});

test('combat-only hides the portrait outside combat and shows it during combat', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', { portrait: { combatOnly: true } });
   });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);

   // Start a combat on the ACTIVE scene (a combat bound to a non-viewed scene never becomes
   // game.combat, so the HUD's combat gate would not see it).
   /** @type {string} The created combat's id, for teardown. */
   const combatId = await page.evaluate(async (id) => {
      const token = canvas.tokens.placeables.find((placeable) => placeable.actor?.id === id);
      const combat = await Combat.create({ scene: canvas.scene.id, active: true });
      ui.combat.viewed = combat;
      await combat.createEmbeddedDocuments('Combatant', [
         { tokenId: token.document.id, sceneId: canvas.scene.id, initiative: 10 },
      ]);
      await combat.startCombat();
      return combat.id;
   }, actorId);
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();

   await page.evaluate(async (id) => {
      const combat = game.combats.get(id);
      if (ui.combat.viewed?.id === id) {
         ui.combat.viewed = null;
      }
      await combat?.delete();
   }, combatId);
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);

   await resetHudOptions(page);
});

test('switching to a tokenless scene hides the HUD; returning restores it', async () => {
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();

   /** @type {{tempId: string, originalId: string}} The temp and original scene ids. */
   const ids = await page.evaluate(async () => {
      const originalId = game.scenes.active.id;
      const temp = await Scene.create({ name: 'E2E HUD Empty Scene', active: true });

      // Let the temp scene's canvas draw finish before anything else touches the view; a second
      // scene transition issued mid-draw races the first and strands the canvas on a dead scene.
      await titanWait(
         () => canvas.ready && canvas.scene?.id === temp.id,
         { message: 'temp scene drawn after activation', timeout: 15000 },
      );
      return { tempId: temp.id, originalId };
   });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);

   await page.evaluate(async ({ tempId, originalId }) => {
      // One canvas transition at a time: view() navigates this client back, and only after the
      // redraw settles is the scene re-activated and the temp scene deleted (neither triggers a
      // further view change at that point).
      await game.scenes.get(originalId).view();
      await titanWait(
         () => canvas.ready && canvas.scene?.id === originalId,
         { message: 'original scene redrawn after view', timeout: 15000 },
      );
      await game.scenes.get(originalId).activate();
      await game.scenes.get(tempId)?.delete();
   }, ids);
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
});

test('player with no selection falls back to an owned token on the scene', async ({ browser }) => {
   const actorId = await seedControlledActor(page, { name: 'HUD Vis Owned' });
   await page.evaluate(async (id) => {
      const player = game.users.getName('E2E Player 1');
      await game.actors.get(id).update({
         ownership: { [player.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      });
   }, actorId);

   await withClients(browser, { player: 'E2E Player 1' }, async ({ player }) => {
      await player.evaluate(async () => {
         await titanWait(() => !!game.titan?.playerHud, { message: 'player HUD controller ready' });
         game.titan.playerHud.refresh();
      });
      await expect(player.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
   });
});
