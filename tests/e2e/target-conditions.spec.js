import { expect, test } from './harness.js';
import {
   clickRoll,
   moveDialogAside,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setNumberField,
   setSelectField,
} from './checkDialog.js';
import { login } from './fixtures.js';
import {
   applyCondition,
   controlPlacedToken,
   createActor,
   createOwnedItem,
   createScene,
   placeToken,
   releaseTargets,
   removeCondition,
   setAttributeBase,
   targetPlacedToken,
   viewScene,
} from './flows.js';
import { getSetting, setClientSetting } from './settings.js';
import { attachPageErrors, closeAllApps, showChatLog } from './world.js';

/**
 * Attack checks against a targeted token's conditions, on real placed tokens of a 1-unit-per-space grid, through the
 * attack check dialog and the chat card it posts. An adjacent Prone target raises Melee, a Prone target 21 spaces away
 * lowers a ranged attack's Accuracy, and an Incapacitated target fixes the Difficulty at 2 under Disadvantage. The
 * dialog and the card list the applied modifiers, the dialog keeps them after the target is released, and a GM who
 * controls a Prone attacker and targets nothing is not read as their own target. An attack message stored without
 * target conditions loads them as none and renders.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The check-options setting in force before this spec. */
let originalCheckOptions;
/**
 * The ids the fixture made.
 * @type {{attackerId: string, attackerSquare: Square, attackerTokenId: string, weaponUuid: string,
 * nearTokenId: string, incapacitatedTokenId: string, farTokenId: string}}
 */
let fixture;

/**
 * A square of the grid.
 * @typedef {object} Square
 * @property {number} column - The grid column.
 * @property {number} row - The grid row.
 */

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await showChatLog(page);
   originalCheckOptions = await getSetting(page, 'getCheckOptions');
   await setClientSetting(page, 'getCheckOptions', 'always');
   await viewScene(page, await createScene(page, { name: 'E2E Target Conditions Scene' }));

   /** @type {Square} The square at the middle of the viewed scene. */
   const middle = await page.evaluate(() => ({
      column: Math.round(canvas.stage.pivot.x / canvas.grid.size),
      row: Math.round(canvas.stage.pivot.y / canvas.grid.size),
   }));
   expect(
      await page.evaluate(() => ({
         diagonals: canvas.grid.diagonals === CONST.GRID_DIAGONALS.ALTERNATING_1,
         distance: canvas.grid.distance,
         square: canvas.grid.type === CONST.GRID_TYPES.SQUARE,
      })),
      'the scene grid is square, 1 unit per space, with the alternating diagonal rule',
   ).toEqual({
      diagonals: true,
      distance: 1,
      square: true,
   });

   // The attacker has Body 6 and Mind 6, and no Training in Melee or Ranged Weapons: base Melee and Accuracy 3.
   /** @type {string} The id of the actor that rolls the attacks. */
   const attackerId = await createActor(page, {
      name: 'E2E Target Conditions Attacker',
      type: 'player',
   });
   await setAttributeBase(page, `Actor.${attackerId}`, 'body', 6);
   await setAttributeBase(page, `Actor.${attackerId}`, 'mind', 6);

   /** @type {string} The id of the attacker's weapon, whose one attack is a Melee attack. */
   const weaponId = await createOwnedItem(page, attackerId, 'weapon', 'E2E Target Conditions Weapon');

   /**
    * Creates a character and drops its token on a square.
    * @param {string} name - The character's name.
    * @param {Square} square - The square to drop the token on.
    * @returns {Promise<string>} The id of the placed token.
    */
   const place = async (name, square) => placeToken(page, await createActor(page, {
      name,
      type: 'player',
   }), { square });

   // The attacker stands at the upper left, the near and incapacitated targets beside it, and the far target 17
   // columns and 8 rows away: the alternating diagonal rule makes that 17 + floor(8 / 2) = 21 spaces. Every token and
   // its Token HUD stay clear of the sidebar and of the Player HUD at the lower left.
   /** @type {Square} The square the attacker's token is dropped on; the other tokens are placed from it. */
   const attackerSquare = {
      column: middle.column - 12,
      row: middle.row - 4,
   };
   fixture = {
      attackerId,
      attackerSquare,
      attackerTokenId: await placeToken(page, attackerId, { square: attackerSquare }),
      farTokenId: await place('E2E Target Conditions Far', {
         column: middle.column + 5,
         row: middle.row + 4,
      }),
      incapacitatedTokenId: await place('E2E Target Conditions Incapacitated', {
         column: attackerSquare.column,
         row: attackerSquare.row + 1,
      }),
      nearTokenId: await place('E2E Target Conditions Near', {
         column: attackerSquare.column + 1,
         row: attackerSquare.row,
      }),
      weaponUuid: `Actor.${attackerId}.Item.${weaponId}`,
   };
   expect(
      await Promise.all([
         fixture.nearTokenId,
         fixture.incapacitatedTokenId,
         fixture.farTokenId,
      ].map((tokenId) => spacesFromAttacker(tokenId))),
      'the near and incapacitated targets are 1 space from the attacker and the far target 21',
   ).toEqual([
      1,
      1,
      21,
   ]);

   // The targets' conditions are part of the fixture, so no test depends on another having applied one.
   await applyCondition(page, fixture.nearTokenId, 'prone');
   await applyCondition(page, fixture.farTokenId, 'prone');
   await applyCondition(page, fixture.incapacitatedTokenId, 'incapacitated');
});

/**
 * Computes the spaces between the attacker's token and another token of the viewed scene from their stored squares and
 * the alternating diagonal rule: the longer axis plus half the shorter, rounded down (read: common/grid/square.mjs:
 * 526-530, Foundry 14.364; the scene grid is asserted in the setup).
 * @param {string} tokenId - The other token's id.
 * @returns {Promise<number>} The distance in spaces.
 */
function spacesFromAttacker(tokenId) {
   return page.evaluate(({ attackerTokenId, tokenId }) => {
      /** @type {TokenDocument} The attacker's token. */
      const attacker = canvas.scene.tokens.get(attackerTokenId);

      /** @type {TokenDocument} The other token. */
      const other = canvas.scene.tokens.get(tokenId);

      /** @type {number} The columns apart. */
      const columns = Math.abs(attacker._source.x - other._source.x) / canvas.grid.size;

      /** @type {number} The rows apart. */
      const rows = Math.abs(attacker._source.y - other._source.y) / canvas.grid.size;
      return Math.max(columns, rows) + Math.floor(Math.min(columns, rows) / 2);
   }, {
      attackerTokenId: fixture.attackerTokenId,
      tokenId,
   });
}

test.afterEach(async () => {
   await closeAllApps(page);
   await releaseTargets(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await setClientSetting(page, 'getCheckOptions', originalCheckOptions);
   await page?.close();
});

/**
 * Builds the localized label of a target-condition modifier.
 * @param {string} condition - The condition id.
 * @param {string} modifier - The modified value: melee, accuracy, or difficulty.
 * @param {string} value - The displayed value.
 * @returns {Promise<string>} The condition, the modified value and the value, worded as the dialog and card word them.
 */
function label(condition, modifier, value) {
   return page.evaluate(({ conditionId, modifierKey, shown }) => {
      /** @type {string} The localized condition name. */
      const conditionName = game.i18n.localize(`LOCAL.${conditionId}.text`);

      /** @type {string} The localized modified value's name. */
      const modifierName = game.i18n.localize(`LOCAL.${modifierKey}.text`);
      return `${conditionName}: ${modifierName} ${shown}`;
   }, {
      conditionId: condition,
      modifierKey: modifier,
      shown: value,
   });
}

/**
 * Locates a chat message's target-condition tags.
 * @param {string} messageId - The id of the chat message whose card is searched.
 * @returns {import('@playwright/test').Locator} The tag elements of the card's target-conditions row.
 */
function chatTargetConditions(messageId) {
   return page.locator(`#chat .message[data-message-id="${messageId}"] [data-testid="check-chat-target-condition"]`);
}

/**
 * Reads the attacker's base Melee and Accuracy ratings from the live actor.
 * @returns {Promise<{melee: number, accuracy: number}>} The base Melee and Accuracy the live actor derives.
 */
function readBaseRatings() {
   return page.evaluate((attackerId) => {
      /** @type {object} The attacker's ratings. */
      const rating = game.actors.get(attackerId).system.rating;
      return {
         accuracy: rating.accuracy.baseValue,
         melee: rating.melee.baseValue,
      };
   }, fixture.attackerId);
}

/**
 * Opens the attack check dialog of the attacker's weapon from its sheet's roll button.
 * @returns {Promise<import('@playwright/test').Locator>} The attack check dialog window.
 */
function openAttackDialog() {
   return openCheckDialog(page, 'attack', fixture.weaponUuid);
}

test('an adjacent Prone target raises a melee attack\'s Melee by a quarter of its base', async () => {
   expect(await readBaseRatings(), 'the attacker\'s base ratings').toEqual({
      accuracy: 3,
      melee: 3,
   });
   await targetPlacedToken(page, fixture.nearTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog. */
   const dialog = await openAttackDialog();

   // A quarter of base 3 is 0.75, rounded up to 1.
   /** @type {string} The expected modifier. */
   const expected = await label('prone', 'melee', '+1');
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);
   await expect(dialog.getByTestId('attack-target-conditions')).toContainText('Target Conditions');
   await expect(dialog.getByTestId('check-field-attackerMelee').locator('input')).toHaveValue('4');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, parameters: object}} The rolled attack. */
   const flags = await readNewestCheckFlags(page, baseline, 'attackCheck');
   expect(flags.parameters).toMatchObject({
      attackerMelee: 4,
      targetConditions: [
         {
            condition: 'prone',
            modifier: 'melee',
            value: 1,
         },
      ],
   });
   await expect(chatTargetConditions(flags.id)).toHaveText([expected]);
   /** @type {import('@playwright/test').Locator} The chat card of the rolled attack. */
   const rolledCard = page.locator(`#chat .message[data-message-id="${flags.id}"]`);
   await expect(rolledCard.getByTestId('check-chat-target-conditions')).toContainText('Target Conditions');
});

test('a Melee typed into the dialog replaces the rating, bonus included, and drops its entry', async () => {
   await targetPlacedToken(page, fixture.nearTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog. */
   const dialog = await openAttackDialog();
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([await label('prone', 'melee', '+1')]);

   await setNumberField(dialog, 'attackerMelee', 9);
   await expect(dialog.getByTestId('check-field-attackerMelee').locator('input')).toHaveValue('9');
   await expect(dialog.getByTestId('attack-target-conditions')).toHaveCount(0);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, parameters: object}} The rolled attack. */
   const flags = await readNewestCheckFlags(page, baseline, 'attackCheck');
   expect(flags.parameters).toMatchObject({
      attackerMelee: 9,
      targetConditions: [],
   });

   // The card rendered its results (the positive edge) and lists no target conditions.
   /** @type {import('@playwright/test').Locator} The rolled card. */
   const card = page.locator(`#chat .message[data-message-id="${flags.id}"]`);
   await expect(card.getByTestId('check-chat-dc').first()).toBeVisible();
   await expect(card.getByTestId('check-chat-target-conditions')).toHaveCount(0);
});

test('a Prone target 21 spaces away lowers a ranged attack\'s Accuracy by two quarters of its base', async () => {
   await targetPlacedToken(page, fixture.farTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog, opened for the weapon's Melee attack. */
   const dialog = await openAttackDialog();
   await expect(dialog.getByTestId('check-field-attackerMelee')).toBeVisible();

   // Ranged, the dialog lists the penalty: two quarters of base 3 is 1.5, the loss rounded down to 1.
   await setSelectField(dialog, 'type', 'ranged');
   /** @type {string} The expected modifier. */
   const expected = await label('prone', 'accuracy', '-1');
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);
   await expect(dialog.getByTestId('check-field-attackerAccuracy').locator('input')).toHaveValue('2');

   // A Melee attack takes none of a far Prone target's Accuracy penalty: its row leaves with the entry.
   await setSelectField(dialog, 'type', 'melee');
   await expect(dialog.getByTestId('check-field-attackerMelee')).toBeVisible();
   await expect(dialog.getByTestId('attack-target-conditions')).toHaveCount(0);
   await setSelectField(dialog, 'type', 'ranged');
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, parameters: object}} The rolled attack. */
   const flags = await readNewestCheckFlags(page, baseline, 'attackCheck');
   expect(flags.parameters).toMatchObject({
      attackerAccuracy: 2,
      targetConditions: [
         {
            condition: 'prone',
            modifier: 'accuracy',
            value: -1,
         },
      ],
      type: 'ranged',
   });
   await expect(chatTargetConditions(flags.id)).toHaveText([expected]);
});

test('an Incapacitated target fixes the Difficulty at 2 even with Disadvantage', async () => {
   await targetPlacedToken(page, fixture.incapacitatedTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog. */
   const dialog = await openAttackDialog();
   await setSelectField(dialog, 'advantage', -1);

   /** @type {string} The expected modifier. */
   const expected = await label('incapacitated', 'difficulty', '2');
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);
   expect(await readSummary(dialog, 'difficulty'), 'the dialog\'s effective Difficulty').toBe(2);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, parameters: object}} The rolled attack. */
   const flags = await readNewestCheckFlags(page, baseline, 'attackCheck');
   expect(flags.parameters.difficulty).toBe(2);
   await expect(chatTargetConditions(flags.id)).toHaveText([expected]);
});

test('the dialog keeps the target\'s conditions after untargeting', async () => {
   await targetPlacedToken(page, fixture.nearTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog. */
   const dialog = await openAttackDialog();

   /** @type {string} The expected modifier. */
   const expected = await label('prone', 'melee', '+1');
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);

   /** @type {import('@playwright/test').Locator} The Melee field's input. */
   const melee = dialog.getByTestId('check-field-attackerMelee').locator('input');
   /** @type {import('@playwright/test').Locator} The Defense field's input. */
   const defense = dialog.getByTestId('check-field-targetDefense').locator('input');
   /** @type {import('@playwright/test').Locator} The total-dice summary. */
   const totalDice = dialog.getByTestId('check-summary-totalDice');
   await expect(melee).toHaveValue('4');

   /** @type {string} The target's Defense shown at open. */
   const defenseAtOpen = await defense.inputValue();

   /** @type {string} The total dice before the forced rebuild. */
   const diceBefore = (await totalDice.textContent()).trim();

   // The dialog rebuilds only when an option or the actor changes, never on a target change, so untargeting alone
   // proves nothing: untarget, then force a rebuild through a field that is not a rating (the dice modifier).
   await releaseTargets(page, { keepWindows: true });
   expect(await page.evaluate(() => game.user.targets.size), 'the Target key released the target').toBe(0);
   await setNumberField(dialog, 'diceMod', 1);
   await expect.poll(async () => (await totalDice.textContent()).trim(), {
      message: 'the forced rebuild ran',
      timeout: 1000,
   }).not.toBe(diceBefore);

   // The target's conditions and Defense were fixed at open, so the rebuilt options keep them.
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([expected]);
   await expect(melee).toHaveValue('4');
   await expect(defense).toHaveValue(defenseAtOpen);
});

test('a GM who controls a Prone attacker and targets nothing is not read as the attacker\'s own target', async () => {
   await targetPlacedToken(page, fixture.nearTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog with a Prone target. */
   const targeted = await openAttackDialog();
   await expect(targeted.getByTestId('attack-target-condition')).toHaveText([await label('prone', 'melee', '+1')]);
   await closeAllApps(page);
   await releaseTargets(page);

   // Without a target the GM's controlled tokens stand in; the attacker's own is never the target.
   await applyCondition(page, fixture.attackerTokenId, 'prone');
   await controlPlacedToken(page, fixture.attackerTokenId);
   expect(
      await page.evaluate(() => [
         game.user.targets.size,
         canvas.tokens.controlled.length,
      ]),
      'nothing is targeted and the attacker\'s token is controlled',
   ).toEqual([
      0,
      1,
   ]);

   /** @type {import('@playwright/test').Locator} The attack check dialog for the controlled attacker. */
   const untargeted = await openAttackDialog();
   await expect(untargeted.getByTestId('check-field-attackerMelee')).toBeVisible();
   await expect(untargeted.getByTestId('attack-target-conditions')).toHaveCount(0);
   await closeAllApps(page);
   await removeCondition(page, fixture.attackerTokenId, 'prone');
});

test('the pinned target conditions follow the attacker\'s base Melee while the dialog is open', async () => {
   await targetPlacedToken(page, fixture.nearTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog. */
   const dialog = await openAttackDialog();

   /** @type {import('@playwright/test').Locator} The Melee field's input. */
   const melee = dialog.getByTestId('check-field-attackerMelee').locator('input');
   await expect(dialog.getByTestId('attack-target-condition')).toHaveText([await label('prone', 'melee', '+1')]);
   await expect(melee).toHaveValue('4');
   await moveDialogAside(dialog);
   try {
      // Body 10 makes the base Melee 5, and a quarter of it rounded up is 2.
      await setAttributeBase(page, `Actor.${fixture.attackerId}`, 'body', 10);
      expect(await readBaseRatings(), 'the attacker\'s base ratings after the Body change').toEqual({
         accuracy: 3,
         melee: 5,
      });
      await expect(dialog.getByTestId('attack-target-condition')).toHaveText([await label('prone', 'melee', '+2')]);
      await expect(melee).toHaveValue('7');
   }
   finally {
      await setAttributeBase(page, `Actor.${fixture.attackerId}`, 'body', 6);
   }
});

test('an explicit target that shares the attacker\'s actor is read as the target', async () => {
   /** @type {string} The id of a second token of the attacker's actor, on a square beside the attacker's. */
   const sameActorTokenId = await placeToken(page, fixture.attackerId, {
      square: {
         column: fixture.attackerSquare.column + 1,
         row: fixture.attackerSquare.row + 1,
      },
   });
   try {
      await applyCondition(page, sameActorTokenId, 'prone');
      await targetPlacedToken(page, sameActorTokenId);

      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openAttackDialog();
      await expect(dialog.getByTestId('attack-target-condition')).toHaveText([await label('prone', 'melee', '+1')]);
      await closeAllApps(page);
      await releaseTargets(page);
      await removeCondition(page, sameActorTokenId, 'prone');
   }
   finally {
      await page.evaluate(async (tokenId) => {
         await canvas.scene.tokens.get(tokenId)?.delete();
      }, sameActorTokenId);
   }
});

test('a type switch that adds the conditions row keeps the fields below it mounted', async () => {
   await targetPlacedToken(page, fixture.farTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog, opened for the weapon's Melee attack. */
   const dialog = await openAttackDialog();
   await expect(dialog.getByTestId('check-field-attackerMelee')).toBeVisible();
   await expect(dialog.getByTestId('attack-target-conditions')).toHaveCount(0);

   // Tag the Attack Type field's element: a remounted field is a new element without the tag.
   await dialog.getByTestId('check-field-type').evaluate((element) => {
      element.dataset.mountTag = 'tagged';
   });
   await setSelectField(dialog, 'type', 'ranged');
   await expect(dialog.getByTestId('attack-target-conditions')).toBeVisible();
   await expect(dialog.getByTestId('check-field-type')).toHaveAttribute('data-mount-tag', 'tagged');
});

test('an attack message without targetConditions loads it as none and renders', async () => {
   await targetPlacedToken(page, fixture.nearTokenId);

   /** @type {import('@playwright/test').Locator} The attack check dialog. */
   const dialog = await openAttackDialog();

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string}} An attack rolled against a Prone target, the source of the legacy copy. */
   const rolled = await readNewestCheckFlags(page, baseline, 'attackCheck');
   await expect(chatTargetConditions(rolled.id)).toHaveCount(1);

   // A message stored before the field existed is data that real flows no longer produce.
   /** @type {{id: string, targetConditions: object[]}} The copy created without the field. */
   const legacy = await page.evaluate(async (sourceId) => {
      /** @type {object} The rolled message's data without `system.parameters.targetConditions`. */
      const data = game.messages.get(sourceId).toObject();
      delete data._id;
      delete data.system.parameters.targetConditions;

      /** @type {ChatMessage} The legacy-shaped message. */
      const message = await ChatMessage.create(data);
      return {
         id: message.id,
         targetConditions: message.system.parameters.targetConditions,
      };
   }, rolled.id);
   expect(legacy.targetConditions).toEqual([]);

   // The card rendered its results, in the same pass that would have drawn the conditions row.
   /** @type {import('@playwright/test').Locator} The legacy message's card. */
   const card = page.locator(`#chat .message[data-message-id="${legacy.id}"]`);
   await expect(card.getByTestId('check-chat-dc').first()).toBeVisible();
   await expect(card.getByTestId('check-chat-target-conditions')).toHaveCount(0);
});
