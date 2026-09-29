import { expect, test } from '@playwright/test';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { selectTitanOption, titanSelectOptionValues } from './select.js';

/**
 * The conditional check modifier editor: the Advantage level select writes the signed level into `value` and never
 * rewrites a stored value it cannot show, Automatic Failure hides the value and stores 1, modifier types and check
 * types filter each other, Resistance checks offer their selectors, and a non-Resistance situation offers a Skill
 * narrowing.
 */

/** @type {string} Name of the world ability item this spec edits. */
const ITEM_NAME = 'E2E Check Modifier Editor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.beforeEach(async () => {
   // Rebuild the item with one Dice +3 modifier and open its Rules Elements tab.
   await page.evaluate(async (name) => {
      await game.items.getName(name)?.delete();

      /** @type {TitanItem} The rebuilt ability. */
      const item = await Item.create({
         name,
         type: 'ability',
         system: {
            rulesElement: [
               {
                  checkType: 'any',
                  key: '',
                  modifierType: 'dice',
                  operation: 'conditionalCheckModifier',
                  selector: 'any',
                  skill: '',
                  uuid: 'e2e-ccm-editor-0',
                  value: 3,
               },
            ],
         },
      });
      /** @type {TitanItemSheet} The rendered item sheet. */
      const app = await item.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
   }, ITEM_NAME);

   /** @type {string} The localized Rules Elements tab label. */
   const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
   await openSheetTab(page, label);
   await expect(sheet().getByTestId('ccm-modifier-type')).toBeVisible();
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((name) => game.items.getName(name)?.delete(), ITEM_NAME);
   await page?.close();
});

/**
 * Locates the open item sheet.
 * @returns {import('@playwright/test').Locator} The sheet window.
 */
function sheet() {
   return page.locator('.application.titan-document-sheet');
}

/**
 * Reads the edited element's persisted fields.
 * @returns {Promise<object>} The element's check type, key, modifier type, selector, skill, and value.
 */
function readElement() {
   return page.evaluate((name) => {
      /** @type {object} The edited rules element. */
      const element = game.items.getName(name).system.rulesElement[0];
      return {
         checkType: element.checkType,
         key: element.key,
         modifierType: element.modifierType,
         selector: element.selector,
         skill: element.skill,
         value: element.value,
      };
   }, ITEM_NAME);
}

test('the Advantage level select replaces the value and writes the signed level', async () => {
   await expect(sheet().getByTestId('ccm-value')).toBeVisible();

   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'advantage');
   await expect.poll(readElement, { message: 'switching to Advantage stores Advantage' }).toMatchObject({
      modifierType: 'advantage',
      value: 1,
   });
   await expect(sheet().getByTestId('ccm-advantage-level')).toBeVisible();
   await expect(sheet().getByTestId('ccm-value')).toHaveCount(0);

   for (const level of [
      -2,
      -1,
      2,
      1,
   ]) {
      await selectTitanOption(page, sheet().getByTestId('ccm-advantage-level'), level);
      await expect.poll(async () => (await readElement()).value, { message: `level ${level} is stored` })
         .toBe(level);
   }
});

test('Automatic Failure hides the level select and the value and stores 1', async () => {
   // Advantage first, so the level select is present before Automatic Failure removes it.
   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'advantage');
   await selectTitanOption(page, sheet().getByTestId('ccm-advantage-level'), -2);
   await expect.poll(readElement, { message: 'Greater Disadvantage is stored' }).toMatchObject({
      modifierType: 'advantage',
      value: -2,
   });
   await expect(sheet().getByTestId('ccm-advantage-level')).toBeVisible();

   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'automaticFailure');
   await expect.poll(readElement, { message: 'Automatic Failure stores 1' }).toMatchObject({
      modifierType: 'automaticFailure',
      value: 1,
   });
   await expect(sheet().getByTestId('ccm-advantage-level')).toHaveCount(0);
   await expect(sheet().getByTestId('ccm-value')).toHaveCount(0);
});

test('a stored Advantage value outside the four levels displays normalized and is not rewritten', async () => {
   /**
    * Stores an Advantage element with the given value, as hand-authored data can.
    * @param {number} value - The stored value.
    * @returns {Promise<void>} Resolves once the item is updated.
    */
   const store = (value) => page.evaluate(async ({ name, stored }) => {
      /** @type {TitanItem} The edited ability. */
      const item = game.items.getName(name);
      await item.update({
         system: {
            rulesElement: [
               {
                  ...item.system.rulesElement[0],
                  modifierType: 'advantage',
                  value: stored,
               },
            ],
         },
      });
   }, {
      name: ITEM_NAME,
      stored: value,
   });

   /** @type {import('@playwright/test').Locator} The level select's trigger. */
   const level = sheet().getByTestId('ccm-advantage-level');

   // A level the options carry starts the select, so each out-of-set value is a displayed transition off it.
   await store(2);
   await expect(level).toHaveAttribute('data-value', '2');

   for (const [stored, shown] of [
      [
         0,
         '1',
      ],
      [
         -3,
         '-2',
      ],
      [
         3,
         '2',
      ],
   ]) {
      await store(stored);

      // The displayed level changing proves the sheet rendered the stored value before the persisted read.
      await expect(level).toHaveAttribute('data-value', shown);
      expect((await readElement()).value, `stored ${stored} is not rewritten`).toBe(stored);
   }
});

test('Healing skips Attack checks, and an unknown stored check type does not break the editor', async () => {
   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'healing');
   await expect.poll(async () => (await readElement()).modifierType).toBe('healing');
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-check-type'))).toEqual([
      'any',
      'casting',
      'item',
   ]);

   // A hand-authored check type no editor option carries: the editor still renders, offering every modifier type.
   await page.evaluate(async (name) => {
      /** @type {TitanItem} The edited ability. */
      const item = game.items.getName(name);
      await item.update({
         system: {
            rulesElement: [
               {
                  ...item.system.rulesElement[0],
                  checkType: 'unknownCheck',
                  modifierType: 'dice',
               },
            ],
         },
      });
   }, ITEM_NAME);
   await expect(sheet().getByTestId('ccm-modifier-type')).toHaveAttribute('data-value', 'dice');
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-modifier-type'))).toEqual([
      'damage',
      'dice',
      'expertise',
      'training',
      'healing',
      'advantage',
      'automaticFailure',
   ]);
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-selector'))).toEqual([
      'any',
      'attribute',
      'skill',
      'customTrait',
      'situation',
   ]);
});

test('Resistance checks offer their selectors and only the modifier types they read', async () => {
   // The Dice element's check types include Resistance; its modifier types are every type.
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-modifier-type'))).toEqual([
      'damage',
      'dice',
      'expertise',
      'training',
      'healing',
      'advantage',
      'automaticFailure',
   ]);

   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'resistance');
   await expect.poll(async () => (await readElement()).checkType).toBe('resistance');
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-selector'))).toEqual([
      'any',
      'resistance',
      'situation',
   ]);

   // Resistance Checks read no Damage, Training, or Healing, so the modifier-type select no longer offers them.
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-modifier-type'))).toEqual([
      'dice',
      'expertise',
      'advantage',
      'automaticFailure',
   ]);

   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'resistance');
   await expect.poll(readElement, { message: 'the Resistance selector defaults its key' }).toMatchObject({
      key: 'reflexes',
      selector: 'resistance',
   });

   // Back on any check type the Resistance selector resets, and Training is offered again.
   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'any');
   await expect.poll(readElement, { message: 'the any check type resets the selector' }).toMatchObject({
      checkType: 'any',
      selector: 'any',
   });

   // A Training element's check types drop Resistance.
   await selectTitanOption(page, sheet().getByTestId('ccm-modifier-type'), 'training');
   await expect.poll(async () => (await readElement()).modifierType).toBe('training');
   expect(await titanSelectOptionValues(page, sheet().getByTestId('ccm-check-type'))).toEqual([
      'any',
      'attack',
      'casting',
      'item',
   ]);
});

test('a situation takes a typed label and an optional Skill narrowing, except on Resistance checks', async () => {
   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'situation');

   /** @type {string} The localized default situation label. */
   const situationLabel = await page.evaluate(() => game.i18n.localize('LOCAL.situation.text'));
   await expect.poll(readElement, { message: 'the situation selector defaults its key and Skill' }).toMatchObject({
      key: situationLabel,
      selector: 'situation',
      skill: '',
   });

   /** @type {import('@playwright/test').Locator} The Skill narrowing select. */
   const skillSelect = sheet().getByTestId('ccm-situation-skill');
   await expect(skillSelect).toBeVisible();
   await selectTitanOption(page, skillSelect, 'athletics');
   await expect.poll(async () => (await readElement()).skill).toBe('athletics');

   // A Resistance Check has no Skill: the situation stays, the narrowing hides, and the stored Skill clears.
   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'resistance');
   await expect.poll(readElement, { message: 'a Resistance situation clears its Skill' }).toMatchObject({
      checkType: 'resistance',
      selector: 'situation',
      skill: '',
   });
   await expect(skillSelect).toHaveCount(0);

   // Back on any check type the narrowing shows again; narrow it, then leave the situation selector.
   await selectTitanOption(page, sheet().getByTestId('ccm-check-type'), 'any');
   await expect(skillSelect).toBeVisible();
   await selectTitanOption(page, skillSelect, 'athletics');
   await expect.poll(async () => (await readElement()).skill).toBe('athletics');

   // Leaving the situation selector hides the Skill narrowing and clears the stored Skill.
   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'any');
   await expect(skillSelect).toHaveCount(0);
   await expect.poll(async () => (await readElement()).skill).toBe('');

   // Switching between two selectors also clears a narrowed Skill: a returning situation starts unnarrowed.
   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'situation');
   await expect(skillSelect).toBeVisible();
   await selectTitanOption(page, skillSelect, 'athletics');
   await expect.poll(async () => (await readElement()).skill).toBe('athletics');
   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'customTrait');
   await expect(skillSelect).toHaveCount(0);
   await expect.poll(readElement, { message: 'the custom trait selector clears the Skill' }).toMatchObject({
      selector: 'customTrait',
      skill: '',
   });
   await selectTitanOption(page, sheet().getByTestId('ccm-selector'), 'situation');
   await expect(skillSelect).toBeVisible();
   await expect.poll(readElement, { message: 'a returning situation is unnarrowed' }).toMatchObject({
      selector: 'situation',
      skill: '',
   });
});
