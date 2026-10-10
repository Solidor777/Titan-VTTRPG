import { expect, test } from './harness.js';
import { clickRoll, readNewestCheckFlags, readSummary } from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import { addCheck, createOwnedItem } from './flows.js';
import { setClientSetting } from './settings.js';
import {
   aspectBlock,
   aspectControl,
   buildSpell,
   castFromSpellSheet,
   openCard,
   readScaling,
} from './spellCasting.js';
import {
   cardOf,
   clickResist,
   createCharacter,
   focusCharacter,
   messageCount,
   readCardButtons,
   readResultRows,
   readVitals,
   rollItemCheck,
   setCheckExtras,
   setCustomAspectResistance,
} from './checkCards.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Resistance checks on casting cards and item check cards, for every Resistance the product offers (Reflexes,
 * Resilience and Willpower). The defender has Body 4, Mind 4 and Soul 2, so by the rules (Reflexes = Mind + half Body,
 * Resilience = Body + half Soul, Willpower = Soul + half of the attribute the rules name; Body and Mind are equal here
 * so both readings agree) it rolls 6 dice for Reflexes, 5 for Resilience and 4 for Willpower. A Resist button asks for
 * Difficulty 4 and Complexity (extra successes + 1) (rules text "Opposed Checks" of "The Arcane Arts"); every die is
 * forced, so the successes of each Resistance Check, the margin of its Complexity and the damage taken are worked out
 * by hand. The GM clicks the buttons with the defender's sheet focused, which is what the buttons act on when nothing
 * is targeted.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who builds the documents and rolls. */
let gm;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {string} The id of the caster, who has Mind 12 and rolls 12 dice per cast. */
let casterId;
/** @type {string} The id of the roller of item checks, who has Body 12 and rolls 12 dice per check. */
let rollerId;
/** @type {string} The id of the defender, who has Body 4, Mind 4 and Soul 2. */
let defenderId;

/**
 * The dice each Resistance of the defender rolls: Reflexes 4 + 2, Resilience 4 + 1, Willpower 2 + 2.
 * @type {Record<string, number>}
 */
const DEFENDER_DICE = {
   reflexes: 6,
   resilience: 5,
   willpower: 4,
};

/** @type {string[]} The Resistances, in the order a casting card lists its buttons. */
const RESISTANCES = [
   'reflexes',
   'resilience',
   'willpower',
];

/**
 * Builds the faces of a roll in which a number of the dice are successes against Difficulty 4: successes are 4s (the
 * lowest face that meets the Difficulty), the rest are 2s.
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
 * Casts a spell from its sheet with a number of successes out of the caster's twelve dice, and opens the card.
 * @param {string} spellUuid - The uuid of the spell.
 * @param {number} successes - How many of the twelve dice are successes (6s; the others are 2s).
 * @returns {Promise<{id: string, parameters: object, results: object, card: import('@playwright/test').Locator}>} The
 * message and its card in the GM's chat log.
 */
async function castWith(spellUuid, successes) {
   await forceDice(gm, [
      ...Array.from({ length: successes }, () => 6),
      ...Array.from({ length: 12 - successes }, () => 2),
   ]);

   /** @type {{id: string, parameters: object, results: object}} The cast. */
   const message = await castFromSpellSheet(gm, spellUuid);
   await resetDice(gm);
   await closeAllApps(gm);
   return {
      ...message,
      card: await openCard(gm, message.id),
   };
}

/**
 * Rolls a check of an item with a number of successes out of the roller's twelve dice, and opens the card.
 * @param {string} itemUuid - The uuid of the item.
 * @param {number} index - The position of the check among the item's checks.
 * @param {number} successes - How many of the twelve dice are successes (6s; the others are 2s).
 * @returns {Promise<{id: string, parameters: object, results: object, card: import('@playwright/test').Locator}>} The
 * message and its card in the GM's chat log.
 */
async function rollWith(itemUuid, index, successes) {
   await forceDice(gm, [
      ...Array.from({ length: successes }, () => 6),
      ...Array.from({ length: 12 - successes }, () => 2),
   ]);

   /** @type {{id: string, parameters: object, results: object}} The roll. */
   const message = await rollItemCheck(gm, itemUuid, index);
   await resetDice(gm);
   await closeAllApps(gm);
   await showChatLog(gm);
   return {
      ...message,
      card: cardOf(gm, message.id),
   };
}

/**
 * Clicks a Resist button of a card with the defender's sheet focused and the defender's dice forced.
 * @param {{id: string}} cast - The card's message.
 * @param {string} resistance - The Resistance of the button.
 * @param {number} successes - How many of the defender's dice for that Resistance are successes.
 * @returns {Promise<{id: string, parameters: object, results: object}>} The posted Resistance Check.
 */
async function resistWith(cast, resistance, successes) {
   await focusCharacter(gm, `Actor.${defenderId}`);
   await showChatLog(gm);
   await forceDice(gm, facesWith(DEFENDER_DICE[resistance], successes));

   /** @type {{id: string, parameters: object, results: object}} The Resistance Check. */
   const resist = await clickResist(gm, cast.id, resistance);
   await resetDice(gm);
   return resist;
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(300_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   await setClientSetting(gm, 'getCheckOptions', 'never');
   casterId = await createCharacter(gm, 'E2E Resist Caster', { mind: 12 });
   rollerId = await createCharacter(gm, 'E2E Resist Roller', { body: 12 });
   defenderId = await createCharacter(gm, 'E2E Resist Defender', {
      body: 4,
      mind: 4,
      soul: 2,
   });
   await closeAllApps(gm);
});

test.afterEach(async () => {
   await resetDice(gm);
   await closeAllApps(gm);
   await setClientSetting(gm, 'getCheckOptions', 'never');
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await gm?.close();
});

test.describe('a casting card with a Resist button for every Resistance', () => {
   /** @type {{id: string, uuid: string}} Damage resisted by Reflexes, Stunned by Resilience, Dread by Willpower. */
   let triple;
   /** @type {{id: string, parameters: object, results: object, card: import('@playwright/test').Locator}} The cast. */
   let cast;

   test.beforeAll(async () => {
      test.setTimeout(300_000);

      // Damage costs 1 (a Resistance Check would halve a cost of 1 down to 1), Stunned costs 4 and halves to 2, and the
      // custom aspect Dread costs 1: the total of 4 is Difficulty 4 and Complexity 1. Damage and Dread scale for 1
      // extra success a step, so two aspects are affordable and the roll buys nothing.
      triple = await buildSpell(gm, casterId, 'E2E Resist Triple', {
         standard: [
            {
               label: 'damage',
               resistanceCheck: 'reflexes',
            },
            {
               label: 'inflictCondition',
               options: ['stunned'],
               resistanceCheck: 'resilience',
            },
         ],
         custom: [
            {
               label: 'Dread',
               cost: 1,
               scaling: true,
            },
         ],
      });
      await setCustomAspectResistance(gm, triple.uuid, 0, 'willpower');
      await closeAllApps(gm);

      // Four successes against Complexity 1 bank 3 extra successes.
      cast = await castWith(triple.uuid, 4);
   });

   test('the card has one Resist button per Resistance: Difficulty 4, Complexity extra successes + 1', async () => {
      expect(cast.parameters.difficulty, 'the aspects cost 4 in all').toBe(4);
      expect(cast.parameters.complexity, 'a total of 4 is Complexity 1').toBe(1);
      expect(cast.parameters.reflexesCheck, 'damage is resisted by Reflexes').toBe(true);
      expect(cast.parameters.resilienceCheck, 'Stunned is resisted by Resilience').toBe(true);
      expect(cast.parameters.willpowerCheck, 'Dread is resisted by Willpower').toBe(true);
      expect(cast.results.extraSuccesses, 'four successes against Complexity 1').toBe(3);
      expect(cast.results.extraSuccessesRemaining, 'two aspects are affordable, so none is bought').toBe(3);
      expect(await readCardButtons(cast.card)).toEqual({
         resist: [
            'Reflexes 4:4',
            'Resilience 4:4',
            'Willpower 4:4',
         ],
         opposed: [],
      });
   });

   for (const resistance of RESISTANCES) {
      test(`${resistance}: exactly the Complexity in successes succeeds, one short fails`, async () => {
         const dice = DEFENDER_DICE[resistance];

         // Four successes meet Complexity 4 exactly.
         const exact = await resistWith(cast, resistance, 4);
         expect(exact.parameters.resistance, 'the button rolls its Resistance').toBe(resistance);
         expect(exact.parameters.difficulty, 'Difficulty 4').toBe(4);
         expect(exact.parameters.complexity, 'Complexity extra successes + 1').toBe(4);
         expect(exact.parameters.damageToReduce, 'a casting card reduces no damage').toBe(0);
         expect(exact.parameters.totalDice, `${resistance} rolls ${dice} dice`).toBe(dice);
         expect(exact.results.successes, 'four successes').toBe(4);
         expect(exact.results.succeeded, '4 successes meet Complexity 4').toBe(true);
         expect(exact.results.extraSuccesses, 'no success beyond the Complexity').toBe(0);
         expect(exact.results.damageTaken, 'nothing to take').toBe(0);
         await showChatLog(gm);
         expect(await readResultRows(cardOf(gm, exact.id))).toEqual({
            dc: 'DC 4:4',
            successes: '4 Successes',
            outcome: 'Succeeded',
            rows: [],
         });

         // Three successes are one short.
         const short = await resistWith(cast, resistance, 3);
         expect(short.parameters.complexity, 'the card is unchanged by the first Resist').toBe(4);
         expect(short.results.successes, 'three successes').toBe(3);
         expect(short.results.succeeded, '3 successes miss Complexity 4').toBe(false);
         expect(short.results.damageTaken, 'a casting card reduces no damage').toBe(0);
         await showChatLog(gm);
         expect(await readResultRows(cardOf(gm, short.id))).toEqual({
            dc: 'DC 4:4',
            successes: '3 Successes',
            outcome: 'Failed',
            rows: [],
         });
      });
   }

   test('the three buttons are independent: each rolls its own Resistance at the card\'s Complexity', async () => {
      /** @type {number} The message count before the clicks. */
      const before = await messageCount(gm);
      /** @type {object[]} The three Resistance Checks. */
      const checks = [];
      for (const resistance of RESISTANCES) {
         checks.push(await resistWith(cast, resistance, 4));
      }
      expect(await messageCount(gm), 'each click posted exactly one check').toBe(before + 3);
      expect(checks.map((check) => [
         check.parameters.resistance,
         check.parameters.totalDice,
         check.parameters.complexity,
         check.results.successes,
         check.results.succeeded,
      ])).toEqual([
         [
            'reflexes',
            6,
            4,
            4,
            true,
         ],
         [
            'resilience',
            5,
            4,
            4,
            true,
         ],
         [
            'willpower',
            4,
            4,
            4,
            true,
         ],
      ]);
      expect(
         (await readCardButtons(cast.card)).resist,
         'the buttons keep their text after being clicked',
      ).toEqual([
         'Reflexes 4:4',
         'Resilience 4:4',
         'Willpower 4:4',
      ]);
   });

   test('extra successes spent or refunded on the card do not change the Resist Complexity', async () => {
      // The rules (Opposed Checks, The Arcane Arts) set the Complexity from the extra successes the casting check
      // earned and let the caster distribute them after the targets have rolled, so spending them leaves it at 4.
      // Spend two steps on Damage (Reflexes-resisted).
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'two steps of Damage' }).toMatchObject({
         damage: 3,
         remaining: 1,
         extra: 3,
      });
      expect((await readCardButtons(cast.card)).resist, 'after a spend').toEqual([
         'Reflexes 4:4',
         'Resilience 4:4',
         'Willpower 4:4',
      ]);
      expect((await resistWith(cast, 'reflexes', 3)).parameters.complexity, 'a Resist after a spend').toBe(4);

      // Refund both steps.
      await aspectControl(aspectBlock(cast.card, 0), 'decrease').click();
      await aspectControl(aspectBlock(cast.card, 0), 'decrease').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'both steps refunded' }).toMatchObject({
         damage: 1,
         remaining: 3,
         extra: 3,
      });
      expect((await readCardButtons(cast.card)).resist, 'after a refund').toEqual([
         'Reflexes 4:4',
         'Resilience 4:4',
         'Willpower 4:4',
      ]);
      expect((await resistWith(cast, 'willpower', 3)).parameters.complexity, 'a Resist after a refund').toBe(4);
   });

   for (const resistance of RESISTANCES) {
      test(`${resistance}: the Resist dialog opens with Difficulty 4 and Complexity 4 and rolls them`, async () => {
         await setClientSetting(gm, 'getCheckOptions', 'always');
         await focusCharacter(gm, `Actor.${defenderId}`);
         await showChatLog(gm);
         await cast.card.locator(`.button.${resistance} button`).click();

         /** @type {import('@playwright/test').Locator} The Resistance Check dialog. */
         const dialog = gm.locator('.application.titan-dialog[id^="titan-resistance-check-dialog-"]').first();
         await expect(dialog).toBeVisible();
         await expect(dialog.getByTestId('check-field-resistance').locator('[role="combobox"]'))
            .toHaveAttribute('data-value', resistance);
         await expect(dialog.getByTestId('check-field-complexity').locator('input')).toHaveValue('4');
         await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('4');
         expect(await readSummary(dialog, 'totalDice'), `${resistance} rolls its dice`)
            .toBe(DEFENDER_DICE[resistance]);

         // Rolling from the dialog posts the dialog's numbers.
         await forceDice(gm, facesWith(DEFENDER_DICE[resistance], 4));
         const baseline = await clickRoll(dialog, gm);
         const resist = await readNewestCheckFlags(gm, baseline, 'resistanceCheck');
         expect(resist.parameters).toMatchObject({
            resistance,
            difficulty: 4,
            complexity: 4,
            totalDice: DEFENDER_DICE[resistance],
         });
         expect(resist.results.succeeded).toBe(true);
      });
   }
});

test.describe('casting cards with fewer or more Resist buttons', () => {
   /** @type {{id: string, uuid: string}} Damage and a custom aspect that are both resisted by Reflexes. */
   let twin;
   /** @type {{id: string, uuid: string}} A spell whose damage is resisted by Resilience. */
   let single;

   test.beforeAll(async () => {
      test.setTimeout(300_000);
      twin = await buildSpell(gm, casterId, 'E2E Resist Twin', {
         standard: [
            {
               label: 'damage',
               resistanceCheck: 'reflexes',
            },
         ],
         custom: [
            {
               label: 'Echo',
               cost: 1,
            },
         ],
      });
      await setCustomAspectResistance(gm, twin.uuid, 0, 'reflexes');
      single = await buildSpell(gm, casterId, 'E2E Resist Single', {
         standard: [
            {
               label: 'damage',
               resistanceCheck: 'resilience',
            },
         ],
      });
      await closeAllApps(gm);
   });

   test('two aspects resisted by the same Resistance share one button', async () => {
      // Damage (1) and Echo (1) cost 2, which is below the minimum Difficulty 4, with Complexity 1. Two successes bank
      // one extra success.
      const cast = await castWith(twin.uuid, 2);
      expect(cast.parameters.difficulty, 'a total below 4 is Difficulty 4').toBe(4);
      expect(cast.results.extraSuccesses).toBe(1);
      expect(await readCardButtons(cast.card)).toEqual({
         resist: ['Reflexes 4:2'],
         opposed: [],
      });
   });

   test('a failed cast offers no Resist button, a successful cast of the same spell does', async () => {
      // The failed cast: zero successes against Complexity 1. The card is mounted and says Failed first.
      const failed = await castWith(single.uuid, 0);
      expect(failed.results.succeeded).toBe(false);
      expect(failed.parameters.resilienceCheck, 'the spell is resisted by Resilience').toBe(true);
      expect((await readResultRows(failed.card)).outcome, 'the card is mounted and failed').toBe('Failed');
      expect((await readCardButtons(failed.card)).resist, 'a failed cast has no button').toEqual([]);

      // The successful cast of the same spell.
      const succeeded = await castWith(single.uuid, 1);
      expect((await readResultRows(succeeded.card)).outcome).toBe('Succeeded');
      expect((await readCardButtons(succeeded.card)).resist).toEqual(['Resilience 4:1']);
   });
});

test.describe('item check cards with a Resist button', () => {
   /** @type {string} The uuid of the ability that holds the checks. */
   let strikes;

   /**
    * The checks of the ability, in order: label, Resistance and damage.
    * @type {{label: string, resistanceCheck: string, isDamage: boolean, initialValue: number}[]}
    */
   const CHECKS = [
      {
         label: 'Reflexes Strike',
         resistanceCheck: 'reflexes',
         isDamage: true,
         initialValue: 5,
      },
      {
         label: 'Resilience Strike',
         resistanceCheck: 'resilience',
         isDamage: true,
         initialValue: 5,
      },
      {
         label: 'Willpower Strike',
         resistanceCheck: 'willpower',
         isDamage: true,
         initialValue: 5,
      },
      {
         label: 'Reflexes Effect',
         resistanceCheck: 'reflexes',
         isDamage: false,
         initialValue: 1,
      },
      {
         label: 'Plain',
         resistanceCheck: undefined,
         isDamage: false,
         initialValue: 1,
      },
      {
         label: 'Fixed Strike',
         resistanceCheck: 'reflexes',
         isDamage: true,
         initialValue: 1,
      },
   ];

   test.beforeAll(async () => {
      test.setTimeout(300_000);
      strikes = `Actor.${rollerId}.Item.${await createOwnedItem(gm, rollerId, 'ability', 'E2E Resist Strikes')}`;
      for (const { label, resistanceCheck, isDamage, initialValue } of CHECKS) {
         await addCheck(gm, strikes, {
            label,
            resistanceCheck,
            isDamage: isDamage || undefined,
            initialValue: isDamage ? initialValue : undefined,
            damageReducedBy: isDamage ? 'resistanceCheck' : undefined,
         });
      }

      // The Fixed Strike does not scale, so its damage stays at 1 whatever the roll.
      await setCheckExtras(gm, strikes, 5, { scaling: false });
      await closeAllApps(gm);
   });

   for (const [index, resistance] of RESISTANCES.entries()) {
      test(`${resistance}: the button carries the scaled damage and the margin decides the damage taken`, async () => {
         // Three successes against Complexity 1 bank 2 extra successes: damage 5 + 2 = 7, Resist Complexity 3.
         const strike = await rollWith(strikes, index, 3);
         expect(strike.parameters.resistanceCheck).toBe(resistance);
         expect(strike.parameters.damageReducedBy).toBe('resistanceCheck');
         expect(strike.results.extraSuccesses).toBe(2);
         expect(strike.results.damage, 'initial 5 + 2 extra successes').toBe(7);
         expect((await readResultRows(strike.card)).rows).toContain('Damage: 7');
         expect(await readCardButtons(strike.card)).toEqual({
            resist: [`${resistance[0].toUpperCase()}${resistance.slice(1)} 4:3`],
            opposed: [],
         });

         // Three successes meet Complexity 3 exactly: the Resistance holds and no damage is taken.
         const exact = await resistWith(strike, resistance, 3);
         expect(exact.parameters).toMatchObject({
            resistance,
            difficulty: 4,
            complexity: 3,
            damageToReduce: 7,
            totalDice: DEFENDER_DICE[resistance],
         });
         expect(exact.results.succeeded).toBe(true);
         expect(exact.results.damageTaken, 'a held Resistance takes nothing').toBe(0);
         await showChatLog(gm);
         expect(await readResultRows(cardOf(gm, exact.id))).toEqual({
            dc: 'DC 4:3',
            successes: '3 Successes',
            outcome: 'Succeeded',
            rows: [],
         });

         // Two successes are one short: the damage is 7 - 2 = 5.
         const short = await resistWith(strike, resistance, 2);
         expect(short.results.succeeded).toBe(false);
         expect(short.results.damageTaken, 'damage 7 minus 2 successes').toBe(5);
         await showChatLog(gm);
         expect(await readResultRows(cardOf(gm, short.id))).toEqual({
            dc: 'DC 4:3',
            successes: '2 Successes',
            outcome: 'Failed',
            rows: ['Damage Taken: 5'],
         });
      });

      test(`${resistance}: Complexity 1 holds with one success and takes the whole damage with none`, async () => {
         // One success against Complexity 1 banks no extra success: damage 5, Resist Complexity 1.
         const strike = await rollWith(strikes, index, 1);
         expect(strike.results.damage).toBe(5);
         expect((await readCardButtons(strike.card)).resist[0]).toMatch(/ 4:1$/);

         const held = await resistWith(strike, resistance, 1);
         expect(held.results.succeeded).toBe(true);
         expect(held.results.damageTaken).toBe(0);

         const failed = await resistWith(strike, resistance, 0);
         expect(failed.results.successes).toBe(0);
         expect(failed.results.succeeded).toBe(false);
         expect(failed.results.damageTaken, 'no success reduces nothing: the whole 5').toBe(5);
      });
   }

   test('a Resistance with fewer dice than the Complexity cannot hold', async () => {
      // Six successes bank 5 extra successes: Complexity 6, damage 10. Willpower rolls 4 dice, all successes.
      const strike = await rollWith(strikes, 2, 6);
      expect(strike.results.damage).toBe(10);
      expect((await readCardButtons(strike.card)).resist).toEqual(['Willpower 4:6']);
      const resist = await resistWith(strike, 'willpower', 4);
      expect(resist.results.successes).toBe(4);
      expect(resist.results.succeeded, '4 successes miss Complexity 6').toBe(false);
      expect(resist.results.damageTaken, '10 - 4').toBe(6);
   });

   test('a resisted check without damage takes none on a failed Resistance', async () => {
      const effect = await rollWith(strikes, 3, 2);
      expect(effect.results.damage).toBe(0);
      expect((await readCardButtons(effect.card)).resist).toEqual(['Reflexes 4:2']);
      const failed = await resistWith(effect, 'reflexes', 0);
      expect(failed.parameters.damageToReduce).toBe(0);
      expect(failed.results.succeeded).toBe(false);
      expect(failed.results.damageTaken).toBe(0);
   });

   test('a failed Resistance never takes negative damage when its successes exceed the damage', async () => {
      // The Fixed Strike deals 1 whatever the roll. Four successes bank 3 extra successes: Resist Complexity 4.
      // Reflexes rolls 6 dice, 3 of them successes: one short, and 3 successes exceed the damage of 1.
      const strike = await rollWith(strikes, 5, 4);
      expect(strike.results.damage, 'a damage that does not scale').toBe(1);
      expect((await readCardButtons(strike.card)).resist).toEqual(['Reflexes 4:4']);
      const failed = await resistWith(strike, 'reflexes', 3);
      expect(failed.results.succeeded).toBe(false);
      expect(failed.results.damageTaken, 'at most the damage, never below 0').toBe(0);
   });

   test('a check with no Resistance has no button, while a failed check with one has none either', async () => {
      const plain = await rollWith(strikes, 4, 3);
      expect((await readResultRows(plain.card)).outcome, 'the plain card is mounted and succeeded').toBe('Succeeded');
      expect((await readCardButtons(plain.card)).resist).toEqual([]);

      // The same Reflexes check that offers a button on a success offers none on a failure.
      const hit = await rollWith(strikes, 0, 1);
      expect((await readCardButtons(hit.card)).resist).toEqual(['Reflexes 4:1']);
      const miss = await rollWith(strikes, 0, 0);
      expect((await readResultRows(miss.card)).outcome, 'the failed card is mounted').toBe('Failed');
      expect((await readCardButtons(miss.card)).resist).toEqual([]);
   });

   test('several checks of one item each keep their own damage and Complexity', async () => {
      // The Reflexes, Resilience and Willpower Strikes roll with 2, 4 and 3 successes: Complexity 2, 4 and 3, damage
      // 5 + 1, 5 + 3 and 5 + 2.
      const reflexes = await rollWith(strikes, 0, 2);
      const resilience = await rollWith(strikes, 1, 4);
      const willpower = await rollWith(strikes, 2, 3);
      expect([
         reflexes.results.damage,
         resilience.results.damage,
         willpower.results.damage,
      ]).toEqual([
         6,
         8,
         7,
      ]);

      // Clicked in the opposite order, each button still carries its own card's numbers; Willpower rolls 3 of 3 (held),
      // Resilience rolls 3 of 4 (short, 8 - 3), Reflexes rolls 1 of 2 (short, 6 - 1).
      const heldWillpower = await resistWith(willpower, 'willpower', 3);
      const shortResilience = await resistWith(resilience, 'resilience', 3);
      const shortReflexes = await resistWith(reflexes, 'reflexes', 1);
      expect(
         [
            heldWillpower,
            shortResilience,
            shortReflexes,
         ].map((check) => [
            check.parameters.resistance,
            check.parameters.complexity,
            check.parameters.damageToReduce,
            check.results.succeeded,
            check.results.damageTaken,
         ]),
      ).toEqual([
         [
            'willpower',
            3,
            7,
            true,
            0,
         ],
         [
            'resilience',
            4,
            8,
            false,
            5,
         ],
         [
            'reflexes',
            2,
            6,
            false,
            5,
         ],
      ]);
   });

   test('the Resist dialog of an item card opens with its Complexity and rolls the damage reduction', async () => {
      const strike = await rollWith(strikes, 2, 3);
      await setClientSetting(gm, 'getCheckOptions', 'always');
      await focusCharacter(gm, `Actor.${defenderId}`);
      await showChatLog(gm);
      await strike.card.locator('.button.willpower button').click();

      /** @type {import('@playwright/test').Locator} The Resistance Check dialog. */
      const dialog = gm.locator('.application.titan-dialog[id^="titan-resistance-check-dialog-"]').first();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId('check-field-complexity').locator('input')).toHaveValue('3');
      await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('4');
      await forceDice(gm, facesWith(4, 2));
      const baseline = await clickRoll(dialog, gm);
      const resist = await readNewestCheckFlags(gm, baseline, 'resistanceCheck');
      expect(resist.parameters).toMatchObject({
         resistance: 'willpower',
         complexity: 3,
         damageToReduce: 7,
      });
      expect(resist.results.damageTaken, '7 - 2').toBe(5);
   });

   test('applying the damage taken lowers the defender\'s Stamina by exactly that amount', async () => {
      const strike = await rollWith(strikes, 0, 3);
      const failed = await resistWith(strike, 'reflexes', 2);
      expect(failed.results.damageTaken).toBe(5);
      await showChatLog(gm);

      /** @type {{stamina: number, wounds: number}} The defender's vitals before the button. */
      const before = await readVitals(gm, defenderId);
      expect(before.stamina, 'the defender can absorb 5').toBeGreaterThanOrEqual(5);
      await cardOf(gm, failed.id).locator('.damage-buttons .button button').first().click();
      await expect.poll(
         async () => (await readVitals(gm, defenderId)).stamina,
         { message: 'the button applied the damage taken' },
      ).toBe(before.stamina - 5);
   });
});
