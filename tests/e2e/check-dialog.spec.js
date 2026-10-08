import { expect, test } from './harness.js';
import { DURATION_PERMANENT } from '~/system/DurationTypes.js';
import { clickSheetTab } from './actions.js';
import {
   clickRoll,
   moveDialogAside,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setCheckbox,
   setNumberField,
   setSelectField,
} from './checkDialog.js';
import { forceDice, resetDice } from './dice.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addCheck,
   addEffect,
   addRulesElement,
   addTrait,
   applyCondition,
   createActor,
   createOwnedItem,
   dragItemOntoSheet,
   placeToken,
   removeCondition,
   setAttributeBase,
   setEffectActive,
   setEquipped,
   shared,
   viewScene,
} from './flows.js';
import { selectTitanOption } from './select.js';
import { setClientSetting } from './settings.js';
import { settle } from './settle.js';
import { expectedCheckResults } from '../shared/checkOracle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * The check dialogs, opened from the roll buttons of the sheets. Each check type's dialog recomputes its totals as its
 * fields change and hands the chosen options to the roll; the Advantage select, the Automatic Failure checkbox, the
 * effective Difficulty and the situation checkboxes follow the actor's effects while the dialog is open; the fields a
 * user has not touched follow edits to the owned item or effect the check comes from, and the dialog closes when that
 * document is deleted; a field the user has set is kept; equipped Heavy, Encumbering and Loud armor offer their check
 * rules as situations; the `getCheckOptions` setting decides whether a roll opens the dialog.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the character that rolls through the dialogs. */
let rollerId;
/** @type {string} The uuid of the character that rolls through the dialogs. */
let rollerUuid;
/** @type {Record<string, string>} The uuids of the roller's weapon, spell and ability, by check type. */
const itemUuids = {};
/** @type {{situation: string, heavy: string, full: string}} The uuids of the file's read-only actors. */
const actors = {};
/** @type {{jump: string, swim: string, undetected: string}} The localized situation labels. */
let labels;

/** @type {number[]} Forced faces; six entries cover the largest dice count in this spec (3 + diceMod 2). */
const FORCED_FACES = [
   6,
   5,
   4,
   3,
   2,
   1,
];

/** @type {{type: string, expectedType: string}[]} The check types of the uniform dialog tests. */
const CORE_CASES = [
   {
      type: 'attribute',
      expectedType: 'attributeCheck',
   },
   {
      type: 'resistance',
      expectedType: 'resistanceCheck',
   },
   {
      type: 'attack',
      expectedType: 'attackCheck',
   },
   {
      type: 'casting',
      expectedType: 'castingCheck',
   },
   {
      type: 'item',
      expectedType: 'itemCheck',
   },
];

/** @type {{jump: string, swim: string, undetected: string}} The stable, locale-independent situation keys. */
const KEYS = {
   jump: 'jump',
   swim: 'swim,Fly,OrClimb',
   undetected: 'remainUndetectedByHearing',
};

/** @type {string} Selector of the Attribute Check dialog window. */
const ATTRIBUTE_DIALOG = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {string} Selector of the Attack Check dialog window. */
const ATTACK_DIALOG = '.application.titan-dialog[id^="titan-attack-check-dialog-"]';

/**
 * Makes a character and returns its id and uuid. The name carries the worker's index: a failed test restarts the
 * worker, whose characters then still exist, and a repeated name would make the directory entry ambiguous.
 * @param {string} name - The character's name.
 * @returns {Promise<{id: string, uuid: string}>} The character.
 */
async function makeActor(name) {
   /** @type {string} The character's id. */
   const id = await createActor(page, {
      name: `${name} w${test.info().workerIndex}`,
      type: 'player',
   });
   return {
      id,
      uuid: `Actor.${id}`,
   };
}

/**
 * Adds an effect with one conditional check modifier to an actor through the Effects tab and the effect's sheet.
 * @param {string} actorId - The id of the actor.
 * @param {string} name - The effect's name.
 * @param {object} element - The rules element, as `addRulesElement` takes it; the operation is a conditional check
 * modifier.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.duration] - The effect's duration type.
 * @returns {Promise<string>} The uuid of the effect.
 */
async function addModifierEffect(actorId, name, element, { duration } = {}) {
   /** @type {string} The effect's uuid. */
   const uuid = `Actor.${actorId}.ActiveEffect.${await addEffect(page, actorId, name, { duration })}`;
   await addRulesElement(page, uuid, {
      operation: 'conditionalCheckModifier',
      ...element,
   });
   return uuid;
}

/**
 * Adds an effect with an Underwater situation (a Disadvantage) to an actor.
 * @param {string} actorId - The id of the actor.
 * @param {string} name - The effect's name.
 * @param {string} key - The situation's name.
 * @returns {Promise<string>} The uuid of the effect.
 */
function addSituationEffect(actorId, name, key) {
   return addModifierEffect(actorId, name, {
      modifierType: 'advantage',
      checkType: 'any',
      selector: 'situation',
      key,
      advantageLevel: -1,
   });
}

/**
 * Deletes an effect with the Delete Effect button of its row in the actor's Effects tab.
 * @param {string} actorUuid - The uuid of the actor.
 * @param {string} effectUuid - The uuid of the effect.
 * @returns {Promise<void>} Resolves once the actor no longer has the effect.
 */
async function deleteEffect(actorUuid, effectUuid) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await clickSheetTab(sheet, 'Effects');
   await settle(page, { transitions: true });
   await sheet.locator(`[data-effect-id="${effectUuid.split('.').at(-1)}"]`)
      .getByRole('button', { name: 'Delete Effect' }).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)) === null, effectUuid),
      { message: 'the Delete Effect button deleted the effect' },
   ).toBe(true);
   await settle(page);
}

/**
 * Deletes an owned item with the Delete Item button of its row in a tab of the actor's sheet.
 * @param {string} actorUuid - The uuid of the actor.
 * @param {string} tab - The sheet tab that lists the item.
 * @param {string} itemUuid - The uuid of the owned item.
 * @returns {Promise<void>} Resolves once the item is gone.
 */
async function deleteItem(actorUuid, tab, itemUuid) {
   /** @type {import('@playwright/test').Locator} The actor's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   await clickSheetTab(sheet, tab);
   await settle(page, { transitions: true });
   await sheet.locator(`[data-item-id="${itemUuid.split('.').at(-1)}"]`)
      .getByRole('button', { name: 'Delete Item' }).click();
   await expect.poll(
      () => page.evaluate(async (uuid) => (await fromUuid(uuid)) === null, itemUuid),
      { message: 'the Delete Item button deleted the item' },
   ).toBe(true);
   await settle(page);
}

/**
 * Adds a permanent effect with always-on conditional check modifiers (any check, no situation) to an actor and
 * switches it off with its active toggle, so that a test can switch it on while a dialog is open.
 * @param {{id: string, uuid: string}} actor - The actor.
 * @param {string} name - The effect's name.
 * @param {object[]} elements - The rules elements of the effect, one row each, as `addRulesElement` takes them.
 * @returns {Promise<string>} The uuid of the effect.
 */
async function addSwitchedOffEffect(actor, name, elements) {
   /** @type {string} The effect's uuid. */
   const uuid = `${actor.uuid}.ActiveEffect.${await addEffect(page, actor.id, name, { duration: DURATION_PERMANENT })}`;
   for (const element of elements) {
      await addRulesElement(page, uuid, {
         operation: 'conditionalCheckModifier',
         checkType: 'any',
         selector: 'any',
         ...element,
      });
   }
   await setEffectActive(page, actor.uuid, uuid, false);
   return uuid;
}

/**
 * Reads the one "no longer valid" notice a check dialog raises when it closes because its source was deleted, checks
 * that no "failed before construction" error accompanies it, then dismisses it with a click as a user does; an
 * undismissed notice covers the OK button of the next create dialog.
 * @returns {Promise<void>} Resolves once the notice is gone.
 */
async function dismissNoLongerValidNotice() {
   /** @type {import('@playwright/test').Locator} The notice. */
   const notice = page.locator('#notifications .notification', { hasText: /no longer valid/i });
   await expect(notice).toHaveCount(1);
   await expect(page.locator('#notifications .notification', { hasText: /failed before construction/i }))
      .toHaveCount(0);
   await notice.click();
   await expect(notice).toHaveCount(0);
}

/**
 * Chooses a value in a select of the first check of an item or effect, in the sheet's Checks tab.
 * @param {string} documentUuid - The uuid of the item or effect.
 * @param {string} label - The select's label (`Difficulty`, `Skill`).
 * @param {string|number} value - The value to choose.
 * @returns {Promise<void>} Resolves once the document stores the value.
 */
async function setCheckSelect(documentUuid, label, value) {
   /** @type {import('@playwright/test').Locator} The document's sheet. */
   const sheet = await openSheetByUuid(page, documentUuid);
   await clickSheetTab(sheet, 'Checks');
   await settle(page, { transitions: true });

   /** @type {import('@playwright/test').Locator} The select inside the first check row. */
   const trigger = sheet.locator('.check').filter({ has: page.locator('.header .label input') }).first()
      .locator('.field').filter({ has: page.getByText(label, { exact: true }) }).first()
      .locator('[role="combobox"]');
   await selectTitanOption(page, trigger, value);
   await expect.poll(
      () => page.evaluate(
         async ({ uuid, field }) => (await fromUuid(uuid)).system.check[0][field],
         {
            uuid: documentUuid,
            field: label.toLowerCase(),
         },
      ),
      { message: `the ${label} select stored ${value}` },
   ).toBe(value);
   await settle(page);
}

/**
 * Chooses a value in a select of the first attack of a weapon, in the sheet's Attacks tab.
 * @param {string} weaponUuid - The uuid of the weapon.
 * @param {string} label - The select's label (`Type`, `Attribute`).
 * @param {string} value - The value to choose.
 * @returns {Promise<void>} Resolves once the weapon stores the value.
 */
async function setAttackSelect(weaponUuid, label, value) {
   /** @type {import('@playwright/test').Locator} The weapon's sheet. */
   const sheet = await openSheetByUuid(page, weaponUuid);
   await clickSheetTab(sheet, 'Attacks');
   await settle(page, { transitions: true });

   /** @type {import('@playwright/test').Locator} The select inside the first attack. */
   const trigger = sheet.locator('.attack').first().locator('.field')
      .filter({ has: page.getByText(label, { exact: true }) }).first().locator('[role="combobox"]');
   await selectTitanOption(page, trigger, value);
   await expect.poll(
      () => page.evaluate(
         async ({ uuid, field }) => (await fromUuid(uuid)).system.attack[0][field],
         {
            uuid: weaponUuid,
            field: label.toLowerCase(),
         },
      ),
      { message: `the ${label} select stored ${value}` },
   ).toBe(value);
   await settle(page);
}

/**
 * Makes a character that owns a copy of a shared item.
 * @param {string} name - The character's name.
 * @param {string} key - The shared fixture's key (`weapon`, `spell`, `ability`).
 * @returns {Promise<{id: string, uuid: string, itemUuid: string, itemId: string}>} The character and its item.
 */
async function makeActorWith(name, key) {
   /** @type {{id: string, uuid: string}} The character. */
   const actor = await makeActor(name);

   /** @type {string} The owned copy's id. */
   const itemId = await dragItemOntoSheet(page, await shared(page, key), actor.id);
   return {
      ...actor,
      itemId,
      itemUuid: `${actor.uuid}.Item.${itemId}`,
   };
}

/**
 * Makes a character wearing one armor with the given traits.
 * @param {string} name - The character's name.
 * @param {string[]} traits - The labels of the armor's traits in the Edit Traits dialog.
 * @returns {Promise<string>} The uuid of the character.
 */
async function makeArmoredActor(name, traits) {
   /** @type {{id: string, uuid: string}} The character. */
   const actor = await makeActor(name);

   /** @type {string} The armor's id. */
   const armorId = await createOwnedItem(page, actor.id, 'armor', `${name} Armor`);
   for (const trait of traits) {
      await addTrait(page, `${actor.uuid}.Item.${armorId}`, trait);
   }
   await setEquipped(page, actor.id, armorId, true);
   return actor.uuid;
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await setClientSetting(page, 'confirmDeletingItems', false);
   await setClientSetting(page, 'confirmDeletingEffects', false);
   await setClientSetting(page, 'getCheckOptions', 'never');
   labels = await page.evaluate(() => ({
      jump: game.i18n.localize('LOCAL.situationJump.text'),
      swim: game.i18n.localize('LOCAL.situationSwimFlyClimb.text'),
      undetected: game.i18n.localize('LOCAL.situationRemainUndetectedByHearing.text'),
   }));

   // The roller: Body and Mind 3 give every check three dice; the shared weapon, spell and ability are copied onto it.
   ({ id: rollerId, uuid: rollerUuid } = await makeActor('E2E Dialog Roller'));
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

   // Characters the tests only read: one with an Underwater situation, and two wearing armor.
   /** @type {{id: string, uuid: string}} The character with the situation. */
   const situation = await makeActor('E2E Dialog Situation Actor');
   await addSituationEffect(situation.id, 'E2E Deep Water', 'Underwater');
   actors.situation = situation.uuid;
   actors.heavy = await makeArmoredActor('E2E Dialog Heavy Actor', ['Heavy']);
   actors.full = await makeArmoredActor('E2E Dialog Full Armor Actor', [
      'Heavy',
      'Encumbering',
      'Loud',
   ]);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await resetDice(page);
   await closeAllApps(page);
   await setClientSetting(page, 'getCheckOptions', 'never');
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await setClientSetting(page, 'getCheckOptions', 'situational');
   await page?.close();
});

test.describe('the dialog of each check type', () => {
   test.beforeEach(async () => {
      await setClientSetting(page, 'getCheckOptions', 'always');
   });

   for (const checkCase of CORE_CASES) {
      test(`${checkCase.type} dialog recomputes totals and rolls with mutated options`, async () => {
         /** @type {import('@playwright/test').Locator} The dialog, opened from the roll button. */
         const dialog = await openCheckDialog(
            page,
            checkCase.type,
            checkCase.type === 'attribute' || checkCase.type === 'resistance' ? rollerUuid : itemUuids[checkCase.type],
         );

         // The dialog offers Advantage, Automatic Failure and the effective Difficulty.
         await expect(dialog.getByTestId('check-field-advantage')).toBeVisible();
         await expect(dialog.getByTestId('check-field-automaticFailure')).toBeVisible();
         await expect(dialog.getByTestId('check-summary-difficulty')).toBeVisible();

         // Baseline totals straight from the freshly opened dialog.
         /** @type {number} The Total Dice before the change. */
         const baseDice = await readSummary(dialog, 'totalDice');
         /** @type {number} The Total Expertise before the change. */
         const baseExpertise = await readSummary(dialog, 'totalExpertise');
         expect(baseExpertise, 'baseline expertise is zero (untrained roller)').toBe(0);

         // (1) diceMod recompute: +2 dice.
         await setNumberField(dialog, 'diceMod', 2);
         await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(baseDice + 2));

         // (2) expertiseMod recompute: +3 expertise.
         await setNumberField(dialog, 'expertiseMod', 3);
         await expect(dialog.getByTestId('check-summary-totalExpertise')).toHaveText(String(baseExpertise + 3));

         // (3) doubleExpertise recompute: the displayed total doubles.
         await setCheckbox(dialog, 'doubleExpertise', true);
         await expect(dialog.getByTestId('check-summary-totalExpertise'))
            .toHaveText(String((baseExpertise + 3) * 2));

         // Reset expertise to zero so the rolled check satisfies the oracle's zero-expertise assumption.
         await setCheckbox(dialog, 'doubleExpertise', false);
         await setNumberField(dialog, 'expertiseMod', 0);
         await expect(dialog.getByTestId('check-summary-totalExpertise')).toHaveText('0');

         // diceMod stays at 2, so the rolled check uses baseDice + 2 dice.
         /** @type {number} The dice the roll uses. */
         const rolledDice = baseDice + 2;
         await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(rolledDice));

         // (4) Roll handoff: force dice, roll, then read the produced message.
         await forceDice(page, FORCED_FACES);
         /** @type {number} The chat-message count before the roll. */
         const baseline = await clickRoll(dialog, page);
         /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
         const flags = await readNewestCheckFlags(page, baseline);
         expect(flags.type, 'message type').toBe(checkCase.expectedType);
         expect(flags.parameters.totalDice, 'rolled totalDice reflects dialog diceMod').toBe(rolledDice);
         expect(flags.parameters.totalExpertise, 'rolled totalExpertise is zero after reset').toBe(0);

         // Forced faces plumbed into the dice (sorted desc, truncated to the dice rolled).
         /** @type {number[]} The forced faces the roll consumes, highest first. */
         const consumedFaces = FORCED_FACES.slice(0, rolledDice).slice().sort((a, b) => b - a);
         expect(flags.results.dice.map((die) => die.base), 'rolled dice bases match forced faces')
            .toEqual(consumedFaces);
         expect(flags.results.dice.map((die) => die.final), 'finals equal bases at zero expertise')
            .toEqual(consumedFaces);

         // Results equal the independent oracle, exactly.
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
      });
   }

   test('attribute dialog difficulty select flows through without changing dice', async () => {
      /** @type {import('@playwright/test').Locator} The dialog. */
      const dialog = await openCheckDialog(page, 'attribute', rollerUuid);
      /** @type {number} The Total Dice before the change. */
      const baseDice = await readSummary(dialog, 'totalDice');

      // Difficulty is a 1-6 Select combobox; changing it must not change the dice count.
      await setSelectField(dialog, 'difficulty', 6);
      await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(baseDice));

      // It flows into the rolled difficulty.
      await forceDice(page, FORCED_FACES);
      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.type, 'message type').toBe('attributeCheck');
      expect(flags.parameters.difficulty, 'dialog difficulty select flows into rolled params').toBe(6);
   });

   test('attack dialog targetDefense flows into rolled parameters', async () => {
      /** @type {import('@playwright/test').Locator} The dialog. */
      const dialog = await openCheckDialog(page, 'attack', itemUuids.attack);

      // A high targetDefense drives difficulty to its clamp ceiling (6); the raw value flows through.
      await setNumberField(dialog, 'targetDefense', 10);
      await forceDice(page, FORCED_FACES);
      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.type, 'message type').toBe('attackCheck');
      expect(flags.parameters.targetDefense, 'dialog targetDefense flows into rolled params').toBe(10);
      expect(flags.parameters.difficulty, 'high targetDefense clamps difficulty to the ceiling').toBe(6);
   });
});

test.describe('the situational setting', () => {
   test('opens the dialog only for a check with a situational modifier', async () => {
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {{id: string, uuid: string}} A character whose permanent effect carries one situation. */
      const actor = await makeActor('E2E Check Options Actor');
      await addModifierEffect(
         actor.id,
         'E2E Underwater',
         {
            modifierType: 'dice',
            checkType: 'any',
            selector: 'situation',
            key: 'Underwater',
            value: -1,
         },
         { duration: DURATION_PERMANENT },
      );

      // With a situational modifier the dialog opens.
      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = await openCheckDialog(page, 'attribute', actor.uuid);
      await expect(dialog).toBeVisible();
      await closeAllApps(page);
      await expect(dialog).toHaveCount(0);

      // Deactivate the effect with its row's toggle: no situational modifier remains, so the same click rolls straight
      // to chat.
      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, actor.uuid);
      await clickSheetTab(sheet, 'Effects');
      await settle(page, { transitions: true });
      await sheet.locator('[data-effect-id] i.fa-square-check').click();
      await expect.poll(
         () => page.evaluate(
            (id) => game.actors.get(id).system.getSituationalCheckModifiers('attribute', { skill: 'none' }).length,
            actor.id,
         ),
         { message: 'the toggle removed the situational modifier' },
      ).toBe(0);

      /** @type {number} The chat-message count before the click. */
      const baseline = await page.evaluate(() => game.messages.size);
      await sheet.getByRole('button', {
         name: 'Body',
         exact: true,
      }).first().click();
      await readNewestCheckFlags(page, baseline, 'attributeCheck');
      await expect(dialog, 'no dialog opened for the roll').toHaveCount(0);
   });
});

test.describe('a situation and the Advantage field', () => {
   test('the Advantage select and a ticked situation change the displayed and rolled Difficulty', async () => {
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = await openCheckDialog(page, 'attribute', actors.situation);

      /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
      const difficulty = dialog.getByTestId('check-summary-difficulty');
      await expect(difficulty).toHaveText('4');

      // The situation row lists its label, what it does, and its source; its check icon tracks the tick.
      /** @type {import('@playwright/test').Locator} The Underwater situation row. */
      const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
      await expect(row).toContainText('E2E Deep Water');

      /** @type {import('@playwright/test').Locator} The row's checkbox. */
      const toggle = row.locator('[data-testid^="situation-toggle-"]');
      await toggle.click();
      await expect(row.locator('i.fa-check')).toHaveCount(1);
      await expect(difficulty).toHaveText('5');
      await toggle.click();
      await expect(row.locator('i.fa-check')).toHaveCount(0);
      await expect(difficulty).toHaveText('4');
      await toggle.click();
      await expect(difficulty).toHaveText('5');

      // Greater Advantage from the select nets +1 against the ticked Disadvantage.
      await setSelectField(dialog, 'advantage', 2);
      await expect(difficulty).toHaveText('3');
      expect(await readSummary(dialog, 'difficulty')).toBe(3);

      // The row is a flex row whose details use the small font token, and its checkbox matches the dialog's other
      // input fields' height, not the smaller global default.
      /**
       * @type {{checkboxHeight: string, detailsFontSize: string, display: string, flexDirection: string,
       * smallFontSize: string}} Row and checkbox styles.
       */
      const styles = await row.evaluate((element) => {
         /** @type {HTMLSpanElement} A probe resolving the small font token to computed px form. */
         const probe = document.createElement('span');
         probe.style.fontSize = 'var(--titan-font-size-small)';
         element.appendChild(probe);

         /** @type {string} The resolved small font size. */
         const smallFontSize = getComputedStyle(probe).fontSize;
         probe.remove();
         return {
            checkboxHeight: getComputedStyle(element.querySelector('button')).height,
            detailsFontSize: getComputedStyle(element.querySelector('.details')).fontSize,
            display: getComputedStyle(element).display,
            flexDirection: getComputedStyle(element).flexDirection,
            smallFontSize,
         };
      });
      /** @type {string} The dialog's other fields' input height, for reference. */
      const fieldInputHeight = await dialog.getByTestId('check-field-diceMod').locator('input').evaluate(
         (element) => getComputedStyle(element).height,
      );
      expect(styles.display).toBe('flex');
      expect(styles.flexDirection).toBe('row');
      expect(styles.detailsFontSize).toBe(styles.smallFontSize);
      expect(styles.checkboxHeight).toBe(fieldInputHeight);

      // The resolved value itself is pinned too, so a change to the shared input-height token fails this test.
      expect(styles.checkboxHeight).toBe('28px');

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters).toMatchObject({
         advantage: 1,
         baseDifficulty: 4,
         difficulty: 3,
         situations: [
            {
               key: 'underwater',
               label: 'Underwater',
            },
         ],
      });
   });

   test('the Automatic Failure checkbox fails the rolled check', async () => {
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = await openCheckDialog(page, 'attribute', actors.situation);
      await setCheckbox(dialog, 'automaticFailure', true);
      await forceDice(page, [6]);
      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters.automaticFailure).toBe(true);

      // The forced die rolled a 6 (a Success against Difficulty 4 without Automatic Failure), so the zero Successes is
      // an Automatic Failure and not an accidental zero.
      expect(flags.results.dice.some((die) => die.final === 6)).toBe(true);
      expect(flags.results.successes).toBe(0);
   });

   test('the open dialog follows the Actor\'s effects', async () => {
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {{id: string, uuid: string}} A character of its own: the test deletes its effect. */
      const actor = await makeActor('E2E Dialog Follow Actor');

      /** @type {string} The uuid of the effect behind the situation. */
      const deepWater = await addSituationEffect(actor.id, 'E2E Deep Water', 'Underwater');

      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = await openCheckDialog(page, 'attribute', actor.uuid);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
      const difficulty = dialog.getByTestId('check-summary-difficulty');

      /** @type {import('@playwright/test').Locator} The Underwater situation row. */
      const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
      await row.locator('[data-testid^="situation-toggle-"]').click();
      await expect(difficulty).toHaveText('5');

      // Deleting the effect behind the ticked situation removes its row and its Disadvantage from the open dialog.
      await deleteEffect(actor.uuid, deepWater);
      await expect(row).toHaveCount(0);
      await expect(difficulty).toHaveText('4');

      // A new situational effect appears in the same open dialog.
      await addSituationEffect(actor.id, 'E2E Strong Current', 'Strong Current');

      /** @type {import('@playwright/test').Locator} The new Strong Current situation row. */
      const strongCurrentRow = dialog.locator('[data-testid^="situation-row-"]')
         .filter({ hasText: 'Strong Current' });
      await expect(strongCurrentRow).toContainText('E2E Strong Current');

      // A brand new situation (a different key from the one just removed) starts unticked and does not affect the
      // Difficulty.
      await expect(strongCurrentRow.locator('i.fa-check')).toHaveCount(0);
      await expect(difficulty).toHaveText('4');
   });

   test('a ticked situation does not survive its row\'s removal onto a same-key situation', async () => {
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {{id: string, uuid: string}} A character of its own: the test deletes its effect. */
      const actor = await makeActor('E2E Dialog Same Key Actor');

      /** @type {string} The uuid of the effect behind the situation. */
      const deepWater = await addSituationEffect(actor.id, 'E2E Deep Water', 'Underwater');

      /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
      const dialog = await openCheckDialog(page, 'attribute', actor.uuid);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
      const difficulty = dialog.getByTestId('check-summary-difficulty');

      /** @type {import('@playwright/test').Locator} The Underwater situation row. */
      const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
      await row.locator('[data-testid^="situation-toggle-"]').click();
      await expect(row.locator('i.fa-check')).toHaveCount(1);
      await expect(difficulty).toHaveText('5');

      // Deleting the effect behind the ticked situation removes its row.
      await deleteEffect(actor.uuid, deepWater);
      await expect(row).toHaveCount(0);
      await expect(difficulty).toHaveText('4');

      // A different effect that resolves to the SAME situation key must start unticked, not inherit the tick left
      // behind by the deleted effect's row.
      await addSituationEffect(actor.id, 'E2E Deep Water 2', 'Underwater');
      await expect(row).toHaveCount(1);
      await expect(row.locator('i.fa-check')).toHaveCount(0);
      await expect(difficulty).toHaveText('4');
   });
});

test.describe('fields that follow the actor while the dialog is open', () => {
   test.beforeEach(async () => {
      await setClientSetting(page, 'getCheckOptions', 'always');
   });

   /**
    * Adds an effect with one always-on conditional check modifier (any check, no situation) to an actor. The effect
    * is active as soon as it exists.
    * @param {string} actorId - The id of the actor.
    * @param {string} name - The effect's name.
    * @param {object[]} elements - The rules elements of the effect, one row each.
    * @returns {Promise<string>} The uuid of the effect.
    */
   async function addAlwaysOnEffect(actorId, name, elements) {
      /** @type {string} The effect's uuid. */
      const uuid = `Actor.${actorId}.ActiveEffect.${await addEffect(page, actorId, name)}`;
      for (const element of elements) {
         await addRulesElement(page, uuid, {
            operation: 'conditionalCheckModifier',
            checkType: 'any',
            selector: 'any',
            ...element,
         });
      }
      return uuid;
   }

   /**
    * Makes a character with switched-off permanent effects, opens its Attribute Check dialog and moves the dialog off
    * the sheet.
    * @param {string} name - The character's name.
    * @param {{name: string, elements: object[]}[]} effects - The effects to make, in order.
    * @returns {Promise<{id: string, uuid: string, effects: string[], dialog: import('@playwright/test').Locator}>}
    * The character, the uuids of its effects and the dialog.
    */
   async function openDialogWithSwitchedOffEffects(name, effects) {
      /** @type {{id: string, uuid: string}} The character. */
      const actor = await makeActor(name);

      /** @type {string[]} The uuids of the character's effects. */
      const effectUuids = [];
      for (const effect of effects) {
         effectUuids.push(await addSwitchedOffEffect(actor, effect.name, effect.elements));
      }

      /** @type {import('@playwright/test').Locator} The dialog. */
      const dialog = await openCheckDialog(page, 'attribute', actor.uuid);
      await moveDialogAside(dialog);
      return {
         ...actor,
         effects: effectUuids,
         dialog,
      };
   }

   test('Advantage follows the active toggle of an Actor effect, and the rolled check carries the re-derived value',
      async () => {
         /** @type {{uuid: string, effects: string[], dialog: object}} The character, its effects and the dialog. */
         const { uuid, effects: [effect], dialog } = await openDialogWithSwitchedOffEffects(
            'E2E Dialog Advantage Actor',
            [
               {
                  name: 'E2E Always Disadvantage',
                  elements: [
                     {
                        modifierType: 'advantage',
                        advantageLevel: -1,
                     },
                  ],
               },
            ],
         );

         /** @type {import('@playwright/test').Locator} The Advantage select's trigger. */
         const advantageSelect = dialog.getByTestId('check-field-advantage').locator('[role="combobox"]');

         /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
         const difficulty = dialog.getByTestId('check-summary-difficulty');
         await expect(difficulty).toHaveText('4');
         await expect(advantageSelect).toHaveAttribute('data-value', '0');

         // Switching the Disadvantage effect on (selector "any", so never offered as a checkbox) while the dialog is
         // open: the select and the effective Difficulty follow it.
         await setEffectActive(page, uuid, effect, true);
         await expect(advantageSelect).toHaveAttribute('data-value', '-1');
         await expect(difficulty).toHaveText('5');

         // Rolling carries the re-derived value, not the stale value the dialog opened with.
         /** @type {number} The chat-message count before the roll. */
         const baseline = await clickRoll(dialog, page);

         /** @type {{parameters: object}} The rolled check's flags. */
         const flags = await readNewestCheckFlags(page, baseline);
         expect(flags.parameters.advantage).toBe(-1);
         expect(flags.parameters.difficulty).toBe(5);

         // A new dialog opens with the effect on; switching the effect off returns both to their prior state.
         await setClientSetting(page, 'getCheckOptions', 'always');

         /** @type {import('@playwright/test').Locator} The second dialog. */
         const second = await openCheckDialog(page, 'attribute', uuid);
         await moveDialogAside(second);

         /** @type {import('@playwright/test').Locator} The second dialog's Advantage select. */
         const secondSelect = second.getByTestId('check-field-advantage').locator('[role="combobox"]');
         await expect(secondSelect).toHaveAttribute('data-value', '-1');
         await setEffectActive(page, uuid, effect, false);
         await expect(secondSelect).toHaveAttribute('data-value', '0');
         await expect(second.getByTestId('check-summary-difficulty')).toHaveText('4');

         // Deleting the effect while it is on removes the value from the open dialog as well.
         await setEffectActive(page, uuid, effect, true);
         await expect(secondSelect).toHaveAttribute('data-value', '-1');
         await deleteEffect(uuid, effect);
         await expect(secondSelect).toHaveAttribute('data-value', '0');
         await expect(second.getByTestId('check-summary-difficulty')).toHaveText('4');
      });

   test('Advantage keeps a user override against a later Actor effect switched on (synced on a visible Total Dice ' +
      'change)', async () => {
      /** @type {{uuid: string, effects: string[], dialog: object}} The character, its effects and the dialog. */
      const { uuid, effects: [effect], dialog } = await openDialogWithSwitchedOffEffects(
         'E2E Dialog Advantage Override Actor',
         [
            {
               name: 'E2E Always Disadvantage And Dice',
               elements: [
                  {
                     modifierType: 'advantage',
                     advantageLevel: -1,
                  },
                  {
                     modifierType: 'dice',
                     value: 3,
                  },
               ],
            },
         ],
      );

      /** @type {import('@playwright/test').Locator} The Advantage select's trigger. */
      const advantageSelect = dialog.getByTestId('check-field-advantage').locator('[role="combobox"]');

      /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
      const difficulty = dialog.getByTestId('check-summary-difficulty');

      /** @type {import('@playwright/test').Locator} The Total Dice summary. */
      const totalDice = dialog.getByTestId('check-summary-totalDice');

      /** @type {number} The Total Dice before the effect is switched on. */
      const baselineDice = await readSummary(dialog, 'totalDice');

      // The user picks Greater Advantage in the dialog.
      await setSelectField(dialog, 'advantage', 2);
      await expect(advantageSelect).toHaveAttribute('data-value', '2');
      await expect(difficulty).toHaveText('2');

      // The effect carries BOTH a Disadvantage modifier (which must not overwrite the user's Advantage) and a Dice
      // modifier (a visible, untouched field). Waiting for the Dice change first proves the effect was processed
      // before Advantage is asserted to have held.
      await setEffectActive(page, uuid, effect, true);
      await expect(totalDice).toHaveText(String(baselineDice + 3));
      await expect(advantageSelect).toHaveAttribute('data-value', '2');
      await expect(difficulty).toHaveText('2');
   });

   test('Automatic Failure follows the active toggle of an Actor effect, off and on again', async () => {
      /** @type {{uuid: string, effects: string[], dialog: object}} The character, its effects and the dialog. */
      const { uuid, effects: [effect], dialog } = await openDialogWithSwitchedOffEffects(
         'E2E Dialog Auto Failure Actor',
         [
            {
               name: 'E2E Always Auto-Fail',
               elements: [{ modifierType: 'automaticFailure' }],
            },
         ],
      );

      /** @type {import('@playwright/test').Locator} The Automatic Failure field wrapper. */
      const field = dialog.getByTestId('check-field-automaticFailure');
      await expect(field.locator('i.fa-check')).toHaveCount(0);

      // Switching the effect on while the dialog is open: the checkbox follows it.
      await setEffectActive(page, uuid, effect, true);
      await expect(field.locator('i.fa-check')).toHaveCount(1);

      // Switching it off before the user edits anything ticks it back off.
      await setEffectActive(page, uuid, effect, false);
      await expect(field.locator('i.fa-check')).toHaveCount(0);

      // Switching it on again ticks it back on: the follow behavior is not a one-shot.
      await setEffectActive(page, uuid, effect, true);
      await expect(field.locator('i.fa-check')).toHaveCount(1);
   });

   test('Automatic Failure keeps a user override against a later Actor effect switched on (synced on a visible ' +
      'Total Dice change)', async () => {
      /** @type {{uuid: string, effects: string[], dialog: object}} The character, its effects and the dialog. */
      const { uuid, effects: [first, second], dialog } = await openDialogWithSwitchedOffEffects(
         'E2E Dialog Auto Failure Override Actor',
         [
            {
               name: 'E2E Always Auto-Fail',
               elements: [{ modifierType: 'automaticFailure' }],
            },
            {
               name: 'E2E Always Auto-Fail And Dice',
               elements: [
                  { modifierType: 'automaticFailure' },
                  {
                     modifierType: 'dice',
                     value: 3,
                  },
               ],
            },
         ],
      );

      /** @type {import('@playwright/test').Locator} The Automatic Failure field wrapper. */
      const field = dialog.getByTestId('check-field-automaticFailure');

      /** @type {import('@playwright/test').Locator} The Total Dice summary. */
      const totalDice = dialog.getByTestId('check-summary-totalDice');

      /** @type {number} The Total Dice before any effect is switched on. */
      const baselineDice = await readSummary(dialog, 'totalDice');

      // The first effect ticks the checkbox on; the user unticks it (an override against the live derivation).
      await setEffectActive(page, uuid, first, true);
      await expect(field.locator('i.fa-check')).toHaveCount(1);
      await setCheckbox(dialog, 'automaticFailure', false);
      await expect(field.locator('i.fa-check')).toHaveCount(0);

      // The second effect carries another Automatic Failure source (which must not re-tick the checkbox) and a Dice
      // modifier (a visible, untouched field); the Dice change proves it was processed.
      await setEffectActive(page, uuid, second, true);
      await expect(totalDice).toHaveText(String(baselineDice + 3));
      await expect(field.locator('i.fa-check')).toHaveCount(0);
   });

   test('rules elements give the Attribute Check dialog its starting Dice Mod and Advantage, and the rolled check ' +
      'carries them', async () => {
      /** @type {{id: string, uuid: string}} A character whose effect carries a Dice modifier and an Advantage. */
      const actor = await makeActor('E2E Dialog Starting Values Actor');
      await addAlwaysOnEffect(actor.id, 'E2E Starting Values', [
         {
            modifierType: 'dice',
            value: 3,
         },
         {
            modifierType: 'advantage',
            advantageLevel: 1,
         },
      ]);

      /** @type {import('@playwright/test').Locator} The dialog, opened from the sheet's attribute button. */
      const dialog = await openCheckDialog(page, 'attribute', actor.uuid);
      await expect(dialog.getByTestId('check-field-diceMod').locator('input')).toHaveValue('3');
      await expect(dialog.getByTestId('check-field-advantage').locator('[role="combobox"]'))
         .toHaveAttribute('data-value', '1');
      await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('3');

      /** @type {number} The Total Dice the dialog shows before the roll. */
      const shownDice = await readSummary(dialog, 'totalDice');

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);

      /** @type {{parameters: object}} The rolled check's flags. */
      const flags = await readNewestCheckFlags(page, baseline, 'attributeCheck');
      expect(flags.parameters.diceMod).toBe(3);
      expect(flags.parameters.advantage).toBe(1);
      expect(flags.parameters.difficulty).toBe(3);
      expect(flags.parameters.totalDice).toBe(shownDice);
   });

   test('an untouched derived field re-derives immediately when the user changes a derivation input (Skill)',
      async () => {
         /** @type {{id: string, uuid: string}} A character with a Skill-narrowed always-on Dice modifier. */
         const actor = await makeActor('E2E Dialog Skill Actor');
         await addAlwaysOnEffect(actor.id, 'E2E Athletics Dice Boost', [
            {
               modifierType: 'dice',
               selector: 'skill',
               key: 'athletics',
               value: 2,
            },
         ]);

         /** @type {import('@playwright/test').Locator} The dialog. */
         const dialog = await openCheckDialog(page, 'attribute', actor.uuid);

         /** @type {import('@playwright/test').Locator} The diceMod field's number input. */
         const diceModField = dialog.getByTestId('check-field-diceMod').locator('input');
         await expect(diceModField).toHaveValue('0');

         // Setting the Skill to Athletics narrows the Dice modifier onto this check; diceMod is untouched, so it
         // re-derives from the check-options change alone.
         await setSelectField(dialog, 'skill', 'athletics');
         await expect(diceModField).toHaveValue('2');
      });

   test('a caller-supplied value survives dialog mount and rolls with its value', async () => {
      // A check that deals with an opposed Attribute Check: its card's button opens the dialog with the complexity
      // the roll's extra successes set (extra successes + 1).
      /** @type {string} The id of the ability. */
      const abilityId = await createOwnedItem(page, rollerId, 'ability', 'E2E Opposed Ability');

      /** @type {string} The uuid of the roller's ability with an opposed check. */
      const abilityUuid = `${rollerUuid}.Item.${abilityId}`;
      await addCheck(page, abilityUuid, {
         label: 'Opposed',
         opposed: true,
      });
      await setClientSetting(page, 'getCheckOptions', 'never');

      // Three forced successes against Difficulty 4 and Complexity 1 bank two extra successes.
      await forceDice(page, [
         6,
         6,
         6,
      ]);

      /** @type {number} The chat-message count before the roll. */
      const first = await page.evaluate(() => game.messages.size);
      await (await openSheetByUuid(page, abilityUuid)).locator('.sidebar-check .header .roll button').first().click();

      /** @type {{id: string, parameters: object, results: object}} The opposed check's message. */
      const message = await readNewestCheckFlags(page, first, 'itemCheck');
      expect(message.results.extraSuccesses, 'the roll banked two extra successes').toBe(2);

      // The card's button rolls for the character whose sheet is the focused window.
      await setClientSetting(page, 'getCheckOptions', 'always');
      await (await openSheetByUuid(page, rollerUuid)).locator('.window-header').click();
      await showChatLog(page);
      await page.locator(`#chat .message[data-message-id="${message.id}"] .opposed-check-button button`).click();

      /** @type {import('@playwright/test').Locator} The dialog the button opened. */
      const dialog = page.locator(ATTRIBUTE_DIALOG);
      await expect(dialog).toBeVisible();

      /** @type {import('@playwright/test').Locator} The complexity field's input. */
      const complexity = dialog.getByTestId('check-field-complexity').locator('input');
      await expect(complexity, 'the dialog opens with the caller-supplied complexity').toHaveValue('3');
      await resetDice(page);

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);

      /** @type {{parameters: object}} The rolled check's flags. */
      const flags = await readNewestCheckFlags(page, baseline, 'attributeCheck');
      expect(flags.parameters.complexity).toBe(3);
   });
});

test.describe('fields that follow the owned item while the dialog is open', () => {
   test.beforeEach(async () => {
      await setClientSetting(page, 'getCheckOptions', 'always');
   });

   test('Attacker Melee follows the active toggle of a rating-modifier Actor effect (presence to absence on the ' +
      'same locator)', async () => {
      /** @type {{id: string, uuid: string, itemUuid: string}} A character with the shared weapon. */
      const actor = await makeActorWith('E2E Dialog Melee Actor', 'weapon');

      // A permanent rating modifier for every Melee attack, switched off before the dialog opens.
      /** @type {string} The effect's uuid. */
      const effect = `${actor.uuid}.ActiveEffect.${await addEffect(page, actor.id, 'E2E Melee Rating Boost', {
         duration: DURATION_PERMANENT,
      })}`;
      await addRulesElement(page, effect, {
         operation: 'conditionalRatingModifier',
         rating: 'melee',
         selector: 'attackType',
         key: 'melee',
         value: 2,
      });
      await setEffectActive(page, actor.uuid, effect, false);

      /** @type {import('@playwright/test').Locator} The Attack Check dialog. */
      const dialog = await openCheckDialog(page, 'attack', actor.itemUuid);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The Melee field's number input. */
      const meleeField = dialog.getByTestId('check-field-attackerMelee').locator('input');

      /** @type {string} The Melee rating while the effect is off. */
      const baselineMelee = await meleeField.inputValue();

      // Switching the effect on while the dialog is open: the untouched Melee field follows it.
      await setEffectActive(page, actor.uuid, effect, true);
      await expect(meleeField).toHaveValue(String(Number(baselineMelee) + 2));

      // Switching it off returns Melee to its prior value (presence to absence on the same locator).
      await setEffectActive(page, actor.uuid, effect, false);
      await expect(meleeField).toHaveValue(baselineMelee);
   });

   test('untouched owned-weapon-derived Attack fields (Type, with dialog UI; Cleave, without) follow an edit to ' +
      'the owned weapon\'s attack, and the rolled check carries the re-derived values', async () => {
      /** @type {{id: string, uuid: string, itemUuid: string}} A character with the shared weapon. */
      const actor = await makeActorWith('E2E Dialog Weapon Actor', 'weapon');

      /** @type {import('@playwright/test').Locator} The Attack Check dialog. */
      const dialog = await openCheckDialog(page, 'attack', actor.itemUuid);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The Type select's trigger. */
      const typeSelect = dialog.getByTestId('check-field-type').locator('[role="combobox"]');
      await expect(typeSelect).toHaveAttribute('data-value', 'melee');
      await expect(dialog.getByTestId('check-field-attackerMelee')).toBeVisible();

      // The weapon's attack becomes Ranged with the Cleave trait (no dialog UI: Cleave shows only on the rolled
      // check's parameters). Both fields are untouched, so both follow.
      await setAttackSelect(actor.itemUuid, 'Type', 'ranged');
      await addTrait(page, actor.itemUuid, 'Cleave', { attackIndex: 0 });
      await expect(typeSelect).toHaveAttribute('data-value', 'ranged');
      await expect(dialog.getByTestId('check-field-attackerAccuracy')).toBeVisible();

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters.type).toBe('ranged');
      expect(flags.parameters.cleave).toBe(true);
   });

   test('a user-set Attack Type is kept against a later owned-weapon edit to its Type (synced on the untouched ' +
      'Attribute)', async () => {
      /** @type {{id: string, uuid: string, itemUuid: string}} A character with the shared weapon. */
      const actor = await makeActorWith('E2E Dialog Type Actor', 'weapon');

      /** @type {import('@playwright/test').Locator} The Attack Check dialog. */
      const dialog = await openCheckDialog(page, 'attack', actor.itemUuid);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The Type select's trigger. */
      const typeSelect = dialog.getByTestId('check-field-type').locator('[role="combobox"]');

      /** @type {import('@playwright/test').Locator} The Attribute select's trigger. */
      const attributeSelect = dialog.getByTestId('check-field-attribute').locator('[role="combobox"]');
      await expect(attributeSelect).toHaveAttribute('data-value', 'body');

      // The user picks Ranged explicitly in the dialog.
      await setSelectField(dialog, 'type', 'ranged');
      await expect(typeSelect).toHaveAttribute('data-value', 'ranged');
      await expect(dialog.getByTestId('check-field-attackerAccuracy')).toBeVisible();

      // Two edits to the weapon's attack: to Ranged, then back to Melee with a Mind Attribute. The second edit would
      // set an untouched Type to Melee; the untouched Attribute follows it and the user's Type stays.
      await setAttackSelect(actor.itemUuid, 'Type', 'ranged');
      await setAttackSelect(actor.itemUuid, 'Type', 'melee');
      await setAttackSelect(actor.itemUuid, 'Attribute', 'mind');

      // The Attribute's change proves the edits were processed before the user's Type is asserted.
      await expect(attributeSelect).toHaveAttribute('data-value', 'mind');
      await expect(typeSelect).toHaveAttribute('data-value', 'ranged');
      await expect(dialog.getByTestId('check-field-attackerAccuracy')).toBeVisible();
   });

   test('an untouched Item Check Difficulty and Skill follow an edit to the owned item\'s check, and the rolled ' +
      'check carries them', async () => {
      /** @type {{id: string, uuid: string, itemUuid: string}} A character with the shared ability. */
      const actor = await makeActorWith('E2E Dialog Check Actor', 'ability');

      /** @type {import('@playwright/test').Locator} The Item Check dialog. */
      const dialog = await openCheckDialog(page, 'item', actor.itemUuid);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The Difficulty select's trigger. */
      const difficultySelect = dialog.getByTestId('check-field-difficulty').locator('[role="combobox"]');

      /** @type {import('@playwright/test').Locator} The Skill select's trigger. */
      const skillSelect = dialog.getByTestId('check-field-skill').locator('[role="combobox"]');
      await expect(difficultySelect).toHaveAttribute('data-value', '4');
      await expect(skillSelect).toHaveAttribute('data-value', 'arcana');

      await setCheckSelect(actor.itemUuid, 'Difficulty', 5);
      await setCheckSelect(actor.itemUuid, 'Skill', 'athletics');
      await expect(difficultySelect).toHaveAttribute('data-value', '5');
      await expect(skillSelect).toHaveAttribute('data-value', 'athletics');

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters.difficulty).toBe(5);
      expect(flags.parameters.skill).toBe('athletics');
   });

   test('a user-set Skill is kept against a later edit to the owned item\'s check (synced on the untouched ' +
      'Difficulty)', async () => {
      /** @type {{id: string, uuid: string, itemUuid: string}} A character with the shared ability. */
      const actor = await makeActorWith('E2E Dialog Kept Skill Actor', 'ability');

      /** @type {import('@playwright/test').Locator} The Item Check dialog. */
      const dialog = await openCheckDialog(page, 'item', actor.itemUuid);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The Difficulty select's trigger. */
      const difficultySelect = dialog.getByTestId('check-field-difficulty').locator('[role="combobox"]');

      /** @type {import('@playwright/test').Locator} The Skill select's trigger. */
      const skillSelect = dialog.getByTestId('check-field-skill').locator('[role="combobox"]');
      await expect(difficultySelect).toHaveAttribute('data-value', '4');

      // The user picks Athletics; the item's check then moves to Melee Weapons, which an untouched Skill would follow.
      await setSelectField(dialog, 'skill', 'athletics');
      await expect(skillSelect).toHaveAttribute('data-value', 'athletics');
      await setCheckSelect(actor.itemUuid, 'Skill', 'meleeWeapons');
      await setCheckSelect(actor.itemUuid, 'Difficulty', 5);

      // The Difficulty's change proves the edits were processed before the user's Skill is asserted.
      await expect(difficultySelect).toHaveAttribute('data-value', '5');
      await expect(skillSelect).toHaveAttribute('data-value', 'athletics');

      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters.skill).toBe('athletics');
   });

   test('Skill "None" on a Skill-opened Attribute Check keeps the displayed Attribute until a real Skill supplies ' +
      'one', async () => {
      /** @type {{id: string, uuid: string}} A character with an always-on Dice modifier for Arcana Checks. */
      const actor = await makeActor('E2E Dialog Arcana Actor');
      await addModifierEffect(actor.id, 'E2E Arcana Dice Boost', {
         modifierType: 'dice',
         checkType: 'any',
         selector: 'skill',
         key: 'arcana',
         value: 2,
      });

      // Opened from the Arcana button of the Skills tab, so the Attribute comes from the Skill's default (Mind).
      /** @type {import('@playwright/test').Locator} The actor's sheet, on the Skills tab. */
      const sheet = await openSheetByUuid(page, actor.uuid);
      await clickSheetTab(sheet, 'Skills');
      await sheet.locator('.skill .check-button button', { hasText: 'Arcana' }).first().click();

      /** @type {import('@playwright/test').Locator} The dialog. */
      const dialog = page.locator(ATTRIBUTE_DIALOG);
      await expect(dialog).toBeVisible();

      /** @type {import('@playwright/test').Locator} The Attribute select's trigger. */
      const attributeSelect = dialog.getByTestId('check-field-attribute').locator('[role="combobox"]');

      /** @type {import('@playwright/test').Locator} The diceMod field's number input. */
      const diceModField = dialog.getByTestId('check-field-diceMod').locator('input');
      await expect(attributeSelect).toHaveAttribute('data-value', 'mind');
      await expect(diceModField).toHaveValue('2');

      // Skill "None" leaves the Attribute without a source; the Arcana Dice modifier stops applying, which proves the
      // options were rebuilt before the Attribute is asserted.
      await setSelectField(dialog, 'skill', 'none');
      await expect(diceModField).toHaveValue('0');
      await expect(attributeSelect).toHaveAttribute('data-value', 'mind');

      // A real Skill supplies the Attribute again.
      await setSelectField(dialog, 'skill', 'athletics');
      await expect(attributeSelect).toHaveAttribute('data-value', 'body');
   });

   for (const [checkType, itemType, key, tab] of [
      [
         'attack',
         'weapon',
         'weapon',
         'Inventory',
      ],
      [
         'casting',
         'spell',
         'spell',
         'Spells',
      ],
      [
         'item',
         'ability',
         'ability',
         'Abilities',
      ],
   ]) {
      test(`deleting the owned ${itemType} while its ${checkType} dialog is open closes the dialog without a page ` +
         'error', async () => {
         /** @type {{id: string, uuid: string, itemUuid: string}} A character with the item. */
         const actor = await makeActorWith(`E2E Dialog Delete ${itemType} Actor`, key);

         /** @type {import('@playwright/test').Locator} The open dialog. */
         const dialog = await openCheckDialog(page, checkType, actor.itemUuid);
         await moveDialogAside(dialog);
         await deleteItem(actor.uuid, tab, actor.itemUuid);
         await expect(dialog).toHaveCount(0);
         await dismissNoLongerValidNotice();
      });
   }
});

test.describe('an effect-sourced Item Check dialog', () => {
   /**
    * Makes a character with an effect that carries one check, and opens that check's dialog from the effect's row.
    * @param {string} name - The character's name.
    * @returns {Promise<{actor: {id: string, uuid: string}, effectUuid: string,
    * dialog: import('@playwright/test').Locator}>} The character, the effect and the dialog.
    */
   async function openEffectCheckDialog(name) {
      await setClientSetting(page, 'getCheckOptions', 'always');

      /** @type {{id: string, uuid: string}} The character. */
      const actor = await makeActor(name);

      /** @type {string} The effect's id. */
      const effectId = await addEffect(page, actor.id, 'E2E Dialog Check Effect');

      /** @type {string} The effect's uuid. */
      const effectUuid = `${actor.uuid}.ActiveEffect.${effectId}`;
      await addCheck(page, effectUuid, { label: 'E2E Dialog Effect Check' });

      /** @type {import('@playwright/test').Locator} The actor's sheet, on the Effects tab. */
      const sheet = await openSheetByUuid(page, actor.uuid);
      await clickSheetTab(sheet, 'Effects');
      await settle(page, { transitions: true });

      /** @type {import('@playwright/test').Locator} The effect's row, expanded to show its check. */
      const row = sheet.locator(`[data-effect-id="${effectId}"]`);
      await row.locator('.header .label .button button').first().click();
      await settle(page, { transitions: true });
      await row.getByRole('button').filter({ hasText: 'E2E Dialog Effect Check' }).first().click();

      /** @type {import('@playwright/test').Locator} The Item Check dialog. */
      const dialog = page.locator('.application.titan-dialog[id^="titan-item-check-dialog-"]');
      await expect(dialog).toBeVisible();
      await moveDialogAside(dialog);
      return {
         actor,
         effectUuid,
         dialog,
      };
   }

   test('an untouched Difficulty follows an edit to the effect\'s check, and the rolled check carries it',
      async () => {
         /** @type {{effectUuid: string, dialog: object}} The effect and the dialog. */
         const { effectUuid, dialog } = await openEffectCheckDialog('E2E Dialog Effect Difficulty Actor');

         /** @type {import('@playwright/test').Locator} The Difficulty select's trigger. */
         const difficultySelect = dialog.getByTestId('check-field-difficulty').locator('[role="combobox"]');
         await expect(difficultySelect).toHaveAttribute('data-value', '4');
         await setCheckSelect(effectUuid, 'Difficulty', 5);
         await expect(difficultySelect).toHaveAttribute('data-value', '5');

         /** @type {number} The chat-message count before the roll. */
         const baseline = await clickRoll(dialog, page);
         /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
         const flags = await readNewestCheckFlags(page, baseline);
         expect(flags.parameters.difficulty).toBe(5);
      });

   test('deleting the effect while its Item Check dialog is open closes the dialog without a page error',
      async () => {
         /** @type {{actor: object, effectUuid: string, dialog: object}} The character, the effect and the dialog. */
         const { actor, effectUuid, dialog } = await openEffectCheckDialog('E2E Dialog Effect Delete Actor');
         await deleteEffect(actor.uuid, effectUuid);
         await expect(dialog).toHaveCount(0);
         await dismissNoLongerValidNotice();
      });
});

test.describe('conditions that offer a situation', () => {
   test('Blinded offers Relies on Sight in a Perception dialog; the row leaves on a Skill change', async () => {
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {{id: string, uuid: string}} A character with a token on the scene. */
      const actor = await makeActor('E2E Dialog Blinded Actor');
      await viewScene(page, await shared(page, 'scene'));

      /** @type {string} The id of the character's token. */
      const tokenId = await placeToken(page, actor.id);
      await applyCondition(page, tokenId, 'blinded');

      /** @type {import('@playwright/test').Locator} The actor's sheet, on the Skills tab. */
      const sheet = await openSheetByUuid(page, actor.uuid);
      await clickSheetTab(sheet, 'Skills');
      await sheet.locator('.skill .check-button button', { hasText: 'Perception' }).first().click();

      /** @type {import('@playwright/test').Locator} The open dialog. */
      const dialog = page.locator(ATTRIBUTE_DIALOG);
      await expect(dialog).toBeVisible();

      /** @type {import('@playwright/test').Locator} The Relies on Sight row. */
      const row = dialog.getByTestId('situation-row-reliesOnSight');
      await expect(row).toBeVisible();
      await setSelectField(dialog, 'skill', 'athletics');
      await expect(row).toHaveCount(0);
      await closeAllApps(page);
      await removeCondition(page, tokenId, 'blinded');
   });
});

test.describe('equipped armor traits', () => {
   /**
    * Opens the Athletics dialog of an actor from the Skills tab of its sheet, under the situational setting.
    * @param {string} actorUuid - The uuid of the actor.
    * @returns {Promise<import('@playwright/test').Locator>} The dialog window.
    */
   async function openAthleticsDialog(actorUuid) {
      await setClientSetting(page, 'getCheckOptions', 'situational');

      /** @type {import('@playwright/test').Locator} The actor's sheet, on the Skills tab. */
      const sheet = await openSheetByUuid(page, actorUuid);
      await clickSheetTab(sheet, 'Skills');
      await sheet.locator('.skill .check-button button', { hasText: 'Athletics' }).first().click();

      /** @type {import('@playwright/test').Locator} The dialog window. */
      const dialog = page.locator(ATTRIBUTE_DIALOG);
      await expect(dialog).toBeVisible();
      return dialog;
   }

   /**
    * Locates a situation row in a dialog by its stable key.
    * @param {import('@playwright/test').Locator} dialog - The dialog window.
    * @param {string} key - The situation's stable key.
    * @returns {import('@playwright/test').Locator} The dialog's situation entry carrying that key.
    */
   function situationRow(dialog, key) {
      return dialog.getByTestId(`situation-row-${key}`);
   }

   test('Heavy armor offers Jump and Swim, Fly, or Climb only on Athletics checks', async () => {
      /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
      const dialog = await openAthleticsDialog(actors.heavy);

      /** @type {import('@playwright/test').Locator} The Jump situation row. */
      const jump = situationRow(dialog, KEYS.jump);

      /** @type {import('@playwright/test').Locator} The Swim, Fly, or Climb situation row. */
      const swim = situationRow(dialog, KEYS.swim);
      await expect(jump).toBeVisible();
      await expect(swim).toBeVisible();

      // Swim, Fly, or Climb starts unticked: the Difficulty is the base 4.
      await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('4');

      // A Dexterity check offers neither Athletics-narrowed situation.
      await setSelectField(dialog, 'skill', 'dexterity');
      await expect(jump).toHaveCount(0);
      await expect(swim).toHaveCount(0);
   });

   test('ticking Swim, Fly, or Climb applies Greater Disadvantage', async () => {
      /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
      const dialog = await openAthleticsDialog(actors.heavy);
      await situationRow(dialog, KEYS.swim).locator('[data-testid^="situation-toggle-"]').click();
      await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('6');
      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters).toMatchObject({
         advantage: -2,
         baseDifficulty: 4,
         difficulty: 6,
      });
      expect(flags.parameters.situations.map((situation) => situation.label)).toEqual([labels.swim]);
   });

   test('a ticked Jump does not apply once the check\'s Skill changes', async () => {
      /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
      const dialog = await openAthleticsDialog(actors.heavy);
      await situationRow(dialog, KEYS.jump).locator('[data-testid^="situation-toggle-"]').click();
      await setSelectField(dialog, 'skill', 'dexterity');
      await expect(situationRow(dialog, KEYS.jump)).toHaveCount(0);
      /** @type {number} The chat-message count before the roll. */
      const baseline = await clickRoll(dialog, page);
      /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
      const flags = await readNewestCheckFlags(page, baseline);
      expect(flags.parameters.automaticFailure).toBe(false);
      expect(flags.parameters.situations).toEqual([]);
   });

   test('Heavy and Encumbering merge into one Athletics entry, and Loud offers its own on Stealth', async () => {
      /** @type {{athletics: object[], stealth: object[]}} The Advantage-type situational modifiers per Skill. */
      const modifiers = await page.evaluate(async (uuid) => {
         /** @type {CharacterDataModel} The wearer's data model. */
         const system = (await fromUuid(uuid)).system;

         /**
          * Lists an Attribute Check's Advantage-type situational modifiers for one Skill.
          * @param {string} skill - The check's Skill.
          * @returns {object[]} The Advantage-type entries.
          */
         const advantageOnly = (skill) => system.getSituationalCheckModifiers('attribute', { skill })
            .filter((modifier) => modifier.modifierType === 'advantage');
         return {
            athletics: advantageOnly('athletics'),
            stealth: advantageOnly('stealth'),
         };
      }, actors.full);
      expect(modifiers.athletics).toEqual([
         expect.objectContaining({
            label: labels.swim,
            sources: ['E2E Dialog Full Armor Actor Armor'],
            value: -3,
         }),
      ]);
      expect(modifiers.stealth).toEqual([
         expect.objectContaining({
            label: labels.undetected,
            sources: ['E2E Dialog Full Armor Actor Armor'],
            value: -1,
         }),
      ]);
   });

   test('unequipping the armor removes its situational modifiers', async () => {
      /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
      const dialog = await openAthleticsDialog(actors.heavy);
      await moveDialogAside(dialog);

      /** @type {import('@playwright/test').Locator} The Jump situation row. */
      const jump = situationRow(dialog, KEYS.jump);

      /** @type {import('@playwright/test').Locator} The Swim, Fly, or Climb situation row. */
      const swim = situationRow(dialog, KEYS.swim);
      await expect(jump).toBeVisible();
      await expect(swim).toBeVisible();

      /** @type {string} The id of the worn armor. */
      const armorId = await page.evaluate(async (uuid) => (await fromUuid(uuid)).system.equipped.armor, actors.heavy);
      await setEquipped(page, actors.heavy.replace('Actor.', ''), armorId, false);
      await expect(jump).toHaveCount(0);
      await expect(swim).toHaveCount(0);

      // The armor goes back on through the same toggle, so the file's other tests find it worn.
      await setEquipped(page, actors.heavy.replace('Actor.', ''), armorId, true);
   });
});
