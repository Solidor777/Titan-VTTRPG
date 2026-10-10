import { expect, flushPageErrors, test } from './harness.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import { createActor, setAttributeBase, setOwnership } from './flows.js';
import { setClientSetting } from './settings.js';
import {
   aspectBlock,
   aspectControl,
   buildSpell,
   castFromCharacterSheet,
   castFromSpellSheet,
   openCard,
   readAspectBlock,
   readCardRows,
   readScaling,
} from './spellCasting.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Spending and refunding extra successes on the scaling aspects of a casting card, through the card's Reset, Decrease
 * and Increase controls. A scaling aspect costs `scalingCost` extra successes per step when the standard aspect has
 * one, otherwise its own aspect cost, and each step moves its value by its initial value (at least 1). When exactly one
 * scaling aspect is affordable at roll time, the roll buys as many whole steps of it as the extra successes pay for;
 * with none or several affordable, nothing is bought. Every number below is worked out by hand from `SpellAspects.js`
 * and those rules.
 *
 * The caster has Mind 12, so every cast rolls 12 dice; the forced faces are 6s (a success against Difficulty 4 or 5)
 * followed by 2s (never a success).
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who builds the spells and casts. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who owns the caster. */
let player;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {string} The id of the caster, who has Mind 12. */
let casterId;
/** @type {string} The uuid of the caster. */
let casterUuid;

/**
 * Builds the twelve forced faces of a cast with a number of successes.
 * @param {number} successes - How many of the twelve dice are 6s; the others are 2s.
 * @returns {number[]} The faces, in roll order.
 */
function facesWith(successes) {
   return [
      ...Array.from({ length: successes }, () => 6),
      ...Array.from({ length: 12 - successes }, () => 2),
   ];
}

/**
 * Casts a spell from its sheet with a number of successes and opens the card.
 * @param {string} spellUuid - The uuid of the spell.
 * @param {number} successes - How many dice are successes.
 * @returns {Promise<{id: string, parameters: object, results: object, card: import('@playwright/test').Locator}>} The
 * message and its card in the GM's chat log.
 */
async function castWith(spellUuid, successes) {
   await forceDice(gm, facesWith(successes));

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
 * One spell with a single scaling aspect, and the numbers worked out by hand for it.
 * @typedef {object} SingleAspectCase
 * @property {string} name - The test's name.
 * @property {object} spell - The aspects `buildSpell` gives the spell.
 * @property {string} label - The label the card shows for the aspect.
 * @property {number} cost - Extra successes per step.
 * @property {number} initial - The aspect's initial value, which is also the size of a step when it is at least 1.
 * @property {number} step - The change in value per step.
 * @property {number} baseDamage - The damage before any step.
 * @property {number} baseHealing - The healing before any step.
 * @property {boolean} damage - Whether a step adds damage.
 * @property {boolean} healing - Whether a step adds healing.
 */

/**
 * The extra successes a single-aspect cast earns for each step cost: two steps and one over for a cost of 2 or more,
 * so the roll buys 2 steps and leaves 1 extra success; a cost of 1 earns 3 so the roll buys all 3.
 * @type {Record<number, {extra: number, steps: number}>}
 */
const SINGLE_EARNED = {
   1: {
      extra: 3,
      steps: 3,
   },
   2: {
      extra: 5,
      steps: 2,
   },
   3: {
      extra: 7,
      steps: 2,
   },
   4: {
      extra: 9,
      steps: 2,
   },
};

/**
 * The scaling standard aspects, one spell each. The step cost is the aspect's `scalingCost` when it has one and its
 * cost otherwise; a decrease or increase aspect costs its option cost per chosen option.
 * @type {SingleAspectCase[]}
 */
const STANDARD_CASES = [
   {
      name: 'extraTargets',
      spell: { standard: [{ label: 'extraTargets' }] },
      label: 'Extra Targets',
      cost: 1,
      initial: 0,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      name: 'duration in rounds',
      spell: { standard: [{ label: 'duration' }] },
      label: 'Rounds',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // Minutes cost 4 to build but a step still costs the aspect's scaling cost of 1.
      name: 'duration in minutes',
      spell: {
         standard: [
            {
               label: 'duration',
               unit: 'minutes',
            },
         ],
      },
      label: 'Minutes',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      name: 'damage',
      spell: { standard: [{ label: 'damage' }] },
      label: 'Damage',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 1,
      baseHealing: 0,
      damage: true,
      healing: false,
   },
   {
      // Ignore Armor makes the aspect cost 2 to build; a step still costs its scaling cost of 1.
      name: 'damage with Ignore Armor',
      spell: {
         standard: [
            {
               label: 'damage',
               options: ['ignoreArmor'],
            },
         ],
      },
      label: 'Damage',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 1,
      baseHealing: 0,
      damage: true,
      healing: false,
   },
   {
      name: 'healing',
      spell: { standard: [{ label: 'healing' }] },
      label: 'Healing',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 1,
      damage: false,
      healing: true,
   },
   {
      // One option at 2 each.
      name: 'decreaseMod',
      spell: {
         standard: [
            {
               label: 'decreaseMod',
               options: ['armor'],
            },
         ],
      },
      label: 'Decrease Mod',
      cost: 2,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 2; a Reflexes resistance check halves the cost to 1, and because the aspect has no scaling
      // cost the halved cost is also the step cost.
      name: 'decreaseMod with a resistance check',
      spell: {
         standard: [
            {
               label: 'decreaseMod',
               options: ['armor'],
               resistanceCheck: 'reflexes',
            },
         ],
      },
      label: 'Decrease Mod',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 2 each.
      name: 'increaseMod',
      spell: {
         standard: [
            {
               label: 'increaseMod',
               options: ['damage'],
            },
         ],
      },
      label: 'Increase Mod',
      cost: 2,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // Two options at 1 each.
      name: 'decreaseRating',
      spell: {
         standard: [
            {
               label: 'decreaseRating',
               options: [
                  'accuracy',
                  'defense',
               ],
            },
         ],
      },
      label: 'Decrease Rating',
      cost: 2,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 1.
      name: 'increaseRating',
      spell: {
         standard: [
            {
               label: 'increaseRating',
               options: ['melee'],
            },
         ],
      },
      label: 'Increase Rating',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 1.
      name: 'decreaseResistance',
      spell: {
         standard: [
            {
               label: 'decreaseResistance',
               options: ['reflexes'],
            },
         ],
      },
      label: 'Decrease Resistance',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // Two options at 1 each.
      name: 'increaseResistance',
      spell: {
         standard: [
            {
               label: 'increaseResistance',
               options: [
                  'willpower',
                  'reflexes',
               ],
            },
         ],
      },
      label: 'Increase Resistance',
      cost: 2,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 4.
      name: 'decreaseAttribute',
      spell: {
         standard: [
            {
               label: 'decreaseAttribute',
               options: ['body'],
            },
         ],
      },
      label: 'Decrease Attribute',
      cost: 4,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 4.
      name: 'increaseAttribute',
      spell: {
         standard: [
            {
               label: 'increaseAttribute',
               options: ['mind'],
            },
         ],
      },
      label: 'Increase Attribute',
      cost: 4,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // Three options at 1 each.
      name: 'decreaseSkill',
      spell: {
         standard: [
            {
               label: 'decreaseSkill',
               options: [
                  'arcana',
                  'lore',
                  'nature',
               ],
            },
         ],
      },
      label: 'Decrease Skill',
      cost: 3,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 1.
      name: 'increaseSkill',
      spell: {
         standard: [
            {
               label: 'increaseSkill',
               options: ['stealth'],
            },
         ],
      },
      label: 'Increase Skill',
      cost: 1,
      initial: 1,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 1; the initial value 5 is also the size of a step.
      name: 'decreaseSpeed',
      spell: {
         standard: [
            {
               label: 'decreaseSpeed',
               options: ['stride'],
            },
         ],
      },
      label: 'Decrease Speed',
      cost: 1,
      initial: 5,
      step: 5,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      // One option at 2; the initial value 5 is also the size of a step.
      name: 'increaseSpeed',
      spell: {
         standard: [
            {
               label: 'increaseSpeed',
               options: ['fly'],
            },
         ],
      },
      label: 'Increase Speed',
      cost: 2,
      initial: 5,
      step: 5,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
];

/**
 * The custom aspects, one spell each: other costs, initial values and steps, and every combination of damage and
 * healing.
 * @type {SingleAspectCase[]}
 */
const CUSTOM_CASES = [
   {
      name: 'custom cost 1, initial 2, damage',
      spell: {
         custom: [
            {
               label: 'Spark',
               cost: 1,
               initialValue: 2,
               damage: true,
            },
         ],
      },
      label: 'Spark',
      cost: 1,
      initial: 2,
      step: 2,
      baseDamage: 2,
      baseHealing: 0,
      damage: true,
      healing: false,
   },
   {
      name: 'custom cost 2, initial 3, healing',
      spell: {
         custom: [
            {
               label: 'Mend',
               cost: 2,
               initialValue: 3,
               healing: true,
            },
         ],
      },
      label: 'Mend',
      cost: 2,
      initial: 3,
      step: 3,
      baseDamage: 0,
      baseHealing: 3,
      damage: false,
      healing: true,
   },
   {
      // An initial value of 0 steps by 1.
      name: 'custom cost 3, initial 0, neither',
      spell: {
         custom: [
            {
               label: 'Glow',
               cost: 3,
               initialValue: 0,
            },
         ],
      },
      label: 'Glow',
      cost: 3,
      initial: 0,
      step: 1,
      baseDamage: 0,
      baseHealing: 0,
      damage: false,
      healing: false,
   },
   {
      name: 'custom cost 4, initial 1, damage and healing',
      spell: {
         custom: [
            {
               label: 'Drain',
               cost: 4,
               initialValue: 1,
               damage: true,
               healing: true,
            },
         ],
      },
      label: 'Drain',
      cost: 4,
      initial: 1,
      step: 1,
      baseDamage: 1,
      baseHealing: 1,
      damage: true,
      healing: true,
   },
];

/**
 * Asserts what a single-aspect card and its message show after a number of steps are bought.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @param {string} messageId - The id of the casting message.
 * @param {SingleAspectCase} aspect - The case.
 * @param {number} extra - The extra successes the cast earned.
 * @param {number} steps - The number of steps bought.
 * @returns {Promise<void>} Resolves once the message and the card agree with the hand-worked numbers.
 */
async function expectSingleState(card, messageId, aspect, extra, steps) {
   /** @type {number} The extra successes still unspent. */
   const remaining = extra - (steps * aspect.cost);
   /** @type {number} The aspect's value. */
   const value = aspect.initial + (steps * aspect.step);
   /** @type {number} The damage. */
   const damage = aspect.baseDamage + (aspect.damage ? steps * aspect.step : 0);
   /** @type {number} The healing. */
   const healing = aspect.baseHealing + (aspect.healing ? steps * aspect.step : 0);
   await expect.poll(() => readScaling(gm, messageId), { message: `${steps} steps are stored` }).toEqual({
      values: [value],
      remaining,
      extra,
      damage,
      healing,
   });
   await expect.poll(
      async () => {
         const rows = await readCardRows(card);
         return [
            rows.extra,
            rows.damage,
            rows.healing,
         ];
      },
      { message: `${steps} steps are shown on the card` },
   ).toEqual([
      `Extra Successes: ${remaining}/${extra}`,
      damage ? `Damage: ${damage}` : null,
      healing ? `Healing: ${healing}` : null,
   ]);
   expect(await readAspectBlock(aspectBlock(card, 0)), `the aspect tag after ${steps} steps`).toEqual({
      label: aspect.label,
      value: String(value),
      cost: `${aspect.cost} ES`,
      disabled: {
         reset: steps === 0,
         decrease: steps === 0,
         increase: remaining < aspect.cost,
      },
   });
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(120_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   player = await (await browser.newContext()).newPage();
   await login(player, 'E2E Player 1');
   await setClientSetting(gm, 'getCheckOptions', 'never');
   await setClientSetting(player, 'getCheckOptions', 'never');
   casterId = await createActor(gm, {
      name: 'E2E Spend Caster',
      type: 'player',
   });
   casterUuid = `Actor.${casterId}`;
   await setAttributeBase(gm, casterUuid, 'mind', 12);
   await setOwnership(gm, casterId, 'E2E Player 1', 'OWNER');
   await player.waitForFunction(
      (id) => game.actors.get(id)?.testUserPermission(game.user, 'OWNER'),
      casterId,
      { timeout: 1000 },
   );
   await closeAllApps(gm);
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
   await gm?.close();
});

test.describe('a single scaling aspect', () => {
   for (const aspect of [
      ...STANDARD_CASES,
      ...CUSTOM_CASES,
   ]) {
      test(`${aspect.name}: the roll buys the affordable steps and the card refunds and spends them exactly`,
         async () => {
            test.setTimeout(150_000);

            /** @type {{extra: number, steps: number}} The extra successes earned and the steps the roll buys. */
            const earned = SINGLE_EARNED[aspect.cost];
            /** @type {{id: string, uuid: string}} The spell, built with the sheet's controls. */
            const spell = await buildSpell(gm, casterId, `E2E Spend ${aspect.name}`, aspect.spell);

            // Complexity 1: one success is needed, the rest are extra.
            const cast = await castWith(spell.uuid, 1 + earned.extra);
            expect(cast.parameters.complexity, 'the spell costs 5 or less, so Complexity is 1').toBe(1);
            expect(cast.results.extraSuccesses, 'the extra successes beyond Complexity 1').toBe(earned.extra);
            expect(cast.results.scalingAspect.length, 'one scaling aspect').toBe(1);
            await expectSingleState(cast.card, cast.id, aspect, earned.extra, earned.steps);

            // One step refunded, then bought again.
            await aspectControl(aspectBlock(cast.card, 0), 'decrease').click();
            await expectSingleState(cast.card, cast.id, aspect, earned.extra, earned.steps - 1);
            await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
            await expectSingleState(cast.card, cast.id, aspect, earned.extra, earned.steps);

            // Reset refunds every step; the aspect is back at its initial value with nothing to decrease.
            await aspectControl(aspectBlock(cast.card, 0), 'reset').click();
            await expectSingleState(cast.card, cast.id, aspect, earned.extra, 0);

            // Buying step by step reaches the state the roll bought, and the control then blocks.
            for (let steps = 1; steps <= earned.steps; steps++) {
               await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
               await expectSingleState(cast.card, cast.id, aspect, earned.extra, steps);
            }
            await expect(aspectControl(aspectBlock(cast.card, 0), 'increase'), 'Increase is blocked when short')
               .toBeDisabled();

            // A round trip of every step down and up again returns exactly what was spent.
            for (let steps = earned.steps - 1; steps >= 0; steps--) {
               await aspectControl(aspectBlock(cast.card, 0), 'decrease').click();
               await expectSingleState(cast.card, cast.id, aspect, earned.extra, steps);
            }
            await expect(aspectControl(aspectBlock(cast.card, 0), 'decrease'), 'Decrease stops at the initial value')
               .toBeDisabled();
            for (let steps = 1; steps <= earned.steps; steps++) {
               await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
            }
            await expectSingleState(cast.card, cast.id, aspect, earned.extra, earned.steps);
         });
   }
});

/**
 * The spell with three custom scaling aspects of different costs: A costs 1, starts at 2 and deals damage (steps of 2);
 * B costs 2, starts at 3 and heals (steps of 3); C costs 3 and starts at 1 (steps of 1). The total cost is 6, which is
 * Difficulty 5 and Complexity 2. Nine successes leave 7 extra successes, and all three aspects are affordable, so the
 * roll buys nothing.
 * @type {object}
 */
const MIXED_SPELL = {
   custom: [
      {
         label: 'Aspect A',
         cost: 1,
         initialValue: 2,
         damage: true,
      },
      {
         label: 'Aspect B',
         cost: 2,
         initialValue: 3,
         healing: true,
      },
      {
         label: 'Aspect C',
         cost: 3,
         initialValue: 1,
      },
   ],
};

/** @type {number[]} The step costs of the mixed spell's aspects, in order. */
const MIXED_COSTS = [
   1,
   2,
   3,
];

/** @type {number[]} The initial values of the mixed spell's aspects, in order. */
const MIXED_INITIAL = [
   2,
   3,
   1,
];

/**
 * @typedef {object} MixedState
 * @property {number[]} values - The current value of each aspect.
 * @property {number} remaining - The extra successes unspent.
 * @property {number} damage - The damage.
 * @property {number} healing - The healing.
 */

/**
 * Asserts the stored state and the card of the mixed spell against a hand-worked state of seven extra successes.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @param {string} messageId - The id of the casting message.
 * @param {MixedState} state - The state that is expected.
 * @param {import('@playwright/test').Page} [on] - The client that reads the stored message.
 * @returns {Promise<void>} Resolves once the message and the card show the state.
 */
async function expectMixedState(card, messageId, state, on = gm) {
   await expect.poll(() => readScaling(on, messageId), { message: 'the stored scaling state' }).toEqual({
      values: state.values,
      remaining: state.remaining,
      extra: 7,
      damage: state.damage,
      healing: state.healing,
   });
   await expect.poll(
      async () => {
         const rows = await readCardRows(card);
         return [
            rows.extra,
            rows.damage,
            rows.healing,
         ];
      },
      { message: 'the card rows' },
   ).toEqual([
      `Extra Successes: ${state.remaining}/7`,
      `Damage: ${state.damage}`,
      `Healing: ${state.healing}`,
   ]);
   for (const [index, label] of [
      'Aspect A',
      'Aspect B',
      'Aspect C',
   ].entries()) {
      expect(await readAspectBlock(aspectBlock(card, index)), `${label} tag`).toEqual({
         label,
         value: String(state.values[index]),
         cost: `${MIXED_COSTS[index]} ES`,
         disabled: {
            reset: state.values[index] === MIXED_INITIAL[index],
            decrease: state.values[index] === MIXED_INITIAL[index],
            increase: state.remaining < MIXED_COSTS[index],
         },
      });
   }
}

test.describe('aspects of different costs on one spell', () => {
   /** @type {{id: string, uuid: string}} The mixed spell. */
   let mixed;

   test.beforeAll(async () => {
      test.setTimeout(120_000);
      mixed = await buildSpell(gm, casterId, 'E2E Spend Mixed', MIXED_SPELL);
      await closeAllApps(gm);
   });

   test('manual spends in any order, refunds, blocked buttons, floors and resets keep the books exact', async () => {
      test.setTimeout(120_000);

      // Hand-worked steps: each is the control to click and the state it leaves. A step is 2 for A, 3 for B and 1
      // for C.
      /** @type {{click: [string, number]|null, state: MixedState}[]} The steps. */
      const steps = [
         {
            click: null,
            state: {
               values: [
                  2,
                  3,
                  1,
               ],
               remaining: 7,
               damage: 2,
               healing: 3,
            },
         },
         {
            click: [
               'increase',
               0,
            ],
            state: {
               values: [
                  4,
                  3,
                  1,
               ],
               remaining: 6,
               damage: 4,
               healing: 3,
            },
         },
         {
            click: [
               'increase',
               1,
            ],
            state: {
               values: [
                  4,
                  6,
                  1,
               ],
               remaining: 4,
               damage: 4,
               healing: 6,
            },
         },
         {
            click: [
               'increase',
               1,
            ],
            state: {
               values: [
                  4,
                  9,
                  1,
               ],
               remaining: 2,
               damage: 4,
               healing: 9,
            },
         },
         {
            click: [
               'increase',
               0,
            ],
            state: {
               values: [
                  6,
                  9,
                  1,
               ],
               remaining: 1,
               damage: 6,
               healing: 9,
            },
         },
         {
            click: [
               'increase',
               0,
            ],
            state: {
               values: [
                  8,
                  9,
                  1,
               ],
               remaining: 0,
               damage: 8,
               healing: 9,
            },
         },
         {
            click: [
               'decrease',
               1,
            ],
            state: {
               values: [
                  8,
                  6,
                  1,
               ],
               remaining: 2,
               damage: 8,
               healing: 6,
            },
         },
         {
            click: [
               'decrease',
               0,
            ],
            state: {
               values: [
                  6,
                  6,
                  1,
               ],
               remaining: 3,
               damage: 6,
               healing: 6,
            },
         },
         {
            click: [
               'increase',
               2,
            ],
            state: {
               values: [
                  6,
                  6,
                  2,
               ],
               remaining: 0,
               damage: 6,
               healing: 6,
            },
         },
         {
            click: [
               'reset',
               1,
            ],
            state: {
               values: [
                  6,
                  3,
                  2,
               ],
               remaining: 2,
               damage: 6,
               healing: 3,
            },
         },
         {
            click: [
               'reset',
               0,
            ],
            state: {
               values: [
                  2,
                  3,
                  2,
               ],
               remaining: 4,
               damage: 2,
               healing: 3,
            },
         },
         {
            click: [
               'reset',
               2,
            ],
            state: {
               values: [
                  2,
                  3,
                  1,
               ],
               remaining: 7,
               damage: 2,
               healing: 3,
            },
         },
      ];

      const cast = await castWith(mixed.uuid, 9);
      expect(cast.parameters.difficulty, 'total cost 6').toBe(5);
      expect(cast.parameters.complexity, 'total cost 6').toBe(2);
      expect(cast.results.extraSuccesses, 'nine successes against Complexity 2').toBe(7);
      for (const step of steps) {
         if (step.click) {
            await aspectControl(aspectBlock(cast.card, step.click[1]), step.click[0]).click();
         }
         await expectMixedState(cast.card, cast.id, step.state);
      }
   });

   test('Increase of a dearer aspect stays blocked until a refund pays for it', async () => {
      const cast = await castWith(mixed.uuid, 9);

      // B costs 2: three steps cost 6 of the 7, leaving 1, which pays for neither B (2) nor C (3) but for A (1).
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await expectMixedState(cast.card, cast.id, {
         values: [
            2,
            12,
            1,
         ],
         remaining: 1,
         damage: 2,
         healing: 12,
      });
      await expect(aspectControl(aspectBlock(cast.card, 1), 'increase'), 'B costs 2 and 1 remains').toBeDisabled();
      await expect(aspectControl(aspectBlock(cast.card, 2), 'increase'), 'C costs 3 and 1 remains').toBeDisabled();
      await expect(aspectControl(aspectBlock(cast.card, 0), 'increase'), 'A costs 1 and 1 remains').toBeEnabled();

      // Refunding B once pays 2: 3 remain, so C is enabled again.
      await aspectControl(aspectBlock(cast.card, 1), 'decrease').click();
      await expectMixedState(cast.card, cast.id, {
         values: [
            2,
            9,
            1,
         ],
         remaining: 3,
         damage: 2,
         healing: 9,
      });
      await expect(aspectControl(aspectBlock(cast.card, 2), 'increase'), 'C costs 3 and 3 remain').toBeEnabled();
   });
});

/**
 * The spell with a cheap and a dear custom aspect: X costs 1, starts at 2 and deals damage (steps of 2); Y costs 3,
 * starts at 1 and heals. The total cost is 4, which is Difficulty 4 and Complexity 1.
 * @type {object}
 */
const PAIR_SPELL = {
   custom: [
      {
         label: 'Aspect X',
         cost: 1,
         initialValue: 2,
         damage: true,
      },
      {
         label: 'Aspect Y',
         cost: 3,
         initialValue: 1,
         healing: true,
      },
   ],
};

test.describe('the roll buys steps only when exactly one aspect is affordable', () => {
   /** @type {{id: string, uuid: string}} The pair spell. */
   let pair;

   test.beforeAll(async () => {
      test.setTimeout(120_000);
      pair = await buildSpell(gm, casterId, 'E2E Spend Pair', PAIR_SPELL);
      await closeAllApps(gm);
   });

   test('two extra successes afford only X, so the roll buys two steps of X', async () => {
      // Three successes against Complexity 1 leave 2 extra successes: X (cost 1) is affordable, Y (cost 3) is not.
      const cast = await castWith(pair.uuid, 3);
      expect(cast.results.extraSuccesses).toBe(2);
      expect(cast.results.scalingAspect.map((aspect) => aspect.currentValue), 'X +4, Y unchanged').toEqual([
         6,
         1,
      ]);
      expect(cast.results.extraSuccessesRemaining, 'both extra successes were spent').toBe(0);
      expect(cast.results.damage, 'damage 2 + 2 steps of 2').toBe(6);
      expect(cast.results.healing, 'healing is still Y\'s 1').toBe(1);
      expect((await readCardRows(cast.card)).extra).toBe('Extra Successes: 0/2');
      await expect(aspectControl(aspectBlock(cast.card, 1), 'increase'), 'Y costs 3').toBeDisabled();
   });

   test('three extra successes afford both, so the roll buys nothing', async () => {
      // Four successes leave 3 extra successes: X (cost 1) and Y (cost 3) are both affordable.
      const cast = await castWith(pair.uuid, 4);
      expect(cast.results.extraSuccesses).toBe(3);
      expect(cast.results.scalingAspect.map((aspect) => aspect.currentValue), 'neither aspect moved').toEqual([
         2,
         1,
      ]);
      expect(cast.results.extraSuccessesRemaining).toBe(3);
      expect(cast.results.damage).toBe(2);
      expect(cast.results.healing).toBe(1);
      expect((await readCardRows(cast.card)).extra).toBe('Extra Successes: 3/3');

      // Buying Y by hand takes all three.
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await expect.poll(() => readScaling(gm, cast.id)).toEqual({
         values: [
            2,
            2,
         ],
         remaining: 0,
         extra: 3,
         damage: 2,
         healing: 2,
      });
   });

   test('no extra success leaves the aspects at their initial values and the card without controls', async () => {
      // One success against Complexity 1 is a success with no extra success.
      const cast = await castWith(pair.uuid, 1);
      expect(cast.results.succeeded).toBe(true);
      expect(cast.results.extraSuccesses).toBe(0);
      expect(cast.results.scalingAspect.map((aspect) => aspect.currentValue), 'initial values').toEqual([
         2,
         1,
      ]);
      expect(cast.results.damage).toBe(2);
      expect(cast.results.healing).toBe(1);
      expect((await readCardRows(cast.card)).extra).toBe('Extra Successes: 0/0');
      await expect(cast.card.locator('.aspects'), 'a card with no extra success offers no controls').toHaveCount(0);
   });
});

test.describe('the owner of the speaker uses the card controls on a player client', () => {
   /** @type {{id: string, uuid: string}} The mixed spell, cast by the player. */
   let mixed;

   test.beforeAll(async () => {
      test.setTimeout(120_000);
      mixed = await buildSpell(gm, casterId, 'E2E Spend Owner Mixed', MIXED_SPELL);
      await closeAllApps(gm);
   });

   test('the player casts from the character sheet and spends and refunds on the player\'s own card', async () => {
      await forceDice(player, facesWith(9));

      /** @type {{id: string, parameters: object, results: object}} The cast, made on the player's client. */
      const message = await castFromCharacterSheet(player, casterUuid, mixed.id);
      await resetDice(player);
      await closeAllApps(player);
      expect(message.results.extraSuccessesRemaining, 'three aspects are affordable').toBe(7);

      /** @type {import('@playwright/test').Locator} The card in the player's chat log. */
      const card = await openCard(player, message.id);
      await aspectControl(aspectBlock(card, 1), 'increase').click();

      /** @type {MixedState} The state after one step of B. */
      const afterSpend = {
         values: [
            2,
            6,
            1,
         ],
         remaining: 5,
         damage: 2,
         healing: 6,
      };
      await expectMixedState(card, message.id, afterSpend, gm);
      await expectMixedState(card, message.id, afterSpend, player);
      await aspectControl(aspectBlock(card, 1), 'decrease').click();
      await expectMixedState(card, message.id, {
         values: [
            2,
            3,
            1,
         ],
         remaining: 7,
         damage: 2,
         healing: 3,
      }, gm);

      // The same card in the GM's chat log follows the player's edits.
      const gmCard = await openCard(gm, message.id);
      await aspectControl(aspectBlock(card, 2), 'increase').click();
      await expect.poll(
         async () => (await readAspectBlock(aspectBlock(gmCard, 2))).value,
         { message: 'the GM\'s card follows the player\'s spend' },
      ).toBe('2');
      expect((await readCardRows(gmCard)).extra, 'the GM\'s card shows the remaining extra successes')
         .toBe('Extra Successes: 4/7');
   });

   test('the player spends on a card that the GM cast for the player\'s character', async () => {
      const cast = await castWith(mixed.uuid, 9);

      // The GM's card is the same message in the player's chat log.
      const playerCard = await openCard(player, cast.id);
      await aspectControl(aspectBlock(playerCard, 0), 'increase').click();
      await expectMixedState(cast.card, cast.id, {
         values: [
            4,
            3,
            1,
         ],
         remaining: 6,
         damage: 4,
         healing: 3,
      });
   });
});

test.describe('aspects that a step cannot buy', () => {
   test('an aspect that is not enabled does not scale and does not count as affordable', async () => {
      // Decrease Mod is switched on with no option chosen, which the spell stores as disabled with a cost of 0.
      const spell = await buildSpell(gm, casterId, 'E2E Spend Disabled', {
         standard: [
            { label: 'damage' },
            { label: 'decreaseMod' },
         ],
      });

      // Six successes against Complexity 1 leave 5 extra successes: the damage aspect (cost 1) is the only affordable
      // one.
      const cast = await castWith(spell.uuid, 6);
      expect(cast.results.scalingAspect.map((aspect) => aspect.label), 'only Damage scales').toEqual(['Damage']);
      expect(cast.results.damage, 'damage 1 + 5 steps').toBe(6);
      expect(cast.results.extraSuccessesRemaining, 'every extra success was spent').toBe(0);
      await expect(cast.card.locator('.aspects > .aspect'), 'the card lists one aspect').toHaveCount(1);
   });

   test('an aspect that is not enabled adds no Resist button, while an enabled one with the same resistance does',
      async () => {
         // Decrease Mod with Reflexes chosen but no option is stored disabled; Damage with Reflexes is enabled.
         const disabled = await buildSpell(gm, casterId, 'E2E Spend Disabled Resisted', {
            standard: [
               { label: 'damage' },
               {
                  label: 'decreaseMod',
                  resistanceCheck: 'reflexes',
               },
            ],
         });
         const enabled = await buildSpell(gm, casterId, 'E2E Spend Enabled Resisted', {
            standard: [
               {
                  label: 'damage',
                  resistanceCheck: 'reflexes',
               },
            ],
         });

         // An enabled resisted aspect shows the Reflexes button; four successes leave 3 extra successes.
         const withResistance = await castWith(enabled.uuid, 4);
         expect(withResistance.parameters.reflexesCheck, 'an enabled resisted aspect needs Reflexes').toBe(true);
         await expect(withResistance.card.locator('.buttons > .button'), 'one Resist button').toHaveCount(1);

         // The disabled aspect with the same resistance adds none.
         const without = await castWith(disabled.uuid, 4);
         expect(without.parameters.reflexesCheck, 'a disabled aspect needs no Reflexes').toBe(false);
         await expect(without.card.locator('.buttons > .button'), 'no Resist button').toHaveCount(0);
      });

   test('a custom aspect that costs nothing cannot be bought with extra successes', async () => {
      // A free scaling aspect has no price to pay a step with; its damage still counts.
      const spell = await buildSpell(gm, casterId, 'E2E Spend Free', {
         custom: [
            {
               label: 'Free',
               cost: 0,
               initialValue: 2,
               damage: true,
            },
         ],
      });
      const cast = await castWith(spell.uuid, 4);
      expect(cast.results.extraSuccesses, 'four successes against Complexity 1').toBe(3);
      expect(cast.results.scalingAspect, 'a free aspect does not scale').toEqual([]);
      expect(cast.results.damage, 'the free aspect still deals its 2').toBe(2);
      expect(cast.results.extraSuccessesRemaining, 'nothing was spent').toBe(3);
      expect((await readCardRows(cast.card)).damage).toBe('Damage: 2');
   });
});

test('a relayed change to a card is written only while the sender owns the speaking character', async () => {
   test.setTimeout(120_000);

   /** @type {string} The id of a character that nobody owns yet. */
   const strangerId = await createActor(gm, {
      name: 'E2E Spend Stranger',
      type: 'player',
   });
   await setAttributeBase(gm, `Actor.${strangerId}`, 'mind', 12);

   /** @type {{id: string, uuid: string}} The stranger's spell. */
   const spell = await buildSpell(gm, strangerId, 'E2E Spend Stranger Spell', PAIR_SPELL);
   const cast = await castWith(spell.uuid, 4);
   expect(cast.results.extraSuccessesRemaining, 'three extra successes, none bought').toBe(3);

   /**
    * Asks for the remaining extra successes of the card to be changed, the way a card control's write is relayed.
    * @param {number} remaining - The value to ask for.
    * @returns {Promise<void>} Resolves once the request is sent.
    */
   const requestRemaining = (remaining) => player.evaluate(
      ({ id, remaining }) => game.titan.socketManager.triggerSocketHook(
         'relayChatMessageUpdate',
         game.user.id,
         id,
         { system: { results: { extraSuccessesRemaining: remaining } } },
      ),
      {
         id: cast.id,
         remaining,
      },
   );

   // With ownership the GM's client writes the change.
   await setOwnership(gm, strangerId, 'E2E Player 1', 'OWNER');
   await requestRemaining(2);
   await expect.poll(() => readScaling(gm, cast.id), { message: 'the owner\'s request was written' })
      .toMatchObject({ remaining: 2 });

   // Without ownership the same request changes nothing.
   await setOwnership(gm, strangerId, 'E2E Player 1', 'NONE');
   await requestRemaining(1);
   await expect(
      gm.locator('#notifications .notification', { hasText: 'A chat message change was refused' }).first(),
      'the refusal reaches the GM client',
   ).toBeVisible();
   expect((await readScaling(gm, cast.id)).remaining, 'the request of a non-owner was refused').toBe(2);
});
