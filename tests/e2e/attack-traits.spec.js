import { expect, test } from './harness.js';
import { forceDice, resetDice } from './dice.js';
import { login } from './fixtures.js';
import { addAttack, addTrait, createOwnedItem, setResource } from './flows.js';
import { setClientSetting, setWorldSetting } from './settings.js';
import {
   cardButton,
   addValuedAttackTrait,
   cardOf,
   createCharacter,
   pressDamageButton,
   pressRendButton,
   readArmorValue,
   readResultRows,
   readVitals,
   rollWeaponAttack,
   setArmorValue,
   wearArmor,
} from './checkCards.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Attack traits, alone and combined, on the attack card and in the damage the card applies. The attacker has Body 11,
 * so every attack rolls 11 dice against Difficulty 4 and Complexity 1 (nothing is targeted, so the attacker's own Melee
 * is the Defense). Every attack deals 1 damage plus 1 per extra success, so s successes deal 1 + (s - 1) = s damage.
 * Every die is forced: a 6 is a critical success (a success that Cleave and Rend count), a 4 a plain success and a 2 a
 * failure. The rules text of each trait is in "Attack Traits" of the Rules Compendium; Penetrating ignores half of the
 * Armor, rounded up (the rules revision that the damage resistance helper implements). Vicious adds a Wound to the
 * Wounds an attack inflicts, and the Ineffective limit of 1 Wound applies after it.
 */

/** @type {number} The radius typed for the Blast trait, whose value is a number. */
const BLAST_RADIUS = 2;

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who builds the documents and rolls. */
let gm;
/** @type {string[]} Uncaught page errors collected on the GM's page during the current test. */
let errors;
/** @type {string} The id of the attacker. */
let attackerId;
/** @type {Record<string, string>} The id of each defender, by name. */
const defenders = {};
/** @type {Record<string, string>} The uuid of the armor each armored defender wears, by defender name. */
const armors = {};
/** @type {Record<string, string>} The uuid of each weapon, by name. */
const weapons = {};

/**
 * The traits of the attack that has no mechanical effect on the card or on the damage: they are tags the GM
 * adjudicates. The label is the trait's name in the Edit Traits dialog.
 * @type {{name: string, label: string}[]}
 */
const TAG_TRAITS = [
   {
      name: 'blast',
      label: 'Blast',
   },
   {
      name: 'close',
      label: 'Close',
   },
   {
      name: 'crushing',
      label: 'Crushing',
   },
   {
      name: 'loud',
      label: 'Loud',
   },
   {
      name: 'piercing',
      label: 'Piercing',
   },
   {
      name: 'push',
      label: 'Push',
   },
   {
      name: 'reload',
      label: 'Reload',
   },
   {
      name: 'restraining',
      label: 'Restraining',
   },
   {
      name: 'slashing',
      label: 'Slashing',
   },
   {
      name: 'splash',
      label: 'Splash',
   },
   {
      name: 'twoHanded',
      label: 'Two-Handed',
   },
];

/**
 * The traits the attack check reads: each sets a flag of the same name in the check's parameters.
 * @type {{name: string, label: string}[]}
 */
const FLAG_TRAITS = [
   {
      name: 'cleave',
      label: 'Cleave',
   },
   {
      name: 'flurry',
      label: 'Flurry',
   },
   {
      name: 'ineffective',
      label: 'Ineffective',
   },
   {
      name: 'magical',
      label: 'Magical',
   },
   {
      name: 'penetrating',
      label: 'Penetrating',
   },
   {
      name: 'rend',
      label: 'Rend',
   },
   {
      name: 'vicious',
      label: 'Vicious',
   },
];

/**
 * The attacks of the combination weapon, in order, each with the traits it carries.
 * @type {Record<string, number>}
 */
const COMBO = {
   plain: 0,
   ineffectivePenetrating: 1,
   cleavePenetrating: 2,
   everything: 3,
   rendMagical: 4,
   cleaveRend: 5,
   allTags: 6,
   viciousIneffective: 7,
};

/**
 * Builds the faces of an eleven-dice roll: critical successes (6s), plain successes (4s) and failures (2s).
 * @param {number} crits - How many dice are 6s.
 * @param {number} plain - How many dice are plain successes (4s).
 * @returns {number[]} The eleven faces, in roll order.
 */
function faces(crits, plain) {
   return [
      ...Array.from({ length: crits }, () => 6),
      ...Array.from({ length: plain }, () => 4),
      ...Array.from({ length: 11 - crits - plain }, () => 2),
   ];
}

/**
 * Rolls an attack of a weapon with forced dice and opens its card.
 * @param {string} weaponName - The weapon's name in `weapons`.
 * @param {number} index - The position of the attack among the weapon's attacks.
 * @param {number[]} roll - The eleven faces.
 * @returns {Promise<{id: string, parameters: object, results: object, card: import('@playwright/test').Locator}>} The
 * message and its card in the GM's chat log.
 */
async function attackWith(weaponName, index, roll) {
   await forceDice(gm, roll);

   /** @type {{id: string, parameters: object, results: object}} The roll. */
   const message = await rollWeaponAttack(gm, weapons[weaponName], index);
   await resetDice(gm);
   await closeAllApps(gm);
   await showChatLog(gm);
   return {
      ...message,
      card: cardOf(gm, message.id),
   };
}

/**
 * Reads the text of the stat tags of an attack card: the attack type, range, multi-attack and traits.
 * @param {import('@playwright/test').Locator} card - The card's chat log entry.
 * @returns {Promise<string[]>} The whitespace-normalised text of each tag.
 */
function readStatTags(card) {
   return card.locator('.stats .stat').evaluateAll(
      (nodes) => nodes.map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
   );
}

/**
 * Tops a defender's Stamina up to its maximum with the Stamina input of the sheet.
 * @param {string} name - The defender's name in `defenders`.
 * @returns {Promise<void>} Resolves once the defender has full Stamina.
 */
async function restoreStamina(name) {
   /** @type {{stamina: number, staminaMax: number}} The defender's Stamina. */
   const { stamina, staminaMax } = await readVitals(gm, defenders[name]);
   if (stamina < staminaMax) {
      await setResource(gm, `Actor.${defenders[name]}`, 'stamina', staminaMax);
      await closeAllApps(gm);
   }
}

/**
 * Sets a defender's worn Armor back to its full value, so that a test that rends it does not depend on another test.
 * @param {string} name - The defender's name in `armors`.
 * @param {number} value - The full Armor value.
 * @returns {Promise<void>} Resolves once the defender wears the Armor at the value.
 */
async function restoreArmor(name, value) {
   await setArmorValue(gm, armors[name], value);
   await closeAllApps(gm);
   expect(await readArmorValue(gm, defenders[name]), `${name} starts at full Armor`).toBe(value);
}

/**
 * Builds a weapon with a number of attacks and gives each attack its traits through the sheet's controls.
 * @param {string} name - The weapon's name; it starts with `E2E `.
 * @param {string[][]} attackTraits - The labels of the traits of each attack, in order.
 * @returns {Promise<string>} The weapon's uuid.
 */
async function buildWeapon(name, attackTraits) {
   /** @type {string} The weapon's uuid. */
   const uuid = `Actor.${attackerId}.Item.${await createOwnedItem(gm, attackerId, 'weapon', name)}`;
   for (let index = 1; index < attackTraits.length; index++) {
      await addAttack(gm, uuid);
   }
   for (const [index, labels] of attackTraits.entries()) {
      for (const label of labels) {
         if (label === 'Blast') {
            await addValuedAttackTrait(gm, uuid, index, label, BLAST_RADIUS);
         }
         else {
            await addTrait(gm, uuid, label, { attackIndex: index });
         }
      }
   }
   return uuid;
}

test.beforeAll(async ({ browser }) => {
   test.setTimeout(900_000);
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   await setClientSetting(gm, 'getCheckOptions', 'never');
   await setWorldSetting(gm, 'reportTakingDamage', true);
   await setWorldSetting(gm, 'reportRendingArmor', true);
   await setWorldSetting(gm, 'reportRepairingArmor', true);
   attackerId = await createCharacter(gm, 'E2E Trait Attacker', { body: 11 });

   // Defenders: Body 4, Mind 4 and Soul 2 give each 10 base attributes. Armor 5 (plain and Penetrating math), Armor 3
   // (Ineffective math, the everything attack), Armor 6 (Rend and Repair), Magical Armor 4 and no Armor.
   for (const [name, armor] of [
      [
         'armor5',
         5,
      ],
      [
         'armor3',
         3,
      ],
      [
         'armor6',
         6,
      ],
      [
         'magical4',
         4,
      ],
      [
         'none',
         0,
      ],
   ]) {
      defenders[name] = await createCharacter(gm, `E2E Trait Defender ${name}`, {
         body: 4,
         mind: 4,
         soul: 2,
      });
      if (armor > 0) {
         /** @type {string} The uuid of the worn armor. */
         const armorUuid = await wearArmor(gm, defenders[name], `E2E Trait Armor ${name}`, armor);
         armors[name] = armorUuid;
         if (name === 'magical4') {
            await addTrait(gm, armorUuid, 'Magical');
         }
      }
   }

   // Six weapons' worth of attacks: the tag traits, the traits the check reads, and combinations.
   weapons.tagsA = await buildWeapon('E2E Trait Tags A', TAG_TRAITS.slice(0, 6).map((trait) => [trait.label]));
   weapons.tagsB = await buildWeapon('E2E Trait Tags B', TAG_TRAITS.slice(6).map((trait) => [trait.label]));
   weapons.flags = await buildWeapon('E2E Trait Flags', FLAG_TRAITS.map((trait) => [trait.label]));
   weapons.combo = await buildWeapon('E2E Trait Combos', [
      [],
      [
         'Ineffective',
         'Penetrating',
      ],
      [
         'Cleave',
         'Penetrating',
      ],
      [
         'Cleave',
         'Rend',
         'Magical',
         'Penetrating',
         'Ineffective',
      ],
      [
         'Rend',
         'Magical',
      ],
      [
         'Cleave',
         'Rend',
      ],
      TAG_TRAITS.map((trait) => trait.label),
      [
         'Vicious',
         'Ineffective',
      ],
   ]);
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

test.describe('every trait shows on the attack card', () => {
   /**
    * Which flags of the check's parameters each trait sets (the traits the check reads set the flag of their name).
    * @type {Record<string, boolean>}
    */
   const NO_FLAGS = {
      cleave: false,
      flurry: false,
      ineffective: false,
      magical: false,
      penetrating: false,
      rend: false,
      vicious: false,
   };

   for (const [position, { name, label }] of TAG_TRAITS.entries()) {
      test(`${label}: a tag with no effect on the parameters or the damage`, async () => {
         // Three plain successes bank 2 extra successes: damage 1 + 2 = 3.
         /** @type {string} The name of the weapon that holds the trait. */
         const weapon = position < 6 ? 'tagsA' : 'tagsB';
         /** @type {object} The rolled attack and its card in the GM's chat log. */
         const check = await attackWith(weapon, position % 6, faces(0, 3));
         expect(check.parameters.attackTrait.map((trait) => trait.name)).toEqual([name]);
         expect(check.parameters.attackTrait[0].value, 'Blast keeps its radius, the others are set').toBe(
            name === 'blast' ? BLAST_RADIUS : true,
         );
         expect(check.parameters).toMatchObject(NO_FLAGS);
         expect(check.parameters.complexity, 'an attack check is always Complexity 1').toBe(1);
         expect(check.results.damage, '1 + 2 extra successes').toBe(3);
         expect(await readResultRows(check.card)).toMatchObject({
            dc: 'DC 4:1',
            successes: '3 Successes',
            outcome: 'Succeeded',
            rows: expect.arrayContaining(['Damage: 3']),
         });
         expect(await readStatTags(check.card), 'the trait is a tag of the card').toContainEqual(
            expect.stringContaining(label),
         );
         await expect(cardButton(check.card, 'cleave'), 'no Cleave button').toHaveCount(0);
      });
   }

   for (const [position, { name, label }] of FLAG_TRAITS.entries()) {
      test(`${label}: sets its flag of the check's parameters and no other`, async () => {
         /** @type {object} The rolled attack and its card in the GM's chat log. */
         const check = await attackWith('flags', position, faces(0, 3));
         expect(check.parameters.attackTrait.map((trait) => trait.name)).toEqual([name]);
         expect(check.parameters).toMatchObject({
            ...NO_FLAGS,
            [name]: true,
         });
         expect(check.results.damage, '1 + 2 extra successes').toBe(3);
         expect(await readStatTags(check.card), 'the trait is a tag of the card').toContainEqual(
            expect.stringContaining(label),
         );
      });
   }

   test('an attack with every tag trait at once keeps the damage of the plain attack', async () => {
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const plain = await attackWith('combo', COMBO.plain, faces(0, 8));
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const tagged = await attackWith('combo', COMBO.allTags, faces(0, 8));
      expect(plain.results.damage, '1 + 7 extra successes').toBe(8);
      expect(tagged.results.damage, 'the tags do not change the damage').toBe(8);
      expect(tagged.parameters.attackTrait.map((trait) => trait.name)).toEqual(TAG_TRAITS.map((trait) => trait.name));
      expect(tagged.parameters).toMatchObject(NO_FLAGS);

      // Applied to the Armor 5 defender, both deal 8 - 5 = 3.
      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const plainHit = await pressDamageButton(gm, plain.id, defenders.armor5, 'apply');
      expect(plainHit.report).toMatchObject({
         damageTaken: 3,
         damageResisted: 5,
      });
      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const taggedHit = await pressDamageButton(gm, tagged.id, defenders.armor5, 'apply');
      expect(taggedHit.report).toMatchObject({
         damageTaken: 3,
         damageResisted: 5,
      });
      expect(taggedHit.report.tags, 'no tag trait adds a tag to the report').toBeNull();
   });
});

test.describe('Armor against the damage buttons of an attack card', () => {
   test('a plain attack: Armor 5 resists 5 of 8, Ignore Armor resists none, Half damage resists all of 4', async () => {
      // Eight plain successes bank 7 extra successes: damage 8.
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.plain, faces(0, 8));
      expect(check.results.damage).toBe(8);

      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const apply = await pressDamageButton(gm, check.id, defenders.armor5, 'apply');
      expect(apply.report).toMatchObject({
         damageTaken: 3,
         damageResisted: 5,
         staminaLost: 3,
      });
      expect(apply.before.stamina - apply.after.stamina, 'the stamina falls by the damage taken').toBe(3);

      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const ignore = await pressDamageButton(gm, check.id, defenders.armor5, 'ignoreArmor');
      expect(ignore.report).toMatchObject({
         damageTaken: 8,
         ignoredArmor: true,
      });
      expect(ignore.before.stamina - ignore.after.stamina, 'Ignore Armor takes all 8').toBe(8);

      // Half of 8 is 4, which Armor 5 resists entirely.
      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const half = await pressDamageButton(gm, check.id, defenders.armor5, 'half');
      expect(half.report.damageResisted, 'half damage 4 is all resisted').toBe(4);
      expect(half.report.damageTaken ?? 0).toBe(0);
      expect(half.after.stamina, 'the stamina is unchanged').toBe(half.before.stamina);
   });

   test('Penetrating ignores half the Armor rounded up: Armor 5 resists 3, so 5 of 8 land and 1 of half', async () => {
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 4, faces(0, 8));
      expect(check.parameters.penetrating).toBe(true);
      expect(check.results.damage).toBe(8);

      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const apply = await pressDamageButton(gm, check.id, defenders.armor5, 'apply');
      expect(apply.report).toMatchObject({
         damageTaken: 5,
         damageResisted: 3,
         tags: { penetrating: true },
      });
      expect(apply.before.stamina - apply.after.stamina).toBe(5);

      // Half of 8 is 4: resisted 3, 1 lands.
      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const half = await pressDamageButton(gm, check.id, defenders.armor5, 'half');
      expect(half.report).toMatchObject({
         damageTaken: 1,
         damageResisted: 3,
      });

      // Ignore Armor resists nothing, whatever the trait.
      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const ignore = await pressDamageButton(gm, check.id, defenders.armor5, 'ignoreArmor');
      expect(ignore.report.damageTaken).toBe(8);
   });

   test('Ineffective doubles the Armor: Armor 3 resists 6, so 2 of 8 land', async () => {
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 2, faces(0, 8));
      expect(check.parameters.ineffective).toBe(true);
      await restoreStamina('armor3');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const apply = await pressDamageButton(gm, check.id, defenders.armor3, 'apply');
      expect(apply.report).toMatchObject({
         damageTaken: 2,
         damageResisted: 6,
         tags: { ineffective: true },
      });
      expect(apply.before.stamina - apply.after.stamina).toBe(2);
   });

   test('Ineffective and Penetrating together: Armor 3 doubles to 6 and halves to 3, so 5 of 8 land', async () => {
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.ineffectivePenetrating, faces(0, 8));
      expect(check.parameters).toMatchObject({
         ineffective: true,
         penetrating: true,
      });
      await restoreStamina('armor3');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const apply = await pressDamageButton(gm, check.id, defenders.armor3, 'apply');
      expect(apply.report).toMatchObject({
         damageTaken: 5,
         damageResisted: 3,
         tags: {
            ineffective: true,
            penetrating: true,
         },
      });
      expect(apply.before.stamina - apply.after.stamina).toBe(5);
   });

   test('Apply Half Damage on an attack card applies at least 1 damage', async () => {
      // One success deals 1 damage; half of 1 is still 1, which a defender with no Armor takes.
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.plain, faces(0, 1));
      expect(check.results.damage).toBe(1);
      await restoreStamina('none');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const half = await pressDamageButton(gm, check.id, defenders.none, 'half');
      expect(half.report.damageTaken, 'half of 1 is at least 1').toBe(1);
      expect(half.before.stamina - half.after.stamina).toBe(1);
   });

   test('a defender with no Armor takes all of the damage whatever the traits', async () => {
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.ineffectivePenetrating, faces(0, 8));
      await restoreStamina('none');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const apply = await pressDamageButton(gm, check.id, defenders.none, 'apply');
      expect(apply.report.damageTaken).toBe(8);
      expect(apply.report.damageResisted ?? 0).toBe(0);
      expect(apply.before.stamina - apply.after.stamina).toBe(8);
   });
});

test.describe('critical successes: Cleave and Rend', () => {
   test('Cleave counts the 6s: three 6s show Cleave 3 and the button deals 3', async () => {
      // Three 6s and two 4s: five successes bank 4 extra successes: damage 5; Cleave 3.
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 0, faces(3, 2));
      expect(check.results.criticalSuccesses).toBe(3);
      expect(check.results.damage).toBe(5);
      expect((await readResultRows(check.card)).rows).toEqual(expect.arrayContaining([
         'Damage: 5',
         'Cleave: 3',
      ]));
      await expect(cardButton(check.card, 'cleave')).toHaveCount(1);

      await restoreStamina('none');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const cleave = await pressDamageButton(gm, check.id, defenders.none, 'cleave');
      expect(cleave.report.damageTaken, 'one damage per 6').toBe(3);
      expect(cleave.before.stamina - cleave.after.stamina).toBe(3);
   });

   test('a Cleave attack with no 6 shows no Cleave row and no Cleave button', async () => {
      // The same Cleave button is on the card of a Cleave attack with 6s and off the card of one without.
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const withSixes = await attackWith('flags', 0, faces(2, 3));
      await expect(cardButton(withSixes.card, 'cleave'), 'two 6s offer the Cleave button').toHaveCount(1);
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 0, faces(0, 5));
      expect(check.results.criticalSuccesses).toBe(0);
      expect((await readResultRows(check.card)).rows, 'the card is mounted with its damage row')
         .toEqual([
            'Extra Successes: 4',
            'Damage: 5',
         ]);
      await expect(cardButton(check.card, 'apply'), 'the damage buttons are on the card').toHaveCount(1);
      await expect(cardButton(check.card, 'cleave')).toHaveCount(0);
   });

   test('Cleave damage uses the attack\'s Penetrating: four 6s vs Armor 5 resist 3, so 1 lands', async () => {
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.cleavePenetrating, faces(4, 0));
      expect(check.results.criticalSuccesses).toBe(4);
      await restoreStamina('armor5');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const cleave = await pressDamageButton(gm, check.id, defenders.armor5, 'cleave');
      expect(cleave.report).toMatchObject({
         damageTaken: 1,
         damageResisted: 3,
      });
   });

   test('Rend counts the 6s: three 6s show Rend 3, rend 3 of Armor 6, repair 3 restores it', async () => {
      await restoreArmor('armor6', 6);
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 5, faces(3, 0));
      expect(check.parameters.rend).toBe(true);
      expect(check.results.criticalSuccesses).toBe(3);
      expect((await readResultRows(check.card)).rows).toContain('Rend: 3');

      /** @type {object} The report and the worn Armor value around the click. */
      const rend = await pressRendButton(gm, check.id, defenders.armor6, 'rend');
      expect(rend.before).toBe(6);
      expect(rend.after, 'one Armor per 6').toBe(3);
      expect(rend.report).toMatchObject({
         rend: 3,
         armorLost: 3,
      });

      /** @type {object} The report and the worn Armor value around the click. */
      const repair = await pressRendButton(gm, check.id, defenders.armor6, 'repair');
      expect(repair.after, 'the repair restores the 3').toBe(6);
      expect(repair.report.armorRepaired).toBe(3);

      // The same Rend and Repair buttons are off the card of a Rend attack with no 6 and off a Cleave attack with 6s.
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const noSix = await attackWith('flags', 5, faces(0, 3));
      expect(noSix.results.criticalSuccesses).toBe(0);
      await expect(cardButton(noSix.card, 'rend'), 'no 6 offers no Rend button').toHaveCount(0);
      await expect(cardButton(noSix.card, 'repair'), 'no 6 offers no Repair button').toHaveCount(0);
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const notRend = await attackWith('flags', 0, faces(3, 0));
      expect(notRend.parameters.rend).toBe(false);
      await expect(cardButton(notRend.card, 'rend'), 'a non-Rend attack offers no Rend button').toHaveCount(0);
      await expect(cardButton(notRend.card, 'repair'), 'a non-Rend attack offers no Repair button').toHaveCount(0);
   });

   test('Rend is limited by the Armor left and Repair by the Armor lost', async () => {
      // Five 6s rend an Armor 6 defender by 5, then 5 more by the 1 left.
      await restoreArmor('armor6', 6);
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 5, faces(5, 0));
      /** @type {object} The report and the worn Armor value around the click. */
      const first = await pressRendButton(gm, check.id, defenders.armor6, 'rend');
      expect(first.after).toBe(1);
      /** @type {object} The report and the worn Armor value around the click. */
      const second = await pressRendButton(gm, check.id, defenders.armor6, 'rend');
      expect(second.after, 'Armor cannot fall below 0').toBe(0);
      expect(second.report.armorLost, 'only the 1 left is lost').toBe(1);

      // Repairs of 5 restore 5, then only the 1 missing.
      /** @type {object} The report and the worn Armor value around the click. */
      const repaired = await pressRendButton(gm, check.id, defenders.armor6, 'repair');
      expect(repaired.after).toBe(5);
      /** @type {object} The report and the worn Armor value around the click. */
      const repairedAgain = await pressRendButton(gm, check.id, defenders.armor6, 'repair');
      expect(repairedAgain.after, 'Armor cannot exceed its maximum').toBe(6);
      expect(repairedAgain.report.armorRepaired).toBe(1);
   });

   test('Rend cannot destroy Magical Armor unless the attack is Magical', async () => {
      // A non-Magical Rend attack of three 6s leaves Magical Armor 4 as it is.
      await restoreArmor('magical4', 4);
      expect(
         await gm.evaluate(
            (id) => game.actors.get(id).system.getEquippedArmor().system.trait.map((trait) => trait.name),
            defenders.magical4,
         ),
         'the worn Armor carries the Magical trait',
      ).toEqual(['magical']);
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const plainRend = await attackWith('flags', 5, faces(3, 0));
      /** @type {object} The report and the worn Armor value around the click. */
      const resisted = await pressRendButton(gm, plainRend.id, defenders.magical4, 'rend');
      expect(resisted.after, 'the Magical Armor is untouched').toBe(4);
      expect(resisted.report.armorLost ?? 0).toBe(0);
      expect(resisted.report.rend, 'the report shows the rend that was resisted').toBe(3);

      // A Magical Rend attack of three 6s rends it by 3.
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const magicalRend = await attackWith('combo', COMBO.rendMagical, faces(3, 0));
      expect(magicalRend.parameters).toMatchObject({
         magical: true,
         rend: true,
      });
      /** @type {object} The report and the worn Armor value around the click. */
      const rent = await pressRendButton(gm, magicalRend.id, defenders.magical4, 'rend');
      expect(rent.after).toBe(1);
      expect(rent.report.armorLost).toBe(3);
      /** @type {object} The report and the worn Armor value around the click. */
      const repaired = await pressRendButton(gm, magicalRend.id, defenders.magical4, 'repair');
      expect(repaired.after).toBe(4);
   });

   test('Cleave and Rend on one attack show both rows and both buttons', async () => {
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.cleaveRend, faces(2, 1));
      expect(check.results.criticalSuccesses).toBe(2);
      expect((await readResultRows(check.card)).rows).toEqual(expect.arrayContaining([
         'Rend: 2',
         'Cleave: 2',
      ]));
      await expect(cardButton(check.card, 'cleave')).toHaveCount(1);
      await expect(cardButton(check.card, 'rend')).toHaveCount(1);
      await expect(cardButton(check.card, 'repair')).toHaveCount(1);
   });
});

test.describe('every mechanical trait on one attack', () => {
   test('damage, Cleave, Rend and Repair apply the traits together', async () => {
      // Three 6s and two 4s: five successes bank 4 extra successes: damage 5; Cleave 3; Rend 3.
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.everything, faces(3, 2));
      expect(check.parameters).toMatchObject({
         cleave: true,
         rend: true,
         magical: true,
         penetrating: true,
         ineffective: true,
      });
      expect(check.results.damage).toBe(5);
      expect((await readResultRows(check.card)).rows).toEqual(expect.arrayContaining([
         'Damage: 5',
         'Rend: 3',
         'Cleave: 3',
      ]));

      // Armor 3 doubles to 6 and halves to 3: 2 of the 5 land.
      await restoreArmor('armor3', 3);
      await restoreStamina('armor3');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const apply = await pressDamageButton(gm, check.id, defenders.armor3, 'apply');
      expect(apply.report).toMatchObject({
         damageTaken: 2,
         damageResisted: 3,
         tags: {
            ineffective: true,
            penetrating: true,
         },
      });

      // The 3 Cleave damage meets the same 3 Armor: none lands.
      await restoreStamina('armor3');
      /** @type {object} The damage report and the defender's vitals around the click. */
      const cleave = await pressDamageButton(gm, check.id, defenders.armor3, 'cleave');
      expect(cleave.report.damageTaken ?? 0).toBe(0);
      expect(cleave.report.damageResisted).toBe(3);

      // The attack is Magical, so Rend takes the Armor from 3 to 0, and Repair restores it.
      /** @type {object} The report and the worn Armor value around the click. */
      const rend = await pressRendButton(gm, check.id, defenders.armor3, 'rend');
      expect(rend.after).toBe(0);
      /** @type {object} The report and the worn Armor value around the click. */
      const repair = await pressRendButton(gm, check.id, defenders.armor3, 'repair');
      expect(repair.after).toBe(3);
      expect(await readArmorValue(gm, defenders.armor3)).toBe(3);
   });
});

test.describe('Wounds that an attack inflicts', () => {
   /** @type {string} The uuid of the defender that the tests bring down to 1 Stamina and no Wounds. */
   let woundedUuid;

   test.beforeAll(async () => {
      test.setTimeout(120_000);
      defenders.wounded = await createCharacter(gm, 'E2E Trait Defender wounded', {
         body: 4,
         mind: 4,
         soul: 2,
      });
      woundedUuid = `Actor.${defenders.wounded}`;
      await closeAllApps(gm);
   });

   /**
    * Sets the defender to 1 Stamina and no Wounds with the resource inputs of the sheet.
    * @returns {Promise<void>} Resolves once the defender holds the values.
    */
   async function weaken() {
      await setResource(gm, woundedUuid, 'stamina', 1);
      await setResource(gm, woundedUuid, 'wounds', 0);
      await closeAllApps(gm);
      expect(await readVitals(gm, defenders.wounded), 'the defender starts at 1 Stamina and 0 Wounds').toMatchObject({
         stamina: 1,
         wounds: 0,
      });
   }

   test('a plain attack that overshoots the Stamina by 5 or more inflicts 3 Wounds', async () => {
      // Eight successes deal 8 damage: 1 Stamina is lost and the 7 left over are 5 or more, which are 3 Wounds.
      await weaken();
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.plain, faces(0, 8));
      /** @type {object} The damage report and the defender's vitals around the click. */
      const hit = await pressDamageButton(gm, check.id, defenders.wounded, 'apply');
      expect(hit.report).toMatchObject({
         damageTaken: 8,
         staminaLost: 1,
         woundsSuffered: 3,
      });
      expect(hit.after).toMatchObject({
         stamina: 0,
         wounds: 3,
      });
   });

   test('Ineffective attacks can only inflict 1 Wound per attack', async () => {
      // The same 8 damage on the same defender would be 3 Wounds; Ineffective limits it to 1.
      await weaken();
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 2, faces(0, 8));
      expect(check.parameters.ineffective).toBe(true);
      /** @type {object} The damage report and the defender's vitals around the click. */
      const hit = await pressDamageButton(gm, check.id, defenders.wounded, 'apply');
      expect(hit.report.damageTaken).toBe(8);
      expect(hit.report.woundsSuffered, 'at most 1 Wound').toBe(1);
      expect(hit.after.wounds).toBe(1);
   });

   test('Vicious adds 1 Wound when the attack inflicts Wounds', async () => {
      // Two successes deal 2 damage: 1 Stamina is lost and the 1 left over is 1 Wound, which Vicious raises to 2.
      await weaken();
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 6, faces(0, 2));
      expect(check.parameters.attackTrait.map((trait) => trait.name)).toEqual(['vicious']);
      expect(check.parameters.vicious, 'the check stores the flag').toBe(true);
      expect(check.results.damage, '1 + 1 extra success').toBe(2);
      /** @type {object} The damage report and the defender's vitals around the click. */
      const hit = await pressDamageButton(gm, check.id, defenders.wounded, 'apply');
      expect(hit.report, 'the 2 damage took 1 Stamina and 1 left over').toMatchObject({
         damageTaken: 2,
         staminaLost: 1,
         woundsSuffered: 2,
      });
      expect(hit.after, 'the defender holds the 2 Wounds').toMatchObject({
         stamina: 0,
         wounds: 2,
      });
   });

   test('Vicious and Ineffective together inflict at most 1 Wound', async () => {
      // The same 2 damage would be 2 Wounds with Vicious; Ineffective limits an attack to 1 Wound per attack.
      await weaken();
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('combo', COMBO.viciousIneffective, faces(0, 2));
      expect(check.parameters).toMatchObject({
         ineffective: true,
         vicious: true,
      });
      /** @type {object} The damage report and the defender's vitals around the click. */
      const hit = await pressDamageButton(gm, check.id, defenders.wounded, 'apply');
      expect(hit.report.woundsSuffered, 'the Ineffective limit applies to the Vicious Wound').toBe(1);
      expect(hit.after.wounds).toBe(1);
   });

   test('Vicious adds no Wound when the attack inflicts none', async () => {
      // Stamina 10 absorbs 2 damage: no Wound, so Vicious adds none.
      await setResource(gm, woundedUuid, 'stamina', 10);
      await setResource(gm, woundedUuid, 'wounds', 0);
      await closeAllApps(gm);
      /** @type {object} The rolled attack and its card in the GM's chat log. */
      const check = await attackWith('flags', 6, faces(0, 2));
      expect(check.parameters.vicious, 'the check stores the flag').toBe(true);
      /** @type {object} The damage report and the defender's vitals around the click. */
      const hit = await pressDamageButton(gm, check.id, defenders.wounded, 'apply');
      expect(hit.report.damageTaken).toBe(2);
      expect(hit.report.woundsSuffered ?? 0).toBe(0);
      expect(hit.after.wounds).toBe(0);
   });
});
