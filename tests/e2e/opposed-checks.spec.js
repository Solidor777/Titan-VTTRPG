import { expect, flushPageErrors, test } from './harness.js';
import { clickRoll, readNewestCheckFlags } from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import { addCheck, createOwnedItem, setOwnership, setSkillTraining } from './flows.js';
import { setClientSetting, setWorldSetting } from './settings.js';
import { buildSpell, castFromSpellSheet, openCard } from './spellCasting.js';
import {
   actAsCharacter,
   assignCharacter,
   cardButton,
   expectActsAs,
   cardOf,
   clickOpposed,
   clickResist,
   createCharacter,
   focusCharacter,
   loginPlayer,
   pressDamageButton,
   readCardButtons,
   readMessageAuthor,
   readMessageSpeaker,
   readResultRows,
   readVitals,
   restoreStamina,
   rollItemCheck,
   setCheckExtras,
} from './checkCards.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Opposed checks of item checks and casting checks. The roller has Body 12 and Mind 12, so each roll uses 12 dice. The
 * defender has Body 4, Mind 4, Soul 2 and Athletics Training 2, so Body (Athletics) rolls 4 + 2 = 6 dice and Mind alone
 * rolls 4. The Opposed button asks for Difficulty 4 and Complexity (extra successes + 1) (rules text "Opposed Checks"
 * of "The Arcane Arts"), and carries the check's damage when the check's Damage Reduced By is the opposed check; a
 * failed opposed check takes the damage minus its successes. Every die is forced, so each number is worked out by hand.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who builds the documents and rolls. */
let gm;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who owns the defender. */
let player;
/** @type {string|null|undefined} The character assigned to E2E Player 1 before the spec (undefined until read). */
let playerCharacter;
/** @type {string} The id of the defender with the Stamina to absorb the half-damage test. */
let hardyId;
/** @type {string} The id of the roller. */
let rollerId;
/** @type {string} The id of the defender. */
let defenderId;
/** @type {string} The uuid of the ability that holds the opposed checks. */
let opposed;

/**
 * The checks of the ability, in order, as the tests below name them by index.
 * @type {Record<string, number>}
 */
const CHECK = {
   skill: 0,
   attribute: 1,
   damage: 2,
   bothOpposedReduces: 3,
   bothResistReduces: 4,
   plain: 5,
   fixed: 6,
};

/**
 * Builds the faces of a roll in which a number of the dice are successes against Difficulty 4: successes are 4s, the
 * rest are 2s.
 * @param {number} dice - How many dice the roll uses.
 * @param {number} successes - How many of them are successes.
 * @returns {number[]} The faces, in roll order.
 */
function facesWith(dice, successes) {
   return [
      ...Array.from({ length: successes }, () => 4),
      ...Array.from({ length: dice - successes }, () => 2),
   ];
}

/**
 * Rolls a check of the ability with a number of successes out of the roller's twelve dice, and opens the card.
 * @param {number} index - The position of the check among the ability's checks.
 * @param {number} successes - How many of the twelve dice are successes (6s; the others are 2s).
 * @returns {Promise<{id: string, parameters: object, results: object, card: import('@playwright/test').Locator}>} The
 * message and its card in the GM's chat log.
 */
async function rollWith(index, successes) {
   await forceDice(gm, [
      ...Array.from({ length: successes }, () => 6),
      ...Array.from({ length: 12 - successes }, () => 2),
   ]);

   /** @type {{id: string, parameters: object, results: object}} The roll. */
   const message = await rollItemCheck(gm, opposed, index);
   await resetDice(gm);
   await closeAllApps(gm);
   await showChatLog(gm);
   return {
      ...message,
      card: cardOf(gm, message.id),
   };
}

/**
 * Clicks the Opposed button of a card with the defender's sheet focused and the defender's dice forced.
 * @param {{id: string}} card - The card's message.
 * @param {number} dice - How many dice the defender's opposed check rolls.
 * @param {number} successes - How many of them are successes.
 * @param {import('@playwright/test').Page} [page] - The client that clicks; the GM's by default.
 * @returns {Promise<{id: string, parameters: object, results: object}>} The posted Attribute Check.
 */
async function opposeWith(card, dice, successes, page = gm) {
   await focusCharacter(page, `Actor.${defenderId}`);
   await showChatLog(page);
   if (page === player) {
      // A player's buttons act on controlled tokens, then the assigned character, then the focused sheet.
      /** @type {string|null} The character assigned before this click. */
      const previous = await actAsCharacter(page, defenderId);
      if (playerCharacter === undefined) {
         playerCharacter = previous;
      }
   }
   await forceDice(page, facesWith(dice, successes));
   if (page === player) {
      await expectActsAs(page, defenderId);
   }

   /** @type {{id: string, parameters: object, results: object}} The Attribute Check. */
   const check = await clickOpposed(page, card.id);
   await resetDice(page);
   return check;
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(300_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   await setClientSetting(gm, 'getCheckOptions', 'never');
   await setWorldSetting(gm, 'reportTakingDamage', true);
   rollerId = await createCharacter(gm, 'E2E Opposed Roller', {
      body: 12,
      mind: 12,
   });
   defenderId = await createCharacter(gm, 'E2E Opposed Defender', {
      body: 4,
      mind: 4,
      soul: 2,
   });
   await setSkillTraining(gm, `Actor.${defenderId}`, 'athletics', 2);
   hardyId = await createCharacter(gm, 'E2E Opposed Hardy Defender', {
      body: 12,
      mind: 12,
      soul: 12,
   });

   // E2E Player 1 owns the defender and clicks the Opposed button from the player client.
   player = await loginPlayer(browser);
   await setClientSetting(player, 'getCheckOptions', 'never');
   await setOwnership(gm, defenderId, 'E2E Player 1', 'OWNER');
   await player.waitForFunction(
      (id) => game.actors.get(id)?.testUserPermission(game.user, 'OWNER'),
      defenderId,
      { timeout: 1000 },
   );
   opposed = `Actor.${rollerId}.Item.${await createOwnedItem(gm, rollerId, 'ability', 'E2E Opposed Checks')}`;

   // A new check opposes Body (Athletics). The first check keeps that; the second opposes Mind with no Skill; the
   // third deals 6 damage that the opposed check reduces; the fourth and fifth add a Resilience resistance and take
   // their damage reduction from the opposed check and from the resistance check; the sixth is not opposed.
   await addCheck(gm, opposed, {
      label: 'Skill Opposed',
      opposed: true,
   });
   await addCheck(gm, opposed, {
      label: 'Attribute Opposed',
      opposed: true,
   });
   await setCheckExtras(gm, opposed, CHECK.attribute, {
      opposedAttribute: 'mind',
      opposedSkill: 'none',
   });
   await addCheck(gm, opposed, {
      label: 'Opposed Damage',
      opposed: true,
      isDamage: true,
      initialValue: 6,
      damageReducedBy: 'opposedCheck',
   });
   await addCheck(gm, opposed, {
      label: 'Opposed And Resisted',
      opposed: true,
      resistanceCheck: 'resilience',
      isDamage: true,
      initialValue: 6,
      damageReducedBy: 'opposedCheck',
   });
   await addCheck(gm, opposed, {
      label: 'Resisted And Opposed',
      opposed: true,
      resistanceCheck: 'resilience',
      isDamage: true,
      initialValue: 6,
      damageReducedBy: 'resistanceCheck',
   });
   await addCheck(gm, opposed, { label: 'Not Opposed' });
   await addCheck(gm, opposed, {
      label: 'Opposed Fixed',
      opposed: true,
      isDamage: true,
      initialValue: 1,
      damageReducedBy: 'opposedCheck',
   });

   // The Opposed Fixed check does not scale, so its damage stays at 1 whatever the roll.
   await setCheckExtras(gm, opposed, CHECK.fixed, { scaling: false });
   await closeAllApps(gm);
});

test.afterEach(async () => {
   await resetDice(gm);
   await resetDice(player);
   await closeAllApps(gm);
   await closeAllApps(player);
   await setClientSetting(gm, 'getCheckOptions', 'never');
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   if (playerCharacter !== undefined) {
      await assignCharacter(player, playerCharacter);
   }
   await flushPageErrors(player);
   await player?.context().close();
   await gm?.close();
});

test.describe('the Complexity of the Opposed button follows the extra successes', () => {
   // Successes against Complexity 1 bank (successes - 1) extra successes, and the button asks for one more than that.
   for (const [successes, extra] of [
      [
         1,
         0,
      ],
      [
         2,
         1,
      ],
      [
         3,
         2,
      ],
      [
         6,
         5,
      ],
   ]) {
      test(`${extra} extra success${extra === 1 ? '' : 'es'}: Body (Athletics) 4:${extra + 1}`, async () => {
         /** @type {object} The rolled check and its card in the GM's chat log. */
         const check = await rollWith(CHECK.skill, successes);
         expect(check.parameters.opposedCheck, 'the check is opposed by Body (Athletics)').toEqual({
            attribute: 'body',
            enabled: true,
            skill: 'athletics',
         });
         expect(check.results.extraSuccesses).toBe(extra);
         expect(await readCardButtons(check.card)).toEqual({
            resist: [],
            opposed: [`Body (Athletics) 4:${extra + 1}`],
         });
      });
   }

   test('a failed check offers no Opposed button, while the same check succeeding does', async () => {
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const hit = await rollWith(CHECK.skill, 1);
      expect((await readCardButtons(hit.card)).opposed).toEqual(['Body (Athletics) 4:1']);
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const miss = await rollWith(CHECK.skill, 0);
      expect((await readResultRows(miss.card)).outcome, 'the failed card is mounted').toBe('Failed');
      expect((await readCardButtons(miss.card)).opposed).toEqual([]);
   });

   test('a check that is not opposed has no Opposed button', async () => {
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const plain = await rollWith(CHECK.plain, 3);
      expect((await readResultRows(plain.card)).outcome, 'the plain card is mounted and succeeded').toBe('Succeeded');
      expect(await readCardButtons(plain.card)).toEqual({
         resist: [],
         opposed: [],
      });
   });

   test('the card has no control that spends extra successes, so the Complexity never changes', async () => {
      // An item card only lists its damage and buttons: the extra successes are not spent on aspects.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.skill, 4);
      expect(check.results.extraSuccesses).toBe(3);
      expect((await readCardButtons(check.card)).opposed, 'the Opposed button is on the mounted card')
         .toEqual(['Body (Athletics) 4:4']);
      await expect(check.card.locator('.aspects'), 'no scaling aspect controls on an item card').toHaveCount(0);
   });
});

test.describe('E2E Player 1 on a GM-rolled card', () => {
   test('clicks Opposed, and the damage buttons stay with the GM', async () => {
      // Three successes bank 2 extra successes: damage 8, Body (Athletics) 4:3.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.damage, 3);
      await showChatLog(player);

      /** @type {import('@playwright/test').Locator} The card in the player's chat log. */
      const playerCard = cardOf(player, check.id);
      await expect(playerCard, 'the player holds the GM card').toBeVisible();
      expect(await readCardButtons(playerCard), 'the player sees the Opposed button').toEqual({
         resist: [],
         opposed: ['Body (Athletics) 4:3'],
      });
      await expect(cardButton(check.card, 'apply'), 'the GM sees the damage buttons of the same card').toHaveCount(1);
      await expect(cardButton(playerCard, 'apply'), 'the player does not').toHaveCount(0);

      /** @type {{id: string, parameters: object, results: object}} The Attribute Check the player click posts. */
      const failed = await opposeWith(check, 6, 2, player);
      expect(await readMessageAuthor(player, failed.id), 'the player posted the check').toBe('E2E Player 1');
      test.info().annotations.push({
         type: 'player check rolled for',
         description: await readMessageSpeaker(player, failed.id),
      });
      expect(failed.parameters, 'the button\'s own numbers').toMatchObject({
         attribute: 'body',
         skill: 'athletics',
         complexity: 3,
         damageToReduce: 8,
         totalDice: 6,
      });
      expect(failed.results.damageTaken, 'damage 8 minus 2 successes').toBe(6);

      // The Attribute Check own damage button is the GM only.
      await showChatLog(gm);
      await expect(cardButton(cardOf(gm, failed.id), 'apply'), 'the GM sees Apply').toHaveCount(1);
      await expect(cardButton(cardOf(player, failed.id), 'apply'), 'the player does not').toHaveCount(0);
   });
});

test.describe('the opposed check the defender rolls', () => {
   test('skill-opposed: Body and Athletics Training roll 6 dice and the margin decides', async () => {
      // Three successes bank 2 extra successes: Complexity 3.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.skill, 3);
      /** @type {object} The Attribute Check the click posts. */
      const held = await opposeWith(check, 6, 3);
      expect(held.parameters).toMatchObject({
         attribute: 'body',
         skill: 'athletics',
         difficulty: 4,
         complexity: 3,
         attributeDice: 4,
         skillTrainingDice: 2,
         totalDice: 6,
         damageToReduce: 0,
      });
      expect(held.results.successes).toBe(3);
      expect(held.results.succeeded, '3 successes meet Complexity 3').toBe(true);
      await showChatLog(gm);
      expect(await readResultRows(cardOf(gm, held.id))).toEqual({
         dc: 'DC 4:3',
         successes: '3 Successes',
         outcome: 'Succeeded',
         rows: [],
      });

      /** @type {object} The Attribute Check the click posts. */
      const short = await opposeWith(check, 6, 2);
      expect(short.results.succeeded, '2 successes miss Complexity 3').toBe(false);
      expect(short.results.damageTaken, 'no damage to reduce').toBe(0);
      await showChatLog(gm);
      expect(await readResultRows(cardOf(gm, short.id))).toEqual({
         dc: 'DC 4:3',
         successes: '2 Successes',
         outcome: 'Failed',
         rows: [],
      });
   });

   test('attribute-opposed: Mind with no Skill rolls 4 dice and the margin decides', async () => {
      // Two successes bank 1 extra success: Complexity 2.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.attribute, 2);
      expect(check.parameters.opposedCheck).toEqual({
         attribute: 'mind',
         enabled: true,
         skill: 'none',
      });
      expect((await readCardButtons(check.card)).opposed, 'the button names no Skill').toEqual(['Mind 4:2']);
      /** @type {object} The Attribute Check the click posts. */
      const held = await opposeWith(check, 4, 2);
      expect(held.parameters).toMatchObject({
         attribute: 'mind',
         skill: 'none',
         complexity: 2,
         attributeDice: 4,
         skillTrainingDice: 0,
         totalDice: 4,
      });
      expect(held.results.succeeded, '2 successes meet Complexity 2').toBe(true);
      /** @type {object} The Attribute Check the click posts. */
      const short = await opposeWith(check, 4, 1);
      expect(short.results.succeeded, '1 success misses Complexity 2').toBe(false);
   });

   test('Complexity 1: one success holds and none fails', async () => {
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.skill, 1);
      expect((await opposeWith(check, 6, 1)).results.succeeded).toBe(true);
      expect((await opposeWith(check, 6, 0)).results.succeeded).toBe(false);
   });

   test('the Opposed dialog opens with the card\'s Attribute, Skill and Complexity for 0 and for 1 extra success',
      async () => {
         for (const [successes, complexity] of [
            [
               1,
               '1',
            ],
            [
               2,
               '2',
            ],
         ]) {
            await setClientSetting(gm, 'getCheckOptions', 'never');
            /** @type {object} The rolled check and its card in the GM's chat log. */
            const check = await rollWith(CHECK.skill, successes);
            await setClientSetting(gm, 'getCheckOptions', 'always');
            await focusCharacter(gm, `Actor.${defenderId}`);
            await showChatLog(gm);
            await check.card.locator('.opposed-check-button button').click();

            /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
            const dialog = gm.locator('.application.titan-dialog[id^="titan-attribute-check-dialog-"]').first();
            await expect(dialog).toBeVisible();
            await expect(dialog.getByTestId('check-field-complexity').locator('input')).toHaveValue(complexity);
            await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('4');
            await expect(dialog.getByTestId('check-field-attribute').locator('[role="combobox"]'))
               .toHaveAttribute('data-value', 'body');
            await expect(dialog.getByTestId('check-field-skill').locator('[role="combobox"]'))
               .toHaveAttribute('data-value', 'athletics');
            await forceDice(gm, facesWith(6, Number(complexity)));
            /** @type {number} The chat-message count before the roll. */
            const baseline = await clickRoll(dialog, gm);
            /** @type {object} The Attribute Check the dialog rolls. */
            const rolled = await readNewestCheckFlags(gm, baseline, 'attributeCheck');
            expect(rolled.parameters).toMatchObject({
               attribute: 'body',
               skill: 'athletics',
               complexity: Number(complexity),
               totalDice: 6,
            });
            expect(rolled.results.succeeded, 'the dialog rolled the forced successes').toBe(true);
            await closeAllApps(gm);
         }
      });
});

test.describe('damage that the opposed check reduces', () => {
   test('the button carries the damage and a failed opposed check takes the damage minus its successes', async () => {
      // Three successes bank 2 extra successes: damage 6 + 2 = 8, Complexity 3.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.damage, 3);
      expect(check.parameters.damageReducedBy).toBe('opposedCheck');
      expect(check.results.damage, 'initial 6 + 2 extra successes').toBe(8);
      expect((await readResultRows(check.card)).rows).toContain('Damage: 8');
      expect((await readCardButtons(check.card)).opposed).toEqual(['Body (Athletics) 4:3']);

      /** @type {object} The Attribute Check the click posts. */
      const held = await opposeWith(check, 6, 3);
      expect(held.parameters.damageToReduce, 'the card passed its damage').toBe(8);
      expect(held.results.succeeded).toBe(true);
      expect(held.results.damageTaken, 'a held opposed check takes nothing').toBe(0);

      /** @type {object} The Attribute Check the click posts. */
      const failed = await opposeWith(check, 6, 2);
      expect(failed.results.succeeded).toBe(false);
      expect(failed.results.damageTaken, 'damage 8 minus 2 successes').toBe(6);
      await showChatLog(gm);
      expect(await readResultRows(cardOf(gm, failed.id))).toEqual({
         dc: 'DC 4:3',
         successes: '2 Successes',
         outcome: 'Failed',
         rows: ['Damage Taken: 6'],
      });
   });

   test('Complexity 1 with no success takes the whole damage', async () => {
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.damage, 1);
      expect(check.results.damage).toBe(6);
      /** @type {object} The Attribute Check the click posts. */
      const failed = await opposeWith(check, 6, 0);
      expect(failed.results.damageTaken, 'no success reduces nothing: the whole 6').toBe(6);
   });

   test('a failed opposed check never takes negative damage when its successes exceed the damage', async () => {
      // The Opposed Fixed check deals 1 whatever the roll. Four successes bank 3 extra successes: Complexity 4. Body
      // (Athletics) rolls 6 dice, 3 of them successes: one short, and 3 successes exceed the damage of 1.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.fixed, 4);
      expect(check.results.damage, 'a damage that does not scale').toBe(1);
      expect((await readCardButtons(check.card)).opposed).toEqual(['Body (Athletics) 4:4']);
      /** @type {object} The Attribute Check the click posts. */
      const failed = await opposeWith(check, 6, 3);
      expect(failed.results.succeeded).toBe(false);
      expect(failed.results.damageTaken, 'at most the damage, never below 0').toBe(0);
   });

   test('Apply Half Damage on an Attribute Check card applies at least 1 damage', async () => {
      // The Opposed Fixed check deals 1; Body (Athletics) with no success takes all of it.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.fixed, 4);
      /** @type {object} The Attribute Check the click posts. */
      const failed = await opposeWith(check, 6, 0);
      expect(failed.results.damageTaken, 'the whole damage of 1').toBe(1);
      /** @type {object} The damage report and the defender's vitals around the click. */
      await restoreStamina(gm, hardyId);
      const half = await pressDamageButton(gm, failed.id, hardyId, 'half');
      expect(half.report.damageTaken, 'half of 1 is at least 1').toBe(1);
      expect(half.before.stamina - half.after.stamina).toBe(1);
   });

   test('applying the damage taken lowers the defender\'s Stamina by exactly that amount', async () => {
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.damage, 3);
      /** @type {object} The Attribute Check the click posts. */
      const failed = await opposeWith(check, 6, 2);
      expect(failed.results.damageTaken).toBe(6);
      await showChatLog(gm);

      /** @type {{stamina: number, wounds: number}} The defender's vitals before the button. */
      const before = await readVitals(gm, defenderId);
      expect(before.stamina, 'the defender can absorb 6').toBeGreaterThanOrEqual(6);
      await cardOf(gm, failed.id).locator('.damage-buttons .button button').first().click();
      await expect.poll(
         async () => (await readVitals(gm, defenderId)).stamina,
         { message: 'the button applied the damage taken' },
      ).toBe(before.stamina - 6);
   });
});

test.describe('a check with an opposed check and a resistance check', () => {
   test('Damage Reduced By the opposed check: only the Opposed button carries the damage', async () => {
      // Three successes bank 2 extra successes: damage 8, both buttons ask for Complexity 3.
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.bothOpposedReduces, 3);
      expect(check.parameters.damageReducedBy).toBe('opposedCheck');
      expect(await readCardButtons(check.card)).toEqual({
         resist: ['Resilience 4:3'],
         opposed: ['Body (Athletics) 4:3'],
      });

      // Both fail on the same card with 2 successes; Resilience rolls 5 dice.
      /** @type {object} The Attribute Check the click posts. */
      const opposedCheck = await opposeWith(check, 6, 2);
      expect(opposedCheck.parameters.damageToReduce).toBe(8);
      expect(opposedCheck.results.damageTaken, 'damage 8 minus 2 successes').toBe(6);

      await focusCharacter(gm, `Actor.${defenderId}`);
      await showChatLog(gm);
      await forceDice(gm, facesWith(5, 2));
      /** @type {object} The Resistance Check the click posts. */
      const resist = await clickResist(gm, check.id, 'resilience');
      expect(resist.parameters).toMatchObject({
         resistance: 'resilience',
         complexity: 3,
         damageToReduce: 0,
         totalDice: 5,
      });
      expect(resist.results.succeeded).toBe(false);
      expect(resist.results.damageTaken, 'the resistance check reduces none of the damage').toBe(0);
   });

   test('Damage Reduced By the resistance check: only the Resist button carries the damage', async () => {
      /** @type {object} The rolled check and its card in the GM's chat log. */
      const check = await rollWith(CHECK.bothResistReduces, 3);
      expect(check.parameters.damageReducedBy).toBe('resistanceCheck');
      expect(await readCardButtons(check.card)).toEqual({
         resist: ['Resilience 4:3'],
         opposed: ['Body (Athletics) 4:3'],
      });

      /** @type {object} The Attribute Check the click posts. */
      const opposedCheck = await opposeWith(check, 6, 2);
      expect(opposedCheck.parameters.damageToReduce, 'the opposed check reduces none of the damage').toBe(0);
      expect(opposedCheck.results.succeeded).toBe(false);
      expect(opposedCheck.results.damageTaken).toBe(0);

      await focusCharacter(gm, `Actor.${defenderId}`);
      await showChatLog(gm);
      await forceDice(gm, facesWith(5, 2));
      /** @type {object} The Resistance Check the click posts. */
      const resist = await clickResist(gm, check.id, 'resilience');
      expect(resist.parameters.damageToReduce).toBe(8);
      expect(resist.results.damageTaken, 'damage 8 minus 2 successes').toBe(6);
   });
});

test.describe('a casting card', () => {
   test('has no Opposed button; its Resist buttons carry the rules\' 4:(1 + extra successes)', async () => {
      // The rules' example: a spell whose effect Resilience resists, cast with 2 extra successes, asks for DC 4:3.
      /** @type {{id: string, uuid: string}} The spell, built with the sheet's controls. */
      const spell = await buildSpell(gm, rollerId, 'E2E Opposed Searing', {
         standard: [
            {
               label: 'damage',
               resistanceCheck: 'resilience',
            },
         ],
      });
      await closeAllApps(gm);
      await forceDice(gm, [
         ...Array.from({ length: 3 }, () => 6),
         ...Array.from({ length: 9 }, () => 2),
      ]);
      /** @type {object} The cast from the spell's sheet. */
      const cast = await castFromSpellSheet(gm, spell.uuid);
      await resetDice(gm);
      await closeAllApps(gm);
      expect(cast.results.extraSuccesses, 'three successes against Complexity 1').toBe(2);
      /** @type {import('@playwright/test').Locator} The cast's card in the GM's chat log. */
      const card = await openCard(gm, cast.id);
      expect(await readCardButtons(card)).toEqual({
         resist: ['Resilience 4:3'],
         opposed: [],
      });
   });
});
