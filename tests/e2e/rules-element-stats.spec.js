import { expect, test } from './harness.js';
import { ALL_KEY } from '~/system/AllKey.js';
import { SET_SUM_MODE_MAX, SET_SUM_MODE_MIN, SET_SUM_MODE_SET } from '~/system/SetSumModes.js';
import { clickSheetTab, commitText } from './actions.js';
import { selectTitanOption } from './select.js';
import { readNewestCheckFlags } from './checkDialog.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   activateScene,
   addRulesElement,
   addEffect,
   addTrait,
   controlPlacedToken,
   createActor,
   createOwnedItem,
   createScene,
   placeToken,
   readServerSystem,
   setAttributeBase,
   setEquipped,
   viewScene,
} from './flows.js';
import { wearArmor } from './checkCards.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Every stat-modifying rules element (Flat Modifier, Multiply Base, Multiply Sum, Set Sum) over every selector and
 * every key the character's data holds, authored through the Rules Elements tab, read back from the character sheet's
 * DOM (the Player HUD for the resource maximum) and, for the stats a header button rolls, from the rolled check.
 * The selectors' keys come from the live character's data; the expected values are the rule's own arithmetic on the
 * baseline the sheet shows before the element exists. Conditional check modifiers are in
 * conditional-modifiers.spec.js.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The character's id. */
let actorId;
/** @type {string} The character's uuid. */
let actorUuid;
/** @type {string} The uuid of the source the running test authors its elements on. */
let sourceUuid;
/** @type {string[]} The uuids of further documents the running test made, deleted when it ends. */
let extraUuids = [];
/** @type {number} The run stamp in the fixture names. */
const RUN = Date.now();

/**
 * The selectors the editor offers for a stat modifier and, for each, the character data it names, the sheet test id
 * prefix of the stat's total and the tab that shows it.
 * @type {Record<string, {data: string, testId: (key: string) => string, tab?: string}>}
 */
const SELECTORS = {
   attribute: {
      data: 'attribute',
      testId: (key) => `sheet-attribute-${key}`,
   },
   resistance: {
      data: 'resistance',
      testId: (key) => `sheet-resistance-${key}`,
   },
   rating: {
      data: 'rating',
      testId: (key) => `sheet-rating-${key}`,
   },
   speed: {
      data: 'speed',
      testId: (key) => `sheet-speed-${key}`,
   },
   mod: {
      data: 'mod',
      testId: (key) => `sheet-mod-${key}`,
   },
   resource: {
      data: 'resource',
      testId: (key) => `sheet-resource-${key}-max`,
   },
   training: {
      data: 'skill',
      testId: (key) => `sheet-skill-${key}-training`,
      tab: 'Skills',
   },
   expertise: {
      data: 'skill',
      testId: (key) => `sheet-skill-${key}-expertise`,
      tab: 'Skills',
   },
};

/**
 * The operations under test: the value typed into the element, any extra fields and the rule applied to a baseline.
 * @type {Record<string, {fields: object, apply: (base: number) => number}>}
 */
const OPERATIONS = {
   flatModifier: {
      fields: { value: 2 },
      apply: (base) => Math.max(base + 2, 0),
   },
   mulBase: {
      fields: {
         value: 2,
         rounding: 'down',
      },
      apply: (base) => base * 2,
   },
   mulSum: {
      fields: {
         value: 2,
         rounding: 'down',
      },
      apply: (base) => base * 2,
   },
   setSum: {
      fields: {
         value: 7,
         mode: SET_SUM_MODE_SET,
      },
      apply: () => 7,
   },
};

/**
 * Lists the keys the character's data holds under a selector.
 * @param {string} selector - The selector.
 * @returns {Promise<string[]>} The keys.
 */
function keysOf(selector) {
   return page.evaluate(
      ({ uuid, data }) => Object.keys(fromUuidSync(uuid).system[data]),
      {
         uuid: actorUuid,
         data: SELECTORS[selector].data,
      },
   );
}

/**
 * Reads the totals the character sheet displays for the keys of a selector.
 * @param {string} selector - The selector.
 * @param {string[]} keys - The keys.
 * @returns {Promise<Record<string, number>>} The displayed totals by key.
 */
async function readSheet(selector, keys) {
   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   if (SELECTORS[selector].tab) {
      await clickSheetTab(sheet, SELECTORS[selector].tab);
   }

   /** @type {Record<string, number>} The totals by key. */
   const totals = {};
   for (const key of keys) {
      totals[key] = Number((await sheet.getByTestId(SELECTORS[selector].testId(key)).innerText()).trim());
   }
   return totals;
}

/**
 * Types a base value of 3 into the base inputs of the keys of a selector that starts at 0, so that a multiplication
 * of the base changes it.
 * @param {string} selector - The selector (`speed`, `training` or `expertise`).
 * @param {string[]} keys - The keys.
 * @returns {Promise<void>} Resolves once the inputs are committed.
 */
async function raiseBases(selector, keys) {
   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(page, actorUuid);
   if (SELECTORS[selector].tab) {
      await clickSheetTab(sheet, SELECTORS[selector].tab);
   }
   for (const key of keys) {
      /** @type {string} The test id of the stat's base input. */
      const baseId = selector === 'speed' ? `sheet-speed-${key}-base` : `sheet-skill-${key}-${selector}-base`;
      await commitText(sheet.getByTestId(baseId), 3);
   }
}

/**
 * Lists the selectors the rules-element editor offers an operation, by adding a row to the running test's source,
 * choosing the operation, opening the selector select and reading its options; the row is deleted again.
 * @param {string} operation - The operation.
 * @returns {Promise<string[]>} The selectors the editor offers.
 */
async function offeredSelectors(operation) {
   /** @type {import('@playwright/test').Locator} The source's sheet, on the Rules Elements tab. */
   const sheet = await openSheetByUuid(page, sourceUuid);
   await clickSheetTab(sheet, 'Rules Elements');
   await sheet.locator('.add-entry-button button').click();

   /** @type {import('@playwright/test').Locator} The new row. */
   const row = sheet.locator('.rules-element').last();
   if (operation !== 'flatModifier') {
      await selectTitanOption(page, row.locator('.operation [role="combobox"]'), operation);
   }
   await row.locator('.operation-settings .field.select').nth(0).locator('[role="combobox"]').click();

   /** @type {string[]} The offered selectors. */
   const offered = await page.locator('[role="option"]').evaluateAll((options) => options.map(
      (option) => option.dataset.value,
   ));
   await page.locator('[role="option"]').first().click();
   await row.locator('.delete-button button').click();
   await expect(sheet.locator('.rules-element')).toHaveCount(0);
   return offered;
}

/**
 * Authors an element on the running test's source and remembers the source.
 * @param {object} element - What the row holds (see `addRulesElement`).
 * @returns {Promise<void>} Resolves once the row holds the element.
 */
async function author(element) {
   await addRulesElement(page, sourceUuid, element);
}

/**
 * Rolls a header button of the character's sheet and returns the posted check.
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
 * Capitalizes the first letter of a key, which is the name of its header button.
 * @param {string} key - The key.
 * @returns {string} The button name.
 */
function buttonName(key) {
   return key.charAt(0).toUpperCase() + key.slice(1);
}

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await setClientSetting(page, 'getCheckOptions', 'never');

   /** @type {string} The scene the token stands on. */
   const sceneId = await createScene(page, { name: `E2E Stat Elements Scene ${RUN}` });
   await viewScene(page, sceneId);
   actorId = await createActor(page, {
      name: `E2E Stat Elements Actor ${RUN}`,
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   for (const [attribute, value] of [
      [
         'body',
         4,
      ],
      [
         'mind',
         6,
      ],
      [
         'soul',
         2,
      ],
   ]) {
      await setAttributeBase(page, actorUuid, attribute, value);
   }
   await placeToken(page, actorId);
   if (!await page.evaluate((id) => game.scenes.get(id).active, sceneId)) {
      await activateScene(page, sceneId);
   }
   await closeAllApps(page);
});

test.afterEach(async () => {
   // Cleanup: the source of the test (and so its elements) is deleted through the API.
   for (const uuid of [
      sourceUuid,
      ...extraUuids,
   ]) {
      await page.evaluate(async (target) => {
         await (await fromUuid(target))?.delete();
      }, uuid);
   }
   extraUuids = [];
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

for (const [operation, { fields, apply }] of Object.entries(OPERATIONS)) {
   test.describe(`${operation} over every selector`, () => {
      test.describe.configure({ timeout: 300_000 });

      for (const selector of Object.keys(SELECTORS)) {
         test(`${selector}: each key shows the element on the sheet`, async () => {
            // A skill's Training and Expertise are many keys: for every operation but Flat Modifier (which gets one
            // element per key) one element with the `all` key reaches each of them.
            /** @type {string[]} The keys the character holds. */
            const allKeys = await keysOf(selector);

            /** @type {string} The id of the ability that carries the elements. */
            const abilityId = await createOwnedItem(page, actorId, 'ability', `E2E ${operation} ${selector}`);
            sourceUuid = `${actorUuid}.Item.${abilityId}`;

            // The editor of every operation offers every selector the character's stats have.
            /** @type {string[]} The selectors the editor offers the operation. */
            const offered = await offeredSelectors(operation);
            expect(offered, `the ${operation} editor offers the ${selector} selector`).toContain(selector);

            // The sheet shows the Armor mod only; the regain mods are read in rules-element-turns.spec.js.
            /** @type {string[]} The keys the sheet displays a total for. */
            const keys = selector === 'mod' ? allKeys.filter((key) => key === 'armor') : allKeys;
            if (selector === 'mod') {
               await expect(
                  (await openSheetByUuid(page, actorUuid)).locator('[data-testid^="sheet-mod-"]'),
                  'the sheet displays one mod total',
               ).toHaveCount(1);
            }
            /** @type {boolean} Whether one `all` element stands for the keys. */
            const useAll = SELECTORS[selector].data === 'skill' && operation !== 'flatModifier';
            if (operation.startsWith('mul') && [
               'speed',
               'training',
               'expertise',
            ].includes(selector)) {
               await raiseBases(selector, keys);
            }

            /** @type {Record<string, number>} The totals the sheet shows before the elements exist. */
            const before = await readSheet(selector, keys);

            for (const key of useAll ? [ALL_KEY] : keys) {
               await author({
                  operation,
                  selector,
                  key,
                  ...fields,
               });
            }

            /** @type {Record<string, number>} The totals the sheet shows with the elements. */
            const after = await readSheet(selector, keys);
            for (const key of keys) {
               expect(after[key], `${selector} ${key} under ${operation}`).toBe(apply(before[key]));
            }

            // The Player HUD shows the resource maximum.
            if (selector === 'resource') {
               /** @type {string} The id of the placed token of the character. */
               const tokenId = await page.evaluate(
                  (id) => canvas.scene.tokens.find((token) => token.actorId === id).id,
                  actorId,
               );
               await controlPlacedToken(page, tokenId);
               for (const key of keys) {
                  await expect(
                     page.getByTestId(`player-hud-bar-${key}-max`),
                     `the HUD shows the ${key} maximum`,
                  ).toHaveText(String(apply(before[key])));
               }
            }

            // The checks a header button rolls carry the stat.
            if (selector === 'attribute') {
               for (const key of keys) {
                  /** @type {{parameters: object}} The rolled check. */
                  const message = await rollFromHeader(buttonName(key), 'attributeCheck');
                  expect(message.parameters.attributeDice, `the ${key} check rolls the element's total`)
                     .toBe(apply(before[key]));
               }
            }
            if (selector === 'resistance') {
               for (const key of keys) {
                  /** @type {{parameters: object}} The rolled check. */
                  const message = await rollFromHeader(buttonName(key), 'resistanceCheck');
                  expect(message.parameters.resistanceDice, `the ${key} check rolls the element's total`)
                     .toBe(apply(before[key]));
               }
            }
         });
      }
   });
}

test.describe('Set Sum modes and element sources', () => {
   test.describe.configure({ timeout: 120_000 });

   test('min and max modes bound the attributes', async () => {
      sourceUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', 'E2E setSum modes')}`;
      for (const [key, mode, value] of [
         [
            'body',
            SET_SUM_MODE_MIN,
            9,
         ],
         [
            'mind',
            SET_SUM_MODE_MAX,
            2,
         ],
         [
            'soul',
            SET_SUM_MODE_SET,
            5,
         ],
      ]) {
         await author({
            operation: 'setSum',
            selector: 'attribute',
            key,
            value,
            mode,
         });
      }

      // Body 4 raised to the floor 9, Mind 6 capped to 2, Soul 2 set to 5.
      expect(await readSheet('attribute', [
         'body',
         'mind',
         'soul',
      ])).toEqual({
         body: 9,
         mind: 2,
         soul: 5,
      });
   });

   test('an effect source shows a bonus and a penalty as styled totals', async () => {
      sourceUuid = `${actorUuid}.ActiveEffect.${await addEffect(page, actorId, 'E2E stat effect')}`;
      await author({
         operation: 'flatModifier',
         selector: 'attribute',
         key: 'body',
         value: 2,
      });
      await author({
         operation: 'flatModifier',
         selector: 'attribute',
         key: 'soul',
         value: -1,
      });

      /** @type {import('@playwright/test').Locator} The character's sheet. */
      const sheet = await openSheetByUuid(page, actorUuid);
      await expect(sheet.getByTestId('sheet-attribute-body')).toHaveText('6');
      await expect(sheet.getByTestId('sheet-attribute-body'), 'an effect bonus is styled').toHaveClass(/bonus/);
      await expect(sheet.getByTestId('sheet-attribute-soul')).toHaveText('1');
      await expect(sheet.getByTestId('sheet-attribute-soul'), 'an effect penalty is styled').toHaveClass(/penalty/);
      await expect(sheet.getByTestId('sheet-attribute-mind'), 'an untouched stat is plain')
         .not.toHaveClass(/bonus|penalty/);
   });
});

test.describe('element sources and native changes', () => {
   test.describe.configure({ timeout: 240_000 });

   test('an equipped equipment item applies its elements and an unequipped one does not', async () => {
      /** @type {string} The id of the equipment item. */
      const itemId = await createOwnedItem(page, actorId, 'equipment', 'E2E stat equipment');
      sourceUuid = `${actorUuid}.Item.${itemId}`;
      await author({
         operation: 'flatModifier',
         selector: 'attribute',
         key: 'body',
         value: 2,
      });

      /** @type {import('@playwright/test').Locator} The character's sheet. */
      const sheet = await openSheetByUuid(page, actorUuid);
      await expect(sheet.getByTestId('sheet-attribute-body'), 'an unequipped item changes nothing').toHaveText('4');
      await setEquipped(page, actorId, itemId, true);
      await expect(sheet.getByTestId('sheet-attribute-body'), 'the equipped item adds 2').toHaveText('6');
      await expect(sheet.getByTestId('sheet-attribute-body'), 'an equipment bonus is the normal value')
         .not.toHaveClass(/bonus|penalty/);
      await setEquipped(page, actorId, itemId, false);
      await expect(sheet.getByTestId('sheet-attribute-body'), 'unequipping removes the bonus').toHaveText('4');
   });

   test('a Flat Modifier with the all key reaches every key of every selector it is offered for', async () => {
      sourceUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', 'E2E stat all keys')}`;
      /** @type {string[]} The selectors the Flat Modifier editor offers that the sheet shows a total for. */
      const selectors = [
         'attribute',
         'resistance',
         'rating',
         'speed',
         'resource',
      ];

      /** @type {Record<string, Record<string, number>>} The totals before the elements, by selector. */
      const before = {};
      for (const selector of selectors) {
         before[selector] = await readSheet(selector, await keysOf(selector));
         await author({
            operation: 'flatModifier',
            selector,
            key: ALL_KEY,
            value: 2,
         });
      }
      for (const selector of selectors) {
         /** @type {Record<string, number>} The totals with the element. */
         const after = await readSheet(selector, Object.keys(before[selector]));
         for (const [key, total] of Object.entries(before[selector])) {
            expect(after[key], `${selector} ${key} under the all key`).toBe(total + 2);
         }
      }
   });

   test('worn Heavy armor lowers every speed above 0 by 1, and Armor elements act on the armor value', async () => {
      /** @type {string} The armor's uuid. */
      const armorUuid = await wearArmor(page, actorId, 'E2E stat armor', 3);
      extraUuids.push(armorUuid);

      /** @type {string[]} The speeds. */
      const speeds = await keysOf('speed');
      /** @type {Record<string, number>} The speeds without the Heavy trait. */
      const before = await readSheet('speed', speeds);
      await addTrait(page, armorUuid, 'Heavy');

      /** @type {Record<string, number>} The speeds with the Heavy trait. */
      const after = await readSheet('speed', speeds);
      for (const speed of speeds) {
         expect(after[speed], `${speed} under Heavy armor`).toBe(before[speed] > 0 ? before[speed] - 1 : 0);
      }
      expect((await readSheet('mod', ['armor'])).armor, 'the worn armor is the Armor mod').toBe(3);

      /** @type {string} The id of the ability that carries the Armor element. */
      const abilityId = await createOwnedItem(page, actorId, 'ability', 'E2E stat armor elements');
      sourceUuid = `${actorUuid}.Item.${abilityId}`;
      await author({
         operation: 'flatModifier',
         selector: 'mod',
         key: 'armor',
         value: 2,
      });
      expect((await readSheet('mod', ['armor'])).armor, 'a flat 2 adds to the worn armor').toBe(5);

      // Multiply Sum doubles the whole total (the armor 3 and the ability's 2).
      await author({
         operation: 'mulSum',
         selector: 'mod',
         key: 'armor',
         value: 2,
         rounding: 'down',
      });
      expect((await readSheet('mod', ['armor'])).armor, 'Multiply Sum doubles the Armor mod').toBe(10);
   });

   test('changes entered in the Active Effect config of core reach each stat on the sheet', async () => {
      /** @type {Array<[string, string, string]>} The selector, the key and the change key of each stat. */
      const targets = [];
      for (const selector of Object.keys(SELECTORS)) {
         /** @type {string} The first key of the selector. */
         const key = (await keysOf(selector))[0];
         targets.push([
            selector,
            key,
            selector === 'training' || selector === 'expertise' ?
               `system.skill.${key}.${selector}.mod.static` :
               `system.${SELECTORS[selector].data}.${key}.mod.static`,
         ]);
      }

      /** @type {string} The id of the base effect. */
      const effectId = await page.evaluate(async (id) => {
         /** @type {ActiveEffect[]} The created effect. */
         const created = await game.actors.get(id).createEmbeddedDocuments('ActiveEffect', [{
            name: 'E2E native stat changes',
            type: 'base',
         }]);
         return created[0].id;
      }, actorId);
      sourceUuid = `${actorUuid}.ActiveEffect.${effectId}`;

      /** @type {Record<string, number>} The totals before the changes, by selector. */
      const before = {};
      for (const [selector, key] of targets) {
         before[selector] = (await readSheet(selector, [key]))[key];
      }

      await page.evaluate(async (uuid) => {
         /** @type {foundry.applications.sheets.ActiveEffectConfig} The effect's config sheet. */
         const sheet = (await fromUuid(uuid)).sheet;
         await sheet.render({ force: true });
         await sheet.changeTab('changes', 'sheet');
      }, sourceUuid);

      /** @type {import('@playwright/test').Locator} The config sheet. */
      const config = page.locator('.application.active-effect-config');
      await expect(config).toBeVisible();
      for (const [index, [, , changeKey]] of targets.entries()) {
         await config.locator('[data-action="addChange"]').click();
         await expect(config.locator('ol[data-changes] li')).toHaveCount(index + 1);
         await config.locator(`[name="system.changes.${index}.key"]`).fill(changeKey);
         await config.locator(`[name="system.changes.${index}.value"]`).fill('3');
      }
      await config.locator('button[type="submit"]').click();

      for (const [selector, key] of targets) {
         await expect.poll(
            async () => (await readSheet(selector, [key]))[key],
            { message: `the native change reaches ${selector} ${key}` },
         ).toBe(before[selector] + 3);
      }
      expect((await readServerSystem(page, sourceUuid)).changes.length, 'the server holds the changes')
         .toBe(targets.length);
   });
});
