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
/** @type {boolean} The world's getCheckOptions value before this file forced direct rolls. */
let priorGetCheckOptions;
/** @type {string[]} Fixture actor names created by this file, deleted in afterAll. */
const fixtureNames = [];

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await deleteOrphanedTokens(page);

   // Start from a clean slate: a crashed prior run can leave stale fixtures with duplicate items.
   for (const name of ['HUD Menu Player', 'HUD Menu Player 2', 'HUD Menu Empty']) {
      await deleteFixtureActor(page, name);
   }

   // Roll directly and delete directly: the check-options and delete-confirmation dialogs would
   // otherwise intercept the menu actions under test.
   priorGetCheckOptions = await page.evaluate(async () => {
      const prior = game.settings.get('titan', 'getCheckOptions');
      await game.settings.set('titan', 'getCheckOptions', false);
      await game.settings.set('titan', 'confirmDeletingEffects', false);
      return prior;
   });
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async ({ prior }) => {
      await game.settings.set('titan', 'getCheckOptions', prior);
      await game.settings.set('titan', 'confirmDeletingEffects', true);
      await game.settings.set('titan', 'playerHudOptions', {});
   }, { prior: priorGetCheckOptions });
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
 * Adds items/effects to a seeded actor.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {string} actorId - The receiving actor's id.
 * @param {object} docs - Create payloads: { items?: Array<object>, effects?: Array<object> }.
 * @returns {Promise<{itemIds: string[], effectIds: string[]}>} The created document ids.
 */
async function seedDocuments(page, actorId, docs) {
   return page.evaluate(async ({ actorId, docs }) => {
      const actor = game.actors.get(actorId);
      if (docs.items?.length) {
         await actor.createEmbeddedDocuments('Item', docs.items);
      }
      if (docs.effects?.length) {
         await actor.createEmbeddedDocuments('ActiveEffect', docs.effects);
      }

      // Resolve ids by NAME, in payload order: createEmbeddedDocuments does not guarantee its
      // return array matches the input order.
      return {
         itemIds: (docs.items ?? []).map((payload) => actor.items.getName(payload.name)?.id),
         effectIds: (docs.effects ?? []).map((payload) => actor.effects.getName(payload.name)?.id),
      };
   }, { actorId, docs });
}

/**
 * Snapshots the world chat message count.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<number>} The current message count.
 */
function messageCount(page) {
   return page.evaluate(() => game.messages.size);
}

/**
 * Builds one COMPLETE check[] entry mirroring createItemCheckTemplate() — the template module is
 * not importable in the browser context, and omitting fields (e.g. OpposedCheck) makes
 * getItemCheckParameters throw instead of rolling.
 * @param {string} label - The check's display label.
 * @returns {object} The full check entry.
 */
function fullCheck(label) {
   return {
      attribute: 'body',
      complexity: 1,
      damageReducedBy: 'none',
      difficulty: 4,
      initialValue: 1,
      isDamage: false,
      isHealing: false,
      label: label,
      opposedCheck: {
         attribute: 'body',
         enabled: false,
         skill: 'athletics',
      },
      resistanceCheck: 'none',
      resolveCost: 0,
      scaling: true,
      skill: 'athletics',
      uuid: 'e2ec4ec0-e2ec-4ec0-8ec0-e2ec4ec0e2ec',
   };
}

test('categories with no sub-options are hidden', async () => {
   await seedControlledActor(page, { name: 'HUD Menu Empty' });
   await expect(page.locator('[data-testid="player-hud-category-skills"]')).toBeVisible();
   await expect(page.locator('[data-testid="player-hud-category-weapons"]')).toHaveCount(0);
   await expect(page.locator('[data-testid="player-hud-category-spells"]')).toHaveCount(0);
});

test('equipped weapon main action rolls the first attack to chat', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   await seedDocuments(page, actorId, { items: [{
      name: 'HUD Longsword',
      type: 'weapon',
      system: { equipped: true },
   }] });
   await page.locator('[data-testid="player-hud-category-weapons"]').click();
   const subOption = page.locator('[data-testid^="player-hud-sub-option-weapons-"]').first();
   await subOption.click();
   await expect.poll(
      () => page.evaluate(() => game.messages.contents.at(-1)?.type),
      { message: 'an attack check chat message', timeout: 10000 },
   ).toBe('attackCheck');
});

test('unequipped weapon main action equips it', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   const { itemIds } = await seedDocuments(page, actorId, { items: [{
      name: 'HUD Sidearm',
      type: 'weapon',
      system: { equipped: false },
   }] });
   await page.locator('[data-testid="player-hud-category-weapons"]').click();
   await page.locator(`[data-testid="player-hud-sub-option-weapons-${itemIds[0]}"]`).click();
   await expect.poll(
      () => page.evaluate(({ actorId, itemId }) => {
         return game.actors.get(actorId).items.get(itemId).system.equipped;
      }, { actorId, itemId: itemIds[0] }),
      { message: 'the weapon equips via its main action' },
   ).toBe(true);
});

test('weapon sub-buttons send to chat and open the sheet', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   /** @type {string} The equipped fixture weapon's id. */
   const weaponId = await page.evaluate((id) => {
      return game.actors.get(id).items.find((item) => item.name === 'HUD Longsword').id;
   }, actorId);

   await page.locator('[data-testid="player-hud-category-weapons"]').click();
   const subOption = page.locator(`[data-testid="player-hud-sub-option-weapons-${weaponId}"]`);
   await subOption.hover();
   await expect(page.locator(`[data-testid="player-hud-sub-button-${weaponId}-attack-0"]`)).toBeVisible();
   await expect(page.locator(`[data-testid="player-hud-sub-button-${weaponId}-equipped"]`)).toBeVisible();

   await page.locator(`[data-testid="player-hud-sub-button-${weaponId}-send-to-chat"]`).click();
   await expect.poll(
      () => page.evaluate(() => game.messages.contents.at(-1)?.type),
      { message: 'the weapon item card lands in chat', timeout: 10000 },
   ).toBe('weapon');

   await page.locator('[data-testid="player-hud-category-weapons"]').click();
   await subOption.hover();
   await page.locator(`[data-testid="player-hud-sub-button-${weaponId}-open-sheet"]`).click();
   await expect.poll(
      () => page.evaluate((itemId) => {
         return Array.from(foundry.applications.instances.values())
            .some((app) => app.document?.id === itemId);
      }, weaponId),
      { message: 'the weapon sheet opens' },
   ).toBe(true);
});

test('skill roll for a group hits every selected actor', async () => {
   await seedControlledActor(page, { name: 'HUD Menu Player' });
   await seedControlledActor(page, { name: 'HUD Menu Player 2', releaseOthers: false });
   /** @type {number} The chat message count before the group roll. */
   const before = await messageCount(page);

   await page.locator('[data-testid="player-hud-category-skills"]').click();
   await page.locator('[data-testid="player-hud-sub-option-skills-athletics"]').click();
   await expect.poll(
      () => page.evaluate((count) => {
         const fresh = game.messages.contents.slice(count);
         return fresh.filter((message) => message.type === 'attributeCheck').length;
      }, before),
      { message: 'one skill check per selected actor', timeout: 10000 },
   ).toBe(2);
});

test('resistance roll rolls for all selected actors', async () => {
   await seedControlledActor(page, { name: 'HUD Menu Player' });
   await seedControlledActor(page, { name: 'HUD Menu Player 2', releaseOthers: false });
   const before = await messageCount(page);

   await page.locator('[data-testid="player-hud-category-resistances"]').click();
   await page.locator('[data-testid="player-hud-sub-option-resistances-reflexes"]').click();
   await expect.poll(
      () => page.evaluate((count) => {
         const fresh = game.messages.contents.slice(count);
         return fresh.filter((message) => message.type === 'resistanceCheck').length;
      }, before),
      { message: 'one resistance check per selected actor', timeout: 10000 },
   ).toBe(2);
});

test('apply damage dialog applies the amount to all selected actors', async () => {
   const firstId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   const secondId = await seedControlledActor(page, { name: 'HUD Menu Player 2', releaseOthers: false });

   /** @type {{first: number, second: number}} Both actors' stamina, topped to max before the hit. */
   const before = await page.evaluate(async ({ firstId, secondId }) => {
      const first = game.actors.get(firstId);
      const second = game.actors.get(secondId);
      await first.update({ system: { resource: { stamina: { value: first.system.resource.stamina.max } } } });
      await second.update({ system: { resource: { stamina: { value: second.system.resource.stamina.max } } } });
      return {
         first: first.system.resource.stamina.value,
         second: second.system.resource.stamina.value,
      };
   }, { firstId, secondId });

   await page.locator('[data-testid="player-hud-category-utility"]').click();
   await page.locator('[data-testid="player-hud-sub-option-utility-applyDamage"]').click();
   await page.locator('[data-testid="hud-amount-input"]').fill('3');
   await page.locator('[data-testid="hud-amount-confirm"]').click();

   await expect.poll(
      () => page.evaluate(({ firstId, secondId }) => {
         return [
            game.actors.get(firstId).system.resource.stamina.value,
            game.actors.get(secondId).system.resource.stamina.value,
         ];
      }, { firstId, secondId }),
      { message: 'both actors take the entered damage', timeout: 10000 },
   ).toEqual([before.first - 3, before.second - 3]);
});

test('spell main action rolls a casting check', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   const { itemIds } = await seedDocuments(page, actorId, { items: [{
      name: 'HUD Spark',
      type: 'spell',
   }] });
   await page.locator('[data-testid="player-hud-category-spells"]').click();
   await page.locator(`[data-testid="player-hud-sub-option-spells-${itemIds[0]}"]`).click();
   await expect.poll(
      () => page.evaluate(() => game.messages.contents.at(-1)?.type),
      { message: 'a casting check chat message', timeout: 10000 },
   ).toBe('castingCheck');
});

test('ability and effect main actions roll their first check', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   const { itemIds } = await seedDocuments(page, actorId, { items: [{
      name: 'HUD Trick',
      type: 'ability',
      system: { check: [fullCheck('Trick Check')] },
   }] });
   await page.locator('[data-testid="player-hud-category-abilities"]').click();
   await page.locator(`[data-testid="player-hud-sub-option-abilities-${itemIds[0]}"]`).click();
   await expect.poll(
      () => page.evaluate(() => game.messages.contents.at(-1)?.type),
      { message: 'an item check from the ability', timeout: 10000 },
   ).toBe('itemCheck');

   const { effectIds } = await seedDocuments(page, actorId, { effects: [{
      name: 'HUD Burning',
      type: 'effect',
      system: {
         check: [fullCheck('Burn Check')],
         duration: { type: 'turnStart', remaining: 2 },
      },
   }] });
   await page.locator('[data-testid="player-hud-category-effects"]').click();
   await page.locator(`[data-testid="player-hud-sub-option-effects-${effectIds[0]}"]`).click();
   await expect.poll(
      () => page.evaluate(() => game.messages.contents.at(-1)?.type),
      { message: 'an item check from the effect', timeout: 10000 },
   ).toBe('itemCheck');
});

test('effect duration and remove sub-buttons update and delete the effect', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   /** @type {string} The fixture effect's id. */
   const effectId = await page.evaluate((id) => {
      return game.actors.get(id).effects.find((effect) => effect.name === 'HUD Burning').id;
   }, actorId);

   await page.locator('[data-testid="player-hud-category-effects"]').click();
   const subOption = page.locator(`[data-testid="player-hud-sub-option-effects-${effectId}"]`);
   await subOption.hover();
   await page.locator(`[data-testid="player-hud-sub-button-${effectId}-duration-increase"]`).click();
   await expect.poll(
      () => page.evaluate(({ actorId, effectId }) => {
         return game.actors.get(actorId).effects.get(effectId).system.duration.remaining;
      }, { actorId, effectId }),
      { message: 'the duration increments in place' },
   ).toBe(3);

   await subOption.hover();
   await page.locator(`[data-testid="player-hud-sub-button-${effectId}-remove"]`).click();
   await expect.poll(
      () => page.evaluate(({ actorId, effectId }) => {
         return game.actors.get(actorId).effects.get(effectId) ?? null;
      }, { actorId, effectId }),
      { message: 'the effect is removed' },
   ).toBe(null);
});

test('commodity quantity sub-buttons step the quantity', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   const { itemIds } = await seedDocuments(page, actorId, { items: [{
      name: 'HUD Rations',
      type: 'commodity',
      system: {
         quantity: 2,
         check: [fullCheck('Ration Check')],
      },
   }] });

   await page.locator('[data-testid="player-hud-category-inventory"]').click();
   const subOption = page.locator(`[data-testid="player-hud-sub-option-inventory-${itemIds[0]}"]`);
   await subOption.hover();
   await page.locator(`[data-testid="player-hud-sub-button-${itemIds[0]}-quantity-increase"]`).click();
   await expect.poll(
      () => page.evaluate(({ actorId, itemId }) => {
         return game.actors.get(actorId).items.get(itemId).system.quantity;
      }, { actorId, itemId: itemIds[0] }),
      { message: 'the quantity increments in place' },
   ).toBe(3);

   await subOption.hover();
   await page.locator(`[data-testid="player-hud-sub-button-${itemIds[0]}-quantity-decrease"]`).click();
   await expect.poll(
      () => page.evaluate(({ actorId, itemId }) => {
         return game.actors.get(actorId).items.get(itemId).system.quantity;
      }, { actorId, itemId: itemIds[0] }),
      { message: 'the quantity decrements in place' },
   ).toBe(2);
});

test('the weapons filter hides action-less weapons until disabled', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });

   // Seed an action-less weapon AND a normal one: the category itself disappears when every
   // weapon is filtered, so the normal weapon keeps the category clickable in any test order.
   const { itemIds } = await seedDocuments(page, actorId, { items: [
      {
         name: 'HUD Driftwood',
         type: 'weapon',
         system: { attack: [] },
      },
      {
         name: 'HUD Filter Blade',
         type: 'weapon',
         system: { equipped: true },
      },
   ] });

   await page.locator('[data-testid="player-hud-category-weapons"]').click();
   await expect(page.locator(`[data-testid="player-hud-sub-option-weapons-${itemIds[1]}"]`)).toBeVisible();
   await expect(page.locator(`[data-testid="player-hud-sub-option-weapons-${itemIds[0]}"]`)).toHaveCount(0);

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {
         actionMenu: { filters: { weaponsWithActions: false } },
      });
   });

   // The options change forces a remount, but the open category persists in the layout state —
   // clicking the category again here would TOGGLE the cascade closed.
   await expect(page.locator(`[data-testid="player-hud-sub-option-weapons-${itemIds[0]}"]`)).toBeVisible();

   await page.evaluate(async () => {
      await game.settings.set('titan', 'playerHudOptions', {});
   });
});

test('Escape and click-away close the cascade', async () => {
   await seedControlledActor(page, { name: 'HUD Menu Player' });
   await page.locator('[data-testid="player-hud-category-skills"]').click();
   await expect(page.locator('[data-testid="player-hud-flyout"]')).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page.locator('[data-testid="player-hud-flyout"]')).toHaveCount(0);

   // Click the portrait instead of the canvas: a canvas click would release the token and unmount
   // the whole HUD, masking the click-away behavior under test.
   await page.locator('[data-testid="player-hud-category-skills"]').click();
   await expect(page.locator('[data-testid="player-hud-flyout"]')).toBeVisible();
   await page.locator('[data-testid="player-hud-portrait"]').click();
   await expect(page.locator('[data-testid="player-hud-flyout"]')).toHaveCount(0);
});
