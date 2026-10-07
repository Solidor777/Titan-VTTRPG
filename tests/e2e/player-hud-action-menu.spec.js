import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login } from './fixtures.js';
import {
   addCheck,
   addEffect,
   controlPlacedToken,
   controlPlacedTokens,
   createActor,
   createOwnedItem,
   createScene,
   deleteAttack,
   placeToken,
   setEquipped,
   setSkillDefaultAttribute,
   viewScene,
} from './flows.js';
import { setClientSetting, setWorldSetting } from './settings.js';
import { settle } from './settle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog, waitForAnimations } from './world.js';

/**
 * The Player HUD's action menu on flow-made actors, items and effects: which categories and sub-options it offers,
 * what its main actions and sub-buttons do (rolls, equip, chat, sheet, duration, quantity, the amount dialog), its
 * options (filters, sub-button gates, disabled categories, layouts and directions), its geometry, its icons, and the
 * report cards that its utility menu and the portrait's Spend Resolve button post. Settings are client settings; they
 * return to their defaults after each test.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {Record<string, string>} The ids of the actors, by `menu`, `menu2`, `empty` and `report`. */
const actorIds = {};
/** @type {Record<string, string>} The ids of the placed tokens, by the same keys. */
const tokenIds = {};
/** @type {Record<string, string>} The ids of the menu player's owned items and effect, by name key. */
const itemIds = {};

/** @type {number} The run stamp in every fixture name, so a worker restart that repeats the hook finds no duplicate. */
const RUN = Date.now();

/** @type {string[]} The world settings that gate the reports of the HUD's direct actions. */
const REPORT_SETTINGS = [
   'reportTakingDamage',
   'reportHealingDamage',
   'reportSpendingResolve',
   'reportRendingArmor',
   'reportRepairingArmor',
   'reportResting',
];

/**
 * Selects an element of the Player HUD by its test id.
 * @param {string} id - The test id.
 * @returns {import('@playwright/test').Locator} The element.
 */
function hud(id) {
   return page.locator(`[data-testid="${id}"]`);
}

/**
 * Takes control of one of the spec's tokens, which shows the HUD of its actor.
 * @param {string} key - `menu`, `menu2`, `empty` or `report`.
 * @returns {Promise<void>} Resolves once the token is the only controlled token.
 */
async function control(key) {
   await controlPlacedToken(page, tokenIds[key]);
}

/**
 * Takes control of the menu player and the second player together, which shows the group menu.
 * @returns {Promise<void>} Resolves once exactly those two tokens are controlled.
 */
async function controlGroup() {
   await controlPlacedTokens(page, [
      tokenIds.menu,
      tokenIds.menu2,
   ]);
}

/**
 * Counts the chat messages, to read the ones a click adds.
 * @returns {Promise<number>} The number of messages.
 */
function messageCount() {
   return page.evaluate(() => game.messages.size);
}

/**
 * Reads the types of the chat messages posted after a count.
 * @param {number} before - The message count before the click.
 * @returns {Promise<string[]>} The types of the new messages, in order.
 */
function newMessageTypes(before) {
   return page.evaluate((count) => game.messages.contents.slice(count).map((message) => message.type), before);
}

/**
 * Opens an action-menu category and waits for its flyout. The open category persists in the HUD layout state across
 * remounts and clicking the open category closes it, so the click is skipped when it is already open.
 * @param {string} key - The category key.
 * @returns {Promise<void>} Resolves once the category's flyout is visible.
 */
async function openCategory(key) {
   /** @type {import('@playwright/test').Locator} The category button. */
   const button = hud(`player-hud-category-${key}`);
   await expect(button).toBeVisible();
   if (!await button.evaluate((element) => element.classList.contains('active'))) {
      await button.click();
   }
   await expect(hud('player-hud-flyout')).toBeVisible();
}

/**
 * Sets the action menu options with the HUD settings (a client setting the settings window writes).
 * @param {object} patch - The `actionMenu` options to merge over the current ones.
 * @returns {Promise<void>} Resolves once the setting is stored.
 */
async function setMenuOptions(patch) {
   await page.evaluate(async (patch) => {
      /** @type {object} The stored options. */
      const current = game.settings.get('titan', 'playerHudOptions') ?? {};
      await game.settings.set(
         'titan',
         'playerHudOptions',
         foundry.utils.mergeObject(current, { actionMenu: patch }, { inplace: false }),
      );
   }, patch);
   await settle(page);
}

/**
 * Returns the HUD settings to their defaults, leaves edit mode and the cascade, and sets the confirmation default.
 * @returns {Promise<void>} Resolves once the HUD shows its default options and layout.
 */
async function resetHud() {
   await setClientSetting(page, 'playerHudOptions', {});
   await setClientSetting(page, 'playerHudLayout', {});
   await setClientSetting(page, 'confirmDeletingEffects', true);
   await page.evaluate(() => {
      game.titan.playerHud.layoutState.editMode = false;
      game.titan.playerHud.resetLayout();
   });
   // The reset persists through a client-setting write that the HUD does not await and settle does not track: the
   // stored layout is read until it equals the layout the HUD now holds.
   await expect.poll(
      () => page.evaluate(() => {
         /** @type {object} The layout the HUD state holds. */
         const held = game.titan.playerHud.layoutState;
         /** @type {object} The stored layout setting. */
         const stored = game.settings.get('titan', 'playerHudLayout');
         return JSON.stringify(stored.positions) === JSON.stringify(held.positions)
            && JSON.stringify(stored.minimized) === JSON.stringify(held.minimized)
            && JSON.stringify(stored.effectsPanelSize) === JSON.stringify(held.effectsPanelSize);
      }),
      { message: 'the reset layout is stored' },
   ).toBe(true);
}

/**
 * Moves the action menu with an edit-mode drag, the way a user places it: edit mode on with its keybinding, a pointer
 * drag on the menu's frame, edit mode off.
 * @param {number} dx - Horizontal distance in pixels.
 * @param {number} dy - Vertical distance in pixels.
 * @returns {Promise<void>} Resolves once the menu has settled at its new place.
 */
async function moveMenu(dx, dy) {
   await page.keyboard.press('Shift+H');
   await expect(hud('player-hud-edit-toolbar')).toBeVisible();
   await waitForAnimations(page, '#titan-player-hud');

   /** @type {{x: number, y: number, width: number, height: number}} The menu's box before the drag. */
   const box = await hud('player-hud-action-menu').boundingBox();
   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
   await page.mouse.down();
   await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
   await page.mouse.up();
   await page.keyboard.press('Shift+H');
   await expect(hud('player-hud-edit-toolbar')).toHaveCount(0);
   await waitForAnimations(page, '#titan-player-hud');
}

/**
 * Waits until two locators' bounding boxes satisfy a comparison. Element measures settle through a ResizeObserver a
 * frame after remounts, so a one-shot box read can race the layout.
 * @param {import('@playwright/test').Locator} first - The locator whose edge is compared.
 * @param {import('@playwright/test').Locator} second - The reference locator.
 * @param {Function} compare - Receives both boxes and reports whether they satisfy the expected arrangement.
 * @param {string} message - The failure message.
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
 * Types a number into a bar input of the portrait and waits until the actor stores it.
 * @param {string} actorId - The actor whose token is controlled.
 * @param {string} resource - `stamina`, `resolve` or `wounds`.
 * @param {number} value - The value to enter.
 * @returns {Promise<void>} Resolves once the actor holds the value.
 */
async function setBar(actorId, resource, value) {
   await commitText(hud(`player-hud-bar-${resource}-input`), value);
   await expect.poll(
      () => page.evaluate(
         ({ actorId, resource }) => game.actors.get(actorId).system.resource[resource].value,
         {
            actorId,
            resource,
         },
      ),
      { message: `the ${resource} bar stored ${value}` },
   ).toBe(value);
}

/**
 * Reads whether a button's icon renders in the resolved accent color.
 * @param {string} testId - The button's data-testid.
 * @returns {Promise<boolean>} True when the icon's computed color equals the accent color.
 */
function iconUsesAccent(testId) {
   return page.evaluate((id) => {
      /** @type {Element | null} The element with the test id. */
      const button = document.querySelector(`[data-testid="${id}"]`);
      /** @type {Element | null} The button's icon. */
      const icon = button.querySelector('i');
      // Resolve the accent token in the same cascade scope as the icon.
      /** @type {HTMLSpanElement} A span whose color resolves the accent token in the icon's scope. */
      const probe = document.createElement('span');
      probe.style.color = 'var(--titan-accent-color)';
      button.appendChild(probe);
      /** @type {string} The resolved accent color. */
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return getComputedStyle(icon).color === accent;
   }, testId);
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // Rolls go straight to chat, and each direct action posts its report card.
   await setClientSetting(page, 'getCheckOptions', 'never');
   for (const key of REPORT_SETTINGS) {
      await setWorldSetting(page, key, true);
   }

   // One scene whose tokens stand next to each other in this order, so that a selection rectangle can take two.
   await viewScene(page, await createScene(page, { name: `E2E HUD Menu Scene ${RUN}` }));
   actorIds.menu = await createActor(page, {
      name: `E2E HUD Menu Player ${RUN}`,
      type: 'player',
   });
   actorIds.menu2 = await createActor(page, {
      name: `E2E HUD Menu Player 2 ${RUN}`,
      type: 'player',
   });
   actorIds.empty = await createActor(page, {
      name: `E2E HUD Menu Empty ${RUN}`,
      type: 'player',
   });
   actorIds.report = await createActor(page, {
      name: `E2E HUD Report Player ${RUN}`,
      type: 'player',
   });
   for (const key of [
      'menu',
      'menu2',
      'empty',
      'report',
   ]) {
      tokenIds[key] = await placeToken(page, actorIds[key]);
   }

   // The menu player owns two weapons (one equipped), a weapon with no attack, a spell, an ability and a commodity
   // with a check, and an effect with a check and a duration; the report player wears an armor.
   /** @type {string} The menu player's uuid prefix. */
   const actorUuid = `Actor.${actorIds.menu}`;
   itemIds.longsword = await createOwnedItem(page, actorIds.menu, 'weapon', 'HUD Longsword');
   await setEquipped(page, actorIds.menu, itemIds.longsword, true);
   itemIds.sidearm = await createOwnedItem(page, actorIds.menu, 'weapon', 'HUD Sidearm');
   itemIds.driftwood = await createOwnedItem(page, actorIds.menu, 'weapon', 'HUD Driftwood');
   await deleteAttack(page, `${actorUuid}.Item.${itemIds.driftwood}`);
   itemIds.spark = await createOwnedItem(page, actorIds.menu, 'spell', 'HUD Spark');
   itemIds.trick = await createOwnedItem(page, actorIds.menu, 'ability', 'HUD Trick');
   await addCheck(page, `${actorUuid}.Item.${itemIds.trick}`, { label: 'Trick Check' });
   itemIds.rations = await createOwnedItem(page, actorIds.menu, 'commodity', 'HUD Rations');
   await addCheck(page, `${actorUuid}.Item.${itemIds.rations}`, { label: 'Ration Check' });
   itemIds.burning = await addEffect(page, actorIds.menu, 'HUD Burning');
   await addCheck(page, `${actorUuid}.ActiveEffect.${itemIds.burning}`, { label: 'Burn Check' });
   itemIds.armor = await createOwnedItem(page, actorIds.report, 'armor', 'HUD Armor');
   await setEquipped(page, actorIds.report, itemIds.armor, true);
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

test.describe('categories, main actions and sub-buttons', () => {
   test('categories with no sub-options are hidden', async () => {
      await control('empty');
      await expect(hud('player-hud-category-skills')).toBeVisible();
      await expect(hud('player-hud-category-weapons')).toHaveCount(0);
      await expect(hud('player-hud-category-spells')).toHaveCount(0);
   });

   test('equipped weapon main action rolls the first attack to chat', async () => {
      await control('menu');
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await hud('player-hud-category-weapons').click();
      await hud(`player-hud-sub-option-weapons-${itemIds.longsword}`).click();
      await expect.poll(() => newMessageTypes(before), { message: 'an attack check chat message' })
         .toEqual(['attackCheck']);
   });

   test('unequipped weapon main action equips it', async () => {
      await control('menu');
      await hud('player-hud-category-weapons').click();
      await hud(`player-hud-sub-option-weapons-${itemIds.sidearm}`).click();
      await expect.poll(
         () => page.evaluate(
            ({ actorId, itemId }) => game.actors.get(actorId).items.get(itemId).system.equipped,
            {
               actorId: actorIds.menu,
               itemId: itemIds.sidearm,
            },
         ),
         { message: 'the weapon equips via its main action' },
      ).toBe(true);
   });

   test('weapon sub-buttons send to chat and open the sheet', async () => {
      await control('menu');
      /** @type {string} The longsword's id. */
      const weaponId = itemIds.longsword;
      await hud('player-hud-category-weapons').click();
      /** @type {import('@playwright/test').Locator} The longsword's sub-option. */
      const subOption = hud(`player-hud-sub-option-weapons-${weaponId}`);
      await subOption.hover();
      await expect(hud(`player-hud-sub-button-${weaponId}-attack-0`)).toBeVisible();
      await expect(hud(`player-hud-sub-button-${weaponId}-equipped`)).toBeVisible();

      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await hud(`player-hud-sub-button-${weaponId}-send-to-chat`).click();
      await expect.poll(() => newMessageTypes(before), { message: 'the weapon item card lands in chat' })
         .toEqual(['weapon']);

      await hud('player-hud-category-weapons').click();
      await subOption.hover();
      await hud(`player-hud-sub-button-${weaponId}-open-sheet`).click();
      await expect.poll(
         () => page.evaluate(
            (itemId) => Array.from(foundry.applications.instances.values()).some((app) => app.document?.id === itemId),
            weaponId,
         ),
         { message: 'the weapon sheet opens' },
      ).toBe(true);
   });

   test('skill roll for a group hits every selected actor', async () => {
      await controlGroup();
      /** @type {number} The message count before the group roll. */
      const before = await messageCount();
      await hud('player-hud-category-skills').click();
      await hud('player-hud-sub-option-skills-athletics').click();
      await expect.poll(() => newMessageTypes(before), { message: 'one skill check per selected actor' })
         .toEqual([
            'attributeCheck',
            'attributeCheck',
         ]);
   });

   test('resistance roll rolls for all selected actors', async () => {
      await controlGroup();
      /** @type {number} The message count before the group roll. */
      const before = await messageCount();
      await hud('player-hud-category-resistances').click();
      await hud('player-hud-sub-option-resistances-reflexes').click();
      await expect.poll(() => newMessageTypes(before), { message: 'one resistance check per selected actor' })
         .toEqual([
            'resistanceCheck',
            'resistanceCheck',
         ]);
   });

   test('apply damage dialog applies the amount to all selected actors', async () => {
      // Both players start at full stamina, set in the portrait's bar one actor at a time.
      /** @type {number[]} The two actors' stamina after the top-up. */
      const before = [];
      for (const key of [
         'menu',
         'menu2',
      ]) {
         await control(key);
         await setBar(
            actorIds[key],
            'stamina',
            await page.evaluate((id) => game.actors.get(id).system.resource.stamina.max, actorIds[key]),
         );
         before.push(await page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, actorIds[key]));
      }

      await controlGroup();
      await hud('player-hud-category-utility').click();
      await hud('player-hud-sub-option-utility-applyDamage').click();
      await hud('hud-amount-input').fill('3');
      await hud('hud-amount-confirm').click();

      await expect.poll(
         () => page.evaluate(
            (ids) => ids.map((id) => game.actors.get(id).system.resource.stamina.value),
            [
               actorIds.menu,
               actorIds.menu2,
            ],
         ),
         { message: 'both actors take the entered damage' },
      ).toEqual([
         before[0] - 3,
         before[1] - 3,
      ]);
   });

   test('spell main action rolls a casting check', async () => {
      await control('menu');
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await hud('player-hud-category-spells').click();
      await hud(`player-hud-sub-option-spells-${itemIds.spark}`).click();
      await expect.poll(() => newMessageTypes(before), { message: 'a casting check chat message' })
         .toEqual(['castingCheck']);
   });

   test('ability and effect main actions roll their first check', async () => {
      await control('menu');
      /** @type {number} The message count before the first click. */
      const before = await messageCount();
      await hud('player-hud-category-abilities').click();
      await hud(`player-hud-sub-option-abilities-${itemIds.trick}`).click();
      await expect.poll(() => newMessageTypes(before), { message: 'an item check from the ability' })
         .toEqual(['itemCheck']);

      await hud('player-hud-category-effects').click();
      await hud(`player-hud-sub-option-effects-${itemIds.burning}`).click();
      await expect.poll(() => newMessageTypes(before), { message: 'an item check from the effect' })
         .toEqual([
            'itemCheck',
            'itemCheck',
         ]);
   });

   test('commodity quantity sub-buttons step the quantity', async () => {
      await control('menu');

      /**
       * Reads the commodity's quantity.
       * @returns {Promise<number>} The quantity.
       */
      const read = () => page.evaluate(
         ({ actorId, itemId }) => game.actors.get(actorId).items.get(itemId).system.quantity,
         {
            actorId: actorIds.menu,
            itemId: itemIds.rations,
         },
      );
      /** @type {number} The quantity before the steps. */
      const quantity = await read();
      await hud('player-hud-category-inventory').click();
      /** @type {import('@playwright/test').Locator} The rations sub-option. */
      const subOption = hud(`player-hud-sub-option-inventory-${itemIds.rations}`);
      await subOption.hover();
      await hud(`player-hud-sub-button-${itemIds.rations}-quantity-increase`).click();
      await expect.poll(read, { message: 'the quantity increments in place' }).toBe(quantity + 1);

      await subOption.hover();
      await hud(`player-hud-sub-button-${itemIds.rations}-quantity-decrease`).click();
      await expect.poll(read, { message: 'the quantity decrements in place' }).toBe(quantity);
   });

   test('effect duration and remove sub-buttons update and delete the effect', async () => {
      await setClientSetting(page, 'confirmDeletingEffects', false);
      await control('menu');

      /**
       * Reads the effect's remaining duration, or null once the effect is gone.
       * @returns {Promise<number | null>} The remaining duration.
       */
      const read = () => page.evaluate(
         ({ actorId, effectId }) => game.actors.get(actorId).effects.get(effectId)?.system.duration.remaining ?? null,
         {
            actorId: actorIds.menu,
            effectId: itemIds.burning,
         },
      );
      /** @type {number} The remaining duration before the step. */
      const remaining = await read();
      await hud('player-hud-category-effects').click();
      /** @type {import('@playwright/test').Locator} The burning effect's sub-option. */
      const subOption = hud(`player-hud-sub-option-effects-${itemIds.burning}`);
      await subOption.hover();
      await hud(`player-hud-sub-button-${itemIds.burning}-duration-increase`).click();
      await expect.poll(read, { message: 'the duration increments in place' }).toBe(remaining + 1);

      await subOption.hover();
      await hud(`player-hud-sub-button-${itemIds.burning}-remove`).click();
      await expect.poll(read, { message: 'the effect is removed' }).toBe(null);
   });
});

test.describe('options', () => {
   test('the weapons filter hides action-less weapons until disabled', async () => {
      await control('menu');

      // The equipped longsword keeps the category itself, which disappears when every weapon is filtered.
      await hud('player-hud-category-weapons').click();
      await expect(hud(`player-hud-sub-option-weapons-${itemIds.longsword}`)).toBeVisible();
      await expect(hud(`player-hud-sub-option-weapons-${itemIds.driftwood}`)).toHaveCount(0);

      await setClientSetting(page, 'playerHudOptions', { actionMenu: { filters: { weaponsWithActions: false } } });

      // The options change forces a remount, but the open category persists in the layout state; clicking the
      // category again would toggle the cascade closed.
      await expect(hud(`player-hud-sub-option-weapons-${itemIds.driftwood}`)).toBeVisible();
   });

   test('a disabled sub-button gate removes that sub-button from the flyout', async () => {
      await control('menu');
      await hud('player-hud-category-weapons').click();
      /** @type {import('@playwright/test').Locator} The longsword's sub-option. */
      const subOption = hud(`player-hud-sub-option-weapons-${itemIds.longsword}`);
      await subOption.hover();

      // Presence: the send-to-chat sub-button shows under the default gates.
      await expect(hud(`player-hud-sub-button-${itemIds.longsword}-send-to-chat`)).toBeVisible();

      await setClientSetting(page, 'playerHudOptions', { actionMenu: { subButtons: { sendToChat: false } } });

      // The options change forces a remount, but the open category persists in the layout state, so re-hovering the
      // same sub-option reveals its (now-gated) sub-buttons without re-opening.
      await subOption.hover();

      // The independently gated open-sheet button proves the gated flyout re-rendered, and the send-to-chat
      // sub-button is gone once its gate is disabled.
      await expect(hud(`player-hud-sub-button-${itemIds.longsword}-open-sheet`)).toBeVisible();
      await expect(hud(`player-hud-sub-button-${itemIds.longsword}-send-to-chat`)).toHaveCount(0);
   });

   test('Escape and click-away close the cascade', async () => {
      await control('menu');
      await hud('player-hud-category-skills').click();
      await expect(hud('player-hud-flyout')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(hud('player-hud-flyout')).toHaveCount(0);

      // Click the portrait instead of the canvas: a canvas click would release the token and unmount the whole HUD,
      // masking the click-away behavior under test.
      await hud('player-hud-category-skills').click();
      await expect(hud('player-hud-flyout')).toBeVisible();
      await hud('player-hud-portrait').click();
      await expect(hud('player-hud-flyout')).toHaveCount(0);
   });

   test('skill sub-options show the icon of the actor\'s current default attribute', async () => {
      /** @type {string} The menu player's uuid. */
      const actorUuid = `Actor.${actorIds.menu}`;
      await setSkillDefaultAttribute(page, actorUuid, 'athletics', 'body');
      await control('menu');
      await openCategory('skills');
      /** @type {import('@playwright/test').Locator} The athletics sub-option's icon. */
      const icon = hud('player-hud-sub-option-skills-athletics').locator('i');
      await expect(icon).toHaveClass(/(?:^|\s)fas\sfa-hand-fist(?:\s|$)/);

      // Changing the default attribute in the sheet re-derives the icon. A press outside the action menu closes the
      // cascade (`onWindowPointerDown` in ActionMenuElement.svelte), and the sheet is outside it, so the category is
      // opened again.
      await setSkillDefaultAttribute(page, actorUuid, 'athletics', 'mind');
      await closeAllApps(page);
      await openCategory('skills');
      await expect(icon).toHaveClass(/(?:^|\s)fas\sfa-brain(?:\s|$)/);

      await setSkillDefaultAttribute(page, actorUuid, 'athletics', 'body');
   });

   test('resistance and utility sub-options carry icons', async () => {
      await control('menu');
      await openCategory('resistances');
      await expect(hud('player-hud-sub-option-resistances-reflexes').locator('i'))
         .toHaveClass(/(?:^|\s)fas\sfa-rabbit-running(?:\s|$)/);

      await openCategory('utility');
      for (const [key, icon] of [
         [
            'toggleInspiration',
            /(?:^|\s)fas\sfa-sun(?:\s|$)/,
         ],
         [
            'shortRest',
            /(?:^|\s)fas\sfa-face-exhaling(?:\s|$)/,
         ],
         [
            'applyRepairs',
            /(?:^|\s)fas\sfa-screwdriver-wrench(?:\s|$)/,
         ],
      ]) {
         await expect(hud(`player-hud-sub-option-utility-${key}`).locator('i')).toHaveClass(icon);
      }
   });

   test('inspiration toggles show whether inspiration applies', async () => {
      await control('menu');
      /** @type {import('@playwright/test').Locator} The portrait's inspiration toggle. */
      const portraitToggle = hud('player-hud-toggle-inspiration');
      /** @type {import('@playwright/test').Locator} The utility menu's inspiration toggle. */
      const menuToggle = hud('player-hud-sub-option-utility-toggleInspiration');
      /** @type {boolean} Whether the actor has inspiration before the test. */
      const before = await page.evaluate((id) => game.actors.get(id).system.inspiration, actorIds.menu);

      // The portrait toggle turns inspiration on when it is off.
      if (!before) {
         await portraitToggle.click();
         await expect(portraitToggle).toHaveAttribute('aria-pressed', 'true');
      }
      await openCategory('utility');

      // Presence: both toggles report pressed and paint the icon in the accent color.
      await expect(portraitToggle).toHaveAttribute('aria-pressed', 'true');
      await expect(menuToggle).toHaveAttribute('aria-pressed', 'true');
      expect(await iconUsesAccent('player-hud-toggle-inspiration')).toBe(true);
      expect(await iconUsesAccent('player-hud-sub-option-utility-toggleInspiration')).toBe(true);

      // Clicking the portrait toggle clears inspiration; both toggles follow. The click lands outside the flyout, which
      // closes the cascade, so the utility category is reopened before reading the menu toggle.
      await portraitToggle.click();
      await expect(portraitToggle).toHaveAttribute('aria-pressed', 'false');
      await openCategory('utility');
      await expect(menuToggle).toHaveAttribute('aria-pressed', 'false');
      expect(await iconUsesAccent('player-hud-sub-option-utility-toggleInspiration')).toBe(false);
      expect(await iconUsesAccent('player-hud-toggle-inspiration')).toBe(false);
      expect(await page.evaluate((id) => game.actors.get(id).system.inspiration, actorIds.menu)).toBe(false);
   });
});

test.describe('layout', () => {
   test('vertical layout stacks categories in a column; horizontal in a row', async () => {
      await control('menu');
      /** @type {import('@playwright/test').Locator} The Skills category button. */
      const skills = hud('player-hud-category-skills');
      /** @type {import('@playwright/test').Locator} The Resistances category button. */
      const resistances = hud('player-hud-category-resistances');

      // A layout switch re-flows the bar asynchronously, so both arrangements are asserted through the settling
      // comparison rather than from one-shot boxes read the instant the setting write returns.
      await expectBoxes(
         skills,
         resistances,
         (skillsBox, resistancesBox) => Math.abs(skillsBox.x - resistancesBox.x) < 2 && resistancesBox.y > skillsBox.y,
         'vertical layout: categories share a column and stack downward',
      );

      await setMenuOptions({ layout: 'horizontal' });
      await expectBoxes(
         skills,
         resistances,
         (skillsBox, resistancesBox) => Math.abs(skillsBox.y - resistancesBox.y) < 2 && resistancesBox.x > skillsBox.x,
         'horizontal layout: categories share a row and run rightward',
      );
   });

   test('sub-options expand to the configured side and lanes never overlap', async () => {
      await control('menu');
      /** @type {import('@playwright/test').Locator} The open flyout. */
      const flyout = hud('player-hud-flyout');
      /** @type {import('@playwright/test').Locator} The Skills category button. */
      const skills = hud('player-hud-category-skills');

      // Park the menu mid-screen so the flyout has room on every side: the move leaves a full flyout's height of space
      // above and below the bar for the horizontal-layout steps.
      await moveMenu(0, -300);

      // Vertical, sub-options left (pinned, the default is right): the flyout lane ends before the bar.
      await setMenuOptions({
         layout: 'vertical',
         directions: { vertical: { subOptions: 'left' } },
      });
      await openCategory('skills');
      await expectBoxes(
         flyout,
         skills,
         (flyoutBox, barBox) => flyoutBox.x + flyoutBox.width <= barBox.x + 1,
         'vertical-left: the flyout lane ends before the bar',
      );

      // Vertical, sub-options right: the flyout lane begins after the bar ends.
      await setMenuOptions({ directions: { vertical: { subOptions: 'right' } } });
      await openCategory('skills');
      await expectBoxes(
         flyout,
         skills,
         (flyoutBox, barBox) => flyoutBox.x >= barBox.x + barBox.width - 1,
         'vertical-right: the flyout lane begins after the bar',
      );

      // Horizontal, sub-options up: the flyout sits fully above the bar.
      await setMenuOptions({
         layout: 'horizontal',
         directions: {
            vertical: { subOptions: 'left' },
            horizontal: { subOptions: 'up' },
         },
      });
      await openCategory('skills');
      await expectBoxes(
         flyout,
         skills,
         (flyoutBox, barBox) => flyoutBox.y + flyoutBox.height <= barBox.y + 1,
         'horizontal-up: the flyout sits above the bar',
      );

      // Horizontal, sub-options down: the flyout sits fully below the bar.
      await setMenuOptions({ directions: { horizontal: { subOptions: 'down' } } });
      await openCategory('skills');
      await expectBoxes(
         flyout,
         skills,
         (flyoutBox, barBox) => flyoutBox.y >= barBox.y + barBox.height - 1,
         'horizontal-down: the flyout sits below the bar',
      );
   });

   test('the vertical flyout anchors to the open category button and flows up or down', async () => {
      await control('menu');
      /** @type {import('@playwright/test').Locator} The open flyout. */
      const flyout = hud('player-hud-flyout');
      /** @type {import('@playwright/test').Locator} The Skills category button. */
      const skills = hud('player-hud-category-skills');

      // Park the menu mid-screen so the flyout has vertical room both above and below the bar.
      await moveMenu(0, -300);

      // Flow down: the first sub-option lines up with the open button's top, stacking below.
      await setMenuOptions({ directions: { vertical: { subOptionsFlow: 'down' } } });
      await openCategory('skills');
      await expectBoxes(
         flyout,
         skills,
         (flyoutBox, barBox) => Math.abs(flyoutBox.y - barBox.y) <= 2,
         'flow-down: the flyout top aligns to the open category button',
      );

      // Flow up: the flyout's bottom lines up with the open button's bottom, stacking earlier options above.
      await setMenuOptions({ directions: { vertical: { subOptionsFlow: 'up' } } });
      await openCategory('skills');
      await expectBoxes(
         flyout,
         skills,
         (flyoutBox, barBox) => Math.abs((flyoutBox.y + flyoutBox.height) - (barBox.y + barBox.height)) <= 2,
         'flow-up: the flyout bottom aligns to the open category button',
      );
   });

   test('sub-buttons form a third disjoint lane', async () => {
      await control('menu');
      /** @type {string} The longsword's id. */
      const weaponId = itemIds.longsword;

      // Pin the left cascade (the default is right) so the lanes run right-to-left.
      await setMenuOptions({
         layout: 'vertical',
         directions: { vertical: { subOptions: 'left' } },
      });
      await openCategory('weapons');
      await hud(`player-hud-sub-option-weapons-${weaponId}`).hover();

      /** @type {import('@playwright/test').Locator} The longsword's open-sheet sub-button. */
      const subButton = hud(`player-hud-sub-button-${weaponId}-open-sheet`);
      await expect(subButton).toBeVisible();

      // The lanes reach their final positions through the sub-button reveal transition, and `boundingBox()` does not
      // retry: settling the HUD subtree first makes the geometry below deterministic.
      await waitForAnimations(page, '#titan-player-hud');

      /** @type {object} The sub-button lane probe box. */
      const buttonBox = await subButton.boundingBox();
      /** @type {object} The sub-option lane box. */
      const flyoutBox = await hud('player-hud-flyout').boundingBox();
      /** @type {object} The category lane probe box. */
      const barBox = await hud('player-hud-category-weapons').boundingBox();

      // The left cascade runs right-to-left: sub-buttons end before the sub-options begin, which in turn end before
      // the category bar begins.
      expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(flyoutBox.x + 1);
      expect(flyoutBox.x + flyoutBox.width).toBeLessThanOrEqual(barBox.x + 1);
   });

   test('the configured direction is honored at the screen edge (no auto-flip)', async () => {
      await control('menu');

      // Pin the left cascade (the default is right).
      await setMenuOptions({
         layout: 'vertical',
         directions: { vertical: { subOptions: 'left' } },
      });

      // Park the menu against the LEFT edge the way a user drags it there. The configured direction is
      // authoritative, so the left cascade keeps opening left rather than flipping away.
      await moveMenu(-1000, 0);
      await openCategory('skills');
      await expectBoxes(
         hud('player-hud-flyout'),
         hud('player-hud-category-skills'),
         (flyoutBox, barBox) => flyoutBox.x + flyoutBox.width <= barBox.x + 1,
         'no flip: the flyout opens to the configured (left) side even at the left edge',
      );
   });

   test('long lists window and wheel-scroll', async () => {
      await control('menu');

      // Pin flow down so the scroll fades and wheel direction assert the natural top-to-bottom window.
      await setMenuOptions({
         windowSize: 5,
         directions: { vertical: { subOptionsFlow: 'down' } },
      });
      await openCategory('skills');

      /** @type {import('@playwright/test').Locator} The skill sub-options. */
      const subOptions = page.locator('[data-testid^="player-hud-sub-option-skills-"]');
      await expect(subOptions).toHaveCount(5);
      await expect(hud('player-hud-flyout-down')).toBeVisible();
      await expect(hud('player-hud-flyout-up')).toHaveCount(0);

      /** @type {string} The first visible skill before scrolling. */
      const firstBefore = await subOptions.first().getAttribute('data-testid');
      await hud('player-hud-flyout').hover();
      await page.mouse.wheel(0, 120);
      await expect(subOptions.first()).not.toHaveAttribute('data-testid', firstBefore);
      await expect(hud('player-hud-flyout-up')).toBeVisible();
   });

   test('per-category disable removes the category', async () => {
      await control('menu');
      await expect(hud('player-hud-category-skills')).toBeVisible();

      await setMenuOptions({ categories: { skills: false } });
      await expect(hud('player-hud-category-skills')).toHaveCount(0);
      await expect(hud('player-hud-category-resistances')).toBeVisible();

      await setMenuOptions({ categories: { skills: true } });
      await expect(hud('player-hud-category-skills')).toBeVisible();
   });

   test('group mode shows only the three group categories', async () => {
      await controlGroup();
      await expect(hud('player-hud-category-skills')).toBeVisible();
      await expect(hud('player-hud-category-resistances')).toBeVisible();
      await expect(hud('player-hud-category-utility')).toBeVisible();
      await expect(page.locator('[data-testid^="player-hud-category-"]')).toHaveCount(3);
   });
});

test.describe('report cards', () => {
   /**
    * Waits for the one report of a type that the click posted, and checks its mounted card in the chat log.
    * @param {number} before - The message count before the click.
    * @param {string} type - The expected leaf subtype key (for example `damageReport`).
    * @returns {Promise<string>} The id of the report message.
    */
   async function expectReportCard(before, type) {
      await expect.poll(
         async () => (await newMessageTypes(before)).filter((entry) => entry === type).length,
         { message: `one ${type} message was posted` },
      ).toBe(1);

      /** @type {string} The report message's id. */
      const id = await page.evaluate(
         ({ count, type }) => game.messages.contents.slice(count).find((message) => message.type === type).id,
         {
            count: before,
            type,
         },
      );

      // Foundry renders each message in more than one log; the card is located by its root class `.report` and the
      // first visible mount is used. The chat log is shown first: a collapsed sidebar parks it off screen.
      await showChatLog(page);
      /** @type {import('@playwright/test').Locator} The report card. */
      const card = page.locator(`#chat .message[data-message-id="${id}"] .report`).first();
      await expect(card, `the mounted ${type} card is visible`).toBeVisible();

      // The card holds text: a blank mount is the regression the two revert reports once had.
      await expect.poll(
         () => card.textContent().then((text) => (text ?? '').trim().length),
         { message: `${type} card content has non-empty text` },
      ).toBeGreaterThan(0);
      return id;
   }

   /**
    * Chooses a utility action in the action menu.
    * @param {string} key - The utility sub-option key.
    * @returns {Promise<void>} Resolves once the click is dispatched.
    */
   async function useUtility(key) {
      await openCategory('utility');
      await hud(`player-hud-sub-option-utility-${key}`).click();
   }

   /**
    * Enters an amount in the amount dialog the apply actions open, and confirms it.
    * @param {number} amount - The amount.
    * @returns {Promise<void>} Resolves once the dialog's confirm button is clicked.
    */
   async function confirmAmount(amount) {
      await hud('hud-amount-input').fill(String(amount));
      await hud('hud-amount-confirm').click();
   }

   test('applyDamage posts a damageReport card', async () => {
      await control('report');
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await useUtility('applyDamage');
      await confirmAmount(5);
      /** @type {string} The damage report message's id. */
      const id = await expectReportCard(before, 'damageReport');

      // The report's resource snapshot maxima equal the actor's live maxima at the same path.
      expect(
         await page.evaluate(({ id, actorId }) => {
            /** @type {object} The resource snapshot the report holds. */
            const report = game.messages.get(id).system.resource;
            /** @type {object} The actor's live resources. */
            const live = game.actors.get(actorId).system.resource;
            return {
               stamina: report.stamina.max === live.stamina.max,
               wounds: report.wounds.max === live.wounds.max,
            };
         }, {
            id,
            actorId: actorIds.report,
         }),
         'the report snapshot resolves at the same path as the actor\'s live maxima',
      ).toEqual({
         stamina: true,
         wounds: true,
      });
   });

   test('applyHealing posts a healingReport card', async () => {
      // Stamina below max, so a heal moves it (healing a full resource posts no report).
      await control('report');
      await setBar(actorIds.report, 'stamina', 0);
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await useUtility('applyHealing');
      await confirmAmount(2);
      await expectReportCard(before, 'healingReport');
   });

   test('spendResolve posts a spendResolveReport card', async () => {
      // No Resolve held, so the spend also exercises the shortage branch.
      await control('report');
      await setBar(actorIds.report, 'resolve', 0);
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await hud('player-hud-spend-resolve').click();
      await expectReportCard(before, 'spendResolveReport');
   });

   test('applyRend posts a rendReport card', async () => {
      // Rend needs worn armor with a positive armor value: the report player wears one.
      await control('report');
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await useUtility('applyRend');
      await confirmAmount(1);
      await expectReportCard(before, 'rendReport');
   });

   test('applyRepairs posts a repairsReport card', async () => {
      // Repairs need worn armor whose value is below its maximum. The rend test above already took the armor below
      // it; the armor is rended here only when it is not (a rend of fully rended armor posts no report).
      await control('report');
      /**
       * Reads whether the worn armor is below its maximum.
       * @returns {Promise<boolean>} True when the armor value is under its maximum.
       */
      const armorBelowMax = () => page.evaluate(
         (id) => {
            /** @type {Item} The worn armor. */
            const armor = game.actors.get(id).items.find((item) => item.type === 'armor');
            return armor.system.armor.value < armor.system.armor.max;
         },
         actorIds.report,
      );
      if (!await armorBelowMax()) {
         await useUtility('applyRend');
         await confirmAmount(1);
      }
      await expect.poll(armorBelowMax, { message: 'the armor is below its maximum' }).toBe(true);

      /** @type {number} The message count before the repair. */
      const before = await messageCount();
      await useUtility('applyRepairs');
      await confirmAmount(1);
      await expectReportCard(before, 'repairsReport');
   });

   test('removeCombatEffects posts a removeCombatEffectsReport card', async () => {
      await control('report');
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await useUtility('removeCombatEffects');
      await expectReportCard(before, 'removeCombatEffectsReport');
   });

   test('shortRest posts a shortRestReport card', async () => {
      await control('report');
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await useUtility('shortRest');
      await expectReportCard(before, 'shortRestReport');
   });

   test('longRest posts a longRestReport card', async () => {
      await control('report');
      /** @type {number} The message count before the click. */
      const before = await messageCount();
      await useUtility('longRest');
      await expectReportCard(before, 'longRestReport');
   });
});

