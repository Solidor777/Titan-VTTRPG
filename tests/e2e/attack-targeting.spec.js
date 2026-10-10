import { expect, test } from './harness.js';
import {
   clickRoll,
   moveDialogAside,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setSelectField,
} from './checkDialog.js';
import { readResultRows } from './checkCards.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   createActor,
   createOwnedItem,
   activateScene,
   createScene,
   setOwnership,
   hoverToken,
   placeToken,
   releaseTargets,
   setAttributeBase,
   targetPlacedToken,
   targetedTokenIds,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import {
   deleteTokenWithKey,
   retargetWithKey,
   setSceneTokenVision,
   targetWithKeyKeepingControl,
   toggleTargetWithTokenHud,
} from './targeting.js';
import { withClients } from './multiClient.js';
import { expectedCheckResults } from '../shared/checkOracle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Targeting sets the Difficulty of an attack. The attacker has Body 6 and Mind 10, no Training: Melee ceil(6 / 2) = 3
 * and Accuracy ceil(10 / 2) = 5 (rules: Melee = half of Body plus Melee Weapons Training, Accuracy = half of Mind plus
 * Ranged Weapons Training, both rounded up). A target's Defense is half of its Body rounded up (no Dexterity Training).
 * The Difficulty is 4 - (attack rating - Defense) limited to 2 through 6 (rules compendium, Attack Checks). Targets are
 * set with the Target key and with the Token HUD's target control; the attack dialog's Defense field and Difficulty
 * summary and the Difficulty on the posted card follow the target, and with no target the attacker's own rating is the
 * Defense.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page. */
let page;
/** @type {string[]} Uncaught page errors collected during the current test. */
let errors;
/** @type {string} The uuid of the attacker's weapon, whose one attack is a Melee attack. */
let weaponUuid;
/** @type {string} The id of the attacker. */
let attackerId;
/** @type {Record<string, {tokenId: string, defense: number}>} The targets by key. */
const targets = {};

/** @type {number[]} Ten forced faces: the attacker rolls 6 dice, and the rest keep a longer roll fixed. */
const FACES = [
   6,
   5,
   5,
   4,
   3,
   3,
   2,
   2,
   1,
   1,
];

/**
 * The fixture targets: Body, the Defense that Body gives (half rounded up), and the Difficulty a Melee 3 and an
 * Accuracy 5 attack get against it (4 - (rating - Defense), limited to 2 through 6).
 * @type {Record<string, {body: number, defense: number, melee: number, ranged: number}>}
 */
const TARGET_SPECS = {
   mid: {
      body: 8,
      defense: 4,
      melee: 5,
      ranged: 3,
   },
   low: {
      body: 4,
      defense: 2,
      melee: 3,
      ranged: 2,
   },
   high: {
      body: 14,
      defense: 7,
      melee: 6,
      ranged: 6,
   },
   floor: {
      body: 1,
      defense: 1,
      melee: 2,
      ranged: 2,
   },
};

test.beforeAll(async ({ browser }) => {
   test.setTimeout(240_000);
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await showChatLog(page);
   await setClientSetting(page, 'getCheckOptions', 'always');
   await viewScene(page, await createScene(page, { name: 'E2E Targeting Scene' }));

   /** @type {{column: number, row: number}} The square at the middle of the viewed scene. */
   const middle = await page.evaluate(() => ({
      column: Math.round(canvas.stage.pivot.x / canvas.grid.size),
      row: Math.round(canvas.stage.pivot.y / canvas.grid.size),
   }));
   attackerId = await createActor(page, {
      name: 'E2E Targeting Attacker',
      type: 'player',
   });
   await setAttributeBase(page, `Actor.${attackerId}`, 'body', 6);
   await setAttributeBase(page, `Actor.${attackerId}`, 'mind', 10);
   weaponUuid = `Actor.${attackerId}.Item.${await createOwnedItem(page, attackerId, 'weapon', 'E2E Targeting Weapon')}`;
   await placeToken(page, attackerId, {
      square: {
         column: middle.column - 12,
         row: middle.row - 5,
      },
   });
   for (const [index, [key, spec]] of Object.entries(TARGET_SPECS).entries()) {
      /** @type {string} The target's id. */
      const id = await createActor(page, {
         name: `E2E Targeting ${key}`,
         type: 'player',
      });
      await setAttributeBase(page, `Actor.${id}`, 'body', spec.body);
      targets[key] = {
         tokenId: await placeToken(page, id, {
            square: {
               column: middle.column - 10 + (index * 2),
               row: middle.row - 3,
            },
         }),
         defense: spec.defense,
      };
   }
   await closeAllApps(page);
});

test.beforeEach(async () => {
   await page.evaluate(() => canvas.tokens.releaseAll());
});

test.afterEach(async () => {
   await resetDice(page);
   await closeAllApps(page);
   await releaseTargets(page);
   await page.evaluate(() => canvas.tokens.releaseAll());
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await setClientSetting(page, 'getCheckOptions', 'never');
   await page?.close();
});

/**
 * Reads the Defense field of an open attack dialog.
 * @param {import('@playwright/test').Locator} dialog - The attack dialog.
 * @returns {Promise<string>} The field's text.
 */
function readDefenseField(dialog) {
   return dialog.getByTestId('check-field-targetDefense').locator('input').inputValue();
}

/**
 * Rolls the open dialog with the forced faces and checks the card against the Difficulty and the oracle.
 * @param {import('@playwright/test').Locator} dialog - The attack dialog.
 * @param {number} difficulty - The Difficulty the card must show.
 * @returns {Promise<{id: string, parameters: object, results: object}>} The posted attack.
 */
async function rollAndExpectCard(dialog, difficulty) {
   await forceDice(page, FACES);

   /** @type {number} The message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The posted check. */
   const flags = await readNewestCheckFlags(page, baseline, 'attackCheck');
   expect(flags.parameters.difficulty, 'the posted Difficulty').toBe(difficulty);

   /** @type {object} The oracle's results for the forced faces against that Difficulty. */
   const expected = expectedCheckResults(FACES.slice(0, flags.results.dice.length), {
      difficulty,
      complexity: flags.parameters.complexity,
      extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
      extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
   });
   expect(flags.results.successes, 'successes at that Difficulty').toBe(expected.successes);
   expect(flags.results.succeeded, 'succeeded at that Difficulty').toBe(expected.succeeded);
   await showChatLog(page);
   expect((await readResultRows(page.locator(`#chat .chat-log li[data-message-id="${flags.id}"]`))).dc, 'card DC')
      .toBe(`DC ${difficulty}:${flags.parameters.complexity}`);
   return flags;
}

test.describe('the Target key', () => {
   for (const [key, spec] of Object.entries(TARGET_SPECS)) {
      test(`a Melee attack on the ${key} target (Defense ${spec.defense}) has Difficulty ${spec.melee}`, async () => {
         await targetPlacedToken(page, targets[key].tokenId);
         /** @type {import('@playwright/test').Locator} The attack check dialog. */
         const dialog = await openCheckDialog(page, 'attack', weaponUuid);
         expect(await readDefenseField(dialog), 'the Defense field').toBe(String(spec.defense));
         expect(await readSummary(dialog, 'difficulty'), 'the dialog Difficulty').toBe(spec.melee);
         await rollAndExpectCard(dialog, spec.melee);
      });

      test(`a Ranged attack on the ${key} target has Difficulty ${spec.ranged} from Accuracy 5`, async () => {
         await targetPlacedToken(page, targets[key].tokenId);
         /** @type {import('@playwright/test').Locator} The attack check dialog. */
         const dialog = await openCheckDialog(page, 'attack', weaponUuid);
         await setSelectField(dialog, 'type', 'ranged');
         expect(await readDefenseField(dialog), 'the Defense field is the target\'s whatever the type')
            .toBe(String(spec.defense));
         expect(await readSummary(dialog, 'difficulty'), 'the dialog Difficulty').toBe(spec.ranged);
         await rollAndExpectCard(dialog, spec.ranged);
      });
   }

   test('two targets: the first one targeted sets the Difficulty, in either order', async () => {
      await targetPlacedToken(page, targets.mid.tokenId);
      await targetPlacedToken(page, targets.low.tokenId, { add: true });
      expect(await targetedTokenIds(page)).toEqual([
         targets.mid.tokenId,
         targets.low.tokenId,
      ]);
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      let dialog = await openCheckDialog(page, 'attack', weaponUuid);
      expect(await readSummary(dialog, 'difficulty'), 'mid first').toBe(TARGET_SPECS.mid.melee);
      await rollAndExpectCard(dialog, TARGET_SPECS.mid.melee);
      await releaseTargets(page);
      await closeAllApps(page);

      await targetPlacedToken(page, targets.low.tokenId);
      await targetPlacedToken(page, targets.mid.tokenId, { add: true });
      dialog = await openCheckDialog(page, 'attack', weaponUuid);
      expect(await readSummary(dialog, 'difficulty'), 'low first').toBe(TARGET_SPECS.low.melee);
      await rollAndExpectCard(dialog, TARGET_SPECS.low.melee);
   });

   test('no target: the Defense is the attacker\'s own rating and the Difficulty is 4, Melee and Ranged', async () => {
      expect(await targetedTokenIds(page), 'nothing is targeted').toEqual([]);
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openCheckDialog(page, 'attack', weaponUuid);
      expect(await readDefenseField(dialog), 'Defense = Melee 3').toBe('3');
      expect(await readSummary(dialog, 'difficulty')).toBe(4);
      await setSelectField(dialog, 'type', 'ranged');
      expect(await readDefenseField(dialog), 'Defense = Accuracy 5').toBe('5');
      expect(await readSummary(dialog, 'difficulty')).toBe(4);
      await rollAndExpectCard(dialog, 4);
   });
});

test.describe('the Token HUD target control', () => {
   test('targets the token, sets the Difficulty, and toggles it off again', async () => {
      await toggleTargetWithTokenHud(page, targets.mid.tokenId, true);
      expect(await targetedTokenIds(page)).toEqual([targets.mid.tokenId]);
      await page.evaluate(() => canvas.tokens.releaseAll());
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openCheckDialog(page, 'attack', weaponUuid);
      expect(await readDefenseField(dialog)).toBe('4');
      expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.mid.melee);
      await rollAndExpectCard(dialog, TARGET_SPECS.mid.melee);
      await closeAllApps(page);

      // Absence on the same token: the control toggles the target off and the Difficulty is the default 4.
      await toggleTargetWithTokenHud(page, targets.mid.tokenId, false);
      expect(await targetedTokenIds(page)).toEqual([]);
      await page.evaluate(() => canvas.tokens.releaseAll());
      /** @type {import('@playwright/test').Locator} The attack check dialog of the untargeted attack. */
      const untargeted = await openCheckDialog(page, 'attack', weaponUuid);
      expect(await readSummary(untargeted, 'difficulty')).toBe(4);
   });

   test('two targets set with the control: the first sets the Difficulty', async () => {
      await toggleTargetWithTokenHud(page, targets.low.tokenId, true);
      await toggleTargetWithTokenHud(page, targets.high.tokenId, true);
      expect(await targetedTokenIds(page)).toEqual([
         targets.low.tokenId,
         targets.high.tokenId,
      ]);
      await page.evaluate(() => canvas.tokens.releaseAll());
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openCheckDialog(page, 'attack', weaponUuid);
      expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.low.melee);
      await rollAndExpectCard(dialog, TARGET_SPECS.low.melee);
   });
});

/**
 * Closes the weapon's sheet, which the roll button opens in the middle of the window and which covers the canvas where
 * a token must be hovered.
 * @returns {Promise<void>} Resolves once the sheet is closed.
 */
async function closeWeaponSheet() {
   /** @type {import('@playwright/test').Locator} The weapon's sheet. */
   const sheet = await openSheetByUuid(page, weaponUuid);
   await sheet.locator('header.window-header [data-action="close"]').click();
   await expect(sheet, 'the weapon sheet closes').toHaveCount(0);
}

/**
 * Opens the attack dialog and clears the canvas of the other windows: the weapon's sheet is closed and the dialog is
 * moved to the left edge of the page, so that the tokens can be hovered while the dialog stays open.
 * @returns {Promise<import('@playwright/test').Locator>} The attack check dialog.
 */
async function openDialogWithClearCanvas() {
   /** @type {import('@playwright/test').Locator} The attack check dialog. */
   const dialog = await openCheckDialog(page, 'attack', weaponUuid);
   await closeWeaponSheet();
   await moveDialogAside(dialog);
   return dialog;
}

test.describe('the target changes while the dialog is open', () => {
   test('retargeting with the dialog open keeps the Defense read at open', async () => {
      await targetPlacedToken(page, targets.mid.tokenId);
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openDialogWithClearCanvas();
      expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.mid.melee);
      await page.evaluate(() => canvas.tokens.releaseAll());
      await retargetWithKey(page, targets.low.tokenId);
      expect(await readDefenseField(dialog), 'the dialog keeps the Defense of the target at open').toBe('4');
      expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.mid.melee);
      await rollAndExpectCard(dialog, TARGET_SPECS.mid.melee);
   });

   test('losing the target with the dialog open leaves the dialog\'s Difficulty and the roll', async () => {
      await targetPlacedToken(page, targets.mid.tokenId);
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openDialogWithClearCanvas();
      await page.evaluate(() => canvas.tokens.releaseAll());

      // The Target key on the targeted token releases it.
      await hoverToken(page, targets.mid.tokenId, { keepWindows: true });
      await page.keyboard.press('KeyT');
      await expect.poll(() => targetedTokenIds(page), { message: 'the key released the target' }).toEqual([]);
      expect(await readDefenseField(dialog)).toBe('4');
      expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.mid.melee);
      await rollAndExpectCard(dialog, TARGET_SPECS.mid.melee);
   });

   test('a target that appears while a no-target dialog is open: the roll follows what the dialog shows', async () => {
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openDialogWithClearCanvas();
      expect(await readSummary(dialog, 'difficulty'), 'no target at open').toBe(4);
      await retargetWithKey(page, targets.high.tokenId);

      /** @type {number} The Difficulty the dialog shows after the target appeared. */
      const shown = await readSummary(dialog, 'difficulty');
      await rollAndExpectCard(dialog, shown);
   });

   test('deleting the target token with the dialog open leaves the dialog\'s Difficulty and the roll', async () => {
      /** @type {string} The id of the target that is deleted. */
      const doomedId = await createActor(page, {
         name: 'E2E Targeting Doomed A',
         type: 'player',
      });
      await setAttributeBase(page, `Actor.${doomedId}`, 'body', 8);
      /** @type {string} The id of the token that is deleted. */
      const doomedToken = await placeToken(page, doomedId, {
         square: {
            column: await page.evaluate(() => Math.round(canvas.stage.pivot.x / canvas.grid.size)) + 4,
            row: await page.evaluate(() => Math.round(canvas.stage.pivot.y / canvas.grid.size)) - 3,
         },
      });
      await targetPlacedToken(page, doomedToken);
      await page.evaluate(() => canvas.tokens.releaseAll());
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openDialogWithClearCanvas();
      expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.mid.melee);
      await deleteTokenWithKey(page, doomedToken);
      expect(await targetedTokenIds(page), 'the deleted token is no longer targeted').toEqual([]);
      expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.mid.melee);
      await rollAndExpectCard(dialog, TARGET_SPECS.mid.melee);
   });

   test('deleting the target token after the roll leaves the card as it was', async () => {
      /** @type {string} The id of the target that is deleted. */
      const doomedId = await createActor(page, {
         name: 'E2E Targeting Doomed B',
         type: 'player',
      });
      await setAttributeBase(page, `Actor.${doomedId}`, 'body', 8);
      /** @type {string} The id of the token that is deleted. */
      const doomedToken = await placeToken(page, doomedId, {
         square: {
            column: await page.evaluate(() => Math.round(canvas.stage.pivot.x / canvas.grid.size)) + 6,
            row: await page.evaluate(() => Math.round(canvas.stage.pivot.y / canvas.grid.size)) - 3,
         },
      });
      await targetPlacedToken(page, doomedToken);
      /** @type {import('@playwright/test').Locator} The attack check dialog. */
      const dialog = await openCheckDialog(page, 'attack', weaponUuid);
      /** @type {{id: string, type: string, parameters: object, results: object}} The posted check. */
      const flags = await rollAndExpectCard(dialog, TARGET_SPECS.mid.melee);
      await closeWeaponSheet();
      await page.evaluate(() => canvas.tokens.releaseAll());
      await deleteTokenWithKey(page, doomedToken);

      /** @type {import('@playwright/test').Locator} The card of the roll. */
      const card = page.locator(`#chat .chat-log li[data-message-id="${flags.id}"]`);
      await expect(card.getByTestId('check-chat-dc'), 'the card still shows its Difficulty').toHaveText('DC 5:1');
   });
});

test.describe('the owner player\'s own client', () => {
   test('a player who targets with the Target key gets the Difficulty of the target', async ({ browser }) => {
      await setOwnership(page, attackerId, 'E2E Player 1', 'OWNER');

      /** @type {string} The scene of this spec. */
      const sceneId = await page.evaluate(() => canvas.scene.id);

      // Players view the active scene, which core makes the first scene created when none was active.
      /** @type {string|undefined} The scene that was active before this test. */
      const previousId = await page.evaluate(() => game.scenes.active?.id);
      if (previousId !== sceneId) {
         await activateScene(page, sceneId);
      }
      await setSceneTokenVision(page, sceneId, false);
      try {
         await withClients(browser, { player: 'E2E Player 1' }, async ({ player }) => {
            await setClientSetting(player, 'getCheckOptions', 'always');
            await forceDice(player, FACES);
            await closeAllApps(player);
            await targetWithKeyKeepingControl(player, targets.low.tokenId);
            expect(await targetedTokenIds(player), 'the player targets the token').toEqual([targets.low.tokenId]);
            /** @type {import('@playwright/test').Locator} The attack check dialog. */
            const dialog = await openCheckDialog(player, 'attack', weaponUuid);
            expect(await readDefenseField(dialog), 'the Defense field').toBe('2');
            expect(await readSummary(dialog, 'difficulty')).toBe(TARGET_SPECS.low.melee);

            /** @type {number} The message count before the roll. */
            const baseline = await clickRoll(dialog, player);
            /** @type {{id: string, type: string, parameters: object, results: object}} The posted check. */
            const flags = await readNewestCheckFlags(player, baseline, 'attackCheck');
            expect(flags.parameters.difficulty).toBe(TARGET_SPECS.low.melee);
            await showChatLog(player);
            expect((await readResultRows(player.locator(`#chat .chat-log li[data-message-id="${flags.id}"]`))).dc)
               .toBe(`DC ${TARGET_SPECS.low.melee}:${flags.parameters.complexity}`);
            await setClientSetting(player, 'getCheckOptions', 'never');
         });
      }
      finally {
         if (previousId && previousId !== sceneId) {
            await activateScene(page, previousId);
         }
      }
   });
});
