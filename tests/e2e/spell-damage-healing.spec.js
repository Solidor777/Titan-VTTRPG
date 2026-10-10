import { expect, test } from './harness.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import {
   addRulesElement,
   createActor,
   createOwnedItem,
   placeToken,
   releaseTargets,
   setAttributeBase,
   setResource,
   shared,
   targetPlacedToken,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import {
   aspectBlock,
   aspectControl,
   buildSpell,
   castFromSpellSheet,
   openCard,
   readCardRows,
   readScaling,
} from './spellCasting.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Damage and healing of casting checks: the amounts a spell's damage and healing aspects (standard and custom) start
 * with, how spent extra successes scale them on the card, how the Damage Mod and Healing Mod of a rules element reach
 * the amounts the card shows and stores, and what the Apply buttons of the card do to a targeted character. Every
 * number is worked out by hand from `SpellAspects.js`, `CastingCheckResults.js` and the rules of the card:
 * damage and healing start at the sum of the damage and healing aspects' initial values, a mod is added once at roll
 * time and only to an amount that is above 0, and each bought step adds the aspect's step (its initial value, at least
 * 1) to its amounts.
 *
 * Both casters have Mind 12, so every cast rolls 12 dice; the forced faces are 6s followed by 2s.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who builds the documents and casts. */
let gm;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {string} The id of the caster whose ability adds 2 to damage and 3 to healing of casting checks. */
let boostedId;
/** @type {string} The id of the caster with no modifiers. */
let plainId;

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
 * Creates a caster with Mind 12.
 * @param {string} name - The caster's name.
 * @returns {Promise<string>} The caster's id.
 */
async function createCaster(name) {
   /** @type {string} The caster's id. */
   const id = await createActor(gm, {
      name,
      type: 'player',
   });
   await setAttributeBase(gm, `Actor.${id}`, 'mind', 12);
   return id;
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(180_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   await setClientSetting(gm, 'getCheckOptions', 'never');
   plainId = await createCaster('E2E DH Plain Caster');
   boostedId = await createCaster('E2E DH Boosted Caster');

   // The ability's two conditional check modifiers: +2 damage and +3 healing on every Casting Check.
   /** @type {string} The uuid of the boosted caster's ability. */
   const abilityUuid = `Actor.${boostedId}.Item.${await createOwnedItem(gm, boostedId, 'ability', 'E2E DH Boost')}`;
   await addRulesElement(gm, abilityUuid, {
      operation: 'conditionalCheckModifier',
      modifierType: 'damage',
      checkType: 'casting',
      selector: 'any',
      value: 2,
   });
   await addRulesElement(gm, abilityUuid, {
      operation: 'conditionalCheckModifier',
      modifierType: 'healing',
      checkType: 'casting',
      selector: 'any',
      value: 3,
   });
   await closeAllApps(gm);
});

test.afterEach(async () => {
   await resetDice(gm);
   await releaseTargets(gm);
   await closeAllApps(gm);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await gm?.close();
});

test.describe('damage and healing aspects scale with spent extra successes', () => {
   /** @type {{id: string, uuid: string}} Standard damage (initial 1) and standard healing (initial 1). */
   let standardPair;
   /** @type {{id: string, uuid: string}} A custom aspect that is both damage and healing, initial 3, cost 2. */
   let both;
   /** @type {{id: string, uuid: string}} Standard damage and a custom healing aspect (initial 2, cost 2). */
   let mixed;

   test.beforeAll(async () => {
      test.setTimeout(150_000);
      standardPair = await buildSpell(gm, plainId, 'E2E DH Standard Pair', {
         standard: [
            { label: 'damage' },
            { label: 'healing' },
         ],
      });
      both = await buildSpell(gm, plainId, 'E2E DH Both', {
         custom: [
            {
               label: 'Surge',
               cost: 2,
               initialValue: 3,
               damage: true,
               healing: true,
            },
         ],
      });
      mixed = await buildSpell(gm, plainId, 'E2E DH Mixed', {
         standard: [{ label: 'damage' }],
         custom: [
            {
               label: 'Mend',
               cost: 2,
               initialValue: 2,
               healing: true,
            },
         ],
      });
      await closeAllApps(gm);
   });

   test('standard damage and healing start at 1 and each scales only its own amount', async () => {
      // Damage 1 + healing 1 cost 2: Difficulty 4, Complexity 1. Five successes leave 4 extra successes; both aspects
      // (cost 1) are affordable, so the roll buys nothing.
      const cast = await castWith(standardPair.uuid, 5);
      expect(cast.parameters.damage, 'the damage aspect starts at 1').toBe(1);
      expect(cast.parameters.healing, 'the healing aspect starts at 1').toBe(1);
      expect(cast.results.damage).toBe(1);
      expect(cast.results.healing).toBe(1);
      expect(cast.results.extraSuccessesRemaining).toBe(4);

      // Two steps of damage: damage 3, healing unchanged.
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'two damage steps' }).toMatchObject({
         damage: 3,
         healing: 1,
         remaining: 2,
      });
      await expect.poll(async () => (await readCardRows(cast.card)).damage, { message: 'the card shows 3 damage' })
         .toBe('Damage: 3');
      expect((await readCardRows(cast.card)).healing, 'healing is untouched').toBe('Healing: 1');

      // Two steps of healing: healing 3, damage unchanged.
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'two healing steps' }).toMatchObject({
         damage: 3,
         healing: 3,
         remaining: 0,
      });
      await expect.poll(async () => (await readCardRows(cast.card)).healing, { message: 'the card shows 3 healing' })
         .toBe('Healing: 3');
      expect((await readCardRows(cast.card)).damage, 'damage is untouched').toBe('Damage: 3');

      // Refunding a damage step lowers damage alone.
      await aspectControl(aspectBlock(cast.card, 0), 'decrease').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'one damage step refunded' }).toMatchObject({
         damage: 2,
         healing: 3,
         remaining: 1,
      });
      await expect.poll(async () => (await readCardRows(cast.card)).damage).toBe('Damage: 2');
   });

   test('one custom aspect that is damage and healing scales both amounts together', async () => {
      // Cost 2 gives Difficulty 4 and Complexity 1. Five successes leave 4 extra successes, which the single affordable
      // aspect (cost 2, step 3) spends as 2 steps: value 3 + 6 = 9, damage 3 + 6 = 9, healing 3 + 6 = 9.
      const cast = await castWith(both.uuid, 5);
      expect(cast.parameters.damage, 'initial damage').toBe(3);
      expect(cast.parameters.healing, 'initial healing').toBe(3);
      expect(cast.results.scalingAspect.map((aspect) => aspect.currentValue)).toEqual([9]);
      expect(cast.results.damage).toBe(9);
      expect(cast.results.healing).toBe(9);
      expect((await readCardRows(cast.card)).damage).toBe('Damage: 9');
      expect((await readCardRows(cast.card)).healing).toBe('Healing: 9');

      // One step refunded: both fall by 3.
      await aspectControl(aspectBlock(cast.card, 0), 'decrease').click();
      await expect.poll(() => readScaling(gm, cast.id)).toMatchObject({
         damage: 6,
         healing: 6,
         remaining: 2,
      });
      await expect.poll(async () => (await readCardRows(cast.card)).healing).toBe('Healing: 6');
      expect((await readCardRows(cast.card)).damage).toBe('Damage: 6');
   });

   test('standard damage with a custom healing aspect: the roll buys damage steps only when only damage is affordable',
      async () => {
         // Damage (cost 1) and Mend (cost 2) cost 3: Difficulty 4, Complexity 1. Two successes leave 1 extra success:
         // only damage is affordable, so the roll buys 1 step of damage (1 + 1) and leaves healing at Mend's 2.
         const cast = await castWith(mixed.uuid, 2);
         expect(cast.results.extraSuccesses).toBe(1);
         expect(cast.results.damage, 'damage 1 + 1 step').toBe(2);
         expect(cast.results.healing, 'Mend\'s initial 2').toBe(2);
         expect(cast.results.extraSuccessesRemaining).toBe(0);
         expect((await readCardRows(cast.card)).damage).toBe('Damage: 2');
         expect((await readCardRows(cast.card)).healing).toBe('Healing: 2');
      });
});

test.describe('Damage Mod and Healing Mod reach the card\'s amounts', () => {
   /** @type {{id: string, uuid: string}} The boosted caster's damage and a custom healing aspect (2, cost 2). */
   let boostedMixed;
   /** @type {{id: string, uuid: string}} The boosted caster's damage-only spell. */
   let boostedDamage;
   /** @type {{id: string, uuid: string}} The boosted caster's healing-only spell. */
   let boostedHealing;
   /** @type {{id: string, uuid: string}} The boosted caster's spell with a damage aspect that is not scaling. */
   let boostedPlain;
   /** @type {{id: string, uuid: string}} The plain caster's damage-only spell. */
   let plainDamage;

   test.beforeAll(async () => {
      test.setTimeout(240_000);
      boostedMixed = await buildSpell(gm, boostedId, 'E2E DH Boosted Mixed', {
         standard: [{ label: 'damage' }],
         custom: [
            {
               label: 'Mend',
               cost: 2,
               initialValue: 2,
               healing: true,
            },
         ],
      });
      boostedDamage = await buildSpell(gm, boostedId, 'E2E DH Boosted Damage', { standard: [{ label: 'damage' }] });
      boostedHealing = await buildSpell(gm, boostedId, 'E2E DH Boosted Healing', { standard: [{ label: 'healing' }] });
      boostedPlain = await buildSpell(gm, boostedId, 'E2E DH Boosted Glow', {
         custom: [
            {
               label: 'Glow',
               cost: 1,
               initialValue: 1,
            },
         ],
      });
      plainDamage = await buildSpell(gm, plainId, 'E2E DH Plain Damage', { standard: [{ label: 'damage' }] });
      await closeAllApps(gm);
   });

   test('the mods are added once to the starting amounts, and steps then add only their own step', async () => {
      // Damage (1) and Mend (2) cost 3: Difficulty 4, Complexity 1. Five successes leave 4 extra successes; both
      // aspects are affordable, so the roll buys nothing: damage 1 + 2 = 3 and healing 2 + 3 = 5.
      const cast = await castWith(boostedMixed.uuid, 5);
      expect(cast.parameters.damageMod, 'the ability adds 2 to damage').toBe(2);
      expect(cast.parameters.healingMod, 'the ability adds 3 to healing').toBe(3);
      expect(cast.results.damage, 'damage 1 + Damage Mod 2').toBe(3);
      expect(cast.results.healing, 'healing 2 + Healing Mod 3').toBe(5);
      expect((await readCardRows(cast.card)).damage).toBe('Damage: 3');
      expect((await readCardRows(cast.card)).healing).toBe('Healing: 5');

      // Two damage steps (1 each) and one Mend step (2 for 2): damage 5, healing 7, nothing left.
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'three steps are stored' }).toEqual({
         values: [
            3,
            4,
         ],
         remaining: 0,
         extra: 4,
         damage: 5,
         healing: 7,
      });
      await expect.poll(async () => (await readCardRows(cast.card)).damage).toBe('Damage: 5');
      expect((await readCardRows(cast.card)).healing).toBe('Healing: 7');

      // Reset of damage refunds both steps and keeps the mod: damage back to 3.
      await aspectControl(aspectBlock(cast.card, 0), 'reset').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'reset keeps the mod' }).toMatchObject({
         damage: 3,
         healing: 7,
         remaining: 2,
      });
   });

   test('a roll that buys steps adds the mod after them', async () => {
      // Damage 1 costs 1: Difficulty 4, Complexity 1. Three successes leave 2 extra successes, so the roll buys 2
      // steps: damage 1 + 2 + Damage Mod 2 = 5. The Healing Mod of 3 is not added, because there is no healing.
      const cast = await castWith(boostedDamage.uuid, 3);
      expect(cast.results.scalingAspect.map((aspect) => aspect.currentValue)).toEqual([3]);
      expect(cast.results.damage, 'damage 1 + 2 steps + Damage Mod 2').toBe(5);
      expect(cast.results.healing, 'a spell with no healing heals nothing, whatever the Healing Mod').toBe(0);
      expect(cast.parameters.healingMod, 'the mod is still on the parameters').toBe(3);
      expect(await readCardRows(cast.card)).toMatchObject({
         damage: 'Damage: 5',
         healing: null,
      });

      // One step refunded lowers damage by 1 and keeps the mod.
      await aspectControl(aspectBlock(cast.card, 0), 'decrease').click();
      await expect.poll(async () => (await readCardRows(cast.card)).damage).toBe('Damage: 4');
      expect((await readScaling(gm, cast.id)).damage).toBe(4);
   });

   test('a healing-only spell adds the Healing Mod and no damage', async () => {
      // Healing 1 costs 1. Three successes leave 2 extra successes: 2 steps, healing 1 + 2 + Healing Mod 3 = 6.
      const cast = await castWith(boostedHealing.uuid, 3);
      expect(cast.results.healing, 'healing 1 + 2 steps + Healing Mod 3').toBe(6);
      expect(cast.results.damage, 'a spell with no damage deals none, whatever the Damage Mod').toBe(0);
      expect(await readCardRows(cast.card)).toMatchObject({
         damage: null,
         healing: 'Healing: 6',
      });
   });

   test('a spell with neither damage nor healing shows neither', async () => {
      const cast = await castWith(boostedPlain.uuid, 2);
      expect(cast.results.damage).toBe(0);
      expect(cast.results.healing).toBe(0);
      expect(await readCardRows(cast.card)).toMatchObject({
         damage: null,
         healing: null,
      });
   });

   test('a failed cast adds no mod', async () => {
      const cast = await castWith(boostedDamage.uuid, 0);
      expect(cast.results.succeeded).toBe(false);
      expect(cast.results.damage, 'a failed cast deals nothing, whatever the Damage Mod').toBe(0);
      expect((await readCardRows(cast.card)).damage).toBe(null);
   });

   test('the same spell on a caster with no mod keeps the plain amounts', async () => {
      // Presence on the boosted caster (damage 5 above), absence on the plain caster: 1 + 2 steps.
      const cast = await castWith(plainDamage.uuid, 3);
      expect(cast.parameters.damageMod, 'no mod').toBe(0);
      expect(cast.results.damage, 'damage 1 + 2 steps').toBe(3);
      expect((await readCardRows(cast.card)).damage).toBe('Damage: 3');
   });
});

test.describe('the Apply buttons of a casting card', () => {
   /** @type {string} The id of the target. */
   let targetId;
   /** @type {string} The id of the target's token. */
   let targetTokenId;
   /** @type {{id: string, uuid: string}} The boosted caster's damage and custom healing spell. */
   let spell;

   test.beforeAll(async () => {
      test.setTimeout(150_000);

      // The target has Body 6, Mind 1 and Soul 1, so the stamina maximum is ceil((6 + 1 + 1) * 2) = 16.
      targetId = await createActor(gm, {
         name: 'E2E DH Target',
         type: 'player',
      });
      await setAttributeBase(gm, `Actor.${targetId}`, 'body', 6);
      await viewScene(gm, await shared(gm, 'scene'));
      targetTokenId = await placeToken(gm, targetId);
      spell = await buildSpell(gm, boostedId, 'E2E DH Apply Spell', {
         standard: [{ label: 'damage' }],
         custom: [
            {
               label: 'Mend',
               cost: 2,
               initialValue: 2,
               healing: true,
            },
         ],
      });
      await closeAllApps(gm);
   });

   /**
    * Reads the target's current Stamina.
    * @returns {Promise<number>} The Stamina.
    */
   function readStamina() {
      return gm.evaluate((id) => game.actors.get(id).system.resource.stamina.value, targetId);
   }

   test('Apply Damage, Half Damage, Ignore Armor, Heal and Heal N Damage change the target\'s Stamina by the card\'s '
      + 'current amounts', async () => {
      test.setTimeout(120_000);
      await setResource(gm, `Actor.${targetId}`, 'stamina', 12);
      expect(await gm.evaluate((id) => game.actors.get(id).system.resource.stamina.max, targetId), 'maximum 16')
         .toBe(16);

      // Five successes against Complexity 1 leave 4 extra successes, which the two affordable aspects leave unspent:
      // damage 1 + Damage Mod 2 = 3 and healing 2 + Healing Mod 3 = 5.
      const cast = await castWith(spell.uuid, 5);
      expect(cast.results.damage).toBe(3);
      expect(cast.results.healing).toBe(5);
      await closeAllApps(gm);
      await targetPlacedToken(gm, targetTokenId);

      /** @type {import('@playwright/test').Locator} The card's damage buttons: damage, ignore armor, half, heal. */
      const damageButtons = cast.card.locator('.damage-buttons .button button');
      await expect(damageButtons, 'the card offers four damage buttons').toHaveCount(4);

      // Apply Damage at the roll's 3: 12 - 3 = 9.
      await damageButtons.nth(0).click();
      await expect.poll(readStamina, { message: 'Apply Damage took 3' }).toBe(9);

      // The Heal N Damage button heals the card's 5: 9 + 5 = 14.
      await cast.card.getByRole('button', { name: 'Heal 5 Damage' }).click();
      await expect.poll(readStamina, { message: 'Heal 5 Damage restored 5' }).toBe(14);

      // Two damage steps (1 each) and one Mend step (2 for 2): damage 5, healing 7.
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 0), 'increase').click();
      await aspectControl(aspectBlock(cast.card, 1), 'increase').click();
      await expect.poll(() => readScaling(gm, cast.id), { message: 'the steps are stored' }).toMatchObject({
         damage: 5,
         healing: 7,
      });
      await expect(cast.card.getByRole('button', { name: 'Heal 7 Damage' }), 'the button follows the healing')
         .toBeVisible();

      // Apply Damage at 5: 14 - 5 = 9.
      await damageButtons.nth(0).click();
      await expect.poll(readStamina, { message: 'Apply Damage took 5' }).toBe(9);

      // Half Damage is floor(5 / 2) = 2: 9 - 2 = 7.
      await damageButtons.nth(2).click();
      await expect.poll(readStamina, { message: 'Half Damage took 2' }).toBe(7);

      // Ignore Armor takes all 5 from a target with no armor: 7 - 5 = 2.
      await damageButtons.nth(1).click();
      await expect.poll(readStamina, { message: 'Ignore Armor took 5' }).toBe(2);

      // The heal button of the damage row heals the damage amount, 5: 2 + 5 = 7.
      await damageButtons.nth(3).click();
      await expect.poll(readStamina, { message: 'the damage row\'s heal button restored 5' }).toBe(7);

      // Heal 7 Damage: 7 + 7 = 14.
      await cast.card.getByRole('button', { name: 'Heal 7 Damage' }).click();
      await expect.poll(readStamina, { message: 'Heal 7 Damage restored 7' }).toBe(14);
   });

   test('healing stops at the Stamina maximum', async () => {
      await setResource(gm, `Actor.${targetId}`, 'stamina', 14);

      // Healing 5 would reach 19; the maximum is 16.
      const cast = await castWith(spell.uuid, 5);
      await targetPlacedToken(gm, targetTokenId);
      await cast.card.getByRole('button', { name: 'Heal 5 Damage' }).click();
      await expect.poll(readStamina, { message: 'healing stopped at the maximum' }).toBe(16);
   });
});
