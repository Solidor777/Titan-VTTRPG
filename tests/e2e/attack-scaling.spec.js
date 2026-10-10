import { expect, test } from './harness.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import { addAttack, addRulesElement, addTrait, createOwnedItem, setAttackStat, setEquipped } from './flows.js';
import { setClientSetting } from './settings.js';
import {
   cardButton,
   cardOf,
   createCharacter,
   openWeaponRow,
   readResultRows,
   rollWeaponAttack,
   setMultiAttack,
   setPlusExtraSuccesses,
} from './checkCards.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Damage scaling of attack checks, multi-attacks and the critical hits Expertise buys. Every attacker has Body 11, so
 * an attack rolls 11 dice against Difficulty 4 and Complexity 1 (nothing is targeted, so the attacker's own Melee is
 * the Defense). The rules (Counting Extra Successes, Multi-Attack): an attack deals its listed Damage plus 1 per extra
 * success when it lists "+ ES"; a Multi-Attack halves the dice, rounding down unless the attack has Flurry, and halves
 * the Expertise, always rounding down. Every die is forced: a 6 is a critical success, a 4 a plain success, a 3 a
 * failure that one Expertise turns into a 4, and a 5 a success that one Expertise turns into a 6.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who builds the documents and rolls. */
let gm;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {string} The uuid of the scaling attacker's blade: attack 0 adds its extra successes, attack 1 does not. */
let scaleBlade;
/** @type {string} The uuid of the boosted attacker's blade (damage 3 and a Damage Mod of +2). */
let boostBlade;
/** @type {string} The uuid of the multi-attacker's blade: attack 0 is plain, 1 has Flurry, 2 has Cleave. */
let multiBlade;
/** @type {string} The uuid of the multi-attacker. */
let multiUuid;
/** @type {string} The id of the multi-attacker's blade. */
let multiBladeId;

/**
 * Builds the faces of an eleven-dice roll from a number of dice of one face and a filler face for the rest.
 * @param {number} count - How many dice show the face.
 * @param {number} face - The face of those dice.
 * @param {number} filler - The face of the other dice.
 * @returns {number[]} The eleven faces, in roll order.
 */
function faces(count, face, filler = 2) {
   return [
      ...Array.from({ length: count }, () => face),
      ...Array.from({ length: 11 - count }, () => filler),
   ];
}

/**
 * Rolls an attack of a weapon with forced dice and opens its card.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {number} index - The position of the attack among the weapon's attacks.
 * @param {number[]} roll - The eleven faces.
 * @returns {Promise<{id: string, parameters: object, results: object, card: import('@playwright/test').Locator}>} The
 * message and its card in the GM's chat log.
 */
async function attackWith(weaponUuid, index, roll) {
   await forceDice(gm, roll);

   /** @type {{id: string, parameters: object, results: object}} The roll. */
   const message = await rollWeaponAttack(gm, weaponUuid, index);
   await resetDice(gm);
   await closeAllApps(gm);
   await showChatLog(gm);
   return {
      ...message,
      card: cardOf(gm, message.id),
   };
}

/**
 * Reads the text of the stat tags of an attack card.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @returns {Promise<string[]>} The whitespace-normalised text of each tag.
 */
function readStatTags(card) {
   return card.locator('.stats .stat').evaluateAll(
      (nodes) => nodes.map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
   );
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(600_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   await setClientSetting(gm, 'getCheckOptions', 'never');

   // The scaling attacker: a blade with two attacks of 3 damage; the second does not add its extra successes.
   /** @type {string} The id of the scaling attacker. */
   const scalerId = await createCharacter(gm, 'E2E Scale Attacker', { body: 11 });
   scaleBlade = `Actor.${scalerId}.Item.${await createOwnedItem(gm, scalerId, 'weapon', 'E2E Scale Blade')}`;
   await addAttack(gm, scaleBlade);
   await setAttackStat(gm, scaleBlade, 0, 'damage', 3);
   await setAttackStat(gm, scaleBlade, 1, 'damage', 3);
   await setPlusExtraSuccesses(gm, scaleBlade, 1, false);

   // The boosted attacker: an ability adds +2 to the damage of every attack.
   /** @type {string} The id of the boosted attacker. */
   const boostedId = await createCharacter(gm, 'E2E Scale Booster', { body: 11 });
   boostBlade = `Actor.${boostedId}.Item.${await createOwnedItem(gm, boostedId, 'weapon', 'E2E Boost Blade')}`;
   await setAttackStat(gm, boostBlade, 0, 'damage', 3);
   await addRulesElement(
      gm,
      `Actor.${boostedId}.Item.${await createOwnedItem(gm, boostedId, 'ability', 'E2E Boost')}`,
      {
         operation: 'conditionalCheckModifier',
         modifierType: 'damage',
         checkType: 'attack',
         selector: 'any',
         value: 2,
      },
   );

   // The multi-attacker: Expertise 5 in Melee Weapons from an ability; a blade with a plain, a Flurry and a Cleave
   // attack, equipped so that its row shows the attacks.
   /** @type {string} The id of the multi-attacker. */
   const multiId = await createCharacter(gm, 'E2E Scale Multi', { body: 11 });
   multiUuid = `Actor.${multiId}`;
   await addRulesElement(gm, `${multiUuid}.Item.${await createOwnedItem(gm, multiId, 'ability', 'E2E Expertise')}`, {
      selector: 'expertise',
      key: 'meleeWeapons',
      value: 5,
   });
   multiBladeId = await createOwnedItem(gm, multiId, 'weapon', 'E2E Multi Blade');
   multiBlade = `${multiUuid}.Item.${multiBladeId}`;
   await addAttack(gm, multiBlade);
   await addAttack(gm, multiBlade);
   await addTrait(gm, multiBlade, 'Flurry', { attackIndex: 1 });
   await addTrait(gm, multiBlade, 'Cleave', { attackIndex: 2 });
   await setEquipped(gm, multiId, multiBladeId, true);
   await closeAllApps(gm);
});

test.afterEach(async () => {
   await resetDice(gm);
   await closeAllApps(gm);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await gm?.close();
});

test.describe('damage grows with the extra successes', () => {
   // Successes against Complexity 1 bank (successes - 1) extra successes, and the attack adds one damage for each.
   for (const [successes, damage] of [
      [
         1,
         3,
      ],
      [
         2,
         4,
      ],
      [
         6,
         8,
      ],
   ]) {
      test(`${successes} on the dice: 3 + ${successes - 1} extra = ${damage} damage`,
         async () => {
            const attack = await attackWith(scaleBlade, 0, faces(successes, 4));
            expect(attack.parameters.plusExtraSuccessDamage).toBe(true);
            expect(attack.parameters.damage, 'the attack\'s listed damage').toBe(3);
            expect(attack.results.extraSuccesses).toBe(successes - 1);
            expect(attack.results.damage).toBe(damage);
            expect(await readResultRows(attack.card)).toMatchObject({
               dc: 'DC 4:1',
               successes: `${successes} Successes`,
               outcome: 'Succeeded',
               rows: expect.arrayContaining([`Damage: ${damage}`]),
            });
         });
   }

   test('an attack without "+ ES" deals its listed damage whatever the extra successes', async () => {
      const attack = await attackWith(scaleBlade, 1, faces(6, 4));
      expect(attack.parameters.plusExtraSuccessDamage).toBe(false);
      expect(attack.results.extraSuccesses, 'five extra successes').toBe(5);
      expect(attack.results.damage, 'still the listed 3').toBe(3);
      expect((await readResultRows(attack.card)).rows).toContain('Damage: 3');
   });

   test('a failed attack deals no damage and offers no damage button', async () => {
      const hit = await attackWith(scaleBlade, 0, faces(1, 4));
      await expect(cardButton(hit.card, 'apply'), 'a hit has the damage buttons').toHaveCount(1);
      const miss = await attackWith(scaleBlade, 0, faces(0, 4));
      expect(miss.results.succeeded).toBe(false);
      expect(miss.results.damage).toBe(0);
      expect((await readResultRows(miss.card)).outcome, 'the failed card is mounted').toBe('Failed');
      await expect(cardButton(miss.card, 'apply')).toHaveCount(0);
   });

   test('a Damage Mod adds to the listed damage before the extra successes', async () => {
      // Three successes bank 2 extra successes: 3 + 2 (mod) + 2 = 7.
      const attack = await attackWith(boostBlade, 0, faces(3, 4));
      expect(attack.parameters.damageMod).toBe(2);
      expect(attack.results.damage).toBe(7);
      expect((await readResultRows(attack.card)).rows).toContain('Damage: 7');
   });
});

test.describe('multi-attack halves the dice and the Expertise', () => {
   test('the weapon row shows the halved dice and Expertise, and the toggle restores them', async () => {
      const row = await openWeaponRow(gm, multiUuid, multiBladeId);
      const dice = row.getByTestId('attack-row-dice').first().locator('.value');
      const expertise = row.getByTestId('attack-row-expertise').first().locator('.value');
      await expect(dice, 'Body 11 rolls 11 dice').toHaveText('11');
      await expect(expertise, 'Expertise 5').toHaveText('5');

      await setMultiAttack(gm, row, multiBlade, true);
      await expect(dice, 'half of 11 rounded down').toHaveText('5');
      await expect(expertise, 'half of 5 rounded down').toHaveText('2');

      // The Flurry attack rounds the dice up.
      await expect(row.getByTestId('attack-row-dice').nth(1).locator('.value'), 'half of 11 rounded up')
         .toHaveText('6');
      await expect(row.getByTestId('attack-row-expertise').nth(1).locator('.value')).toHaveText('2');

      await setMultiAttack(gm, row, multiBlade, false);
      await expect(dice).toHaveText('11');
      await expect(expertise).toHaveText('5');
   });

   test('a normal attack spends all 5 Expertise: eleven 3s become five successes', async () => {
      const attack = await attackWith(multiBlade, 0, faces(11, 3));
      expect(attack.parameters).toMatchObject({
         multiAttack: false,
         totalDice: 11,
         totalExpertise: 5,
      });
      expect(attack.results.successes, 'five 3s become 4s').toBe(5);
      expect(attack.results.expertiseRemaining).toBe(0);
      expect(attack.results.extraSuccesses).toBe(4);
      expect(attack.results.damage, '1 + 4').toBe(5);
   });

   test('a multi-attack rolls 5 dice with 2 Expertise, twice, and each card shows the tag', async () => {
      const row = await openWeaponRow(gm, multiUuid, multiBladeId);
      await setMultiAttack(gm, row, multiBlade, true);
      await closeAllApps(gm);
      for (const label of [
         'first',
         'second',
      ]) {
         const attack = await attackWith(multiBlade, 0, faces(11, 3));
         expect(attack.parameters, `the ${label} attack`).toMatchObject({
            multiAttack: true,
            totalDice: 5,
            totalExpertise: 2,
         });
         expect(attack.results.dice.length).toBe(5);
         expect(attack.results.successes, 'two 3s become 4s').toBe(2);
         expect(attack.results.expertiseRemaining).toBe(0);
         expect(attack.results.damage, '1 + 1 extra success').toBe(2);
         expect(await readStatTags(attack.card)).toContainEqual(expect.stringContaining('Multi-Attack'));
      }
   });

   test('a Flurry multi-attack rolls 6 dice with 2 Expertise', async () => {
      const attack = await attackWith(multiBlade, 1, faces(11, 3));
      expect(attack.parameters).toMatchObject({
         multiAttack: true,
         flurry: true,
         totalDice: 6,
         totalExpertise: 2,
      });
      expect(attack.results.dice.length).toBe(6);
      expect(attack.results.successes).toBe(2);
   });

   test('turning Multi Attack off restores the full dice pool', async () => {
      const row = await openWeaponRow(gm, multiUuid, multiBladeId);
      await setMultiAttack(gm, row, multiBlade, false);
      await closeAllApps(gm);
      const attack = await attackWith(multiBlade, 1, faces(11, 3));
      expect(attack.parameters).toMatchObject({
         multiAttack: false,
         totalDice: 11,
         totalExpertise: 5,
      });
   });
});

test.describe('Expertise buys the critical successes that Cleave counts', () => {
   test('a Cleave attack turns spare Expertise into 6s: eleven 5s become five Cleave', async () => {
      // Every die is already a success, so nothing is spent on failures; the 5 Expertise raise five 5s to 6s.
      const cleave = await attackWith(multiBlade, 2, faces(11, 5));
      expect(cleave.results.successes).toBe(11);
      expect(cleave.results.criticalSuccesses, 'five 5s became 6s').toBe(5);
      expect(cleave.results.expertiseRemaining).toBe(0);
      expect((await readResultRows(cleave.card)).rows).toContain('Cleave: 5');
      await expect(cardButton(cleave.card, 'cleave')).toHaveCount(1);
   });

   test('an attack without Cleave or Rend keeps the Expertise and shows no Cleave', async () => {
      const plain = await attackWith(multiBlade, 0, faces(11, 5));
      expect(plain.results.criticalSuccesses).toBe(0);
      expect(plain.results.expertiseRemaining, 'the Expertise is not spent').toBe(5);
      expect((await readResultRows(plain.card)).outcome, 'the card is mounted and succeeded').toBe('Succeeded');
      await expect(cardButton(plain.card, 'cleave')).toHaveCount(0);
   });
});
