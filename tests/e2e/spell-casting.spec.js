import { expect, flushPageErrors, test } from './harness.js';
import {
   clickRoll,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setCheckbox,
   setNumberField,
} from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import {
   createActor,
   placeToken,
   setAttributeBase,
   setOwnership,
   setResource,
   setSkillTraining,
   shared,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { settle } from './settle.js';
import {
   aspectBlock,
   buildSpell,
   castFromCharacterSheet,
   castFromHud,
   castFromSpellSheet,
   openCard,
   readAspectBlock,
   readCardDice,
   readCardRows,
} from './spellCasting.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Casting a spell through the entry points a user has: the spell sheet's roll button, the character sheet's spell row,
 * the Player HUD's Spells category and a player's own client. The expected numbers are worked out by hand from the
 * aspect costs of the spell (`SpellAspects.js`) and the rules text: the total aspect cost is the sum of the enabled
 * standard aspects' costs and the custom aspects' costs; a total of 5 or less is Difficulty 4 (5 when the total is 5)
 * and Complexity 1, and a larger total is Difficulty 5 and Complexity total - 4. Every die the roll uses is forced.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who builds the documents. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who owns the caster. */
let player;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {string} The id of the caster, who has Mind 7. */
let casterId;
/** @type {string} The uuid of the caster. */
let casterUuid;
/** @type {string} The id of the id of the caster's token on the shared scene. */
let casterTokenId;
/** @type {{id: string, uuid: string}} The spell with range 10, minutes of duration, Ignore Armor damage and healing. */
let multi;

/**
 * The faces the multi-aspect cast rolls: seven dice against Difficulty 5, of which six succeed (two 6s and four 5s).
 * @type {number[]}
 */
const MULTI_FACES = [
   6,
   6,
   5,
   5,
   5,
   5,
   3,
];

/**
 * Asserts a casting message and its card against the numbers worked out by hand for the multi-aspect spell: range 10
 * costs 2, minutes of duration cost 4, damage with Ignore Armor costs 2 (1 for damage and 1 for the option) and healing
 * costs 1, so the total cost is 9, which makes Difficulty 5 and Complexity 9 - 4 = 5. Seven dice with six successes
 * leave one extra success, which three affordable scaling aspects (cost 1 each) leave unspent.
 * @param {import('@playwright/test').Page} on - The client whose chat log shows the card.
 * @param {{id: string, parameters: object, results: object}} message - The posted casting check.
 * @returns {Promise<void>} Resolves once every assertion has run.
 */
async function expectMultiCard(on, message) {
   const { parameters, results } = message;
   expect(parameters.attribute, 'attribute').toBe('mind');
   expect(parameters.skill, 'skill').toBe('arcana');
   expect(parameters.totalDice, 'seven dice: Mind 7 and no Training').toBe(7);
   expect(parameters.difficulty, 'difficulty from a total cost of 9').toBe(5);
   expect(parameters.complexity, 'complexity from a total cost of 9').toBe(5);
   expect(parameters.damage, 'the damage aspect starts at 1').toBe(1);
   expect(parameters.healing, 'the healing aspect starts at 1').toBe(1);
   expect(results.dice.map((die) => die.final), 'the forced dice').toEqual(MULTI_FACES);
   expect(results.successes, 'two 6s and four 5s').toBe(6);
   expect(results.succeeded, 'six successes meet Complexity 5').toBe(true);
   expect(results.extraSuccesses, 'one extra success').toBe(1);
   expect(results.extraSuccessesRemaining, 'three aspects are affordable, so none is bought for the caster').toBe(1);
   expect(results.damage, 'damage is the base 1').toBe(1);
   expect(results.healing, 'healing is the base 1').toBe(1);
   expect(
      results.scalingAspect.map((aspect) => [
         aspect.label,
         aspect.cost,
         aspect.initialValue,
         aspect.currentValue,
      ]),
      'the scaling aspects: Minutes, Damage, Healing, each at its initial value',
   ).toEqual([
      [
         'Minutes',
         1,
         1,
         1,
      ],
      [
         'Damage',
         1,
         1,
         1,
      ],
      [
         'Healing',
         1,
         1,
         1,
      ],
   ]);

   /** @type {import('@playwright/test').Locator} The card in the client's chat log. */
   const card = await openCard(on, message.id);
   expect(await readCardRows(card), 'the card\'s result rows').toEqual({
      dc: 'DC 5:5',
      successes: '6 Successes',
      outcome: 'Succeeded',
      extra: 'Extra Successes: 1/1',
      damage: 'Damage: 1',
      healing: 'Healing: 1',
   });
   expect(await readCardDice(card), 'the dice on the card').toEqual(MULTI_FACES.map(String));
   await expect(card.locator('.label').first(), 'the card names the spell').toContainText('E2E Cast Multi');
   await expect(card.locator('.sub-label').first(), 'the card names the attribute and skill')
      .toContainText('Mind (Arcana)');
   for (const [index, label] of [
      'Minutes',
      'Damage',
      'Healing',
   ].entries()) {
      expect(await readAspectBlock(aspectBlock(card, index)), `the ${label} aspect tag`).toEqual({
         label,
         value: '1',
         cost: '1 ES',
         disabled: {
            reset: true,
            decrease: true,
            increase: false,
         },
      });
   }
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(240_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   player = await (await browser.newContext()).newPage();
   await login(player, 'E2E Player 1');
   await setClientSetting(gm, 'getCheckOptions', 'never');
   await setClientSetting(player, 'getCheckOptions', 'never');

   casterId = await createActor(gm, {
      name: 'E2E Cast Caster',
      type: 'player',
   });
   casterUuid = `Actor.${casterId}`;
   await setAttributeBase(gm, casterUuid, 'mind', 7);
   await setOwnership(gm, casterId, 'E2E Player 1', 'OWNER');
   await player.waitForFunction(
      (id) => game.actors.get(id)?.testUserPermission(game.user, 'OWNER'),
      casterId,
      { timeout: 1000 },
   );
   await viewScene(gm, await shared(gm, 'scene'));
   casterTokenId = await placeToken(gm, casterId);
   multi = await buildSpell(gm, casterId, 'E2E Cast Multi', {
      standard: [
         {
            label: 'range',
            initialValue: 10,
         },
         {
            label: 'duration',
            unit: 'minutes',
         },
         {
            label: 'damage',
            options: ['ignoreArmor'],
         },
         { label: 'healing' },
      ],
   });
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

test.describe('the three entry points give the same card', () => {
   test('the roll button of the spell sheet', async () => {
      await forceDice(gm, MULTI_FACES);
      await expectMultiCard(gm, await castFromSpellSheet(gm, multi.uuid));
   });

   test('the casting button of the character sheet\'s spell row', async () => {
      await forceDice(gm, MULTI_FACES);
      await expectMultiCard(gm, await castFromCharacterSheet(gm, casterUuid, multi.id));
   });

   test('the Spells category of the Player HUD', async () => {
      await forceDice(gm, MULTI_FACES);
      await expectMultiCard(gm, await castFromHud(gm, casterTokenId, multi.id));
   });

   test('the owner player casts from the character sheet on the player\'s own client', async () => {
      await forceDice(player, MULTI_FACES);
      await expectMultiCard(player, await castFromCharacterSheet(player, casterUuid, multi.id));
   });
});

test.describe('failed casts', () => {
   test('no success at all fails and applies nothing', async () => {
      await forceDice(gm, [
         2,
         2,
         2,
         2,
         2,
         2,
         2,
      ]);
      /** @type {{id: string, parameters: object, results: object}} The failed cast. */
      const message = await castFromSpellSheet(gm, multi.uuid);
      expect(message.results.successes, 'no die reaches Difficulty 5').toBe(0);
      expect(message.results.succeeded, 'zero successes fail Complexity 5').toBe(false);
      expect(message.results.extraSuccesses).toBe(0);
      expect(message.results.damage, 'a failed cast inflicts no damage').toBe(0);
      expect(message.results.healing, 'a failed cast heals nothing').toBe(0);
      expect(message.results.scalingAspect, 'a failed cast has no scaling aspects').toEqual([]);

      /** @type {import('@playwright/test').Locator} The card in the chat log. */
      const card = await openCard(gm, message.id);
      expect(await readCardRows(card)).toEqual({
         dc: 'DC 5:5',
         successes: '0 Successes',
         outcome: 'Failed',
         extra: null,
         damage: null,
         healing: null,
      });
      await expect(card.locator('.aspects'), 'no scaling aspect shows').toHaveCount(0);
      await expect(card.locator('.damage-buttons'), 'no damage button shows').toHaveCount(0);
   });

   test('four successes fall one short of Complexity 5 and fail with their successes counted', async () => {
      await forceDice(gm, [
         6,
         5,
         5,
         5,
         3,
         3,
         3,
      ]);
      /** @type {{id: string, parameters: object, results: object}} The failed cast. */
      const message = await castFromSpellSheet(gm, multi.uuid);
      expect(message.results.successes, 'a 6 and three 5s').toBe(4);
      expect(message.results.succeeded, 'four successes fail Complexity 5').toBe(false);
      expect(message.results.damage).toBe(0);
      expect(message.results.scalingAspect).toEqual([]);

      /** @type {import('@playwright/test').Locator} The card in the chat log. */
      const card = await openCard(gm, message.id);
      expect((await readCardRows(card)).successes).toBe('4 Successes');
      expect((await readCardRows(card)).outcome).toBe('Failed');
   });
});

/**
 * Spells whose aspects make a total cost that the hand calculation turns into a Difficulty and Complexity. Seven forced
 * 6s are seven successes. Damage is the aspect's initial 1 plus one for every extra success when the damage aspect is
 * the only affordable scaling aspect (it costs 1 per step and every extra success buys a step).
 * @type {{name: string, standard: object[], total: number, difficulty: number, complexity: number, damage: number,
 * healing: number, scaling: string[], reflexes: boolean, resilience: boolean}[]}
 */
const COST_CASES = [
   {
      name: 'touch range and damage',
      standard: [
         {
            label: 'range',
            initialValue: 'touch',
         },
         { label: 'damage' },
      ],
      // Touch costs 1 and damage costs 1.
      total: 2,
      difficulty: 4,
      complexity: 1,
      damage: 7,
      healing: 0,
      scaling: ['Damage'],
      reflexes: false,
      resilience: false,
   },
   {
      name: 'range 30 and radius 5',
      standard: [
         {
            label: 'range',
            initialValue: 30,
         },
         {
            label: 'radius',
            initialValue: 5,
         },
      ],
      // Range 30 costs 3 and radius 5 costs 3.
      total: 6,
      difficulty: 5,
      complexity: 2,
      damage: 0,
      healing: 0,
      scaling: [],
      reflexes: false,
      resilience: false,
   },
   {
      name: 'radius 10 alone',
      standard: [
         {
            label: 'radius',
            initialValue: 10,
         },
      ],
      // Radius 10 costs 5, which is the largest total that keeps Complexity 1.
      total: 5,
      difficulty: 5,
      complexity: 1,
      damage: 0,
      healing: 0,
      scaling: [],
      reflexes: false,
      resilience: false,
   },
   {
      name: 'range 50, radius 10, rounds of duration and healing',
      standard: [
         {
            label: 'range',
            initialValue: 50,
         },
         {
            label: 'radius',
            initialValue: 10,
         },
         { label: 'duration' },
         { label: 'healing' },
      ],
      // Range 50 costs 4, radius 10 costs 5, rounds of duration cost 1 and healing costs 1.
      total: 11,
      difficulty: 5,
      complexity: 7,
      damage: 0,
      healing: 1,
      scaling: [
         'Rounds',
         'Healing',
      ],
      reflexes: false,
      resilience: false,
   },
   {
      name: 'resisted damage and a resisted Stunned',
      standard: [
         {
            label: 'damage',
            options: ['ignoreArmor'],
            resistanceCheck: 'reflexes',
         },
         {
            label: 'inflictCondition',
            options: ['stunned'],
            resistanceCheck: 'resilience',
         },
      ],
      // Damage with Ignore Armor costs 2, which a resistance halves to 1; Stunned costs 4, which a resistance halves to
      // 2.
      total: 3,
      difficulty: 4,
      complexity: 1,
      damage: 7,
      healing: 0,
      scaling: ['Damage'],
      reflexes: true,
      resilience: true,
   },
   {
      name: 'Stunned inflicted and Prone removed',
      standard: [
         {
            label: 'inflictCondition',
            options: ['stunned'],
         },
         {
            label: 'removeCondition',
            options: ['prone'],
         },
      ],
      // Stunned costs 4 and removing Prone costs 2.
      total: 6,
      difficulty: 5,
      complexity: 2,
      damage: 0,
      healing: 0,
      scaling: [],
      reflexes: false,
      resilience: false,
   },
];

test.describe('Difficulty and Complexity follow the aspect costs', () => {
   for (const costCase of COST_CASES) {
      test(`${costCase.name}: total cost ${costCase.total}`, async () => {
         test.setTimeout(120_000);

         /** @type {{id: string, uuid: string}} The spell, built with the sheet's controls. */
         const spell = await buildSpell(gm, casterId, `E2E Cast ${costCase.name}`, { standard: costCase.standard });
         await closeAllApps(gm);

         // Seven 6s are seven successes.
         await forceDice(gm, [
            6,
            6,
            6,
            6,
            6,
            6,
            6,
         ]);
         /** @type {{id: string, parameters: object, results: object}} The cast. */
         const message = await castFromSpellSheet(gm, spell.uuid);
         expect(message.parameters.difficulty, 'difficulty').toBe(costCase.difficulty);
         expect(message.parameters.complexity, 'complexity').toBe(costCase.complexity);
         expect(message.results.successes, 'seven 6s').toBe(7);
         expect(message.results.extraSuccesses, 'successes beyond the complexity').toBe(7 - costCase.complexity);
         expect(message.results.damage, 'damage').toBe(costCase.damage);
         expect(message.results.healing, 'healing').toBe(costCase.healing);
         expect(message.results.scalingAspect.map((aspect) => aspect.label), 'scaling aspects')
            .toEqual(costCase.scaling);
         expect(message.parameters.reflexesCheck, 'Reflexes resists').toBe(costCase.reflexes);
         expect(message.parameters.resilienceCheck, 'Resilience resists').toBe(costCase.resilience);

         /** @type {import('@playwright/test').Locator} The card in the chat log. */
         const card = await openCard(gm, message.id);
         expect((await readCardRows(card)).dc).toBe(`DC ${costCase.difficulty}:${costCase.complexity}`);
      });
   }
});

test.describe('Resolve spent by a cast', () => {
   /** @type {string} The uuid of the caster with Arcana Training 2. */
   let trainedUuid;
   /** @type {{id: string, uuid: string}} The trained caster's spell. */
   let spark;

   test.beforeAll(async () => {
      test.setTimeout(120_000);

      /** @type {string} The id of the caster. */
      const trainedId = await createActor(gm, {
         name: 'E2E Cast Trained Caster',
         type: 'player',
      });
      trainedUuid = `Actor.${trainedId}`;
      await setAttributeBase(gm, trainedUuid, 'mind', 3);

      // Soul 6 gives a maximum Resolve of ceil(6 * 0.5) = 3, the default multiplier of the Resolve setting.
      await setAttributeBase(gm, trainedUuid, 'soul', 6);
      await setSkillTraining(gm, trainedUuid, 'arcana', 2);
      spark = await buildSpell(gm, trainedId, 'E2E Cast Spark', { standard: [{ label: 'damage' }] });
      await setResource(gm, trainedUuid, 'resolve', 3);
      await closeAllApps(gm);
   });

   /**
    * Reads the trained caster's Resolve.
    * @returns {Promise<number>} The current Resolve.
    */
   function readResolve() {
      return gm.evaluate((uuid) => fromUuid(uuid).then((actor) => actor.system.resource.resolve.value), trainedUuid);
   }

   test.beforeEach(async () => {
      await setResource(gm, trainedUuid, 'resolve', 3);
      await closeAllApps(gm);
   });

   test.afterEach(async () => {
      await setClientSetting(gm, 'getCheckOptions', 'never');
      await setClientSetting(gm, 'autoSpendResolveDoubleTraining', true);
      await setClientSetting(gm, 'autoSpendResolveDoubleExpertise', true);
   });

   test('doubling Training and Expertise spends one Resolve each and doubles what they add', async () => {
      await setClientSetting(gm, 'getCheckOptions', 'always');
      /** @type {number} The Resolve before the cast. */
      const before = await readResolve();
      expect(before, 'the caster starts with 3 Resolve').toBe(3);

      /** @type {import('@playwright/test').Locator} The casting dialog. */
      const dialog = await openCheckDialog(gm, 'casting', spark.uuid);

      // Mind 3 and Arcana Training 2 are 5 dice; doubled Training is 3 + 4 = 7 dice; one Expertise point doubles to 2.
      expect(await readSummary(dialog, 'totalDice'), 'Mind 3 and Training 2').toBe(5);
      await setCheckbox(dialog, 'doubleTraining', true);
      expect(await readSummary(dialog, 'totalDice'), 'Training doubled').toBe(7);
      await setNumberField(dialog, 'expertiseMod', 1);
      await setCheckbox(dialog, 'doubleExpertise', true);
      expect(await readSummary(dialog, 'totalExpertise'), 'Expertise doubled').toBe(2);
      await forceDice(gm, [
         6,
         6,
         6,
         6,
         6,
         6,
         6,
      ]);

      /** @type {number} The message count before the roll. */
      const baseline = await clickRoll(dialog, gm);
      /** @type {{id: string, parameters: object, results: object}} The cast. */
      const message = await readNewestCheckFlags(gm, baseline, 'castingCheck');
      expect(message.parameters.totalDice, 'the cast rolled 7 dice').toBe(7);
      expect(message.parameters.totalExpertise, 'the cast carries 2 Expertise').toBe(2);
      expect(message.results.successes, 'seven 6s').toBe(7);
      await expect.poll(readResolve, { message: 'doubling Training and Expertise spent 2 Resolve' }).toBe(1);
   });

   test('doubling Training spends Resolve while the auto-spend setting is on and nothing once it is off', async () => {
      await setClientSetting(gm, 'getCheckOptions', 'always');

      /**
       * Casts with Training doubled in the dialog and returns the Resolve the cast spent.
       * @returns {Promise<number>} The Resolve before the cast minus the Resolve after it.
       */
      async function castDoubled() {
         /** @type {number} The Resolve before the cast. */
         const before = await readResolve();
         /** @type {import('@playwright/test').Locator} The casting dialog. */
         const dialog = await openCheckDialog(gm, 'casting', spark.uuid);
         await setCheckbox(dialog, 'doubleTraining', true);
         await forceDice(gm, [
            6,
            6,
            6,
            6,
            6,
            6,
            6,
         ]);

         /** @type {number} The message count before the roll. */
         const baseline = await clickRoll(dialog, gm);
         /** @type {{id: string, parameters: object, results: object}} The cast. */
         const message = await readNewestCheckFlags(gm, baseline, 'castingCheck');
         expect(message.parameters.totalDice, 'Training was doubled').toBe(7);
         await resetDice(gm);
         await settle(gm);
         return before - await readResolve();
      }

      expect(await castDoubled(), 'the setting is on, so the cast spent 1 Resolve').toBe(1);
      await setClientSetting(gm, 'autoSpendResolveDoubleTraining', false);
      expect(await castDoubled(), 'the setting is off, so the cast spent nothing').toBe(0);
   });

   test('a failed cast still spends the Resolve of the doubled Training', async () => {
      await setClientSetting(gm, 'getCheckOptions', 'always');
      /** @type {number} The Resolve before the cast. */
      const before = await readResolve();
      /** @type {import('@playwright/test').Locator} The casting dialog. */
      const dialog = await openCheckDialog(gm, 'casting', spark.uuid);
      await setCheckbox(dialog, 'doubleTraining', true);
      await forceDice(gm, [
         2,
         2,
         2,
         2,
         2,
         2,
         2,
      ]);

      /** @type {number} The message count before the roll. */
      const baseline = await clickRoll(dialog, gm);
      /** @type {{id: string, parameters: object, results: object}} The cast. */
      const message = await readNewestCheckFlags(gm, baseline, 'castingCheck');
      expect(message.results.succeeded, 'the cast failed').toBe(false);
      await expect.poll(readResolve, { message: 'the failed cast spent 1 Resolve' }).toBe(before - 1);
   });
});
