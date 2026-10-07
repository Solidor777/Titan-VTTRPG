import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { settle } from './settle.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addRulesElement, createWorldItem } from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { ROUNDING_DIRECTIONS } from '../../src/helpers/utility-functions/RoundDirectional.js';
import { readTitanSelectValue, selectTitanOption, titanSelectOptionValues } from './select.js';

/**
 * The Rules Elements tab of an item sheet, on a weapon made through the Items tab. Adding and deleting a row re-renders
 * the list at once; changing a flat modifier's selector resets its key to the curated default; the rounding select of
 * a Multiply Base and a Multiply Sum element offers every direction and stores the chosen one; and the conditional
 * check modifier editor writes the signed Advantage level, hides the value on Automatic Failure, filters modifier
 * types and check types against each other, offers the Resistance selectors, and offers a Skill narrowing on a
 * situation.
 *
 * The weapon is made once. Each test adds the rows it needs through the tab's controls and the `afterEach` hook
 * deletes every row through the row's delete button in the sheet the test left open, so a test starts with an empty
 * list. Stored values the editor cannot
 * produce (an Advantage value outside the four levels, an unknown check type, a missing rounding) are probed in
 * `component-probe-inputs.spec.js`.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the weapon whose Rules Elements tab the tests edit. */
let weaponUuid;
/** @type {import('@playwright/test').Locator | null} The weapon sheet the current test opened, or null. */
let openedSheet = null;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   weaponUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Rules Editor Weapon',
      type: 'weapon',
   })}`;
});

test.afterEach(async () => {
   await clearRulesElements();
   await closeAllApps(page);
   openedSheet = null;
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Opens the weapon's sheet on its Rules Elements tab.
 * @returns {Promise<import('@playwright/test').Locator>} The weapon sheet's window element.
 */
async function openRulesElements() {
   /** @type {import('@playwright/test').Locator} The weapon's sheet. */
   const sheet = await openSheetByUuid(page, weaponUuid);

   /** @type {string} The localized Rules Elements tab label. */
   const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
   await clickSheetTab(sheet, label);
   await expect(sheet.locator('.add-entry-button button'), 'the rules elements tab rendered').toBeVisible();
   openedSheet = sheet;
   return sheet;
}

/**
 * Deletes every rules element of the weapon through the rows' delete buttons, in the sheet the test left open (the
 * sheet is opened only when the test opened none).
 * @returns {Promise<void>} Resolves once the list is empty.
 */
async function clearRulesElements() {
   /** @type {import('@playwright/test').Locator} The weapon's sheet on its Rules Elements tab. */
   const sheet = openedSheet ?? await openRulesElements();

   /** @type {import('@playwright/test').Locator} The rule element rows. */
   const rows = sheet.locator('.rules-element');
   for (let remaining = await rows.count(); remaining > 0; remaining--) {
      await rows.first().locator('.delete-button button').click();
      await expect(rows).toHaveCount(remaining - 1);
      await settle(sheet.page(), { transitions: true });
   }
}

/**
 * Reads the weapon's stored rules elements.
 * @returns {Promise<object[]>} The weapon's `system.rulesElement`.
 */
function readElements() {
   return page.evaluate(async (uuid) => (await fromUuid(uuid)).system.rulesElement, weaponUuid);
}

test.describe('adding and deleting rows', () => {
   test('adding then deleting a rules element re-renders the list in place', async () => {
      /** @type {import('@playwright/test').Locator} The weapon's sheet. */
      const sheet = await openRulesElements();

      /** @type {import('@playwright/test').Locator} The rule element rows. */
      const rows = sheet.locator('.rules-element');
      await expect(rows, 'starts with no rules elements').toHaveCount(0);

      await sheet.locator('.add-entry-button button').click();
      await expect.poll(async () => (await readElements()).length, { message: 'rules element persisted' }).toBe(1);
      await expect(rows, 'list re-rendered with the new row').toHaveCount(1);
      await settle(page, { transitions: true });

      await rows.first().locator('.delete-button button').click();
      await expect.poll(async () => (await readElements()).length, { message: 'rules element removed' }).toBe(0);
      await expect(rows, 'list re-rendered without the row').toHaveCount(0);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('changing the selector resets the key to the curated default', async () => {
      await addRulesElement(page, weaponUuid, {});

      // A new row is a flat modifier whose defaults are the attribute selector and the body key.
      expect(await readElements(), 'the seeded default flat modifier').toMatchObject([
         {
            operation: 'flatModifier',
            selector: 'attribute',
            key: 'body',
         },
      ]);

      /** @type {import('@playwright/test').Locator} The weapon's sheet. */
      const sheet = await openRulesElements();
      await selectTitanOption(
         page,
         sheet.locator('.rules-element .operation-settings .field.select [role="combobox"]').first(),
         'resource',
      );

      // The key lands on the curated default "resolve", not the first option of the new selector's key list.
      await expect.poll(async () => (await readElements())[0].key, { message: 'curated default key' })
         .toBe('resolve');

      // The retired owner guard must not have raised its "Cannot modify document" error notification.
      await expect(page.locator('.notification.error', { hasText: 'Cannot modify document' })).toHaveCount(0);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});

test.describe('rounding select', () => {
   /**
    * The localized labels the rounding select shows for each direction, in display order: `down.text`, `up.text` and
    * `nearest.text` under `LOCAL` in `lang/en.json`.
    * @type {string[]}
    */
   const ROUNDING_LABELS = [
      'Round Down',
      'Round Up',
      'Round to Nearest',
   ];

   for (const [operation, testId] of [
      [
         'mulBase',
         'mulbase-rounding',
      ],
      [
         'mulSum',
         'mulsum-rounding',
      ],
   ]) {
      test(`the ${testId} select offers every rounding direction and stores nearest`, async () => {
         await addRulesElement(page, weaponUuid, { operation });

         /** @type {import('@playwright/test').Locator} The weapon's sheet. */
         const sheet = await openRulesElements();

         /** @type {import('@playwright/test').Locator} The rounding select's trigger. */
         const trigger = sheet.getByTestId(testId);
         expect(await titanSelectOptionValues(page, trigger)).toEqual(ROUNDING_DIRECTIONS);

         // The rows read the localized labels, not the raw direction keys.
         await trigger.click();
         await expect(page.locator('[role="option"]')).toHaveText(ROUNDING_LABELS);
         await page.keyboard.press('Escape');

         await selectTitanOption(page, trigger, 'nearest');
         await expect.poll(async () => (await readElements())[0].rounding, { message: 'nearest is stored' })
            .toBe('nearest');
         expect(await readTitanSelectValue(trigger)).toBe('nearest');
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      });
   }
});

test.describe('conditional check modifier editor', () => {
   /**
    * Reads the edited element's stored fields.
    * @returns {Promise<{checkType: string, key: string, modifierType: string, selector: string, skill: string,
    * value: number}>} The element's check type, key, modifier type, selector, skill and value.
    */
   async function readElement() {
      /** @type {object} The edited element. */
      const element = (await readElements())[0];
      return {
         checkType: element.checkType,
         key: element.key,
         modifierType: element.modifierType,
         selector: element.selector,
         skill: element.skill,
         value: element.value,
      };
   }

   /** @type {import('@playwright/test').Locator} The weapon's sheet, set by each test's `beforeEach`. */
   let sheet;

   test.beforeEach(async () => {
      // One Dice +3 modifier on any check, entered in the editor.
      await addRulesElement(page, weaponUuid, {
         operation: 'conditionalCheckModifier',
         modifierType: 'dice',
         value: 3,
      });
      sheet = await openRulesElements();
      await expect(sheet.getByTestId('ccm-modifier-type')).toBeVisible();
   });

   test('the Advantage level select replaces the value and writes the signed level', async () => {
      await expect(sheet.getByTestId('ccm-value')).toBeVisible();

      await selectTitanOption(page, sheet.getByTestId('ccm-modifier-type'), 'advantage');
      await expect.poll(readElement, { message: 'switching to Advantage stores Advantage' }).toMatchObject({
         modifierType: 'advantage',
         value: 1,
      });
      await expect(sheet.getByTestId('ccm-advantage-level')).toBeVisible();
      await expect(sheet.getByTestId('ccm-value')).toHaveCount(0);

      for (const level of [
         -2,
         -1,
         2,
         1,
      ]) {
         await selectTitanOption(page, sheet.getByTestId('ccm-advantage-level'), level);
         await expect.poll(async () => (await readElement()).value, { message: `level ${level} is stored` })
            .toBe(level);
      }
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('Automatic Failure replaces the value input and stores 1', async () => {
      /** @type {import('@playwright/test').Locator} The value input, present on a value-bearing type. */
      const value = sheet.getByTestId('ccm-value');
      await selectTitanOption(page, sheet.getByTestId('ccm-modifier-type'), 'damage');
      await expect(value).toBeVisible();

      await selectTitanOption(page, sheet.getByTestId('ccm-modifier-type'), 'automaticFailure');
      await expect(value).toHaveCount(0);
      await expect.poll(readElement, { message: 'Automatic Failure stores 1' }).toMatchObject({
         modifierType: 'automaticFailure',
         value: 1,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('Automatic Failure replaces the Advantage level select and stores 1', async () => {
      /** @type {import('@playwright/test').Locator} The level select, present on Advantage. */
      const level = sheet.getByTestId('ccm-advantage-level');
      await selectTitanOption(page, sheet.getByTestId('ccm-modifier-type'), 'advantage');
      await expect(level).toBeVisible();

      await selectTitanOption(page, sheet.getByTestId('ccm-modifier-type'), 'automaticFailure');
      await expect(level).toHaveCount(0);
      await expect.poll(readElement, { message: 'Automatic Failure stores 1' }).toMatchObject({
         modifierType: 'automaticFailure',
         value: 1,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('Healing skips Attack checks', async () => {
      await selectTitanOption(page, sheet.getByTestId('ccm-modifier-type'), 'healing');
      await expect.poll(async () => (await readElement()).modifierType).toBe('healing');
      expect(await titanSelectOptionValues(page, sheet.getByTestId('ccm-check-type'))).toEqual([
         'any',
         'casting',
         'item',
      ]);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('Resistance checks offer their selectors and only the modifier types they read', async () => {
      // The Dice element's check types include Resistance; its modifier types are every type.
      expect(await titanSelectOptionValues(page, sheet.getByTestId('ccm-modifier-type'))).toEqual([
         'damage',
         'dice',
         'expertise',
         'training',
         'healing',
         'advantage',
         'automaticFailure',
      ]);

      await selectTitanOption(page, sheet.getByTestId('ccm-check-type'), 'resistance');
      await expect.poll(async () => (await readElement()).checkType).toBe('resistance');
      expect(await titanSelectOptionValues(page, sheet.getByTestId('ccm-selector'))).toEqual([
         'any',
         'resistance',
         'situation',
      ]);

      // Resistance Checks read no Damage, Training, or Healing, so the modifier-type select no longer offers them.
      expect(await titanSelectOptionValues(page, sheet.getByTestId('ccm-modifier-type'))).toEqual([
         'dice',
         'expertise',
         'advantage',
         'automaticFailure',
      ]);

      await selectTitanOption(page, sheet.getByTestId('ccm-selector'), 'resistance');
      await expect.poll(readElement, { message: 'the Resistance selector defaults its key' }).toMatchObject({
         key: 'reflexes',
         selector: 'resistance',
      });

      // Back on any check type the Resistance selector resets, and Training is offered again.
      await selectTitanOption(page, sheet.getByTestId('ccm-check-type'), 'any');
      await expect.poll(readElement, { message: 'the any check type resets the selector' }).toMatchObject({
         checkType: 'any',
         selector: 'any',
      });

      // A Training element's check types drop Resistance.
      await selectTitanOption(page, sheet.getByTestId('ccm-modifier-type'), 'training');
      await expect.poll(async () => (await readElement()).modifierType).toBe('training');
      expect(await titanSelectOptionValues(page, sheet.getByTestId('ccm-check-type'))).toEqual([
         'any',
         'attack',
         'casting',
         'item',
      ]);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('a situation takes a typed label and an optional Skill narrowing, except on Resistance checks', async () => {
      await selectTitanOption(page, sheet.getByTestId('ccm-selector'), 'situation');

      /** @type {string} The localized default situation label. */
      const situationLabel = await page.evaluate(() => game.i18n.localize('LOCAL.situation.text'));
      await expect.poll(readElement, { message: 'the situation selector defaults its key and Skill' }).toMatchObject({
         key: situationLabel,
         selector: 'situation',
         skill: '',
      });

      /** @type {import('@playwright/test').Locator} The Skill narrowing select. */
      const skillSelect = sheet.getByTestId('ccm-situation-skill');
      await expect(skillSelect).toBeVisible();
      await selectTitanOption(page, skillSelect, 'athletics');
      await expect.poll(async () => (await readElement()).skill).toBe('athletics');

      // A Resistance Check has no Skill: the situation stays, the narrowing hides, and the stored Skill clears.
      await selectTitanOption(page, sheet.getByTestId('ccm-check-type'), 'resistance');
      await expect.poll(readElement, { message: 'a Resistance situation clears its Skill' }).toMatchObject({
         checkType: 'resistance',
         selector: 'situation',
         skill: '',
      });
      await expect(skillSelect).toHaveCount(0);

      // Back on any check type the narrowing shows again; narrow it, then leave the situation selector.
      await selectTitanOption(page, sheet.getByTestId('ccm-check-type'), 'any');
      await expect(skillSelect).toBeVisible();
      await selectTitanOption(page, skillSelect, 'athletics');
      await expect.poll(async () => (await readElement()).skill).toBe('athletics');

      // Leaving the situation selector hides the Skill narrowing and clears the stored Skill.
      await selectTitanOption(page, sheet.getByTestId('ccm-selector'), 'any');
      await expect(skillSelect).toHaveCount(0);
      await expect.poll(async () => (await readElement()).skill).toBe('');

      // Switching between two selectors also clears a narrowed Skill: a returning situation starts unnarrowed.
      await selectTitanOption(page, sheet.getByTestId('ccm-selector'), 'situation');
      await expect(skillSelect).toBeVisible();
      await selectTitanOption(page, skillSelect, 'athletics');
      await expect.poll(async () => (await readElement()).skill).toBe('athletics');
      await selectTitanOption(page, sheet.getByTestId('ccm-selector'), 'customTrait');
      await expect(skillSelect).toHaveCount(0);
      await expect.poll(readElement, { message: 'the custom trait selector clears the Skill' }).toMatchObject({
         selector: 'customTrait',
         skill: '',
      });
      await selectTitanOption(page, sheet.getByTestId('ccm-selector'), 'situation');
      await expect(skillSelect).toBeVisible();
      await expect.poll(readElement, { message: 'a returning situation is unnarrowed' }).toMatchObject({
         selector: 'situation',
         skill: '',
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
