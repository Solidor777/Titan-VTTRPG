import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { pressDamageButton, rollWeaponAttack } from './checkCards.js';
import { readNewestCheckFlags } from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   activateScene,
   addAttack,
   addEffect,
   addRulesElement,
   addCombatant,
   applyCondition,
   controlPlacedToken,
   createActor,
   createCombat,
   createOwnedItem,
   createScene,
   endCombat,
   placeToken,
   readServerSystem,
   releaseTargets,
   removeCondition,
   rollInitiative,
   setAttackStat,
   setAttributeBase,
   startCombat,
   targetPlacedToken,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * Stats that feed a roll, changed by rules elements and by a condition, read from the check, the damage report or the
 * combatant they reach: the attributes, training and expertise of an attack, the Melee, Accuracy and Defense ratings,
 * the Armor mod, the Initiative rating, and a condition's elements (the condition bucket). The expected values are the
 * rule's own arithmetic on values the sheet shows before the element exists.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {{id: string, uuid: string, tokenId: string}} The attacker, whose stats feed the attacks. */
let attacker;
/** @type {{id: string, uuid: string, tokenId: string}} The defender, whose stats the attacks meet. */
let defender;
/** @type {string} The uuid of the attacker's weapon. */
let weaponUuid;
/** @type {string[]} The uuids of the documents the running test made, deleted when it ends. */
let madeUuids = [];
/** @type {number} The run stamp in the fixture names. */
const RUN = Date.now();

/**
 * Makes a character with a placed token.
 * @param {string} name - The character's name.
 * @param {number} body - The character's Body.
 * @returns {Promise<{id: string, uuid: string, tokenId: string}>} The character.
 */
async function makeCharacter(name, body) {
   /** @type {string} The character's id. */
   const id = await createActor(page, {
      name,
      type: 'player',
   });
   await setAttributeBase(page, `Actor.${id}`, 'body', body);
   return {
      id,
      uuid: `Actor.${id}`,
      tokenId: await placeToken(page, id),
   };
}

/**
 * Reads the total a character sheet shows for a stat.
 * @param {{uuid: string}} character - The character.
 * @param {string} testId - The test id of the stat's total.
 * @param {string} [tab] - The tab that shows it, when it is not on every tab.
 * @returns {Promise<number>} The displayed total.
 */
async function sheetTotal(character, testId, tab) {
   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(page, character.uuid);
   if (tab) {
      await clickSheetTab(sheet, tab);
   }
   return Number((await sheet.getByTestId(testId).innerText()).trim());
}

/**
 * Adds an ability to a character and authors elements on it through the Rules Elements tab.
 * @param {{id: string, uuid: string}} character - The character.
 * @param {object[]} elements - The elements (see `addRulesElement`).
 * @returns {Promise<string>} The uuid of the ability.
 */
async function giveElements(character, elements) {
   /** @type {string} The ability's id. */
   const abilityId = await createOwnedItem(page, character.id, 'ability', `E2E Roll Elements ${madeUuids.length}`);
   /** @type {string} The ability's uuid. */
   const uuid = `${character.uuid}.Item.${abilityId}`;
   madeUuids.push(uuid);
   for (const element of elements) {
      await addRulesElement(page, uuid, element);
   }
   return uuid;
}

/**
 * Rolls the attacker's weapon attack with all 6s and returns the message.
 * @returns {Promise<{id: string, parameters: object, results: object}>} The attack check.
 */
async function attack() {
   await forceDice(page, Array.from({ length: 40 }, () => 6));
   /** @type {{id: string, parameters: object, results: object}} The roll. */
   const message = await rollWeaponAttack(page, weaponUuid, 0);
   await resetDice(page);
   return message;
}

/**
 * Rolls a header button of a character's sheet.
 * @param {{uuid: string}} character - The character.
 * @param {string} button - The localized name of the Attribute button.
 * @returns {Promise<{id: string, parameters: object, results: object}>} The rolled check's message.
 */
async function rollFromHeader(character, button) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await (await openSheetByUuid(page, character.uuid)).getByRole('button', {
      name: button,
      exact: true,
   }).first().click();
   return readNewestCheckFlags(page, baseline, 'attributeCheck');
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await setClientSetting(page, 'getCheckOptions', 'never');

   /** @type {string} The scene the tokens stand on. */
   const sceneId = await createScene(page, { name: `E2E Element Rolls Scene ${RUN}` });
   await viewScene(page, sceneId);
   if (!await page.evaluate((id) => game.scenes.get(id).active, sceneId)) {
      await activateScene(page, sceneId);
   }

   // The attacker has Body 11, so an attack rolls enough dice for forced faces to fix its results.
   attacker = await makeCharacter(`E2E Element Rolls Attacker ${RUN}`, 11);
   defender = await makeCharacter(`E2E Element Rolls Defender ${RUN}`, 4);

   /** @type {string} The id of the attacker's weapon. */
   const weaponId = await createOwnedItem(page, attacker.id, 'weapon', 'E2E Element Rolls Weapon');
   weaponUuid = `${attacker.uuid}.Item.${weaponId}`;
   if ((await readServerSystem(page, weaponUuid)).attack.length === 0) {
      await addAttack(page, weaponUuid);
   }
   await setAttackStat(page, weaponUuid, 0, 'damage', 1);
   await closeAllApps(page);
});

test.afterEach(async () => {
   if (await page.evaluate(() => game.combat?.started === true)) {
      await endCombat(page);
   }
   for (const uuid of madeUuids) {
      await page.evaluate(async (target) => {
         await (await fromUuid(target))?.delete();
      }, uuid);
   }
   madeUuids = [];
   await releaseTargets(page);
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('stats that feed an attack', () => {
   test.describe.configure({ timeout: 240_000 });

   test('attribute, training and expertise elements reach the attack\'s dice and Expertise', async () => {
      /** @type {{parameters: object}} The attack with no elements. */
      const plain = await attack();
      /** @type {object} The attack's attribute, skill and totals before the elements. */
      const before = plain.parameters;
      await giveElements(attacker, [
         {
            selector: 'attribute',
            key: before.attribute,
            value: 1,
         },
         {
            selector: 'training',
            key: before.skill,
            value: 2,
         },
         {
            selector: 'expertise',
            key: before.skill,
            value: 3,
         },
      ]);

      /** @type {{parameters: object}} The attack with the elements. */
      const after = await attack();
      expect(after.parameters.attributeDice, 'the attribute element adds a die').toBe(before.attributeDice + 1);
      expect(after.parameters.skillTrainingDice, 'the training element adds 2 dice').toBe(before.skillTrainingDice + 2);
      expect(after.parameters.skillExpertise, 'the expertise element adds 3').toBe(before.skillExpertise + 3);
      expect(after.parameters.totalDice, 'the total dice follow').toBe(before.totalDice + 3);
      expect(after.parameters.totalExpertise, 'the total Expertise follows').toBe(before.totalExpertise + 3);
   });

   test('Melee and Accuracy elements reach the attacker rating of the attack', async () => {
      /** @type {number} The Melee rating the sheet shows before the elements. */
      const melee = await sheetTotal(attacker, 'sheet-rating-melee');
      /** @type {number} The Accuracy rating the sheet shows before the elements. */
      const accuracy = await sheetTotal(attacker, 'sheet-rating-accuracy');
      await giveElements(attacker, [
         {
            selector: 'rating',
            key: 'melee',
            value: 2,
         },
         {
            selector: 'rating',
            key: 'accuracy',
            value: 3,
         },
      ]);

      /** @type {{parameters: object}} The attack with the elements. */
      const { parameters } = await attack();
      expect(parameters.attackerMelee, 'the Melee element').toBe(melee + 2);
      expect(parameters.attackerAccuracy, 'the Accuracy element').toBe(accuracy + 3);
      expect(parameters.attackerRating, 'the attack uses the rating of its type')
         .toBe(parameters.type === 'melee' ? melee + 2 : accuracy + 3);
   });

   test('a Defense element sets the Defense a targeted attack meets', async () => {
      /** @type {number} The Defense the sheet shows before the element. */
      const defense = await sheetTotal(defender, 'sheet-rating-defense');
      await targetPlacedToken(page, defender.tokenId);
      /** @type {{parameters: object}} The attack before the element. */
      const plain = await attack();
      expect(plain.parameters.targetDefense, 'the attack meets the Defense of the sheet').toBe(defense);

      await giveElements(defender, [
         {
            selector: 'rating',
            key: 'defense',
            value: 2,
         },
      ]);
      /** @type {{parameters: object}} The attack after the element. */
      const { parameters } = await attack();
      expect(parameters.targetDefense, 'the Defense element is met by the attack').toBe(defense + 2);
      expect(parameters.difficulty, 'the Difficulty follows the Defense')
         .toBe(Math.min(Math.max(defense + 2 - parameters.attackerRating + 4, 2), 6));
   });

   test('an Armor element resists damage on the Apply Damage button', async () => {
      await giveElements(defender, [
         {
            selector: 'mod',
            key: 'armor',
            value: 2,
         },
      ]);
      /** @type {{id: string, results: object}} The attack, all dice successes. */
      const hit = await attack();
      await showChatLog(page);

      /** @type {{report: object}} The damage report of the Apply Damage button. */
      const applied = await pressDamageButton(page, hit.id, defender.id, 'apply');
      expect(hit.results.damage, 'the attack deals more than the Armor').toBeGreaterThan(2);
      expect(applied.report.damageResisted, 'the Armor element resists 2').toBe(2);
      expect(applied.report.damageTaken, 'the rest is taken').toBe(hit.results.damage - 2);
   });
});

test.describe('the resource maximum', () => {
   test.describe.configure({ timeout: 120_000 });

   test('a Short Rest from the Player HUD restores Stamina to the maximum the element raised', async () => {
      /** @type {number} The Stamina maximum the sheet shows before the element. */
      const max = await sheetTotal(defender, 'sheet-resource-stamina-max');
      await giveElements(defender, [
         {
            selector: 'resource',
            key: 'stamina',
            value: 3,
         },
      ]);
      expect(await sheetTotal(defender, 'sheet-resource-stamina-max'), 'the sheet shows the raised maximum')
         .toBe(max + 3);

      await controlPlacedToken(page, defender.tokenId);
      await page.getByTestId('player-hud-short-rest').click();
      await expect.poll(
         () => page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, defender.id),
         { message: 'the Short Rest restored Stamina to the raised maximum' },
      ).toBe(max + 3);
   });
});

test.describe('the Initiative rating', () => {
   test.describe.configure({ timeout: 240_000 });

   /**
    * Rolls the initiative of the attacker in a new combat with forced dice and ends the combat.
    * @returns {Promise<number>} The initiative the combatant got.
    */
   async function initiativeOfAttacker() {
      await createCombat(page);
      await addCombatant(page, attacker.tokenId);
      await addCombatant(page, defender.tokenId);
      await forceDice(page, Array.from({ length: 12 }, () => 3));
      await rollInitiative(page);
      await resetDice(page);
      await startCombat(page);
      /** @type {number} The attacker's initiative. */
      const initiative = await page.evaluate(
         (actorId) => game.combat.combatants.find((combatant) => combatant.actorId === actorId).initiative,
         attacker.id,
      );
      await endCombat(page);
      return initiative;
   }

   test('an Initiative element raises the initiative a combatant rolls', async () => {
      /** @type {number} The initiative before the element. */
      const before = await initiativeOfAttacker();
      await giveElements(attacker, [
         {
            selector: 'rating',
            key: 'initiative',
            value: 2,
         },
      ]);
      expect(await initiativeOfAttacker(), 'the same dice give 2 more').toBe(before + 2);
   });
});

test.describe('conditions fill the condition bucket', () => {
   test.describe.configure({ timeout: 240_000 });

   test('Blinded lowers Melee and Defense by a quarter of the base, on the sheet and in the attack', async () => {
      /** @type {number} The Melee the sheet shows before the condition. */
      const melee = await sheetTotal(attacker, 'sheet-rating-melee');
      /** @type {number} The Defense the sheet shows before the condition. */
      const defense = await sheetTotal(attacker, 'sheet-rating-defense');
      await applyCondition(page, attacker.tokenId, 'blinded');

      /** @type {import('@playwright/test').Locator} The attacker's sheet. */
      const sheet = await openSheetByUuid(page, attacker.uuid);
      await expect(sheet.getByTestId('sheet-rating-melee'), 'Melee falls to three quarters, rounded up')
         .toHaveText(String(Math.ceil(melee * 0.75)));
      await expect(sheet.getByTestId('sheet-rating-defense'), 'Defense falls to three quarters, rounded up')
         .toHaveText(String(Math.ceil(defense * 0.75)));
      await expect(sheet.getByTestId('sheet-rating-melee'), 'a condition penalty is styled').toHaveClass(/penalty/);

      /** @type {{parameters: object}} The attack while blinded. */
      const { parameters } = await attack();
      expect(parameters.attackerMelee, 'the attack uses the lowered Melee').toBe(Math.ceil(melee * 0.75));

      await removeCondition(page, attacker.tokenId, 'blinded');
      await expect(
         (await openSheetByUuid(page, attacker.uuid)).getByTestId('sheet-rating-melee'),
         'removing the condition restores Melee',
      ).toHaveText(String(melee));
   });

   test('Prone halves every speed, rounded up', async () => {
      /** @type {Record<string, number>} The speeds the sheet shows before the condition. */
      const before = {};
      /** @type {string[]} The speeds. */
      const speeds = await page.evaluate((uuid) => Object.keys(fromUuidSync(uuid).system.speed), defender.uuid);
      for (const speed of speeds) {
         before[speed] = await sheetTotal(defender, `sheet-speed-${speed}`);
      }
      await applyCondition(page, defender.tokenId, 'prone');

      /** @type {import('@playwright/test').Locator} The defender's sheet. */
      const sheet = await openSheetByUuid(page, defender.uuid);
      for (const speed of speeds) {
         await expect(sheet.getByTestId(`sheet-speed-${speed}`), `${speed} is halved, rounded up`)
            .toHaveText(String(Math.ceil(before[speed] * 0.5)));
      }
      await removeCondition(page, defender.tokenId, 'prone');
   });

   test('Frightened gives every check a Disadvantage', async () => {
      await applyCondition(page, attacker.tokenId, 'frightened');
      /** @type {{parameters: object}} The Body check while frightened. */
      const { parameters } = await rollFromHeader(attacker, 'Body');
      expect(parameters.advantage, 'the condition is one level of Disadvantage').toBe(-1);
      expect(parameters.difficulty, 'the Difficulty rises by one').toBe(parameters.baseDifficulty + 1);
      await removeCondition(page, attacker.tokenId, 'frightened');
   });
});

test.describe('an effect on a character', () => {
   test.describe.configure({ timeout: 120_000 });

   test('adds its own bucket to the attack', async () => {
      /** @type {number} The Melee the sheet shows before the effect. */
      const melee = await sheetTotal(attacker, 'sheet-rating-melee');
      /** @type {string} The id of the effect. */
      const effectId = await addEffect(page, attacker.id, 'E2E Element Rolls Effect');
      madeUuids.push(`${attacker.uuid}.ActiveEffect.${effectId}`);
      await addRulesElement(page, `${attacker.uuid}.ActiveEffect.${effectId}`, {
         selector: 'rating',
         key: 'melee',
         value: 1,
      });

      /** @type {{parameters: object}} The attack with the effect. */
      const { parameters } = await attack();
      expect(parameters.attackerMelee, 'the effect adds 1 to Melee').toBe(melee + 1);
   });
});
