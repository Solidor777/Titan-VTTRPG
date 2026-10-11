import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login, openSheetByUuid, openSheetTab } from './fixtures.js';
import {
   controlPlacedToken,
   createActor,
   createScene,
   placeToken,
   readServerSystem,
   setAttributeBase,
   setResource,
   viewScene,
} from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The character sheet's widths, measured from the live computed geometry of the real rendered elements in the default
 * theme: a two-digit Resource value in the sidebar is not cut off, and a Skills tab row sizes its roll button to the
 * skill name (wrapping a very long name inside the button) while the Attribute select, Training and Expertise keep one
 * column to its right at the same place in every row.
 */

/** @type {string} Name of the actor whose sheet is measured; `E2E ` lets the census find it. */
const WIDTHS_ACTOR_NAME = 'E2E Widths Actor';

/** @type {string[]} The Resources the character sheet's sidebar shows. */
const RESOURCES = [
   'stamina',
   'wounds',
   'resolve',
];

/** @type {string} The skill whose localized name the long-name test replaces. */
const LONG_NAME_SKILL = 'athletics';

/** @type {string} A skill name far wider than the row, so its button must wrap. */
const LONG_NAME = 'An Extraordinarily Long Skill Name That Cannot Possibly Fit Beside The Attribute Select '
   + 'Training And Expertise Controls On A Single Line Of The Skills Tab';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the measured actor. */
let actorUuid;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   actorUuid = `Actor.${await createActor(page, {
      name: WIDTHS_ACTOR_NAME,
      type: 'player',
   })}`;

   // With the default multipliers these bases give Stamina 80, Wounds 20 and Resolve 10: two digits each.
   for (const [attribute, value] of [
      [
         'body',
         10,
      ],
      [
         'mind',
         10,
      ],
      [
         'soul',
         20,
      ],
   ]) {
      await setAttributeBase(page, actorUuid, attribute, value);
   }
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Measures how much of an element's text is cut off by its own box: the scroll width against the client width, and the
 * rendered text's width against the width left inside the element's padding.
 * @param {import('@playwright/test').Locator} locator - The element: an input (its value is the text) or any other.
 * @returns {Promise<{text: string, scrollWidth: number, clientWidth: number, textWidth: number, available: number}>}
 * The element's text and widths.
 */
function measureText(locator) {
   return locator.evaluate((element) => {
      /** @type {CSSStyleDeclaration} The element's computed style. */
      const style = globalThis.getComputedStyle(element);

      /** @type {string} The element's text. */
      const text = element.value ?? element.textContent.trim();

      /** @type {CanvasRenderingContext2D} A canvas context with the element's font. */
      const context = document.createElement('canvas').getContext('2d');
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      return {
         text,
         scrollWidth: element.scrollWidth,
         clientWidth: element.clientWidth,
         textWidth: context.measureText(text).width,
         available: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      };
   });
}

test.describe('the Resource values in the sidebar', () => {
   test('a two-digit value, maximum and static mod are not cut off', async () => {
      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, actorUuid);
      for (const resource of RESOURCES) {
         /** @type {number} The Resource's maximum, read from the sheet. */
         const max = Number(await sheet.getByTestId(`sheet-resource-${resource}-max`).textContent());
         expect(String(max).length, `${resource} maximum ${max} has two digits`).toBe(2);
         await setResource(page, actorUuid, resource, max);

         /** @type {import('@playwright/test').Locator} The Resource's meter row and label row inputs. */
         const container = sheet.locator(`.middle.${resource}`)
            .locator('xpath=ancestor::div[contains(@class, "container")][1]');
         await commitText(container.locator('.row').first().locator('.side input'), '10');

         for (const [label, locator] of [
            [
               'current value input',
               container.locator('.row').nth(1).locator('.side input').first(),
            ],
            [
               'maximum label',
               sheet.getByTestId(`sheet-resource-${resource}-max`),
            ],
            [
               'static mod input',
               container.locator('.row').first().locator('.side input'),
            ],
         ]) {
            /** @type {Awaited<ReturnType<typeof measureText>>} The element's text and widths. */
            const measured = await measureText(locator);
            expect(measured.text.length, `${resource} ${label} holds two digits`).toBe(2);
            expect(measured.scrollWidth, `${resource} ${label} text is not scrolled out of its box`)
               .toBeLessThanOrEqual(measured.clientWidth);
            expect(measured.textWidth, `${resource} ${label} glyphs fit ${JSON.stringify(measured)}`)
               .toBeLessThanOrEqual(measured.available + 0.5);
         }
      }
   });
});

test.describe('the Resource bars of the Player HUD', () => {
   test('a two-digit value and maximum are not cut off', async () => {
      // The actor holds the two-digit current values the sidebar test typed.
      for (const resource of RESOURCES) {
         await setResource(page, actorUuid, resource, 10);
      }
      await closeAllApps(page);

      /** @type {string} The scene the actor's token stands on. */
      const sceneId = await createScene(page, { name: `E2E Widths Scene ${Date.now()}` });
      await viewScene(page, sceneId);
      await controlPlacedToken(page, await placeToken(page, actorUuid.replace('Actor.', '')));
      for (const resource of RESOURCES) {
         for (const part of [
            'input',
            'max',
         ]) {
            /** @type {Awaited<ReturnType<typeof measureText>>} The element's text and widths. */
            const measured = await measureText(page.getByTestId(`player-hud-bar-${resource}-${part}`));
            expect(measured.text.length, `HUD ${resource} ${part} holds two digits`).toBe(2);
            expect(measured.scrollWidth, `HUD ${resource} ${part} text is not scrolled out of its box`)
               .toBeLessThanOrEqual(measured.clientWidth);
            expect(measured.textWidth, `HUD ${resource} ${part} glyphs fit ${JSON.stringify(measured)}`)
               .toBeLessThanOrEqual(measured.available + 0.5);
         }
      }
   });
});

test.describe('a three-digit Resource', () => {
   test('a Stamina of 120 is not cut off in the sidebar or the Player HUD', async () => {
      // Attributes of 20 give Stamina 120 with the default multiplier.
      /** @type {string} The id of the actor with the three-digit Stamina. */
      const bigId = await createActor(page, {
         name: 'E2E Widths Big Actor',
         type: 'player',
      });
      /** @type {string} The actor's uuid. */
      const bigUuid = `Actor.${bigId}`;
      for (const attribute of [
         'body',
         'mind',
         'soul',
      ]) {
         await setAttributeBase(page, bigUuid, attribute, 20);
      }

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, bigUuid);
      expect(await sheet.getByTestId('sheet-resource-stamina-max').textContent(), 'Stamina maximum').toBe('120');
      await setResource(page, bigUuid, 'stamina', 120);
      await commitText(sheet.locator('.middle.stamina').locator('xpath=ancestor::div[contains(@class, "container")][1]')
         .locator('.row').first().locator('.side input'), '100');

      /** @type {import('@playwright/test').Locator} The Stamina container. */
      const container = sheet.locator('.middle.stamina')
         .locator('xpath=ancestor::div[contains(@class, "container")][1]');
      for (const [label, locator] of [
         [
            'current value input',
            container.locator('.row').nth(1).locator('.side input').first(),
         ],
         [
            'maximum label',
            sheet.getByTestId('sheet-resource-stamina-max'),
         ],
         [
            'static mod input',
            container.locator('.row').first().locator('.side input'),
         ],
      ]) {
         /** @type {Awaited<ReturnType<typeof measureText>>} The element's text and widths. */
         const measured = await measureText(locator);
         expect(measured.text.length, `sidebar ${label} holds three digits`).toBe(3);
         expect(measured.scrollWidth, `sidebar ${label} is not scrolled out of its box`)
            .toBeLessThanOrEqual(measured.clientWidth);
         expect(measured.textWidth, `sidebar ${label} glyphs fit ${JSON.stringify(measured)}`)
            .toBeLessThanOrEqual(measured.available + 0.5);
      }
      await closeAllApps(page);

      /** @type {string} The scene the actor's token stands on. */
      const sceneId = await createScene(page, { name: `E2E Widths Big Scene ${Date.now()}` });
      await viewScene(page, sceneId);
      await controlPlacedToken(page, await placeToken(page, bigId));
      for (const part of [
         'input',
         'max',
      ]) {
         /** @type {Awaited<ReturnType<typeof measureText>>} The element's text and widths. */
         const measured = await measureText(page.getByTestId(`player-hud-bar-stamina-${part}`));
         expect(measured.text.length, `HUD stamina ${part} holds three digits`).toBe(3);
         expect(measured.scrollWidth, `HUD stamina ${part} is not scrolled out of its box`)
            .toBeLessThanOrEqual(measured.clientWidth);
         expect(measured.textWidth, `HUD stamina ${part} glyphs fit ${JSON.stringify(measured)}`)
            .toBeLessThanOrEqual(measured.available + 0.5);
      }

      // The HUD input accepts a three-digit value.
      await commitText(page.getByTestId('player-hud-bar-stamina-input'), '110');
      await expect.poll(
         async () => (await readServerSystem(page, bigUuid)).resource.stamina.value,
         { message: 'the HUD input stored a three-digit value' },
      ).toBe(110);
   });
});

test.describe('the Skills tab rows', () => {
   /**
    * Measures every skill row: the roll button, its text, and the three controls of the right-hand column, relative to
    * the row.
    * @returns {Promise<object[]>} One record per row.
    */
   function measureRows() {
      return page.evaluate(() => {
         /** @type {Element[]} The skill rows of the open sheet. */
         const rows = [...document.querySelectorAll('.application.titan-document-sheet .skill')];
         return rows.map((row) => {
            /** @type {DOMRect} The box of the skill row; every offset is relative to it. */
            const rowBox = row.getBoundingClientRect();

            /** @type {HTMLElement} The roll button. */
            const button = row.querySelector('.check button');

            /** @type {DOMRect} The box of the button's content. */
            const content = button.querySelector('.button-inner').getBoundingClientRect();

            /** @type {HTMLElement[]} The Attribute select, the Training group and the Expertise group. */
            const column = [
               row.querySelector('.attribute'),
               ...row.querySelectorAll('.stats .stat'),
            ];

            /** @type {DOMRect} The box of the roll button. */
            const buttonBox = button.getBoundingClientRect();
            return {
               name: button.textContent.trim(),
               buttonLeft: buttonBox.left - rowBox.left,
               buttonRight: buttonBox.right - rowBox.left,
               buttonWidth: buttonBox.width,
               buttonHeight: buttonBox.height,
               contentWidth: content.width,
               overflow: button.scrollWidth - button.clientWidth,
               columnLefts: column.map((element) => element.getBoundingClientRect().left - rowBox.left),
               columnTops: column.map((element) => element.getBoundingClientRect().top - rowBox.top),
            };
         });
      });
   }

   /** @type {number} The padding and border a button adds around its content, with a little slack. */
   const BUTTON_CHROME = 30;

   test('a roll button is as wide as its text and the right-hand column keeps one place', async () => {
      await openSheetByUuid(page, actorUuid);
      await openSheetTab(page, 'Skills');
      await expect(page.locator('.application.titan-document-sheet .skill').first()).toBeVisible();

      /** @type {object[]} The measured rows. */
      const rows = await measureRows();
      expect(rows.length, 'every skill has a row').toBe(18);
      for (const row of rows) {
         expect(row.buttonWidth - row.contentWidth, `${row.name} button is no wider than its text`)
            .toBeLessThanOrEqual(BUTTON_CHROME);
         expect(row.overflow, `${row.name} button text is not cut off`).toBeLessThanOrEqual(0);

         // The Attribute select, Training and Expertise form one column right of the button, stacked in that order.
         expect(row.columnLefts[0], `${row.name} Training starts at the Attribute select's left`)
            .toBeCloseTo(row.columnLefts[1], 0);
         expect(row.columnLefts[0], `${row.name} Expertise starts at the Attribute select's left`)
            .toBeCloseTo(row.columnLefts[2], 0);
         expect(row.columnLefts[0], `${row.name} column starts right of the button`)
            .toBeGreaterThanOrEqual(row.buttonRight);
         expect(row.columnTops[1], `${row.name} Training is below the Attribute select`)
            .toBeGreaterThan(row.columnTops[0]);
         expect(row.columnTops[2], `${row.name} Expertise is below Training`).toBeGreaterThan(row.columnTops[1]);
      }

      expect(new Set(rows.map((row) => Math.round(row.columnLefts[0]))).size, 'one column place for every row')
         .toBe(1);
      expect(new Set(rows.map((row) => Math.round(row.buttonWidth))).size, 'button widths follow the skill names')
         .toBeGreaterThan(3);
   });

   test('a very long skill name wraps inside its button and the column stays in place', async () => {
      /** @type {string} The skill's localized name before the test replaces it. */
      const original = await page.evaluate((skill) => game.i18n.localize(`LOCAL.${skill}.text`), LONG_NAME_SKILL);
      try {
         await page.evaluate(({ skill, name }) => {
            foundry.utils.setProperty(game.i18n.translations, `LOCAL.${skill}.text`, name);
         }, {
            skill: LONG_NAME_SKILL,
            name: LONG_NAME,
         });
         expect(
            await page.evaluate((skill) => game.i18n.localize(`LOCAL.${skill}.text`), LONG_NAME_SKILL),
            'the replaced name is what the sheet will localize',
         ).toBe(LONG_NAME);
         await openSheetByUuid(page, actorUuid);
         await openSheetTab(page, 'Skills');
         await expect(page.locator('.application.titan-document-sheet .skill').first()).toBeVisible();

         /** @type {object[]} The measured rows. */
         const rows = await measureRows();
         /** @type {object} The row with the long name. */
         const long = rows.find((row) => row.name.startsWith(LONG_NAME.slice(0, 20)));
         /** @type {object[]} The other rows. */
         const others = rows.filter((row) => row !== long);
         expect(long, 'the long-named row exists').toBeDefined();

         /** @type {number} The tallest button among the short names, which hold one line of text. */
         const oneLine = Math.max(...others.map((row) => row.buttonHeight));
         expect(long.buttonHeight, 'the long name wraps onto several lines inside its button')
            .toBeGreaterThan(oneLine * 1.8);
         expect(long.overflow, 'the wrapped text is not cut off').toBeLessThanOrEqual(0);
         expect(long.columnLefts[0], 'the column stays right of the wrapped button')
            .toBeGreaterThanOrEqual(long.buttonRight);
         expect(
            new Set(rows.map((row) => Math.round(row.columnLefts[0]))).size,
            'the long row keeps the column place of the short rows',
         ).toBe(1);
         expect(long.columnTops[1], 'Training is below the Attribute select').toBeGreaterThan(long.columnTops[0]);
         expect(long.columnTops[2], 'Expertise is below Training').toBeGreaterThan(long.columnTops[1]);
      }
      finally {
         await page.evaluate(({ skill, name }) => {
            foundry.utils.setProperty(game.i18n.translations, `LOCAL.${skill}.text`, name);
         }, {
            skill: LONG_NAME_SKILL,
            name: original,
         });
      }
   });
});
