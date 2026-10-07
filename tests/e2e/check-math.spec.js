import { expect, test } from './harness.js';
import { clickSheetTab, commitText } from './actions.js';
import { clickRoll, openCheckDialog, readNewestCheckFlags, setCheckbox, setNumberField } from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addAttack,
   addCheck,
   addCustomAspect,
   addRulesElement,
   addTrait,
   createActor,
   createOwnedItem,
   dragItemOntoSheet,
   placeToken,
   releaseTargets,
   setAttributeBase,
   shared,
   targetPlacedToken,
   targetedTokenIds,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { settle } from './settle.js';
import { expectedCheckResults } from '../shared/checkOracle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Check math through the rolls a user makes. One character rolls every check type from the sheet buttons with forced
 * dice: the posted parameters are assembled from the actor and its items, the forced dice reach the results, and an
 * independent oracle (`tests/shared/checkOracle.js`) agrees with every result. The same character rolls attacks at
 * targeted tokens, whose Defense sets the Difficulty, and a damaging check that a targeted token resists with the
 * Resist button of the card; the damage card's Apply button applies damage to a targeted token, and Penetrating halves
 * the Armor that resists it. The card controls spend Expertise on a die, reset the roll, and adjust a scaling aspect;
 * Advantage and Automatic Failure set in the dialog reach the rolled parameters and the card.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the character that rolls. */
let rollerId;
/** @type {string} The uuid of the character that rolls. */
let rollerUuid;
/** @type {string} The uuid of a character with no modifiers: Body 1, so an Attribute Check rolls one die. */
let plainUuid;
/** @type {Record<string, string>} The uuids of the roller's weapon, spell and ability, by item type. */
const itemUuids = {};
/** @type {Map<string, string>} The id of each target's placed token, by name. */
const tokenIds = new Map();

/** @type {number[]} The forced faces the oracle rolls use; a 3-dice check consumes all, a 1-die check uses one. */
const FORCED_FACES = [
   6,
   4,
   1,
];

/**
 * The Defense flat modifiers of the targets: an interior value, one above the upper clamp and one below the lower.
 * @type {number[]}
 */
const TARGET_MODS = [
   5,
   9,
   -8,
];

/** @type {number} Flat boost to the roller's Melee and Accuracy ratings, so both difficulty clamps are reachable. */
const ATTACKER_BOOST = 5;

/**
 * Per-check expectations for the roller (Body and Mind 3, the shared weapon, spell and ability).
 * @type {{name: string, expectedType: string, expectedTotalDice: number|null, expectedDifficulty: number|null,
 * expectedComplexity: number|null}[]}
 */
const CHECK_CASES = [
   {
      name: 'attribute',
      expectedType: 'attributeCheck',
      expectedTotalDice: 3,
      expectedDifficulty: 4,
      expectedComplexity: 0,
   },
   {
      name: 'resistance',
      expectedType: 'resistanceCheck',
      expectedTotalDice: null,
      expectedDifficulty: 4,
      expectedComplexity: 0,
   },
   {
      name: 'attack',
      expectedType: 'attackCheck',
      expectedTotalDice: 3,
      expectedDifficulty: 4,
      expectedComplexity: 1,
   },
   {
      name: 'casting',
      expectedType: 'castingCheck',
      expectedTotalDice: 3,
      expectedDifficulty: null,
      expectedComplexity: null,
   },
   {
      name: 'item',
      expectedType: 'itemCheck',
      expectedTotalDice: 3,
      expectedDifficulty: 4,
      expectedComplexity: 1,
   },
];

/**
 * Returns the localized name of a target actor for a given Defense flat modifier.
 * @param {number} mod - The Defense flat modifier.
 * @returns {string} The actor name used in the world.
 */
function targetName(mod) {
   return `E2E Math Target ${mod >= 0 ? '+' : ''}${mod}`;
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await setClientSetting(page, 'getCheckOptions', 'never');

   // The roller: Body and Mind 3 give an Attribute, Attack, Casting and Item Check three dice; the shared weapon, spell
   // and ability are copied onto it; an ability boosts the Melee and Accuracy ratings.
   rollerId = await createActor(page, {
      name: 'E2E Math Roller',
      type: 'player',
   });
   rollerUuid = `Actor.${rollerId}`;
   await setAttributeBase(page, rollerUuid, 'body', 3);
   await setAttributeBase(page, rollerUuid, 'mind', 3);
   for (const [type, key] of [
      [
         'attack',
         'weapon',
      ],
      [
         'casting',
         'spell',
      ],
      [
         'item',
         'ability',
      ],
   ]) {
      itemUuids[type] = `${rollerUuid}.Item.${await dragItemOntoSheet(page, await shared(page, key), rollerId)}`;
   }
   /** @type {string} The uuid of the boost ability. */
   const boostUuid = `${rollerUuid}.Item.${await createOwnedItem(page, rollerId, 'ability', 'E2E Math Boost')}`;
   for (const key of [
      'melee',
      'accuracy',
   ]) {
      await addRulesElement(page, boostUuid, {
         selector: 'rating',
         key,
         value: ATTACKER_BOOST,
      });
   }

   plainUuid = `Actor.${await createActor(page, {
      name: 'E2E Math Plain Actor',
      type: 'player',
   })}`;

   // Each target carries an ability with a Defense flat modifier, and a token on the shared scene.
   for (const mod of TARGET_MODS) {
      /** @type {string} The target's id. */
      const targetId = await createActor(page, {
         name: targetName(mod),
         type: 'player',
      });
      /** @type {string} The id of the target's ability. */
      const abilityId = await createOwnedItem(page, targetId, 'ability', 'E2E Math Defense');
      /** @type {string} The uuid of the target's ability. */
      const abilityUuid = `Actor.${targetId}.Item.${abilityId}`;
      await addRulesElement(page, abilityUuid, {
         selector: 'rating',
         key: 'defense',
         value: mod,
      });
      await viewScene(page, await shared(page, 'scene'));
      tokenIds.set(targetName(mod), await placeToken(page, targetId));
   }
   await closeAllApps(page);
});

test.afterEach(async () => {
   await resetDice(page);
   await releaseTargets(page);
   await closeAllApps(page);
   await setClientSetting(page, 'getCheckOptions', 'never');
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Clicks the roll button of a check type on the roller's sheets: the Body and Resilience buttons of the actor sheet,
 * and the first roll button in the sidebar of the owned item's sheet.
 * @param {string} type - The check type: attribute, resistance, attack, casting or item.
 * @param {string} [uuid] - The uuid of the owned item whose sheet holds the button; the roller's item of that type.
 * @param {number} [index] - The position of the roll button among the item sheet's attacks or checks.
 * @returns {Promise<void>} Resolves once the button has been clicked.
 */
async function clickRollButton(type, uuid = itemUuids[type], index = 0) {
   if (type === 'attribute' || type === 'resistance') {
      await (await openSheetByUuid(page, rollerUuid)).getByRole('button', {
         name: type === 'attribute' ? 'Body' : 'Resilience',
         exact: true,
      }).first().click();
   }
   else {
      await (await openSheetByUuid(page, uuid)).locator('.sidebar-check .header .roll button').nth(index).click();
   }
}

/**
 * Rolls a check type straight to chat and returns the check message it posts.
 * @param {string} type - The check type: attribute, resistance, attack, casting or item.
 * @param {string} expectedType - The message subtype the roll posts.
 * @param {string} [uuid] - The uuid of the owned item whose sheet holds the button.
 * @param {number} [index] - The position of the roll button among the item sheet's attacks or checks.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The posted check.
 */
async function roll(type, expectedType, uuid, index) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await clickRollButton(type, uuid, index);
   return readNewestCheckFlags(page, baseline, expectedType);
}

/**
 * Reads the stored roll state of a check message.
 * @param {string} messageId - The id of the check message to read.
 * @returns {Promise<object>} `{ dice: {final, expertiseApplied}[], expertiseRemaining, successes }`.
 */
function readCheckState(messageId) {
   return page.evaluate((id) => {
      /** @type {object} The posted message's system data. */
      const system = game.messages.get(id).system.toObject();
      return {
         dice: system.results.dice.map((die) => ({
            final: die.final,
            expertiseApplied: die.expertiseApplied,
         })),
         expertiseRemaining: system.results.expertiseRemaining,
         successes: system.results.successes,
      };
   }, messageId);
}

test.describe('v14 checks (forced dice)', () => {
   for (const checkCase of CHECK_CASES) {
      test(`${checkCase.name} check assembles parameters, plumbs forced dice and renders its card`, async () => {
         await forceDice(page, FORCED_FACES);
         /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
         const flags = await roll(checkCase.name, checkCase.expectedType);

         // A Resistance Check rolls the dice of the Resilience stat as the actor shows it.
         /** @type {number} The dice count the check rolls. */
         const expectedTotalDice = checkCase.expectedTotalDice ??
            await page.evaluate((id) => game.actors.get(id).system.resistance.resilience.value, rollerId);

         // (0) A message of the right type was created.
         expect(flags.type, 'message type').toBe(checkCase.expectedType);

         // (1) Parameters were assembled from the actor.
         expect(flags.parameters.totalDice, 'totalDice from actor').toBe(expectedTotalDice);

         // A spell's Difficulty and Complexity are the values its aspects calculate and the spell stores.
         /** @type {{difficulty: number, complexity: number}} The spell's stored casting check. */
         const stored = await page.evaluate(
            async (uuid) => {
               /** @type {{difficulty: number, complexity: number}} The spell's casting check. */
               const { difficulty, complexity } = (await fromUuid(uuid)).system.castingCheck;
               return {
                  difficulty,
                  complexity,
               };
            },
            itemUuids.casting,
         );
         expect(flags.parameters.difficulty, 'difficulty from actor/item')
            .toBe(checkCase.expectedDifficulty ?? stored.difficulty);
         expect(flags.parameters.complexity, 'complexity from actor/item')
            .toBe(checkCase.expectedComplexity ?? stored.complexity);
         expect(flags.parameters.totalExpertise, 'totalExpertise is zero (untrained)').toBe(0);

         // (2) The forced dice plumbed through: results.dice[].base == forced faces, sorted desc, truncated to the
         // number of dice actually rolled.
         /** @type {number[]} The forced faces the roll consumes, highest first. */
         const consumedFaces = FORCED_FACES.slice(0, expectedTotalDice)
            .slice()
            .sort((a, b) => b - a);
         expect(flags.results.dice.map((die) => die.base), 'rolled dice bases match forced faces')
            .toEqual(consumedFaces);

         // With zero expertise, finals equal bases.
         expect(flags.results.dice.map((die) => die.final), 'finals equal bases at zero expertise')
            .toEqual(consumedFaces);

         // (3) Results equal the independent oracle, exactly.
         /** @type {object} The oracle's expected results. */
         const expected = expectedCheckResults(consumedFaces, {
            difficulty: flags.parameters.difficulty,
            complexity: flags.parameters.complexity,
            extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
            extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
         });
         expect(flags.results.successes, 'successes').toBe(expected.successes);
         expect(flags.results.criticalSuccesses, 'criticalSuccesses').toBe(expected.criticalSuccesses);
         expect(flags.results.criticalFailures, 'criticalFailures').toBe(expected.criticalFailures);
         expect(flags.results.succeeded, 'succeeded').toBe(expected.succeeded);
         expect(flags.results.extraSuccesses, 'extraSuccesses').toBe(expected.extraSuccesses);
         expect(flags.results.expertiseRemaining, 'expertiseRemaining').toBe(expected.expertiseRemaining);

         // (4) The chat log mounts the card, tagged titan and holding the check card.
         await showChatLog(page);
         /** @type {import('@playwright/test').Locator} The rolled message's entry in the chat log. */
         const entry = page.locator(`#chat .message[data-message-id="${flags.id}"]`).first();
         await expect(entry.locator('.check-chat-message'), 'the check card is mounted').toBeAttached();
         await expect(entry, 'the entry carries the titan class').toHaveClass(/(^|\s)titan(\s|$)/);
      });
   }

   test('attack check carries the attack label as attackName', async () => {
      /** @type {string} The weapon's first attack label as stored. */
      const label = await page.evaluate(
         async (uuid) => (await fromUuid(uuid)).system.attack[0].label,
         itemUuids.attack,
      );

      // Non-vacuous: the stored label must be non-empty before the equality proves anything.
      expect(label, 'the weapon attack label is non-empty').not.toBe('');
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await roll('attack', 'attackCheck');
      expect(flags.parameters.attackName, 'attackName matches the rolled attack label').toBe(label);

      // The mounted attack-check header renders the attack name as its sub-label.
      await showChatLog(page);
      await expect(
         page.locator(`#chat .message[data-message-id="${flags.id}"]`).getByText(label, { exact: true }).first(),
      ).toBeVisible();
   });
});

test.describe('check chat-card interactions (clone-then-update parity)', () => {
   test('die click applies expertise; reset restores the roll', async () => {
      // Difficulty 4, Expertise 2 typed in the dialog, forced [3, 1, 1]: roll-time auto-expertise raises the 3 to 4
      // (cheapest first) and leaves 1 expertise remaining with two clickable failure dice.
      await setClientSetting(page, 'getCheckOptions', 'always');
      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = await openCheckDialog(page, 'attribute', rollerUuid);
      await setNumberField(dialog, 'expertiseMod', 2);
      await forceDice(page, [
         3,
         1,
         1,
      ]);
      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {string} The id of the freshly rolled attribute-check message under test. */
      const messageId = (await readNewestCheckFlags(page, baseline, 'attributeCheck')).id;

      // Confirm the roll-time state the click test depends on (the raised 4 is the lone success).
      expect(await readCheckState(messageId)).toEqual({
         dice: [
            {
               final: 4,
               expertiseApplied: 1,
            },
            {
               final: 1,
               expertiseApplied: 0,
            },
            {
               final: 1,
               expertiseApplied: 0,
            },
         ],
         expertiseRemaining: 1,
         successes: 1,
      });

      // Click the second die (final 1: clickable while expertise remains).
      await showChatLog(page);

      /** @type {import('@playwright/test').Locator} The message's card in the main chat log. */
      const card = page.locator(`#chat .chat-log li[data-message-id="${messageId}"]`);
      await card.locator('.die button').nth(1).click();

      // The update round-trip persists the bumped die and spends the last expertise; the bumped 2 stays below
      // difficulty, so the recalculated successes hold at 1.
      await expect.poll(() => readCheckState(messageId)).toEqual({
         dice: [
            {
               final: 4,
               expertiseApplied: 1,
            },
            {
               final: 2,
               expertiseApplied: 1,
            },
            {
               final: 1,
               expertiseApplied: 0,
            },
         ],
         expertiseRemaining: 0,
         successes: 1,
      });

      // The card re-renders the die with its expertise label.
      await expect(card.locator('.die').nth(1)).toContainText('1 + 1');

      // Reset restores every die to its base and refunds the full expertise pool; the bare 3 no longer reaches
      // difficulty, so the recalculated successes drop to 0.
      await card.locator('button:has(i.fa-rotate-left)').click();
      await expect.poll(() => readCheckState(messageId)).toEqual({
         dice: [
            {
               final: 3,
               expertiseApplied: 0,
            },
            {
               final: 1,
               expertiseApplied: 0,
            },
            {
               final: 1,
               expertiseApplied: 0,
            },
         ],
         expertiseRemaining: 2,
         successes: 0,
      });
   });

   test('scaling aspect increase/decrease/reset adjust the clone-backed results', async () => {
      // A spell of its own with one scaling damage aspect of initial value 2 and cost 1: the increment (2) differs from
      // the cost (1), so an operand swap in the handlers cannot cancel out.
      /** @type {string} The id of the new spell. */
      const spellId = await createOwnedItem(page, rollerId, 'spell', 'E2E Math Scaling Spell');
      /** @type {string} The uuid of the new spell. */
      const spellUuid = `${rollerUuid}.Item.${spellId}`;
      await addCustomAspect(page, spellUuid);

      /** @type {import('@playwright/test').Locator} The custom aspect's row on the spell sheet. */
      const row = (await openSheetByUuid(page, spellUuid)).locator('li.reorder-row').first();
      if (await row.locator('.expandable-content').count() === 0) {
         await row.getByRole('button', { name: 'Expand' }).click();
      }

      /**
       * Finds a labelled field of the aspect row.
       * @param {string} text - The field's label.
       * @returns {import('@playwright/test').Locator} The field's element.
       */
      /** @type {(text: string) => {import('@playwright/test').Locator}} Finds a labelled field of the row. */
      const field = (text) => row.locator('.field').filter({ has: page.getByText(text, { exact: true }) }).first();
      await settle(page, { transitions: true });
      await field('Damage').locator('button').click();
      await commitText(field('Initial Value').locator('input'), '2');
      await expect.poll(
         () => page.evaluate(async (uuid) => {
            /** @type {object} The aspect as stored. */
            const aspect = (await fromUuid(uuid)).system.customAspect[0];
            return {
               initialValue: aspect.initialValue,
               isDamage: aspect.isDamage,
               cost: aspect.cost,
               scaling: aspect.scaling,
            };
         }, spellUuid),
         { message: 'the row stored a scaling damage aspect of initial value 2 and cost 1' },
      ).toEqual({
         initialValue: 2,
         isDamage: true,
         cost: 1,
         scaling: true,
      });

      // Force three successes (difficulty 4, complexity 1), banking two extra successes at roll time.
      await forceDice(page, [
         6,
         6,
         6,
      ]);
      /** @type {string} The id of the freshly rolled casting-check message under test. */
      const messageId = (await roll('casting', 'castingCheck', spellUuid)).id;

      /**
       * Reads a plain snapshot of the casting message's scaling state.
       * @returns {Promise<object>} `{ currentValue, extraSuccessesRemaining, damage }`.
       */
      /** @type {() => Promise<object>} Reads the posted card's scaling state. */
      const readScalingState = () => page.evaluate((id) => {
         /** @type {object} The posted message's system data. */
         const system = game.messages.get(id).system.toObject();
         return {
            currentValue: system.results.scalingAspect[0].currentValue,
            extraSuccessesRemaining: system.results.extraSuccessesRemaining,
            damage: system.results.damage,
         };
      }, messageId);

      // Roll-time auto-maximization: with exactly ONE affordable scaling aspect, the casting check spends every extra
      // success on it at roll time (2 purchases at cost 1, each moving value AND damage by the increment 2), so the
      // card opens maxed out: value 2 + 4, damage 2 (base, incl. the aspect's initial 2) + 4, nothing left to spend.
      expect(await readScalingState()).toEqual({
         currentValue: 6,
         extraSuccessesRemaining: 0,
         damage: 6,
      });

      await showChatLog(page);

      // The scaling-aspects list nests a div.aspect wrapper around the component's own div.aspect root, so target the
      // first (outermost) match for the single seeded aspect.
      /** @type {import('@playwright/test').Locator} The seeded scaling aspect's card section. */
      const aspect = page.locator(`#chat .chat-log li[data-message-id="${messageId}"] .aspect`).first();

      // Decrease (third .control) refunds one purchase: -2 value and damage, +cost extra successes. Increase starts
      // DISABLED (no extra successes remain), so decrease must move first.
      await aspect.locator('.controls .control:nth-child(3) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 4,
         extraSuccessesRemaining: 1,
         damage: 4,
      });
      await expect(aspect.locator('.header .value')).toHaveText('4');

      // Increase (fourth .control) spends it back: +2 value and damage, -cost extra successes.
      await aspect.locator('.controls .control:nth-child(4) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 6,
         extraSuccessesRemaining: 0,
         damage: 6,
      });
      await expect(aspect.locator('.header .value')).toHaveText('6');

      // Reset (second .control) restores the aspect to its INITIAL value (2), refunding every spent success: it does
      // NOT return to the auto-maximized roll-time state. Decrease first so reset is exercised from a mid-range value
      // with a known refund of 1 success.
      await aspect.locator('.controls .control:nth-child(3) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 4,
         extraSuccessesRemaining: 1,
         damage: 4,
      });
      await aspect.locator('.controls .control:nth-child(2) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 2,
         extraSuccessesRemaining: 2,
         damage: 2,
      });
   });
});

test.describe('v14 opposed checks (forced dice)', () => {
   /**
    * Targets the tokens of the named targets with the Target key (Shift adds), in order, then rolls the roller's attack
    * with the forced faces and reads the Defense ratings of the targets.
    * @param {string[]} names - The names of the targets, in targeting order; none rolls with no target.
    * @returns {Promise<{parameters: object, results: object, targetDefenses: number[]}>} The attack's message and the
    * Defense ratings of the named targets.
    */
   async function targetAndRoll(names) {
      for (const [index, name] of names.entries()) {
         await targetPlacedToken(page, tokenIds.get(name), { add: index > 0 });
      }
      expect(await targetedTokenIds(page), 'the user targets exactly the named tokens')
         .toEqual(names.map((name) => tokenIds.get(name)));
      await forceDice(page, FORCED_FACES);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await roll('attack', 'attackCheck');
      return {
         parameters: flags.parameters,
         results: flags.results,
         targetDefenses: await page.evaluate(
            (targets) => targets.map((name) => game.actors.getName(name).system.getRollData().rating.defense.value),
            names,
         ),
      };
   }

   /**
    * Mirrors the engine's difficulty clamp: clamp(targetDefense - attackerRating + 4, 2, 6).
    * @param {number} targetDefense - The target's Defense rating.
    * @param {number} attackerRating - The attacker's attack rating.
    * @returns {number} The difficulty the engine should derive, between 2 and 6.
    */
   function expectedDifficulty(targetDefense, attackerRating) {
      return Math.min(6, Math.max(2, targetDefense - attackerRating + 4));
   }

   test('targeted attack derives difficulty from the target Defense (interior)', async () => {
      /** @type {{parameters: object, results: object, targetDefenses: number[]}} The attack's message. */
      const flags = await targetAndRoll([targetName(5)]);
      /** @type {number} The Defense of the target. */
      const targetDefense = flags.targetDefenses[0];
      /** @type {{attackerRating: number, difficulty: number}} The attack's parameters. */
      const { attackerRating, difficulty } = flags.parameters;

      // The target path populated targetDefense from the target, not the attacker fallback.
      expect(flags.parameters.targetDefense, 'targetDefense read from target').toBe(targetDefense);
      expect(targetDefense, 'target Defense differs from the attacker rating').not.toBe(attackerRating);

      // The difficulty follows the clamp formula and lands strictly inside the band (interior).
      /** @type {number} The difficulty before it is limited to the die faces. */
      const raw = targetDefense - attackerRating + 4;
      expect(raw, 'interior case is not clamped (above lower bound)').toBeGreaterThan(2);
      expect(raw, 'interior case is not clamped (below upper bound)').toBeLessThan(6);
      expect(difficulty, 'difficulty = clamp(targetDefense - attackerRating + 4, 2, 6)')
         .toBe(expectedDifficulty(targetDefense, attackerRating));

      // The full results pipeline still holds at this non-4 difficulty.
      /** @type {object} The oracle's expected results. */
      const expected = expectedCheckResults([...FORCED_FACES].sort((a, b) => b - a), {
         difficulty,
         complexity: flags.parameters.complexity,
         extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
         extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
      });
      expect(flags.results.successes, 'successes').toBe(expected.successes);
      expect(flags.results.succeeded, 'succeeded').toBe(expected.succeeded);
      expect(flags.results.criticalSuccesses, 'criticalSuccesses').toBe(expected.criticalSuccesses);
      expect(flags.results.criticalFailures, 'criticalFailures').toBe(expected.criticalFailures);
      expect(flags.results.extraSuccesses, 'extraSuccesses').toBe(expected.extraSuccesses);
   });

   test('attack difficulty clamps to both bounds (2 and 6)', async () => {
      // High bound: a far-above-attacker Defense pins the difficulty to 6.
      /** @type {{parameters: object, results: object, targetDefenses: number[]}} The high-Defense attack. */
      const high = await targetAndRoll([targetName(9)]);
      /** @type {number} The difficulty before it is limited, for the high-Defense target. */
      const highRaw = high.targetDefenses[0] - high.parameters.attackerRating + 4;
      expect(highRaw, 'high case exceeds the upper bound before clamping').toBeGreaterThan(6);
      expect(high.parameters.difficulty, 'difficulty clamps to 6').toBe(6);
      await releaseTargets(page);

      // Low bound: a floored (0) Defense against the boosted attacker pins the difficulty to 2.
      /** @type {{parameters: object, results: object, targetDefenses: number[]}} The low-Defense attack. */
      const low = await targetAndRoll([targetName(-8)]);
      /** @type {number} The difficulty before it is limited, for the low-Defense target. */
      const lowRaw = low.targetDefenses[0] - low.parameters.attackerRating + 4;
      expect(lowRaw, 'low case falls below the lower bound before clamping').toBeLessThan(2);
      expect(low.parameters.difficulty, 'difficulty clamps to 2').toBe(2);
   });

   test('with multiple targets the first target Defense is used', async () => {
      /** @type {{parameters: object, results: object, targetDefenses: number[]}} The attack's message. */
      const flags = await targetAndRoll([
         targetName(5),
         targetName(9),
      ]);
      /** @type {number[]} The Defense of each target. */
      const [firstDefense, secondDefense] = flags.targetDefenses;
      expect(firstDefense, 'the targets have distinct Defense').not.toBe(secondDefense);
      expect(flags.parameters.targetDefense, 'targetDefense uses the first target').toBe(firstDefense);
      expect(flags.parameters.difficulty, 'difficulty derives from the first target')
         .toBe(expectedDifficulty(firstDefense, flags.parameters.attackerRating));
   });

   test('with no target the attack falls back to the attacker rating (difficulty 4)', async () => {
      expect(await targetedTokenIds(page), 'no token is targeted').toEqual([]);
      /** @type {{parameters: object, results: object, targetDefenses: number[]}} The attack's message. */
      const flags = await targetAndRoll([]);
      expect(flags.parameters.targetDefense, 'targetDefense falls back to the attacker rating')
         .toBe(flags.parameters.attackerRating);
      expect(flags.parameters.difficulty, 'fallback difficulty is the unopposed 4').toBe(4);
   });
});

test.describe('the damage card of a damaging check', () => {
   /** @type {string} The uuid of the roller's ability whose check deals 5 damage that Resilience resists. */
   let strikeUuid;

   test.beforeAll(async () => {
      strikeUuid = `${rollerUuid}.Item.${await createOwnedItem(page, rollerId, 'ability', 'E2E Math Strike')}`;
      await addCheck(page, strikeUuid, {
         label: 'Strike',
         resistanceCheck: 'resilience',
         isDamage: true,
         initialValue: 5,
         damageReducedBy: 'resistanceCheck',
      });
      await closeAllApps(page);
   });

   /**
    * Rolls the Strike check with the forced faces, targets a token, and clicks the card's Resilience Resist button; the
    * defender's single Resilience die rolls the forced face.
    * @param {number[]} strikeFaces - The faces the three dice of the Strike check roll.
    * @param {number} resistFace - The face the defender's one Resilience die rolls.
    * @returns {Promise<{strike: object, resist: object}>} The Strike check and the Resilience check it caused.
    */
   async function strikeAndResist(strikeFaces, resistFace) {
      await targetPlacedToken(page, tokenIds.get(targetName(5)));
      await forceDice(page, strikeFaces);
      /** @type {{id: string, parameters: object, results: object}} The Strike check's message. */
      const strike = await roll('item', 'itemCheck', strikeUuid);
      await showChatLog(page);
      await forceDice(page, [resistFace]);

      /** @type {number} The chat-message count before the Resist click. */
      const baseline = await page.evaluate(() => game.messages.size);
      await page.locator(`#chat .message[data-message-id="${strike.id}"] .button.resilience button`).click();
      return {
         strike,
         resist: await readNewestCheckFlags(page, baseline, 'resistanceCheck'),
      };
   }

   test('failed resistance reduces incoming damage by the successes rolled', async () => {
      // Two Strike successes bank one extra success, so the Resist button asks for 2 successes; the defender's one die
      // shows a 4, a success against Difficulty 4, which leaves the check one success short.
      /** @type {{strike: object, resist: object}} The Strike check and the Resilience check it caused. */
      const { strike, resist } = await strikeAndResist([
         6,
         6,
         1,
      ], 4);
      expect(strike.results.extraSuccesses, 'the Strike check banked one extra success').toBe(1);
      expect(resist.parameters.complexity, 'the Resist button carries the complexity').toBe(2);
      expect(resist.results.dice.length, 'Resilience rolls a single die').toBe(1);

      /** @type {object} The oracle's expected results. */
      const oracle = expectedCheckResults([4], {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: resist.parameters.extraSuccessOnCritical,
         extraFailureOnCritical: resist.parameters.extraFailureOnCritical,
      });
      expect(resist.results.successes, 'one forced success').toBe(1);
      expect(oracle.succeeded, 'oracle: 1 success < complexity 2 fails').toBe(false);
      expect(resist.results.succeeded, 'engine: the resist failed').toBe(false);

      // damageTaken = the Strike's damage - successes when the resist fails.
      expect(resist.parameters.damageToReduce, 'the card passed its damage').toBe(strike.results.damage);
      expect(resist.results.damageTaken, 'damageTaken = damage - successes')
         .toBe(strike.results.damage - resist.results.successes);
   });

   test('successful resistance takes no damage', async () => {
      // One Strike success asks for 1 success; the defender's one die shows a 4, which succeeds.
      /** @type {{strike: object, resist: object}} The Strike check and the Resilience check it caused. */
      const { strike, resist } = await strikeAndResist([
         6,
         1,
         1,
      ], 4);
      expect(strike.results.extraSuccesses, 'the Strike check banked no extra success').toBe(0);
      expect(resist.parameters.complexity, 'the Resist button carries the complexity').toBe(1);
      expect(resist.results.succeeded, 'check succeeded (1 success >= complexity 1)').toBe(true);
      expect(resist.results.damageTaken, 'no damage taken on a successful resist').toBe(0);
   });
});

test.describe('the damage card of an attack', () => {
   /** @type {string} The uuid of the roller's weapon, whose first attack is plain and whose second is Penetrating. */
   let bladeUuid;
   /** @type {string} The id of the defender wearing Armor 5. */
   let defenderId;
   /** @type {string} The id of the defender's placed token. */
   let defenderTokenId;

   test.beforeAll(async () => {

      // A weapon with two attacks that deal 4 damage, the second with the Penetrating trait.
      bladeUuid = `${rollerUuid}.Item.${await createOwnedItem(page, rollerId, 'weapon', 'E2E Math Blade')}`;
      await addAttack(page, bladeUuid);
      await clickSheetTab(await openSheetByUuid(page, bladeUuid), 'Attacks');
      for (let index = 0; index < 2; index++) {
         await commitText(
            (await openSheetByUuid(page, bladeUuid)).locator('.attack').nth(index).locator('.field')
               .filter({ has: page.getByText('Damage', { exact: true }) }).locator('input.titan-number-input').first(),
            '4',
         );
      }
      await expect.poll(
         () => page.evaluate(
            async (uuid) => (await fromUuid(uuid)).system.attack.map((attack) => attack.damage),
            bladeUuid,
         ),
         { message: 'the inputs stored the attack damage' },
      ).toEqual([
         4,
         4,
      ]);
      await addTrait(page, bladeUuid, 'Penetrating', { attackIndex: 1 });

      // The defender wears Armor 5.
      defenderId = await createActor(page, {
         name: 'E2E Math Armored Target',
         type: 'player',
      });
      /** @type {string} The id of the defender's armor. */
      const armorId = await createOwnedItem(page, defenderId, 'armor', 'E2E Math Armor');
      /** @type {string} The uuid of the defender's armor. */
      const armorUuid = `Actor.${defenderId}.Item.${armorId}`;
      /** @type {import('@playwright/test').Locator} The armor sheet's Armor stat. */
      const armor = (await openSheetByUuid(page, armorUuid)).locator('.header .stat, .header .labeled-element')
         .filter({ has: page.getByText('Armor', { exact: true }) }).last();
      await commitText(armor.locator('input').nth(1), '5');
      await commitText(armor.locator('input').nth(0), '5');
      await expect.poll(
         () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.armor, armorUuid),
         { message: 'the inputs stored Armor 5' },
      ).toMatchObject({
         max: 5,
         value: 5,
      });

      // Equipping goes through the Equipped toggle of the armor's row in the Inventory tab.
      /** @type {import('@playwright/test').Locator} The defender's sheet, on the Inventory tab. */
      const sheet = await openSheetByUuid(page, `Actor.${defenderId}`);
      await clickSheetTab(sheet, 'Inventory');
      await sheet.locator(`[data-item-id="${armorUuid.split('.').at(-1)}"]`).getByRole('button', { name: 'Equipped' })
         .first().click();
      await expect.poll(
         () => page.evaluate((id) => game.actors.get(id).system.getEquippedArmor()?.name ?? null, defenderId),
         { message: 'the toggle equipped the armor' },
      ).toBe('E2E Math Armor');
      await viewScene(page, await shared(page, 'scene'));
      defenderTokenId = await placeToken(page, defenderId);
      await closeAllApps(page);
   });

   /**
    * Rolls one attack of the Blade at the armored defender (one success, so the damage is the attack's 4), clicks the
    * Apply Damage button of the card, and reads the defender's stamina before and after.
    * @param {number} attackIndex - The position of the attack in the weapon: 0 is plain, 1 is Penetrating.
    * @returns {Promise<{before: number, after: number}>} The defender's stamina before and after the button.
    */
   async function applyAttackDamage(attackIndex) {
      await targetPlacedToken(page, defenderTokenId);
      await forceDice(page, [
         6,
         1,
         1,
      ]);
      /** @type {{id: string, results: object}} The attack's message. */
      const attack = await roll('attack', 'attackCheck', bladeUuid, attackIndex);
      expect(attack.results.damage, 'the attack deals its 4 damage').toBe(4);
      await showChatLog(page);

      /** @type {number} The defender's stamina before the button. */
      const before = await page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, defenderId);
      await page.locator(`#chat .message[data-message-id="${attack.id}"]`).locator('.damage-buttons .button button')
         .first().click();
      await expect.poll(
         () => page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, defenderId),
         { message: 'the button applied damage to the targeted defender' },
      ).not.toBe(before);
      return {
         before,
         after: await page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, defenderId),
      };
   }

   test('Armor resists all of a plain attack\'s damage', async () => {
      // Armor 5 against 4 damage: nothing lands, so the stamina does not change and the poll in the helper cannot see a
      // change. The damage report the button posts is the observable.
      await targetPlacedToken(page, defenderTokenId);
      await forceDice(page, [
         6,
         1,
         1,
      ]);
      /** @type {{id: string}} The attack's message. */
      const attack = await roll('attack', 'attackCheck', bladeUuid, 0);
      await showChatLog(page);

      /** @type {number} The chat-message count before the button. */
      const baseline = await page.evaluate(() => game.messages.size);
      /** @type {number} The defender's stamina before the button. */
      const before = await page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, defenderId);
      await page.locator(`#chat .message[data-message-id="${attack.id}"]`).locator('.damage-buttons .button button')
         .first().click();
      await expect.poll(
         () => page.evaluate(
            (count) => game.messages.contents.slice(count).some((message) => message.type === 'damageReport'),
            baseline,
         ),
         { message: 'the button posted a damage report' },
      ).toBe(true);
      expect(
         await page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, defenderId),
         'Armor 5 resisted all 4 damage',
      ).toBe(before);
   });

   test('Penetrating damage is resisted by half the Armor, rounded up', async () => {
      // Armor 5 halves to 3, so 1 of the 4 damage lands.
      /** @type {{before: number, after: number}} The defender's stamina before and after the button. */
      const { before, after } = await applyAttackDamage(1);
      expect(before - after, 'Penetrating leaves ceil(5 / 2) = 3 Armor, so 1 damage lands').toBe(1);
   });
});

test.describe('Advantage and Automatic Failure in check options', () => {
   /**
    * Opens the roller's Attribute Check dialog (the setting is Always).
    * @returns {Promise<import('@playwright/test').Locator>} The dialog.
    */
   async function openDialog() {
      await setClientSetting(page, 'getCheckOptions', 'always');
      return openCheckDialog(page, 'attribute', rollerUuid);
   }

   test('options Advantage moves the rolled Difficulty and keeps the base', async () => {
      /** @type {import('@playwright/test').Locator} The dialog. */
      const advantaged = await openDialog();
      await advantaged.getByTestId('check-field-advantage').locator('[role="combobox"]').click();
      await page.locator('[role="option"][data-value="1"]').click();
      /** @type {number} The chat-message count before the roll. */
      const first = await clickRoll(advantaged, page);
      expect((await readNewestCheckFlags(page, first, 'attributeCheck')).parameters).toMatchObject({
         advantage: 1,
         baseDifficulty: 4,
         difficulty: 3,
      });

      /** @type {import('@playwright/test').Locator} The dialog of the second roll. */
      const disadvantaged = await openDialog();
      await disadvantaged.getByTestId('check-field-advantage').locator('[role="combobox"]').click();
      await page.locator('[role="option"][data-value="-2"]').click();
      /** @type {number} The chat-message count before the second roll. */
      const second = await clickRoll(disadvantaged, page);
      expect((await readNewestCheckFlags(page, second, 'attributeCheck')).parameters).toMatchObject({
         advantage: -2,
         baseDifficulty: 4,
         difficulty: 6,
      });
   });

   /**
    * Rolls an Attribute Check of the plain actor (Body 1, one die) from its dialog with the options set.
    * @param {object} [options] - What the dialog's fields are set to before the roll.
    * @param {number} [options.expertiseMod] - The Expertise modifier.
    * @param {number} [options.trainingMod] - The Training modifier.
    * @param {boolean} [options.automaticFailure] - Whether Automatic Failure is ticked.
    * @returns {Promise<{id: string, parameters: object, results: object}>} The rolled check's message.
    */
   async function rollPlain({ expertiseMod, trainingMod, automaticFailure } = {}) {
      await setClientSetting(page, 'getCheckOptions', 'always');

      /** @type {import('@playwright/test').Locator} The dialog. */
      const dialog = await openCheckDialog(page, 'attribute', plainUuid);

      // One success is enough for the check to succeed.
      await setNumberField(dialog, 'complexity', 1);
      if (expertiseMod !== undefined) {
         await setNumberField(dialog, 'expertiseMod', expertiseMod);
      }
      if (trainingMod !== undefined) {
         await setNumberField(dialog, 'trainingMod', trainingMod);
      }
      if (automaticFailure) {
         await setCheckbox(dialog, 'automaticFailure', true);
      }
      return readNewestCheckFlags(page, await clickRoll(dialog, page), 'attributeCheck');
   }

   /**
    * Opens the chat log's context menu on a card, returns its entries' labels, and closes it again.
    * @param {import('@playwright/test').Locator} card - The card's list item in the chat log.
    * @returns {Promise<string[]>} The trimmed label of each menu entry.
    */
   async function readChatContextMenu(card) {
      await card.locator('.message-header').click({ button: 'right' });

      /** @type {import('@playwright/test').Locator} The open menu's entries. */
      const entries = page.locator('#context-menu li.context-item');
      await expect(entries.first()).toBeVisible();

      /** @type {string[]} The entries' labels. */
      const entryLabels = (await entries.allInnerTexts()).map((text) => text.trim());
      await page.evaluate(() => ui.context?.close({ animate: false }));
      await expect(page.locator('#context-menu')).toHaveCount(0);
      return entryLabels;
   }

   test('an automatically failed check rolls its dice but has no successes', async () => {
      // Positive control: the same forced die succeeds without Automatic Failure.
      await forceDice(page, [6]);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const control = await rollPlain();
      expect(control.results).toMatchObject({
         successes: 1,
         succeeded: true,
      });

      await forceDice(page, [6]);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const failed = await rollPlain({ automaticFailure: true });
      expect(failed.parameters.automaticFailure).toBe(true);
      expect(failed.results.dice.map((die) => die.base)).toEqual([6]);
      expect(failed.results).toMatchObject({
         criticalSuccesses: 1,
         successes: 0,
         succeeded: false,
      });
   });

   test('an automatically failed check spends no Expertise and its card shows no die raised by it', async () => {
      await showChatLog(page);

      // Positive control: without Automatic Failure the Expertise raises the 3, and the card shows "3 + 1".
      await forceDice(page, [3]);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const control = await rollPlain({ expertiseMod: 1 });
      expect(control.results.expertiseRemaining).toBe(0);
      expect(control.results.dice.map((die) => die.expertiseApplied)).toEqual([1]);
      await showChatLog(page);

      /** @type {import('@playwright/test').Locator} The normal card in the chat log. */
      const controlCard = page.locator(`#chat .chat-log li[data-message-id="${control.id}"]`);
      await expect(controlCard.locator('.die', { hasText: '+' })).toHaveCount(1);

      // The same roll with Automatic Failure spends nothing: the Expertise remains and the die shows its face alone.
      await forceDice(page, [3]);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const failed = await rollPlain({
         expertiseMod: 1,
         automaticFailure: true,
      });
      expect(failed.results.expertiseRemaining).toBe(1);
      expect(failed.results.dice.map((die) => die.expertiseApplied)).toEqual([0]);
      await showChatLog(page);

      /** @type {import('@playwright/test').Locator} The automatically failed card in the chat log. */
      const failedCard = page.locator(`#chat .chat-log li[data-message-id="${failed.id}"]`);
      await expect(failedCard.locator('.die')).toHaveText(['3']);
      await expect(failedCard.locator('.die', { hasText: '+' })).toHaveCount(0);
   });

   test('an automatically failed card offers no outcome-changing action and styles no die as a success',
      async () => {
         /** @type {Record<string, string>} The localized labels of the actions a failed card withholds. */
         const labels = await page.evaluate(() => ({
            doubleExpertise: game.i18n.localize('LOCAL.doubleExpertise.text'),
            doubleExpertiseSpendResolve: game.i18n.localize('LOCAL.doubleExpertiseSpendResolve.text'),
            doubleTraining: game.i18n.localize('LOCAL.doubleTraining.text'),
            doubleTrainingSpendResolve: game.i18n.localize('LOCAL.doubleTrainingSpendResolve.text'),
            expertiseRemaining: game.i18n.localize('LOCAL.expertiseRemaining.text'),
            reRollFailures: game.i18n.localize('LOCAL.reRollFailures.text'),
            reRollFailuresSpendResolve: game.i18n.localize('LOCAL.reRollFailuresSpendResolve.text'),
            resetExpertise: game.i18n.localize('LOCAL.resetExpertise.text'),
         }));

         /** @type {string[]} Every context-menu label a failed card withholds (a GM sees both forms of each). */
         const withheld = [
            labels.reRollFailures,
            labels.reRollFailuresSpendResolve,
            labels.doubleExpertise,
            labels.doubleExpertiseSpendResolve,
            labels.doubleTraining,
            labels.doubleTrainingSpendResolve,
         ];

         // Two dice (Body 1 + Training 1), 1 Expertise and a 4:1 check, so every action applies. Without Automatic
         // Failure the card offers every action and styles the 6 a critical success.
         await forceDice(page, [
            6,
            2,
         ]);
         /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
         const control = await rollPlain({
            expertiseMod: 1,
            trainingMod: 1,
         });
         await showChatLog(page);

         /** @type {import('@playwright/test').Locator} The normal card in the chat log. */
         const controlCard = page.locator(`#chat .chat-log li[data-message-id="${control.id}"]`);
         await expect(controlCard.locator('.die.critical-success')).toHaveCount(1);
         await expect(controlCard.getByRole('button', { name: labels.resetExpertise })).toBeVisible();
         expect(await readChatContextMenu(controlCard)).toEqual(expect.arrayContaining(withheld));

         // The same roll with Automatic Failure: the card renders its dice and Expertise row but withholds the
         // actions.
         await forceDice(page, [
            6,
            2,
         ]);
         /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
         const failed = await rollPlain({
            expertiseMod: 1,
            trainingMod: 1,
            automaticFailure: true,
         });
         await showChatLog(page);

         /** @type {import('@playwright/test').Locator} The automatically failed card in the chat log. */
         const failedCard = page.locator(`#chat .chat-log li[data-message-id="${failed.id}"]`);
         await expect(failedCard.locator('.die')).toHaveCount(2);
         await expect(failedCard.getByText(labels.expertiseRemaining)).toBeVisible();
         await expect(failedCard.locator('.die.success, .die.critical-success')).toHaveCount(0);
         await expect(failedCard.getByRole('button', { name: labels.resetExpertise })).toHaveCount(0);

         /** @type {string[]} The failed card's context-menu labels. */
         const failedMenu = await readChatContextMenu(failedCard);
         for (const label of withheld) {
            expect(failedMenu).not.toContain(label);
         }

         // The rolled 6 renders in the resolved failure color.
         await expect.poll(() => failedCard.locator('.die', { hasText: '6' }).evaluate((element) => {
            /** @type {HTMLSpanElement} A probe resolving the failure token to computed rgb() form. */
            const probe = document.createElement('span');
            probe.style.backgroundColor = 'var(--titan-failure-background)';
            element.appendChild(probe);

            /** @type {string} The resolved failure background. */
            const failure = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return getComputedStyle(element.querySelector('button')).backgroundColor === failure;
         }), { message: 'the failed card\'s 6 shows the failure background' }).toBe(true);
      });
});
