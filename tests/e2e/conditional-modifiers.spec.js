import { expect, test } from './harness.js';
import {
   CHECK_TYPE_CONDITIONAL_SELECTORS,
   CHECK_TYPE_MODIFIER_TYPES,
} from '~/system/ConditionalCheckModifierTypes.js';
import { clickSheetTab, commitText } from './actions.js';
import { clickRoll, openCheckDialog, readNewestCheckFlags } from './checkDialog.js';
import { openWeaponRow, rollItemCheck, rollWeaponAttack, setMultiAttack } from './checkCards.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addAttack,
   addAttackCustomTrait,
   addCheck,
   addCustomTrait,
   addEffect,
   addRulesElement,
   addTrait,
   createActor,
   createOwnedItem,
   readServerSystem,
   setAttributeBase,
   setEquipped,
} from './flows.js';
import { castFromSpellSheet } from './spellCasting.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Conditional check modifiers over every cell the system's tables list for each check type a user rolls (Attribute,
 * Resistance, Attack, Casting and Item checks), authored through the Rules Elements tab and read from the rolled
 * check's parameters; and the conditional rating modifiers over the Melee, Accuracy and Defense ratings.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The character's id. */
let actorId;
/** @type {string} The character's uuid. */
let actorUuid;
/** @type {string} The uuid of the effect the running test authors on. */
let effectUuid;
/** @type {string} The weapon's id. */
let weaponId;
/** @type {string} The weapon's uuid. */
let weaponUuid;
/** @type {string} The uuid of the ability that holds an item check. */
let abilityUuid;
/** @type {string} The uuid of the spell. */
let spellUuid;
/** @type {number} The run stamp in the fixture names. */
const RUN = Date.now();
/** @type {string} The custom trait name every item carries. */
const TRAIT = 'Void Edge';
/** @type {string} The tradition of the spell. */
const TRADITION = 'Air';

/**
 * The element fields of each modifier type, the check parameter it lands in and the value the parameter takes.
 * @type {Record<string, {fields: object, parameter: string, expected: number|boolean}>}
 */
const MODIFIER_CASES = {
   damage: {
      fields: { value: 5 },
      parameter: 'damageMod',
      expected: 5,
   },
   dice: {
      fields: { value: 2 },
      parameter: 'diceMod',
      expected: 2,
   },
   expertise: {
      fields: { value: 3 },
      parameter: 'expertiseMod',
      expected: 3,
   },
   healing: {
      fields: { value: 6 },
      parameter: 'healingMod',
      expected: 6,
   },
   training: {
      fields: { value: 4 },
      parameter: 'trainingMod',
      expected: 4,
   },
   advantage: {
      fields: { advantageLevel: 1 },
      parameter: 'advantage',
      expected: 1,
   },
   automaticFailure: {
      fields: {},
      parameter: 'automaticFailure',
      expected: true,
   },
};

/**
 * Rolls a header button of the character's sheet.
 * @param {string} button - The localized name of the Attribute or Resistance button.
 * @param {string} type - The check subtype the roll posts.
 * @returns {Promise<{id: string, parameters: object, results: object}>} The rolled check's message.
 */
async function rollFromHeader(button, type) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await (await openSheetByUuid(page, actorUuid)).getByRole('button', {
      name: button,
      exact: true,
   }).first().click();
   return readNewestCheckFlags(page, baseline, type);
}

/**
 * Rolls a Skill's check with the check button of its row on the Skills tab.
 * @param {string} skill - The Skill key.
 * @returns {Promise<{id: string, parameters: object, results: object}>} The rolled check's message.
 */
async function rollSkill(skill) {
   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await clickSheetTab(sheet, 'Skills');

   /** @type {string} The Skill's localized name. */
   const label = await page.evaluate((key) => game.i18n.localize(`LOCAL.${key}.text`), skill);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await sheet.locator('.skill', {
      has: page.locator('.check-button .label', { hasText: new RegExp(`^\\s*${RegExp.escape(label)}\\s*$`) }),
   }).locator('.check-button button').first().click();
   return readNewestCheckFlags(page, baseline, 'attributeCheck');
}

/**
 * The ways each check type is rolled and the keys a selector is matched against.
 * @type {Record<string, {roll: () => Promise<object>, subtype: string}>}
 */
const ROLLED = {
   attribute: {
      roll: () => rollFromHeader('Body', 'attributeCheck'),
      subtype: 'attributeCheck',
   },
   resistance: {
      roll: () => rollFromHeader('Reflexes', 'resistanceCheck'),
      subtype: 'resistanceCheck',
   },
   attack: {
      roll: () => rollWeaponAttack(page, weaponUuid, 0),
      subtype: 'attackCheck',
   },
   casting: {
      roll: () => castFromSpellSheet(page, spellUuid),
      subtype: 'castingCheck',
   },
   item: {
      roll: () => rollItemCheck(page, abilityUuid, 0),
      subtype: 'itemCheck',
   },
};

/**
 * Picks the key that a rolled check matches for a selector, and a key it does not match.
 * @param {string} selector - The selector.
 * @param {object} baseline - The parameters of the check rolled with no elements.
 * @param {string} checkType - The rolled check type.
 * @returns {{match: string, wrong: string}} The matching and the non-matching key.
 */
function keysFor(selector, baseline, checkType) {
   switch (selector) {
      case 'attribute': {
         return {
            match: baseline.attribute,
            wrong: baseline.attribute === 'soul' ? 'mind' : 'soul',
         };
      }
      case 'skill': {
         return {
            match: baseline.skill,
            wrong: baseline.skill === 'lore' ? 'arcana' : 'lore',
         };
      }
      case 'customTrait': {
         return {
            match: TRAIT,
            wrong: 'Wrong Trait',
         };
      }
      case 'attackTrait': {
         return {
            match: baseline.attackTrait[0].name,
            wrong: 'blast',
         };
      }
      case 'attackType': {
         return {
            match: baseline.type,
            wrong: baseline.type === 'melee' ? 'ranged' : 'melee',
         };
      }
      case 'spellTradition': {
         return {
            match: TRADITION,
            wrong: 'Fire',
         };
      }
      case 'resistance': {
         return {
            match: baseline.resistance,
            wrong: baseline.resistance === 'willpower' ? 'resilience' : 'willpower',
         };
      }
      default: {
         throw new Error(`no key rule for the ${selector} selector of the ${checkType} check`);
      }
   }
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await setClientSetting(page, 'getCheckOptions', 'never');

   actorId = await createActor(page, {
      name: `E2E Conditional Actor ${RUN}`,
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   for (const attribute of [
      'body',
      'mind',
      'soul',
   ]) {
      await setAttributeBase(page, actorUuid, attribute, 4);
   }

   // A weapon whose attack carries a standard trait and a custom trait.
   weaponId = await createOwnedItem(page, actorId, 'weapon', 'E2E Conditional Weapon');
   weaponUuid = `${actorUuid}.Item.${weaponId}`;
   if ((await readServerSystem(page, weaponUuid)).attack.length === 0) {
      await addAttack(page, weaponUuid);
   }
   await addTrait(page, weaponUuid, 'Penetrating', { attackIndex: 0 });
   await addAttackCustomTrait(page, weaponUuid, 0, TRAIT, 'Trait of the attack.');
   await setEquipped(page, actorId, weaponId, true);

   // An ability with an item check and a custom trait.
   abilityUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', 'E2E Conditional Ability')}`;
   await addCheck(page, abilityUuid, { label: 'Probe' });
   await addCustomTrait(page, abilityUuid, TRAIT, 'Trait of the item.');

   // A spell with a tradition and a custom trait.
   spellUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'spell', 'E2E Conditional Spell')}`;
   await commitText(
      (await openSheetByUuid(page, spellUuid)).locator('.stat').filter({ hasText: 'Tradition' }).locator('input'),
      TRADITION,
   );
   await addCustomTrait(page, spellUuid, TRAIT, 'Trait of the spell.');
   await closeAllApps(page);
});

test.afterEach(async () => {
   await setClientSetting(page, 'getCheckOptions', 'never');

   // Cleanup: the effect (and so its elements) is deleted through the API.
   if (effectUuid) {
      await page.evaluate(async (uuid) => {
         await (await fromUuid(uuid))?.delete();
      }, effectUuid);
      effectUuid = undefined;
   }
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

for (const checkType of Object.keys(ROLLED)) {
   test.describe(`conditional check modifiers on a rolled ${checkType} check`, () => {
      test.describe.configure({ timeout: 240_000 });

      for (const [elementCheckType, selectors] of Object.entries(CHECK_TYPE_CONDITIONAL_SELECTORS[checkType])) {
         for (const selector of selectors) {
            test(`${elementCheckType} check type, ${selector} selector`, async () => {
               /** @type {string[]} The modifier types the check reads. */
               const types = CHECK_TYPE_MODIFIER_TYPES[checkType];
               /** @type {() => Promise<object>} Rolls the check. */
               const roll = (selector === 'skill' && checkType === 'attribute') ?
                  () => rollSkill('arcana') :
                  ROLLED[checkType].roll;

               /** @type {object} The check rolled with no elements. */
               const baseline = (await roll()).parameters;
               if (selector === 'resistance') {
                  baseline.resistance = 'reflexes';
               }
               const keys = [
                  'any',
                  'multiAttack',
               ].includes(selector) ? {} : keysFor(selector, baseline, checkType);

               /** @type {string} The id of the effect that carries the elements. */
               const effectId = await addEffect(page, actorId, `E2E ccm ${checkType} ${elementCheckType} ${selector}`);
               effectUuid = `${actorUuid}.ActiveEffect.${effectId}`;

               /** @type {object[]} The elements, one per modifier type, keyed to what the check matches. */
               const elements = types.map((modifierType) => ({
                  operation: 'conditionalCheckModifier',
                  modifierType,
                  checkType: elementCheckType,
                  selector,
                  ...(keys.match === undefined ? {} : { key: keys.match }),
                  ...MODIFIER_CASES[modifierType].fields,
               }));
               if (keys.wrong !== undefined) {
                  // A dice element keyed to what the check does not match adds nothing.
                  elements.push({
                     operation: 'conditionalCheckModifier',
                     modifierType: 'dice',
                     checkType: elementCheckType,
                     selector,
                     key: keys.wrong,
                     value: 9,
                  });
               }
               for (const element of elements) {
                  await addRulesElement(page, effectUuid, element);
               }

               if (selector === 'multiAttack') {
                  // Presence before absence: a single attack takes none of them, the multi-attack takes all.
                  /** @type {object} The single attack's parameters. */
                  const single = (await roll()).parameters;
                  for (const modifierType of types) {
                     expect(single[MODIFIER_CASES[modifierType].parameter], `${modifierType} skips a single attack`)
                        .not.toBe(MODIFIER_CASES[modifierType].expected);
                  }
                  await setMultiAttack(page, await openWeaponRow(page, actorUuid, weaponId), weaponUuid, true);
               }

               /** @type {object} The rolled check's parameters. */
               const { parameters } = await roll();
               for (const modifierType of types) {
                  /** @type {{parameter: string, expected: number|boolean}} The modifier type's case. */
                  const modifierCase = MODIFIER_CASES[modifierType];
                  expect(parameters[modifierCase.parameter], `${modifierType} reaches the ${checkType} roll`)
                     .toBe(modifierCase.expected);
               }

               if (selector === 'multiAttack') {
                  await setMultiAttack(page, await openWeaponRow(page, actorUuid, weaponId), weaponUuid, false);
               }
            });
         }
      }
   });
}

test.describe('conditional rating modifiers', () => {
   test.describe.configure({ timeout: 240_000 });

   for (const rating of [
      'melee',
      'accuracy',
   ]) {
      for (const selector of [
         'attackTrait',
         'attackType',
         'customWeaponTrait',
         'multiAttack',
      ]) {
         test(`${rating} rating, ${selector} selector reaches the attack`, async () => {
            /** @type {object} The attack rolled with no elements. */
            const baseline = (await rollWeaponAttack(page, weaponUuid, 0)).parameters;
            /** @type {Record<string, string|undefined>} The key each selector matches. */
            const matching = {
               attackTrait: baseline.attackTrait[0].name,
               attackType: baseline.type,
               customWeaponTrait: TRAIT,
               multiAttack: undefined,
            };

            /** @type {string} The id of the effect that carries the element. */
            const effectId = await addEffect(page, actorId, `E2E crm ${rating} ${selector}`);
            effectUuid = `${actorUuid}.ActiveEffect.${effectId}`;
            await addRulesElement(page, effectUuid, {
               operation: 'conditionalRatingModifier',
               rating,
               selector,
               ...(matching[selector] === undefined ? {} : { key: matching[selector] }),
               value: 3,
            });
            if (selector === 'multiAttack') {
               await setMultiAttack(page, await openWeaponRow(page, actorUuid, weaponId), weaponUuid, true);
            }

            /** @type {object} The attack rolled with the element. */
            const { parameters } = await rollWeaponAttack(page, weaponUuid, 0);
            /** @type {string} The parameter the rating lands in. */
            const parameter = rating === 'melee' ? 'attackerMelee' : 'attackerAccuracy';
            /** @type {string} The parameter of the other rating. */
            const other = rating === 'melee' ? 'attackerAccuracy' : 'attackerMelee';
            expect(parameters[parameter], `${rating} rises by the element's value`)
               .toBe(baseline[parameter] + 3);
            expect(parameters[other], 'the other attack rating is untouched').toBe(baseline[other]);
            if (selector === 'multiAttack') {
               await setMultiAttack(page, await openWeaponRow(page, actorUuid, weaponId), weaponUuid, false);
            }
         });
      }
   }

   test('defense rating: armor, shield and their custom traits raise the Defense on the sheet', async () => {
      /** @type {string} The id of the armor. */
      const armorId = await createOwnedItem(page, actorId, 'armor', 'E2E Conditional Armor');
      /** @type {string} The armor's uuid. */
      const armorUuid = `${actorUuid}.Item.${armorId}`;
      await addTrait(page, armorUuid, 'Magical');
      await addCustomTrait(page, armorUuid, 'Spiked', 'Armor trait.');
      await setEquipped(page, actorId, armorId, true);

      /** @type {string} The id of the shield. */
      const shieldId = await createOwnedItem(page, actorId, 'shield', 'E2E Conditional Shield');
      /** @type {string} The shield's uuid. */
      const shieldUuid = `${actorUuid}.Item.${shieldId}`;
      await addTrait(page, shieldUuid, 'Magical');
      await addCustomTrait(page, shieldUuid, 'Spiked', 'Shield trait.');
      await setEquipped(page, actorId, shieldId, true);

      /** @type {string} The id of the effect that carries the elements. */
      const effectId = await addEffect(page, actorId, 'E2E crm defense');
      effectUuid = `${actorUuid}.ActiveEffect.${effectId}`;

      /**
       * Reads the Defense total the character sheet shows.
       * @returns {Promise<number>} The displayed Defense.
       */
      const defense = async () => Number(
         (await (await openSheetByUuid(page, actorUuid)).getByTestId('sheet-rating-defense').innerText()).trim(),
      );

      /** @type {number} The Defense before any element. */
      const base = await defense();
      let expected = base;
      for (const [selector, key] of [
         [
            'armorTrait',
            'magical',
         ],
         [
            'shieldTrait',
            'magical',
         ],
         [
            'customArmorTrait',
            'Spiked',
         ],
         [
            'customShieldTrait',
            'Spiked',
         ],
      ]) {
         await addRulesElement(page, effectUuid, {
            operation: 'conditionalRatingModifier',
            rating: 'defense',
            selector,
            key,
            value: 2,
         });
         expected += 2;
         expect(await defense(), `the ${selector} element raises Defense by 2`).toBe(expected);
      }

      // The unequipped armor no longer raises it: the two armor elements drop out.
      await setEquipped(page, actorId, armorId, false);
      expect(await defense(), 'the armor elements stop applying').toBe(base + 4);
   });
});

/**
 * Opens the dialog of each rolled check type with the roll button a user clicks.
 * @type {Record<string, () => Promise<import('@playwright/test').Locator>>}
 */
const DIALOGS = {
   attribute: () => openCheckDialog(page, 'attribute', actorUuid),
   resistance: () => openCheckDialog(page, 'resistance', actorUuid, { button: 'Reflexes' }),
   attack: () => openCheckDialog(page, 'attack', weaponUuid),
   casting: () => openCheckDialog(page, 'casting', spellUuid),
   item: () => openCheckDialog(page, 'item', abilityUuid),
};

for (const checkType of Object.keys(DIALOGS)) {
   test.describe(`situational check modifiers on a ${checkType} check`, () => {
      test.describe.configure({ timeout: 240_000 });

      for (const elementCheckType of Object.keys(CHECK_TYPE_CONDITIONAL_SELECTORS[checkType])) {
         test(`${elementCheckType} check type, situation selector: applies only when its box is ticked`, async () => {
            await setClientSetting(page, 'getCheckOptions', 'situational');

            /** @type {string[]} The modifier types the check reads. */
            const types = CHECK_TYPE_MODIFIER_TYPES[checkType];
            /** @type {string} The id of the effect that carries the situation elements. */
            const effectId = await addEffect(page, actorId, `E2E situation ${checkType} ${elementCheckType}`);
            effectUuid = `${actorUuid}.ActiveEffect.${effectId}`;
            for (const modifierType of types) {
               await addRulesElement(page, effectUuid, {
                  operation: 'conditionalCheckModifier',
                  modifierType,
                  checkType: elementCheckType,
                  selector: 'situation',
                  key: 'Rough Terrain',
                  ...MODIFIER_CASES[modifierType].fields,
               });
            }

            // Presence before absence: the dialog lists the situation, and a roll that leaves it unticked takes none
            // of its modifiers.
            /** @type {import('@playwright/test').Locator} The dialog of the check. */
            const unticked = await DIALOGS[checkType]();
            await expect(unticked.getByTestId('situation-row-roughTerrain'), 'the dialog lists the situation')
               .toBeVisible();
            /** @type {number} The chat-message count before the roll. */
            const untickedBaseline = await clickRoll(unticked, page);
            /** @type {{parameters: object}} The check rolled with the box unticked. */
            const plain = await readNewestCheckFlags(page, untickedBaseline, ROLLED[checkType].subtype);
            for (const modifierType of types) {
               expect(
                  plain.parameters[MODIFIER_CASES[modifierType].parameter],
                  `${modifierType} does not apply while the situation is unticked`,
               ).not.toBe(MODIFIER_CASES[modifierType].expected);
            }
            expect(plain.parameters.situations, 'no situation is recorded').toHaveLength(0);

            /** @type {import('@playwright/test').Locator} The dialog of the check, opened again. */
            const ticked = await DIALOGS[checkType]();
            await ticked.getByTestId('situation-toggle-roughTerrain').click();
            /** @type {number} The chat-message count before the roll. */
            const tickedBaseline = await clickRoll(ticked, page);
            /** @type {{parameters: object}} The check rolled with the box ticked. */
            const applied = await readNewestCheckFlags(page, tickedBaseline, ROLLED[checkType].subtype);
            for (const modifierType of types) {
               /** @type {{parameter: string, expected: number|boolean}} The modifier type's case. */
               const modifierCase = MODIFIER_CASES[modifierType];
               expect(applied.parameters[modifierCase.parameter], `${modifierType} applies once ticked`)
                  .toBe(modifierCase.expected);
            }
            expect(applied.parameters.situations.map((situation) => situation.key), 'the roll records the situation')
               .toEqual(['roughTerrain']);
         });
      }
   });
}
