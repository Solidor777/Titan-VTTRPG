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
 * theme: a two-digit Resource value in the sidebar is not cut off and no Resource row overflows the sidebar, a Skills
 * tab row is one line that sizes its roll button to the skill name (wrapping a very long name inside the button) while
 * the Attribute select, Training and Expertise keep one place to its right in every row, the column header above the
 * list lines up with those columns, and a skill entry has a minimum width and a bounded name column.
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
               nameColumn: document.querySelector('.application.titan-document-sheet .skill-tab .head-name')
                  .getBoundingClientRect().width,
               contentWidth: content.width,
               overflow: button.scrollWidth - button.clientWidth,
               columnLefts: column.map((element) => element.getBoundingClientRect().left - rowBox.left),
               columnTops: column.map((element) => element.getBoundingClientRect().top - rowBox.top),
               columnBorders: column.map((element) => parseFloat(globalThis.getComputedStyle(element).borderLeftWidth)),
               rowHeight: rowBox.height,
               rowCentre: rowBox.top + rowBox.height / 2,
               buttonCentre: buttonBox.top + buttonBox.height / 2,
               controlCentres: [
                  row.querySelector('.attribute select, .attribute button'),
                  ...row.querySelectorAll('.stats .stat .input, .stats .stat .value'),
               ].filter(Boolean).map((element) => {
                  /** @type {DOMRect} The control's box. */
                  const box = element.getBoundingClientRect();
                  return box.top + box.height / 2;
               }),
            };
         });
      });
   }

   /** @type {number} The padding and border a button adds around its content, with a little slack. */
   const BUTTON_CHROME = 30;

   test('every skill sits on one line of columns: the button, Attribute select, Training and Expertise', async () => {
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

         // The Attribute select, Training and Expertise follow the button from left to right on one line.
         expect(row.columnLefts[0], `${row.name} Attribute select starts right of the button`)
            .toBeGreaterThanOrEqual(row.buttonRight);
         expect(row.columnLefts[1], `${row.name} Training starts right of the Attribute select`)
            .toBeGreaterThan(row.columnLefts[0]);
         expect(row.columnLefts[2], `${row.name} Expertise starts right of Training`)
            .toBeGreaterThan(row.columnLefts[1]);
         for (const top of row.columnTops) {
            expect(top, `${row.name} columns share one line`).toBeCloseTo(row.columnTops[0], 0);
         }

         // A name that fits the name column stays on one line, and the row is then one line of controls (a 30px
         // select and 5px padding). A longer name wraps inside its button, which fills the column, and the row grows
         // only as much as the button needs.
         if (row.buttonWidth < row.nameColumn - 1) {
            expect(row.buttonHeight, `${row.name} name is on one line`).toBeLessThanOrEqual(rows[0].buttonHeight + 1);
            expect(row.rowHeight, `${row.name} row is one line tall`).toBeLessThanOrEqual(44);
         }
         else {
            expect(row.rowHeight, `${row.name} row is no taller than its button needs`)
               .toBeLessThanOrEqual(row.buttonHeight + 14);
         }

         // A divider sits at the left edge of each of the three columns.
         for (const [index, borderLeft] of row.columnBorders.entries()) {
            expect(borderLeft, `${row.name} column ${index} has a divider`).toBeGreaterThan(0);
         }
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

         // The taller row keeps every column on its vertical middle.
         expect(long.rowHeight, 'the wrapped row is taller than a one-line row')
            .toBeGreaterThan(others[0].rowHeight + 10);
         expect(Math.abs(long.buttonCentre - long.rowCentre), 'the wrapped button is on the row middle')
            .toBeLessThanOrEqual(1);
         expect(long.controlCentres.length, 'the Attribute select and the six stat inputs are measured').toBe(7);
         for (const centre of long.controlCentres) {
            expect(Math.abs(centre - long.rowCentre), 'a column control is on the middle of the taller row')
               .toBeLessThanOrEqual(1);
         }
         expect(long.columnLefts[0], 'the column stays right of the wrapped button')
            .toBeGreaterThanOrEqual(long.buttonRight);
         expect(
            new Set(rows.map((row) => Math.round(row.columnLefts[0]))).size,
            'the long row keeps the column place of the short rows',
         ).toBe(1);
         for (const top of long.columnTops) {
            expect(top, 'the long row keeps the columns on one line').toBeCloseTo(long.columnTops[0], 0);
         }
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

test.describe('the Skills column header', () => {
   /**
    * Measures the column header against every skill row: the left and width of each column, and the horizontal centre
    * of each sub-label against the control below it.
    * @returns {Promise<object>} The header's texts and geometry, and the per-row differences.
    */
   function measureHeader() {
      return page.evaluate(() => {
         /** @type {Element} The open character sheet. */
         const sheet = document.querySelector('.application.titan-document-sheet');

         /** @type {Element} The column header. */
         const head = sheet.querySelector('.skill-tab .head');

         /** @type {Element} The scrolling area of the skill list. */
         const content = sheet.querySelector('.skill-tab .scrolling-container .content');

         /** @type {DOMRect[]} The boxes of the four header columns: name, Attribute, Training, Expertise. */
         const cells = [...head.querySelectorAll('.head-cell')].map((cell) => cell.getBoundingClientRect());

         /** @type {DOMRect[]} The boxes of the six sub-labels: Base, Mod and Total of Training then Expertise. */
         const subLabels = [...head.querySelectorAll('.head-sub span')].map((span) => span.getBoundingClientRect());

         /** @type {object[]} The per-row differences from the header. */
         const rows = [...sheet.querySelectorAll('.skill')].map((row) => {
            /** @type {DOMRect[]} The boxes of the row's Attribute select and two stat groups. */
            const columns = [
               row.querySelector('.attribute'),
               ...row.querySelectorAll('.stats .stat'),
            ].map((element) => element.getBoundingClientRect());

            /** @type {DOMRect[]} The boxes of each stat group's base input, mod input and total. */
            const controls = [...row.querySelectorAll('.stats .stat')].flatMap((stat) => [
               ...stat.querySelectorAll('.input, .value'),
            ]).map((element) => element.getBoundingClientRect());
            return {
               leftDifferences: columns.map((box, index) => Math.abs(box.left - cells[index + 1].left)),
               widthDifferences: columns.map((box, index) => Math.abs(box.width - cells[index + 1].width)),
               centreDifferences: controls.map((box, index) => Math.abs(
                  box.left + box.width / 2 - (subLabels[index].left + subLabels[index].width / 2),
               )),
            };
         });
         return {
            labels: [...head.querySelectorAll('.head-label')].map((label) => label.textContent.trim()),
            subLabelTexts: [...head.querySelectorAll('.head-sub span')].map((span) => span.textContent.trim()),
            headInsideScroller: content.contains(head),
            headTop: head.getBoundingClientRect().top,
            headGutter: head.offsetWidth - head.clientWidth,
            listGutter: content.offsetWidth - content.clientWidth,
            overflowing: content.scrollHeight > content.clientHeight,
            rows,
         };
      });
   }

   test('the header labels the columns and lines up with every row, scrolled or not', async () => {
      await openSheetByUuid(page, actorUuid);
      await openSheetTab(page, 'Skills');
      await expect(page.locator('.application.titan-document-sheet .skill').first()).toBeVisible();

      /** @type {Awaited<ReturnType<typeof measureHeader>>} The header measured with the list at its top. */
      const atTop = await measureHeader();
      expect(atTop.labels, 'the group labels').toEqual([
         'Skill',
         'Attribute',
         'Training',
         'Expertise',
      ]);
      expect(atTop.subLabelTexts, 'the sub-labels of both groups').toEqual([
         'Base',
         'Mod',
         'Total',
         'Base',
         'Mod',
         'Total',
      ]);
      expect(atTop.headInsideScroller, 'the header is outside the scrolling list').toBe(false);
      expect(atTop.overflowing, 'the list scrolls, so its scrollbar shows').toBe(true);
      expect(atTop.headGutter, 'the header reserves the scrollbar width of the list').toBe(atTop.listGutter);
      expect(atTop.rows.length, 'every skill row is measured').toBe(18);

      // The list scrolls to its end; the header stays and the columns still line up.
      await page.evaluate(() => {
         /** @type {Element} The scrolling area of the skill list. */
         const content = document.querySelector('.titan-document-sheet .skill-tab .scrolling-container .content');
         content.scrollTop = content.scrollHeight;
      });
      /** @type {Awaited<ReturnType<typeof measureHeader>>} The header measured with the list at its end. */
      let scrolled;
      await expect.poll(async () => {
         scrolled = await measureHeader();
         return scrolled.headTop;
      }, { message: 'the header does not move when the list scrolls' }).toBe(atTop.headTop);

      for (const [position, measured] of [
         [
            'at the top',
            atTop,
         ],
         [
            'scrolled to the end',
            scrolled,
         ],
      ]) {
         for (const [index, row] of measured.rows.entries()) {
            for (const [column, difference] of row.leftDifferences.entries()) {
               expect(difference, `row ${index} column ${column} left edge ${position}`).toBeLessThanOrEqual(1);
               expect(row.widthDifferences[column], `row ${index} column ${column} width ${position}`)
                  .toBeLessThanOrEqual(1);
            }
            for (const [control, difference] of row.centreDifferences.entries()) {
               expect(difference, `row ${index} control ${control} sits under its sub-label ${position}`)
                  .toBeLessThanOrEqual(1);
            }
         }
      }
   });

   // Nested so these tests share `measureHeader`.
   test.describe('the width of a skill entry', () => {
   /** @type {number} The narrowest the skill name column is allowed to be (`--skill-name-min`). */
      const NAME_MIN = 165;

      /** @type {number} The widest the skill name column is allowed to be (`--skill-name-max`). */
      const NAME_MAX = 195;

      /**
       * @type {number} The narrowest a skill entry is allowed to be: name minimum, 121 + 145 + 145 for the Attribute,
       * Training and Expertise tracks, and 15 of row padding.
       */
      const ENTRY_MIN_WIDTH = NAME_MIN + 121 + 145 + 145 + 15;

      /**
       * Measures the columns of the open sheet's skill entries.
       * @returns {Promise<object>} The skill name column width, the entries' minimum widths, the widest roll button,
       * the left edge of each column inside the first row, and the free space between the last column and the row's
       * end.
       */
      function measureEntries() {
         return page.evaluate(() => {
            /** @type {Element} The open character sheet. */
            const sheet = document.querySelector('.application.titan-document-sheet');

            /** @type {Element[]} The skill rows. */
            const rows = [...sheet.querySelectorAll('.skill')];

            /** @type {DOMRect} The first row's box. */
            const rowBox = rows[0].getBoundingClientRect();

            /** @type {DOMRect[]} The boxes of the first row's Attribute select and stat groups. */
            const columns = [
               rows[0].querySelector('.attribute'),
               ...rows[0].querySelectorAll('.stats .stat'),
            ].map((element) => element.getBoundingClientRect());
            return {
               nameColumn: sheet.querySelector('.skill-tab .head-name').getBoundingClientRect().width,
               rowMinWidth: globalThis.getComputedStyle(rows[0]).minWidth,
               entryMinWidth: globalThis.getComputedStyle(rows[0].closest('li')).minWidth,
               widestButton: Math.max(
                  ...rows.map((row) => row.querySelector('.check button').getBoundingClientRect().width),
               ),
               columnLefts: columns.map((box) => Math.round(box.left - rowBox.left)),
               trailingSpace: rowBox.right - columns.at(-1).right,
            };
         });
      }

      test('the entry has a minimum width and the skill name column stays within its bounds', async () => {
         await openSheetByUuid(page, actorUuid);
         await openSheetTab(page, 'Skills');
         await expect(page.locator('.application.titan-document-sheet .skill').first()).toBeVisible();

         /** @type {Awaited<ReturnType<typeof measureEntries>>} The measured entries. */
         const measured = await measureEntries();
         expect(measured.rowMinWidth, 'a skill row has the one-line minimum width').toBe(`${ENTRY_MIN_WIDTH}px`);
         expect(measured.entryMinWidth, 'a skill list entry has the one-line minimum width')
            .toBe(`${ENTRY_MIN_WIDTH}px`);
         expect(measured.nameColumn, 'the skill name column is at least its minimum').toBeGreaterThanOrEqual(NAME_MIN);
         expect(measured.nameColumn, 'the skill name column is at most its maximum').toBeLessThanOrEqual(NAME_MAX);
         expect(measured.widestButton, 'a roll button is never wider than the skill name column')
            .toBeLessThanOrEqual(measured.nameColumn);
      });

      test('a wider sheet leaves its extra room after the columns, which keep their place and the header alignment',
         async () => {
            await openSheetByUuid(page, actorUuid);
            await openSheetTab(page, 'Skills');
            await expect(page.locator('.application.titan-document-sheet .skill').first()).toBeVisible();

            /** @type {Awaited<ReturnType<typeof measureEntries>>[]} The entries at each wider sheet width. */
            const measuredWidths = [];
            try {
               // Both widths leave more room than the columns need, so the name column is at its maximum in both.
               for (const width of [
                  1300,
                  1500,
               ]) {
                  await page.evaluate(async ({ uuid, sheetWidth }) => {
                     (await fromUuid(uuid)).sheet.setPosition({ width: sheetWidth });
                  }, {
                     uuid: actorUuid,
                     sheetWidth: width,
                  });
                  await expect.poll(() => page.evaluate(() => Math.round(
                     document.querySelector('.application.titan-document-sheet').getBoundingClientRect().width,
                  )), { message: `the sheet is ${width}px wide` }).toBe(width);
                  measuredWidths.push(await measureEntries());

                  /** @type {Awaited<ReturnType<typeof measureHeader>>} The header against the rows. */
                  const header = await measureHeader();
                  for (const [index, row] of header.rows.entries()) {
                     for (const [column, difference] of row.leftDifferences.entries()) {
                        expect(difference, `row ${index} column ${column} left edge at ${width}px`)
                           .toBeLessThanOrEqual(1);
                     }
                  }
               }
               const [
                  narrower,
                  wider,
               ] = measuredWidths;
               expect(narrower.nameColumn, 'the skill name column is at its maximum').toBe(NAME_MAX);
               expect(wider.nameColumn, 'the skill name column stays at its maximum').toBe(NAME_MAX);
               expect(wider.columnLefts, 'the columns keep their place in the row').toEqual(narrower.columnLefts);
               expect(wider.trailingSpace, 'the extra room trails the columns')
                  .toBeGreaterThanOrEqual(narrower.trailingSpace + 190);
            }
            finally {
               await page.evaluate(async (uuid) => {
                  (await fromUuid(uuid)).sheet.setPosition({ width: 900 });
               }, actorUuid);
            }
         });
   });
});

test.describe('the Resource rows of the sidebar', () => {
   test('no Resource row overflows the sidebar horizontally', async () => {
      await openSheetByUuid(page, actorUuid);

      /** @type {object[]} The measurement of each Resource's two rows. */
      const measured = await page.evaluate((resources) => resources.map((resource) => {
         /** @type {Element} The Resource's container. */
         const container = document.querySelector(`.application.titan-document-sheet .middle.${resource}`)
            .closest('.container');

         /** @type {Element} The nearest ancestor that clips or scrolls horizontally: the sidebar. */
         let sidebar = container.parentElement;
         while (globalThis.getComputedStyle(sidebar).overflowX === 'visible') {
            sidebar = sidebar.parentElement;
         }
         /** @type {DOMRect} The sidebar's box. */
         const sidebarBox = sidebar.getBoundingClientRect();
         return {
            resource,
            rows: [...container.querySelectorAll('.row')].map((row) => ({
               overflow: row.scrollWidth - row.clientWidth,
               rightOfSidebar: Math.max(...[...row.children].map((child) => child.getBoundingClientRect().right))
                  - sidebarBox.right,
            })),
            sidebarOverflow: sidebar.scrollWidth - sidebar.clientWidth,
         };
      }), RESOURCES);
      expect(measured.length, 'every Resource is measured').toBe(RESOURCES.length);
      for (const resource of measured) {
         expect(resource.rows.length, `${resource.resource} has a label row and a meter row`).toBe(2);
         for (const row of resource.rows) {
            expect(row.overflow, `${resource.resource} row does not overflow its box`).toBeLessThanOrEqual(0);
            expect(row.rightOfSidebar, `${resource.resource} row ends inside the sidebar`).toBeLessThanOrEqual(0);
         }
         expect(resource.sidebarOverflow, `${resource.resource} does not widen the sidebar`).toBeLessThanOrEqual(0);
      }
   });
});
