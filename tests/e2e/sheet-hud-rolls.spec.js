import { expect, flushPageErrors, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { clickRoll, openCheckDialog, readNewestCheckFlags, setCheckbox } from './checkDialog.js';
import { openWeaponRow, readResultRows } from './checkCards.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   activateScene,
   addCheck,
   controlPlacedToken,
   createActor,
   createOwnedItem,
   createScene,
   placeToken,
   sendToChat,
   setAttributeBase,
   setEquipped,
   setOwnership,
   setResource,
   setSkillTraining,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { buildSpell, readCardDice } from './spellCasting.js';
import { expectedCheckResults } from '../shared/checkOracle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Rolls from the character sheet and from the Player HUD, with forced dice and the result read from the chat card. The
 * roller has Body 5, Mind 5 and Soul 2 and Arcana Training 2. By the rules formulas of `CharacterDataModel` (read in
 * `_calculateBaseResistances`): Reflexes = Mind + floor(Body / 2) = 7, Resilience = Body + floor(Soul / 2) = 6,
 * Willpower = Soul + floor(Mind / 2) = 4; an Arcana check rolls Mind + Training = 7 dice, an Attribute, Attack or Item
 * check rolls 5. With no target an attack is Difficulty 4, Complexity 1. The expected successes come from the oracle
 * (`tests/shared/checkOracle.js`). A roll from the HUD gives the same dice, results and card as the same roll from
 * the sheet, and the owner's own client rolls from both too.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who owns the roller. */
let player;
/** @type {string[]} Uncaught page errors collected on the GM's page. */
let errors;
/** @type {string|undefined} The id of the scene that was active before this spec. */
let previousSceneId;
/** @type {Record<string, string>} The roller's ids: actor, token, weapon, spell, ability. */
const roller = {};
/** @type {Record<string, string>} The Resolve caster's ids: actor, token, spell. */
const caster = {};

/** @type {number[]} Seven forced faces, enough for the largest check. */
const FACES = [
   6,
   6,
   5,
   4,
   3,
   2,
   1,
];

/** @type {string} The label of the ability's check. */
const CHECK_LABEL = 'E2E Sheet Roll Check';

/**
 * The checks under test: the type of message each posts, the dice it rolls and where each entry point is.
 * @type {{name: string, type: string, dice: number, hud: string[]|null}[]}
 */
const CASES = [
   {
      name: 'attribute',
      type: 'attributeCheck',
      dice: 5,
      hud: null,
   },
   {
      name: 'skill',
      type: 'attributeCheck',
      dice: 7,
      hud: [
         'skills',
         'arcana',
      ],
   },
   {
      name: 'resistance',
      type: 'resistanceCheck',
      dice: 7,
      hud: [
         'resistances',
         'reflexes',
      ],
   },
   {
      name: 'attack',
      type: 'attackCheck',
      dice: 5,
      hud: [
         'weapons',
         'weapon',
      ],
   },
   {
      name: 'casting',
      type: 'castingCheck',
      dice: 7,
      hud: [
         'spells',
         'spell',
      ],
   },
   {
      name: 'item',
      type: 'itemCheck',
      dice: 5,
      hud: [
         'abilities',
         'ability',
      ],
   },
];

test.beforeAll(async ({ browser }) => {
   test.setTimeout(300_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   await setClientSetting(gm, 'getCheckOptions', 'never');
   previousSceneId = await gm.evaluate(() => game.scenes.active?.id);
   await viewScene(gm, await createScene(gm, { name: 'E2E Sheet HUD Rolls Scene' }));

   /** @type {{column: number, row: number}} The middle square of the viewed scene. */
   const middle = await gm.evaluate(() => ({
      column: Math.round(canvas.stage.pivot.x / canvas.grid.size),
      row: Math.round(canvas.stage.pivot.y / canvas.grid.size),
   }));
   roller.actor = await createActor(gm, {
      name: 'E2E Sheet Roller',
      type: 'player',
   });
   /** @type {string} The roller's uuid. */
   const rollerUuid = `Actor.${roller.actor}`;
   await setAttributeBase(gm, rollerUuid, 'body', 5);
   await setAttributeBase(gm, rollerUuid, 'mind', 5);
   await setAttributeBase(gm, rollerUuid, 'soul', 2);
   await setSkillTraining(gm, rollerUuid, 'arcana', 2);
   roller.weapon = await createOwnedItem(gm, roller.actor, 'weapon', 'E2E Sheet Weapon');
   await setEquipped(gm, roller.actor, roller.weapon, true);
   roller.ability = await createOwnedItem(gm, roller.actor, 'ability', 'E2E Sheet Ability');
   await addCheck(gm, `${rollerUuid}.Item.${roller.ability}`, { label: CHECK_LABEL });
   roller.spell = (await buildSpell(gm, roller.actor, 'E2E Sheet Spell', {})).id;
   roller.token = await placeToken(gm, roller.actor, {
      square: {
         column: middle.column - 12,
         row: middle.row - 4,
      },
   });
   await setOwnership(gm, roller.actor, 'E2E Player 1', 'OWNER');

   caster.actor = await createActor(gm, {
      name: 'E2E Sheet Resolve Caster',
      type: 'player',
   });
   /** @type {string} The caster's uuid. */
   const casterUuid = `Actor.${caster.actor}`;
   await setAttributeBase(gm, casterUuid, 'mind', 3);
   await setAttributeBase(gm, casterUuid, 'soul', 6);
   await setSkillTraining(gm, casterUuid, 'arcana', 2);
   caster.spell = (await buildSpell(gm, caster.actor, 'E2E Sheet Resolve Spell', {
      standard: [{ label: 'damage' }],
   })).id;
   caster.token = await placeToken(gm, caster.actor, {
      square: {
         column: middle.column - 12,
         row: middle.row - 1,
      },
   });
   await closeAllApps(gm);

   // The Player sees the active scene.
   // Core activates a scene created while none is active.
   if (!await gm.evaluate(() => canvas.scene.active)) {
      await activateScene(gm, await gm.evaluate(() => canvas.scene.id));
   }
   player = await (await browser.newContext()).newPage();
   await login(player, 'E2E Player 1');
   await setClientSetting(player, 'getCheckOptions', 'never');
});

test.afterEach(async () => {
   await resetDice(gm);
   await resetDice(player);
   await closeAllApps(gm);
   await closeAllApps(player);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await flushPageErrors(player);
   await player?.context().close();
   if (previousSceneId && previousSceneId !== await gm.evaluate(() => game.scenes.active?.id)) {
      await activateScene(gm, previousSceneId);
   }
   await gm?.close();
});

/**
 * Expands an item row of the open sheet tab.
 * @param {import('@playwright/test').Locator} sheet - The actor's sheet.
 * @param {string} itemId - The item's id.
 * @returns {Promise<import('@playwright/test').Locator>} The expanded row.
 */
async function expandRow(sheet, itemId) {
   /** @type {import('@playwright/test').Locator} The row. */
   const row = sheet.locator(`[data-item-id="${itemId}"]`);
   await expect(row, 'the row renders').toBeVisible();
   if (await row.locator('.expandable-content').count() === 0) {
      await row.locator('.header .label .button button').first().click();
   }
   await expect(row.locator('.expandable-content')).toBeVisible();
   return row;
}

/**
 * Clicks the roll control of a check on the roller's character sheet.
 * @param {import('@playwright/test').Page} on - The client.
 * @param {string} name - The case name.
 * @returns {Promise<void>} Resolves once clicked.
 */
async function clickSheetControl(on, name) {
   /** @type {string} The roller's uuid. */
   const uuid = `Actor.${roller.actor}`;
   /** @type {import('@playwright/test').Locator} The sheet. */
   const sheet = await openSheetByUuid(on, uuid);
   if (name === 'attribute') {
      await sheet.getByRole('button', {
         name: 'Body',
         exact: true,
      }).first().click();
   }
   else if (name === 'resistance') {
      await sheet.getByRole('button', {
         name: 'Reflexes',
         exact: true,
      }).first().click();
   }
   else if (name === 'skill') {
      await clickSheetTab(sheet, 'Skills');
      await sheet.locator('.skill .check-button button', { hasText: 'Arcana' }).first().click();
   }
   else if (name === 'attack') {
      await clickSheetTab(sheet, 'Inventory');
      await (await expandRow(sheet, roller.weapon)).locator('.controls .check-button button').click();
   }
   else if (name === 'casting') {
      await clickSheetTab(sheet, 'Spells');
      await sheet.locator(`[data-item-id="${roller.spell}"] .controls .check-button button`).click();
   }
   else {
      await clickSheetTab(sheet, 'Abilities');
      await (await expandRow(sheet, roller.ability)).getByRole('button').filter({ hasText: CHECK_LABEL }).click();
   }
}

/**
 * Clicks the entry of a check in the Player HUD, after controlling the roller's token.
 * @param {import('@playwright/test').Page} on - The client.
 * @param {string[]} entry - The category and the sub-option (`weapon`, `spell` and `ability` name the roller's item).
 * @returns {Promise<void>} Resolves once clicked.
 */
async function clickHudEntry(on, entry) {
   // A Player's only token is controlled on joining and the Escape key does not release it, so it is not clicked again.
   if (!await on.evaluate((id) => canvas.tokens.controlled.some((token) => token.id === id), roller.token)) {
      await controlPlacedToken(on, roller.token);
   }
   /** @type {string[]} The category and the sub-option of the entry. */
   const [category, sub] = entry;
   /** @type {import('@playwright/test').Locator} The category button. */
   const button = on.getByTestId(`player-hud-category-${category}`);
   await expect(button).toBeVisible();
   if (!await button.evaluate((element) => element.classList.contains('active'))) {
      await button.click();
   }
   /** @type {string} The sub-option key. */
   const key = {
      weapon: roller.weapon,
      spell: roller.spell,
      ability: roller.ability,
   }[sub] ?? sub;
   await on.getByTestId(`player-hud-sub-option-${category}-${key}`).click();
}

/**
 * Rolls a case from the sheet or the HUD with the forced faces and returns the posted check.
 * @param {import('@playwright/test').Page} on - The client.
 * @param {object} rollCase - The case.
 * @param {'sheet'|'hud'} from - The entry point.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The check.
 */
async function roll(on, rollCase, from) {
   await forceDice(on, FACES);
   /** @type {number} The message count before the click. */
   const baseline = await on.evaluate(() => game.messages.size);
   if (from === 'sheet') {
      await clickSheetControl(on, rollCase.name);
   }
   else {
      await clickHudEntry(on, rollCase.hud);
   }
   return readNewestCheckFlags(on, baseline, rollCase.type);
}

/**
 * Asserts a posted check against the hand-worked dice and the oracle, and its card against both.
 * @param {import('@playwright/test').Page} on - The client whose chat log shows the card.
 * @param {object} rollCase - The case.
 * @param {{id: string, parameters: object, results: object}} flags - The posted check.
 * @returns {Promise<void>} Resolves once every assertion ran.
 */
async function expectRoll(on, rollCase, flags) {
   expect(flags.parameters.totalDice, `${rollCase.name}: dice from the attributes`).toBe(rollCase.dice);

   /** @type {number[]} The faces the roll consumes. */
   const faces = FACES.slice(0, rollCase.dice);
   expect(flags.results.dice.map((die) => die.final), 'the forced dice').toEqual(faces);

   /** @type {object} The oracle's results. */
   const expected = expectedCheckResults(faces, {
      difficulty: flags.parameters.difficulty,
      complexity: flags.parameters.complexity,
      extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
      extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
   });
   expect(flags.results.successes, 'successes').toBe(expected.successes);
   expect(flags.results.succeeded, 'succeeded').toBe(expected.succeeded);
   expect(flags.results.extraSuccesses, 'extra successes').toBe(expected.extraSuccesses);
   if (rollCase.name === 'attack') {
      expect([
         flags.parameters.difficulty,
         flags.parameters.complexity,
      ], 'no target: Difficulty 4, Complexity 1')
         .toEqual([
            4,
            1,
         ]);
   }
   await showChatLog(on);

   /** @type {import('@playwright/test').Locator} The card. */
   const card = on.locator(`#chat .chat-log li[data-message-id="${flags.id}"]`);
   await expect(card.locator('.check-chat-message')).toBeAttached();
   /** @type {{dc: string, successes: string}} The card's rows. */
   const rows = await readResultRows(card);
   expect(rows.dc, 'card DC').toBe(`DC ${flags.parameters.difficulty}:${flags.parameters.complexity}`);
   expect(rows.successes, 'card successes').toBe(`${expected.successes} Successes`);
   expect(await readCardDice(card), 'card dice').toEqual(faces.map(String));
}

/**
 * Picks the parts of a check that must be the same whichever control rolled it.
 * @param {{parameters: object, results: object}} flags - The posted check.
 * @returns {object} The comparable parts.
 */
function essence({ parameters, results }) {
   return {
      totalDice: parameters.totalDice,
      difficulty: parameters.difficulty,
      complexity: parameters.complexity,
      dice: results.dice.map((die) => die.final),
      successes: results.successes,
      succeeded: results.succeeded,
      extraSuccesses: results.extraSuccesses,
   };
}

test.describe('the GM rolls from the character sheet and the Player HUD', () => {
   for (const rollCase of CASES) {
      test(`${rollCase.name} check: sheet result is right and the HUD gives the same`, async () => {
         /** @type {{id: string, parameters: object, results: object}} The check rolled from the sheet. */
         const fromSheet = await roll(gm, rollCase, 'sheet');
         await expectRoll(gm, rollCase, fromSheet);
         await closeAllApps(gm);
         if (rollCase.hud) {
            /** @type {{id: string, parameters: object, results: object}} The check rolled from the HUD. */
            const fromHud = await roll(gm, rollCase, 'hud');
            await expectRoll(gm, rollCase, fromHud);
            expect(essence(fromHud), 'the HUD roll equals the sheet roll').toEqual(essence(fromSheet));
         }
      });
   }
});

test.describe('the owner rolls on the player\'s own client', () => {
   for (const rollCase of CASES) {
      test(`${rollCase.name} check from the player's sheet${rollCase.hud ? ' and HUD' : ''}`, async () => {
         /** @type {{id: string, parameters: object, results: object}} The check rolled from the sheet. */
         const fromSheet = await roll(player, rollCase, 'sheet');
         await expectRoll(player, rollCase, fromSheet);
         await closeAllApps(player);
         if (rollCase.hud) {
            /** @type {{id: string, parameters: object, results: object}} The check rolled from the HUD. */
            const fromHud = await roll(player, rollCase, 'hud');
            await expectRoll(player, rollCase, fromHud);
            expect(essence(fromHud), 'the HUD roll equals the sheet roll').toEqual(essence(fromSheet));
         }
      });
   }
});

test.describe('a cast that spends Resolve', () => {
   /**
    * Reads the caster's Resolve.
    * @returns {Promise<number>} The current Resolve.
    */
   function readResolve() {
      return gm.evaluate((id) => game.actors.get(id).system.resource.resolve.value, caster.actor);
   }

   test.beforeEach(async () => {
      await setClientSetting(gm, 'getCheckOptions', 'always');
      await setResource(gm, `Actor.${caster.actor}`, 'resolve', 3);
      await closeAllApps(gm);
   });

   test.afterEach(async () => {
      await setClientSetting(gm, 'getCheckOptions', 'never');
   });

   /**
    * Casts with Training doubled in the dialog the entry point opens and checks the dice and the Resolve.
    * @param {() => Promise<void>} open - Clicks the entry point.
    * @returns {Promise<void>} Resolves once checked.
    */
   async function castDoubled(open) {
      await open();
      /** @type {import('@playwright/test').Locator} The casting dialog. */
      const dialog = gm.locator('.application.titan-dialog[id^="titan-casting-check-dialog-"]').first();
      await expect(dialog).toBeVisible();
      await setCheckbox(dialog, 'doubleTraining', true);
      await forceDice(gm, FACES);
      /** @type {number} The message count before the roll. */
      const baseline = await clickRoll(dialog, gm);
      /** @type {{id: string, type: string, parameters: object, results: object}} The posted check. */
      const flags = await readNewestCheckFlags(gm, baseline, 'castingCheck');

      // Mind 3 and Arcana Training 2 doubled: 3 + 4 = 7 dice, as the T1 cast spec worked out from the same rules.
      expect(flags.parameters.totalDice).toBe(7);
      expect(flags.results.dice.map((die) => die.final)).toEqual(FACES);
      await expect.poll(readResolve, { message: 'the doubled Training spent 1 Resolve' }).toBe(2);
   }

   test('from the character sheet', async () => {
      await castDoubled(async () => {
         /** @type {import('@playwright/test').Locator} The sheet. */
         const sheet = await openSheetByUuid(gm, `Actor.${caster.actor}`);
         await clickSheetTab(sheet, 'Spells');
         await sheet.locator(`[data-item-id="${caster.spell}"] .controls .check-button button`).click();
      });
   });

   test('from the Player HUD', async () => {
      await castDoubled(async () => {
         await controlPlacedToken(gm, caster.token);
         /** @type {import('@playwright/test').Locator} The Spells category. */
         const category = gm.getByTestId('player-hud-category-spells');
         await expect(category).toBeVisible();
         if (!await category.evaluate((element) => element.classList.contains('active'))) {
            await category.click();
         }
         await gm.getByTestId(`player-hud-sub-option-spells-${caster.spell}`).click();
      });
   });
});

test.describe('the ability\'s chat card', () => {
   test('its check button rolls the item check for the controlled character', async () => {
      /** @type {string} The id of the card the ability's Send to Chat button posts. */
      const cardId = await sendToChat(gm, `Actor.${roller.actor}.Item.${roller.ability}`);
      await controlPlacedToken(gm, roller.token);
      await showChatLog(gm);

      /** @type {import('@playwright/test').Locator} The check button on the card. */
      const button = gm.locator(`#chat .chat-log li[data-message-id="${cardId}"]`)
         .locator('button', { hasText: CHECK_LABEL });
      await expect(button, 'the card offers the check').toBeVisible();
      await forceDice(gm, FACES);

      /** @type {number} The message count before the click. */
      const baseline = await gm.evaluate(() => game.messages.size);
      await button.click();
      await expectRoll(gm, CASES[5], await readNewestCheckFlags(gm, baseline, 'itemCheck'));
   });
});

test.describe('a player who does not own the character', () => {
   test('has the roll buttons of the sheet disabled where the owner has them enabled', async () => {
      /** @type {string} The id of a character that the player may only observe. */
      const strangerId = await createActor(gm, {
         name: 'E2E Sheet Stranger',
         type: 'player',
      });
      await setOwnership(gm, strangerId, 'E2E Player 1', 'OBSERVER');
      await player.waitForFunction(
         (id) => game.actors.get(id)?.testUserPermission(game.user, 'OBSERVER'),
         strangerId,
         { timeout: 1000 },
      );

      // Presence: on the same client, the owner's sheet has its Attribute and Resistance buttons enabled.
      /** @type {import('@playwright/test').Locator} The sheet of the character the player owns. */
      const owned = await openSheetByUuid(player, `Actor.${roller.actor}`);
      /** @type {import('@playwright/test').Locator} The sheet of the character the player observes. */
      const observed = await openSheetByUuid(player, `Actor.${strangerId}`);
      for (const name of [
         'Body',
         'Reflexes',
      ]) {
         await expect(owned.getByRole('button', {
            name,
            exact: true,
         }).first(), `the owner's ${name} button is enabled`).toBeEnabled();
      }

      // Absence: the same buttons on the observed character's sheet are disabled and roll nothing.
      /** @type {number} The message count before the clicks. */
      const baseline = await player.evaluate(() => game.messages.size);
      for (const name of [
         'Body',
         'Reflexes',
      ]) {
         /** @type {import('@playwright/test').Locator} The observer's button. */
         const button = observed.getByRole('button', {
            name,
            exact: true,
         }).first();
         await expect(button, `the observer's ${name} button is disabled`).toBeDisabled();
         await button.click({ force: true });
      }
      expect(await player.evaluate(() => game.messages.size), 'the clicks rolled nothing').toBe(baseline);
   });
});
