import { expect, test } from '../harness.js';
import { DURATION_PERMANENT } from '~/system/DurationTypes.js';
import { ALL_KEY } from '~/system/AllKey.js';
import { SET_SUM_MODE_MAX, SET_SUM_MODE_MIN, SET_SUM_MODE_SET } from '~/system/SetSumModes.js';
import { clickSheetTab, commitText } from '../actions.js';
import { clickRoll, openCheckDialog, readNewestCheckFlags } from '../checkDialog.js';
import { forceDice, resetDice } from '../dice.js';
import { login, openSheetByUuid } from '../fixtures.js';
import {
   addCheck,
   addCustomTrait,
   addEffect,
   addRulesElement,
   createActor,
   createOwnedItem,
   dragItemOntoSheet,
   setAttributeBase,
   setEffectActive,
   setEquipped,
   shared,
} from '../flows.js';
import { selectTitanOption } from '../select.js';
import { setClientSetting } from '../settings.js';
import { settle } from '../settle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from '../world.js';

/**
 * Rules elements entered in the editor reach the derived values and the rolled checks. Each test adds the elements it
 * needs to one owned ability or effect through the Rules Elements tab, reads what the engine derives (an Attribute's
 * value, the options of a check dialog, the parameters of a rolled check) and deletes its rows again through their
 * delete buttons, so the next test starts from an empty list. The math (flat modifiers, Multiply Base, Multiply Sum
 * and Set Sum, with their rounding and modes) acts on one character whose Body is 1; the conditional check modifiers
 * act on a character with a weapon, a spell and two abilities, and on a character whose effect carries the elements of
 * the rolled Resistance and Attribute checks. The sources are an owned weapon, equipment item, shield and armor, which
 * apply only while equipped, and a permanent effect, which applies only while enabled.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string[]} The uuids of the documents whose rules elements the running test added. */
let touched = [];

/**
 * The selector and key of an element that acts on Body. A new Multiply Sum row starts on the Stride speed, so the
 * row's selector and key are always chosen.
 * @type {{selector: string, key: string}}
 */
const ON_BODY = {
   selector: 'attribute',
   key: 'body',
};

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await showChatLog(page);
});

test.afterEach(async () => {
   await resetDice(page);
   for (const uuid of touched) {
      await clearRulesElements(uuid);
   }
   touched = [];
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Adds a rules element to a document and remembers the document, so the test's rows are deleted when it ends.
 * @param {string} uuid - The uuid of the ability or effect.
 * @param {object} element - What the row holds (see `addRulesElement`).
 * @returns {Promise<void>} Resolves once the row holds the element.
 */
async function addElement(uuid, element) {
   if (!touched.includes(uuid)) {
      touched.push(uuid);
   }
   await addRulesElement(page, uuid, element);
}

/**
 * Deletes every rules element of a document through the rows' delete buttons.
 * @param {string} uuid - The uuid of the ability or effect.
 * @returns {Promise<void>} Resolves once the list is empty.
 */
async function clearRulesElements(uuid) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, uuid);
   await clickSheetTab(sheet, 'Rules Elements');

   /** @type {import('@playwright/test').Locator} The rule element rows. */
   const rows = sheet.locator('.rules-element');
   for (let remaining = await rows.count(); remaining > 0; remaining--) {
      await rows.first().locator('.delete-button button').click();
      await expect(rows).toHaveCount(remaining - 1);
      await settle(page, { transitions: true });
   }
}

test.describe('rules elements — derived attribute math', () => {
   /** @type {string} The uuid of the character. */
   let actorUuid;
   /** @type {string} The uuid of its ability, which carries each test's elements. */
   let abilityUuid;

   test.beforeAll(async () => {

      // A new player has Body 1: the math below starts from that base.
      /** @type {string} The character's id. */
      const actorId = await createActor(page, {
         name: 'E2E Rules Elements Actor',
         type: 'player',
      });
      actorUuid = `Actor.${actorId}`;
      /** @type {string} The id of the ability. */
      const abilityId = await createOwnedItem(page, actorId, 'ability', 'E2E Rules Elements Ability');
      abilityUuid = `${actorUuid}.Item.${abilityId}`;
      await closeAllApps(page);
   });

   /**
    * Reads the derived value of an attribute of the character.
    * @param {string} [attribute] - The attribute key.
    * @returns {Promise<number>} The attribute's derived value.
    */
   function derived(attribute = 'body') {
      return page.evaluate(
         async ({ uuid, attribute }) => (await fromUuid(uuid)).system.attribute[attribute].value,
         {
            uuid: actorUuid,
            attribute,
         },
      );
   }

   test('a single +2 flatModifier raises Body from 1 to 3', async () => {
      expect(await derived(), 'Body starts at its base 1').toBe(1);
      await addElement(abilityUuid, { value: 2 });

      // Base Body 1 + flat 2 = 3.
      expect(await derived(), 'derived Body should be base 1 + flat 2').toBe(3);
   });

   test('a mulBase of 2 raises Body from 1 to 2', async () => {
      await addElement(abilityUuid, {
         ...ON_BODY,
         operation: 'mulBase',
         value: 2,
      });

      // Base 1 + base*(2-1) = 1 + 1 = 2.
      expect(await derived(), 'derived Body should be base 1 + base*(mul-1)=1').toBe(2);
   });

   test('mulBase 2 plus flatModifier 3 raises Body from 1 to 5', async () => {
      await addElement(abilityUuid, {
         ...ON_BODY,
         operation: 'mulBase',
         value: 2,
      });
      await addElement(abilityUuid, { value: 3 });

      // Base 1 + base*(2-1) + 3 = 1 + 1 + 3 = 5.
      expect(await derived(), 'derived Body should be 1 + 1 + 3').toBe(5);
   });

   test('flatModifier with key "all" shifts every attribute', async () => {
      await addElement(abilityUuid, {
         key: ALL_KEY,
         value: 2,
      });
      expect({
         body: await derived('body'),
         mind: await derived('mind'),
         soul: await derived('soul'),
      }).toEqual({
         body: 3,
         mind: 3,
         soul: 3,
      });
   });

   test('mulSum halves the post-additive Body total, rounding up', async () => {
      await addElement(abilityUuid, { value: 4 });
      await addElement(abilityUuid, {
         ...ON_BODY,
         operation: 'mulSum',
         value: 0.5,
         rounding: 'up',
      });

      expect(await derived(), 'mulSum should halve the post-additive total of 5 to 3').toBe(3);
   });

   test('stacked mulSum elements compound in order', async () => {
      await addElement(abilityUuid, { value: 7 });
      for (let count = 0; count < 2; count++) {
         await addElement(abilityUuid, {
            ...ON_BODY,
            operation: 'mulSum',
            value: 0.5,
            rounding: 'up',
         });
      }

      expect(await derived(), 'two mulSum halvings of 8 should compound to 2').toBe(2);
   });

   test('setSum set mode forces the Body total to the value', async () => {
      await addElement(abilityUuid, { value: 4 });
      await addElement(abilityUuid, {
         ...ON_BODY,
         operation: 'setSum',
         value: 0,
         mode: SET_SUM_MODE_SET,
      });
      expect(await derived(), 'a Set Sum of 0 forces Body to 0').toBe(0);

      // The same element, its value edited in the row's input.
      /** @type {import('@playwright/test').Locator} The Set Sum row's value input. */
      const input = (await openSheetByUuid(page, abilityUuid)).locator('.rules-element').nth(1)
         .locator('.operation-settings .field.number input');
      await commitText(input, '2');
      await expect.poll(derived, { message: 'the edited Set Sum forces Body to 2' }).toBe(2);
   });

   test('setSum min mode raises a low total to the floor', async () => {
      await addElement(abilityUuid, {
         ...ON_BODY,
         operation: 'setSum',
         value: 5,
         mode: SET_SUM_MODE_MIN,
      });

      // Body base 1, below the floor of 5 -> raised to 5.
      expect(await derived(), 'setSum min should raise Body from 1 to its floor of 5').toBe(5);
   });

   test('setSum max mode caps a high total', async () => {
      await addElement(abilityUuid, { value: 7 });
      await addElement(abilityUuid, {
         ...ON_BODY,
         operation: 'setSum',
         value: 5,
         mode: SET_SUM_MODE_MAX,
      });

      // Body base 1 + flat 7 = 8, capped at 5.
      expect(await derived(), 'setSum max should cap Body total of 8 at 5').toBe(5);
   });

   test('a fractional mulBase rounds its base contribution up or down', async () => {
      await addElement(abilityUuid, {
         ...ON_BODY,
         operation: 'mulBase',
         value: 0.5,
         rounding: 'down',
      });

      // Body base 1; contribution = round(1 * (0.5 - 1)) = round(-0.5): down -> floor(-0.5) = -1 -> Body 0.
      expect(await derived(), 'rounding down takes Body to 0').toBe(0);

      // The same element, its rounding changed in the row's select: up -> ceil(-0.5) = 0 -> Body 1.
      await selectTitanOption(
         page,
         (await openSheetByUuid(page, abilityUuid)).getByTestId('mulbase-rounding'),
         'up',
      );
      await expect.poll(derived, { message: 'rounding up leaves Body at 1' }).toBe(1);
   });
});

test.describe('conditional check modifiers on owned items', () => {
   /** @type {string} The uuid of the character. */
   let actorUuid;
   /** @type {string} The uuid of the ability that carries each test's elements. */
   let sourceUuid;
   /** @type {string} The uuid of the owned weapon. */
   let weaponUuid;
   /** @type {string} The uuid of the owned spell with the Void custom trait. */
   let voidSpellUuid;
   /** @type {string} The uuid of the owned spell whose tradition is Fire. */
   let fireSpellUuid;
   /** @type {string} The uuid of the ability with the Field Medicine custom trait and a damaging check. */
   let kitUuid;

   test.beforeAll(async () => {

      /** @type {string} The character's id. */
      const actorId = await createActor(page, {
         name: 'E2E Modifier Items Actor',
         type: 'player',
      });
      actorUuid = `Actor.${actorId}`;

      // The shared weapon and spell are copied onto the actor; the shared spell holds the Void custom trait.
      weaponUuid = `${actorUuid}.Item.${await dragItemOntoSheet(page, await shared(page, 'weapon'), actorId)}`;
      voidSpellUuid = `${actorUuid}.Item.${await dragItemOntoSheet(page, await shared(page, 'spell'), actorId)}`;
      sourceUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', 'E2E Modifier Source')}`;

      // A spell of tradition Fire: the tradition is typed into the spell sheet's header.
      /** @type {string} The Fire spell's id. */
      const fireId = await createOwnedItem(page, actorId, 'spell', 'E2E Fire Spell');
      fireSpellUuid = `${actorUuid}.Item.${fireId}`;
      await commitText(
         (await openSheetByUuid(page, fireSpellUuid)).locator('.header .stat, .header .labeled-element')
            .filter({ has: page.getByText('Tradition', { exact: true }) }).last().locator('input'),
         'Fire',
      );
      await expect.poll(
         () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.tradition, fireSpellUuid),
         { message: 'the sheet stored the tradition' },
      ).toBe('Fire');

      // An ability with a custom trait and a damaging check.
      kitUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', 'E2E Field Kit')}`;
      await addCustomTrait(page, kitUuid, 'Field Medicine');
      await addCheck(page, kitUuid, {
         label: 'Treat',
         isDamage: true,
      });
      await closeAllApps(page);
   });

   /**
    * Clicks the roll button of an owned item's sheet (never opening a dialog) and returns the posted check.
    * @param {string} uuid - The owned item's uuid.
    * @param {string} type - The check subtype the roll posts.
    * @returns {Promise<{id: string, parameters: object}>} The rolled check's message.
    */
   async function rollItem(uuid, type) {
      await setClientSetting(page, 'getCheckOptions', 'never');

      /** @type {number} The chat-message count before the roll. */
      const baseline = await page.evaluate(() => game.messages.size);
      await (await openSheetByUuid(page, uuid)).locator('.sidebar-check .header .roll button').first().click();
      return readNewestCheckFlags(page, baseline, type);
   }

   test('damage and healing conditional modifiers apply to attack, casting, and item checks', async () => {
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'damage',
         checkType: 'any',
         selector: 'any',
         value: 2,
      });
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'healing',
         checkType: 'any',
         selector: 'any',
         value: 3,
      });
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'damage',
         checkType: 'attack',
         selector: 'any',
         value: 1,
      });

      /** @type {{id: string, parameters: object}} The rolled attack. */
      const attack = await rollItem(weaponUuid, 'attackCheck');
      /** @type {{id: string, parameters: object}} The rolled casting check. */
      const casting = await rollItem(voidSpellUuid, 'castingCheck');
      /** @type {{id: string, parameters: object}} The rolled item check. */
      const item = await rollItem(kitUuid, 'itemCheck');
      expect({
         attackDamage: attack.parameters.damageMod,
         castingDamage: casting.parameters.damageMod,
         castingHealing: casting.parameters.healingMod,
         itemDamage: item.parameters.damageMod,
         itemHealing: item.parameters.healingMod,
      }).toEqual({
         attackDamage: 3,
         castingDamage: 2,
         castingHealing: 3,
         itemDamage: 2,
         itemHealing: 3,
      });
   });

   test('casting check options apply custom-trait dice and casting expertise modifiers', async () => {
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         checkType: 'casting',
         selector: 'customTrait',
         key: 'void',
         value: 2,
      });
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'expertise',
         checkType: 'casting',
         selector: 'any',
         value: 1,
      });
      await setClientSetting(page, 'getCheckOptions', 'always');

      /** @type {import('@playwright/test').Locator} The Casting Check dialog of the Void spell. */
      const dialog = await openCheckDialog(page, 'casting', voidSpellUuid);
      await expect(dialog.getByTestId('check-field-diceMod').locator('input'), 'the Void trait adds 2 dice')
         .toHaveValue('2');
      await expect(dialog.getByTestId('check-field-expertiseMod').locator('input'), 'casting checks add 1 expertise')
         .toHaveValue('1');
   });

   test('conditional dice and expertise apply to item checks and to tradition-keyed casting checks', async () => {
      // Keys as a player types them: a capitalised tradition and a spaced custom trait.
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         checkType: 'casting',
         selector: 'spellTradition',
         key: 'Fire',
         value: 3,
      });
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         checkType: 'item',
         selector: 'customTrait',
         key: 'Field Medicine',
         value: 2,
      });
      await addElement(sourceUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'expertise',
         checkType: 'casting',
         selector: 'any',
         value: 1,
      });
      await setClientSetting(page, 'getCheckOptions', 'always');

      /** @type {import('@playwright/test').Locator} The Casting Check dialog of the Fire spell. */
      const casting = await openCheckDialog(page, 'casting', fireSpellUuid);
      await expect(casting.getByTestId('check-field-diceMod').locator('input'), 'the Fire tradition adds 3 dice')
         .toHaveValue('3');
      await expect(casting.getByTestId('check-field-expertiseMod').locator('input'), 'casting checks add 1 expertise')
         .toHaveValue('1');
      await closeAllApps(page);

      /** @type {import('@playwright/test').Locator} The Item Check dialog of the Field Kit. */
      const item = await openCheckDialog(page, 'item', kitUuid);
      await expect(item.getByTestId('check-field-diceMod').locator('input'), 'the trait adds 2 dice')
         .toHaveValue('2');
   });
});

test.describe('conditional check modifiers on rolled checks', () => {
   /** @type {string} The uuid of the character. */
   let actorUuid;
   /** @type {string} The uuid of its effect, which carries each test's elements. */
   let effectUuid;
   /** @type {string} The uuid of its ability with a damaging check resisted by Reflexes. */
   let hitUuid;

   test.beforeAll(async () => {

      // Body, Mind and Soul 4 give Reflexes and Willpower 6.
      /** @type {string} The character's id. */
      const actorId = await createActor(page, {
         name: 'E2E Modifier Effects Actor',
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
      effectUuid = `${actorUuid}.ActiveEffect.${await addEffect(page, actorId, 'E2E Modifier Effect')}`;

      // A check that deals 3 damage, which a Reflexes check resists.
      hitUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', 'E2E Reflexes Hit')}`;
      await addCheck(page, hitUuid, {
         label: 'Hit',
         resistanceCheck: 'reflexes',
         isDamage: true,
         initialValue: 3,
         damageReducedBy: 'resistanceCheck',
      });
      await closeAllApps(page);
   });

   /**
    * Clicks a header roll button of the character's sheet (never opening a dialog) and returns the posted check.
    * @param {string} button - The localized name of the Attribute or Resistance button.
    * @param {string} type - The check subtype the roll posts.
    * @returns {Promise<{id: string, parameters: object, results: object}>} The rolled check's message.
    */
   async function rollFromHeader(button, type) {
      await setClientSetting(page, 'getCheckOptions', 'never');

      /** @type {number} The chat-message count before the roll. */
      const baseline = await page.evaluate(() => game.messages.size);
      await (await openSheetByUuid(page, actorUuid)).getByRole('button', {
         name: button,
         exact: true,
      }).first().click();
      return readNewestCheckFlags(page, baseline, type);
   }

   test('a Resistance Check picks up an any-check dice penalty and a penalty keyed to its Resistance', async () => {
      await addElement(effectUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         checkType: 'any',
         selector: 'any',
         value: -1,
      });
      await addElement(effectUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         checkType: 'resistance',
         selector: 'resistance',
         key: 'reflexes',
         value: -1,
      });
      await setClientSetting(page, 'getCheckOptions', 'always');

      /** @type {import('@playwright/test').Locator} The Reflexes dialog. */
      const reflexes = await openCheckDialog(page, 'resistance', actorUuid, { button: 'Reflexes' });
      await expect(reflexes.getByTestId('check-field-diceMod').locator('input'), 'Reflexes takes both penalties')
         .toHaveValue('-2');

      // Willpower takes only the any-check penalty.
      await closeAllApps(page);
      /** @type {import('@playwright/test').Locator} The Willpower dialog. */
      const willpower = await openCheckDialog(page, 'resistance', actorUuid, { button: 'Willpower' });
      await expect(willpower.getByTestId('check-field-diceMod').locator('input'), 'Willpower takes one penalty')
         .toHaveValue('-1');
      await closeAllApps(page);

      /** @type {import('@playwright/test').Locator} The Reflexes dialog the roll is made from. */
      const roll = await openCheckDialog(page, 'resistance', actorUuid, { button: 'Reflexes' });
      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(roll, page);
      /** @type {{id: string, parameters: object, results: object}} The rolled Reflexes check's message. */
      const message = await readNewestCheckFlags(page, baseline, 'resistanceCheck');
      expect(message.parameters.resistanceDice).toBeGreaterThan(2);
      expect(message.parameters.diceMod).toBe(-2);
      expect(message.parameters.totalDice).toBe(message.parameters.resistanceDice - 2);
   });

   test('an Automatic Failure on Reflexes fails a rolled Reflexes check and reduces no damage', async () => {
      await addElement(effectUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'automaticFailure',
         checkType: 'resistance',
         selector: 'resistance',
         key: 'reflexes',
      });

      // The Hit check deals 3 damage with one success; the Reflexes Resist button on its card rolls for the character,
      // whose sheet is the focused window.
      await forceDice(page, [
         6,
         1,
         1,
         1,
      ]);
      await setClientSetting(page, 'getCheckOptions', 'never');

      /** @type {number} The chat-message count before the Hit roll. */
      const baseline = await page.evaluate(() => game.messages.size);
      await (await openSheetByUuid(page, hitUuid)).locator('.sidebar-check .header .roll button').first().click();
      /** @type {{id: string, parameters: object, results: object}} The Hit check's message. */
      const hit = await readNewestCheckFlags(page, baseline, 'itemCheck');
      expect(hit.results.damage, 'the Hit check deals 3 damage').toBe(3);

      await forceDice(page, [
         6,
         6,
         6,
         6,
         6,
         6,
      ]);
      /** @type {import('@playwright/test').Locator} The Reflexes Resist button of the Hit card. */
      const resist = page.locator(`#chat .message[data-message-id="${hit.id}"] .button.reflexes button`);
      /** @type {number} The chat-message count before the Resist roll. */
      const resistBaseline = await page.evaluate(() => game.messages.size);
      await (await openSheetByUuid(page, actorUuid)).locator('.window-header').click();
      await showChatLog(page);
      await resist.click();
      /** @type {{id: string, parameters: object, results: object}} The Reflexes check's message. */
      const message = await readNewestCheckFlags(page, resistBaseline, 'resistanceCheck');
      expect(message.parameters.automaticFailure).toBe(true);
      expect(message.results).toMatchObject({
         damageTaken: 3,
         successes: 0,
         succeeded: false,
      });
   });

   test('an effect with Disadvantage raises a rolled check\'s Difficulty', async () => {
      await addElement(effectUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'advantage',
         checkType: 'any',
         selector: 'any',
         advantageLevel: -1,
      });

      /** @type {{parameters: object}} The rolled check's message. */
      const message = await rollFromHeader('Body', 'attributeCheck');
      expect(message.parameters).toMatchObject({
         advantage: -1,
         baseDifficulty: 4,
         difficulty: 5,
      });
   });

   test('opposing Advantage sources cancel', async () => {
      await addElement(effectUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'advantage',
         checkType: 'any',
         selector: 'any',
         advantageLevel: 1,
      });
      await addElement(effectUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'advantage',
         checkType: 'any',
         selector: 'any',
         advantageLevel: -1,
      });

      /** @type {{parameters: object}} The rolled check's message. */
      const message = await rollFromHeader('Body', 'attributeCheck');
      expect(message.parameters).toMatchObject({
         advantage: 0,
         baseDifficulty: 4,
         difficulty: 4,
      });
   });

   test('an effect with Automatic Failure fails a rolled check', async () => {
      await addElement(effectUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'automaticFailure',
         checkType: 'any',
         selector: 'any',
      });
      await forceDice(page, [
         6,
         6,
         6,
         6,
      ]);

      /** @type {{parameters: object, results: object}} The rolled check's message. */
      const message = await rollFromHeader('Body', 'attributeCheck');
      expect(message.parameters.automaticFailure).toBe(true);
      expect(message.results).toMatchObject({
         successes: 0,
         succeeded: false,
      });
   });
});

test.describe('rules elements — which sources apply, and to which bucket', () => {
   /** @type {string} The id of the character. */
   let actorId;
   /** @type {string} The uuid of the character. */
   let actorUuid;
   /** @type {Record<string, string>} The id of each owned item, keyed by item type. */
   const itemIds = {};
   /** @type {string} The uuid of the character's permanent effect. */
   let effectUuid;

   test.beforeAll(async () => {

      // A new player has Body 1. Each source below gets a +2 Body flat modifier inside its own test.
      actorId = await createActor(page, {
         name: 'E2E Rules Sources Actor',
         type: 'player',
      });
      actorUuid = `Actor.${actorId}`;
      for (const type of [
         'weapon',
         'equipment',
         'shield',
         'armor',
      ]) {
         itemIds[type] = await createOwnedItem(page, actorId, type, `E2E Rules Sources ${type}`);
      }
      effectUuid = `${actorUuid}.ActiveEffect.${await addEffect(page, actorId, 'E2E Rules Sources Effect', {
         duration: DURATION_PERMANENT,
      })}`;
      await closeAllApps(page);
   });

   /**
    * Reads the character's derived Body and the sum its flat modifiers added in the equipment and effect buckets.
    * @returns {Promise<{effect: number, equipment: number, value: number}>} Body's value and those two buckets.
    */
   function readBody() {
      return page.evaluate(async (uuid) => {
         /** @type {object} The derived Body. */
         const body = (await fromUuid(uuid)).system.attribute.body;
         return {
            effect: body.mod.effect,
            equipment: body.mod.equipment,
            value: body.value,
         };
      }, actorUuid);
   }

   for (const type of [
      'weapon',
      'equipment',
      'shield',
      'armor',
   ]) {
      test(`the ${type}'s elements fill the equipment bucket only while it is equipped`, async () => {
         await addElement(`${actorUuid}.Item.${itemIds[type]}`, { value: 2 });
         await expect.poll(readBody, { message: `the unequipped ${type} adds nothing` }).toEqual({
            effect: 0,
            equipment: 0,
            value: 1,
         });

         await setEquipped(page, actorId, itemIds[type], true);
         await expect.poll(readBody, { message: `the equipped ${type} adds +2 in the equipment bucket` }).toEqual({
            effect: 0,
            equipment: 2,
            value: 3,
         });

         await setEquipped(page, actorId, itemIds[type], false);
         await expect.poll(readBody, { message: `the unequipped ${type} adds nothing again` }).toEqual({
            effect: 0,
            equipment: 0,
            value: 1,
         });
      });
   }

   test('an effect\'s elements fill the effect bucket only while the effect is enabled', async () => {
      await addElement(effectUuid, { value: 2 });
      await expect.poll(readBody, { message: 'the enabled effect adds +2 in the effect bucket' }).toEqual({
         effect: 2,
         equipment: 0,
         value: 3,
      });

      await setEffectActive(page, actorUuid, effectUuid, false);
      await expect.poll(readBody, { message: 'the disabled effect adds nothing' }).toEqual({
         effect: 0,
         equipment: 0,
         value: 1,
      });

      await setEffectActive(page, actorUuid, effectUuid, true);
      await expect.poll(readBody, { message: 'the re-enabled effect adds +2 again' }).toEqual({
         effect: 2,
         equipment: 0,
         value: 3,
      });
   });
});
