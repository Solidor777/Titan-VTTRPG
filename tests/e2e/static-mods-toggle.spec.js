import { expect, test } from './harness.js';
import { commitText } from './actions.js';
import { login, openSheetByUuid, openSheetTab } from './fixtures.js';
import {
   createActor,
   placeToken,
   readServerSystem,
   setOwnership,
   setStaticModsShown,
   shared,
   unlinkPlacedToken,
   viewScene,
} from './flows.js';
import { withClients } from './multiClient.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { MODS } from '~/system/Mods.js';
import { RATINGS } from '~/system/Ratings.js';
import { RESOURCES } from '~/system/Resources.js';
import { SKILLS } from '~/system/Skills.js';
import { SPEEDS } from '~/system/Speeds.js';

/**
 * The Static Mods header button: its pressed state, its icon, its size against the Edit Token button, the flag it
 * stores and its persistence across sheet reopenings, on Player and NPC sheets. Every actor is made through the
 * Actors tab.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads the Static Mods flag of an actor from the server-side data.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @param {string} uuid - The uuid of the actor.
 * @returns {Promise<boolean | undefined>} The stored flag, or undefined when none is stored.
 */
async function readFlag(page, uuid) {
   return page.evaluate(async (uuid) => (await fromUuid(uuid)).flags.titan?.showStaticMods, uuid);
}

/**
 * Asserts that the Static Mods button is as wide and as tall as the Edit Token button, within 1px.
 * @param {import('@playwright/test').Locator} sheet - The open sheet's window element.
 * @returns {Promise<void>} Resolves once the boxes are measured and compared.
 */
async function expectSameBoxAsEditToken(sheet) {
   /** @type {import('@playwright/test').Locator} The Static Mods button. */
   const button = sheet.locator('.window-header .static-mods-button');

   /** @type {import('@playwright/test').Locator} The Edit Token button. */
   const editToken = sheet.locator('.window-header .edit-token-button');

   /** @type {{width: number, height: number}} The Static Mods button's box. */
   const buttonBox = await button.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return {
         width,
         height,
      };
   });

   /** @type {{width: number, height: number}} The Edit Token button's box. */
   const editBox = await editToken.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return {
         width,
         height,
      };
   });
   expect(Math.abs(buttonBox.width - editBox.width)).toBeLessThanOrEqual(1);
   expect(Math.abs(buttonBox.height - editBox.height)).toBeLessThanOrEqual(1);
}

test.describe('the Static Mods header button', () => {
   test('a new player starts hidden: pressed false, slashed icon, no flag stored', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 1',
         type: 'player',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, uuid);

      /** @type {import('@playwright/test').Locator} The Static Mods button. */
      const button = sheet.locator('.window-header .static-mods-button');
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button.locator('i.fa-plus-minus')).toHaveCount(1);
      await expect(button.locator('i.fa-slash')).toHaveCount(1);
      expect(await readFlag(page, uuid)).toBeUndefined();
   });

   test('pressing it shows the inputs: pressed true, slash gone, flag true, button as big as Edit Token', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 2',
         type: 'player',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, uuid);

      /** @type {import('@playwright/test').Locator} The Static Mods button. */
      const button = sheet.locator('.window-header .static-mods-button');
      await expectSameBoxAsEditToken(sheet);
      await setStaticModsShown(sheet, true);
      await expect(button.locator('i.fa-plus-minus')).toHaveCount(1);
      await expect(button.locator('i.fa-slash')).toHaveCount(0);
      await expect.poll(() => readFlag(page, uuid), { message: 'the flag is stored' }).toBe(true);
      await expectSameBoxAsEditToken(sheet);
   });

   test('the setting survives closing and reopening the sheet', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 3',
         type: 'player',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      let sheet = await openSheetByUuid(page, uuid);
      await setStaticModsShown(sheet, true);
      await closeAllApps(page);
      sheet = await openSheetByUuid(page, uuid);
      await expect(sheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'true');

      await setStaticModsShown(sheet, false);
      await closeAllApps(page);
      sheet = await openSheetByUuid(page, uuid);
      await expect(sheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'false');
      expect(await readFlag(page, uuid)).toBe(false);
   });

   test('an NPC sheet has the same button and stores the same flag', async () => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods 4',
         type: 'npc',
      });

      /** @type {string} The new actor's uuid. */
      const uuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, uuid);
      await setStaticModsShown(sheet, true);
      await expect.poll(() => readFlag(page, uuid), { message: 'the flag is stored' }).toBe(true);
      await expect(sheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'true');
   });
});

test.describe('the sidebar', () => {
   /** @type {string[]} The test ids of every sidebar static mod input: 3 Resources, 5 Ratings, 1 Mod and 5 Speeds. */
   const sidebarModIds = [
      ...RESOURCES.map((resource) => `sheet-resource-${resource}-mod`),
      ...RATINGS.map((rating) => `sheet-rating-${rating}-mod`),
      ...MODS.filter((mod) => mod === 'armor').map((mod) => `sheet-mod-${mod}-mod`),
      ...SPEEDS.map((speed) => `sheet-speed-${speed}-mod`),
   ];

   /** @type {string[]} The test ids of every sidebar total, which shows in both states. */
   const sidebarTotalIds = [
      ...RESOURCES.map((resource) => `sheet-resource-${resource}-max`),
      ...RATINGS.map((rating) => `sheet-rating-${rating}`),
      'sheet-mod-armor',
      ...SPEEDS.map((speed) => `sheet-speed-${speed}`),
   ];

   /** @type {string} The uuid of the actor measured by the sidebar tests. */
   let uuid;
   /** @type {import('@playwright/test').Locator} The actor's open sheet. */
   let sheet;

   test.beforeAll(async () => {
      uuid = `Actor.${await createActor(page, {
         name: 'E2E Static Mods Sidebar',
         type: 'player',
      })}`;
   });

   test.beforeEach(async () => {
      sheet = await openSheetByUuid(page, uuid);
   });

   /**
    * Measures the sidebar: the width of its inner column, and the heights of its sections and of each Resource, Rating,
    * Mod and Speed container.
    * @returns {Promise<{width: number, sections: number[], containers: number[]}>} The rounded width and the heights.
    */
   function measureSidebar() {
      return sheet.evaluate((element) => {
         /** @type {Element} The sidebar column that sizes itself from the sidebar width. */
         const column = element.querySelector('.titan-sheet > .sidebar > .sidebar');
         return {
            width: Math.round(column.getBoundingClientRect().width),
            sections: [...element.querySelectorAll('.titan-sheet > .sidebar .section')]
               .map((section) => section.getBoundingClientRect().height),
            containers: [...element.querySelectorAll('.titan-sheet > .sidebar .section .container')]
               .map((container) => container.getBoundingClientRect().height),
            resourceLabelRows: [
               ...element.querySelectorAll('.titan-sheet > .sidebar .section .container > .row:first-child'),
            ].map((row) => row.getBoundingClientRect().height),
         };
      });
   }

   /**
    * Reads the text of every sidebar row that holds a Resource, Rating, Mod or Speed total.
    * @returns {Promise<{speeds: string[], others: string[]}>} The text of the Speed rows and of all the other rows.
    */
   function readSymbolRows() {
      return sheet.evaluate((element) => {
         /** @type {Element[]} Every sidebar stat container. */
         const containers = [...element.querySelectorAll('.titan-sheet > .sidebar .section .container')];

         /**
          * Tells whether a sidebar stat container is a Speed.
          * @param {Element} container - The container to test.
          * @returns {boolean} True for a Speed container.
          */
         const isSpeed = (container) => container.querySelector('[data-testid^="sheet-speed-"]') !== null;
         return {
            speeds: containers.filter(isSpeed).map((container) => container.textContent),
            others: containers.filter((container) => !isSpeed(container)).map((container) => container.textContent),
         };
      });
   }

   test('hidden: no sidebar static mod input exists and every total is still shown', async () => {
      await setStaticModsShown(sheet, false);
      for (const id of sidebarModIds) {
         await expect(sheet.getByTestId(id), id).toHaveCount(0);
      }
      for (const id of sidebarTotalIds) {
         await expect(sheet.getByTestId(id), id).toBeVisible();
      }

      /** @type {Awaited<ReturnType<typeof readSymbolRows>>} The text of the hidden sidebar rows. */
      const rows = await readSymbolRows();
      expect(rows.others.length).toBeGreaterThan(0);
      expect(rows.speeds.length).toBeGreaterThan(0);
      for (const text of rows.others) {
         expect(text, 'a Resource, Rating or Mod row has no + or = symbol').not.toMatch(/[+=]/);
      }
      for (const text of rows.speeds) {
         expect(text, 'a Speed row has no + symbol').not.toContain('+');
         expect(text, 'a Speed row keeps its = symbol').toContain('=');
      }
   });

   test('shown: every sidebar static mod input exists (3 resources, 5 ratings, 1 mod, 5 speeds)', async () => {
      await setStaticModsShown(sheet, true);
      for (const id of sidebarModIds) {
         await expect(sheet.getByTestId(id), id).toHaveCount(1);
      }
      expect(sidebarModIds).toHaveLength(14);
   });

   test('the sidebar is 184px wide hidden and 208px shown', async () => {
      await setStaticModsShown(sheet, false);
      await expect.poll(async () => (await measureSidebar()).width, { message: 'hidden width' }).toBe(184);
      await setStaticModsShown(sheet, true);
      await expect.poll(async () => (await measureSidebar()).width, { message: 'shown width' }).toBe(208);
   });

   test('toggling does not change any sidebar row height', async () => {
      await setStaticModsShown(sheet, false);
      await expect(sheet.getByTestId('sheet-rating-defense-mod')).toHaveCount(0);

      /** @type {Awaited<ReturnType<typeof measureSidebar>>} The sidebar measured hidden. */
      const hidden = await measureSidebar();
      await setStaticModsShown(sheet, true);
      await expect(sheet.getByTestId('sheet-rating-defense-mod')).toHaveCount(1);

      /** @type {Awaited<ReturnType<typeof measureSidebar>>} The sidebar measured shown. */
      const shown = await measureSidebar();
      expect(hidden.sections.length).toBeGreaterThan(0);
      expect(hidden.containers.length).toBeGreaterThan(0);
      expect(hidden.resourceLabelRows.length).toBeGreaterThan(0);
      expect(shown.sections).toHaveLength(hidden.sections.length);
      expect(shown.containers).toHaveLength(hidden.containers.length);
      expect(shown.resourceLabelRows).toHaveLength(hidden.resourceLabelRows.length);
      for (const [index, height] of hidden.resourceLabelRows.entries()) {
         expect(Math.abs(shown.resourceLabelRows[index] - height), `label row ${index} height`).toBeLessThanOrEqual(1);
      }
      for (const [index, height] of hidden.sections.entries()) {
         expect(Math.abs(shown.sections[index] - height), `section ${index} height`).toBeLessThanOrEqual(1);
      }
      for (const [index, height] of hidden.containers.entries()) {
         expect(Math.abs(shown.containers[index] - height), `container ${index} height`).toBeLessThanOrEqual(1);
      }
   });

   test('a typed static mod still counts while hidden', async () => {
      await setStaticModsShown(sheet, true);

      /** @type {import('@playwright/test').Locator} The Defense total. */
      const total = sheet.getByTestId('sheet-rating-defense');

      /** @type {number} The Defense total before the static mod is typed. */
      const before = Number(await total.textContent());

      /** @type {number} The stored Defense static mod before the test types one. */
      const original = (await readServerSystem(page, uuid)).rating.defense.mod.static;
      try {
         await commitText(sheet.getByTestId('sheet-rating-defense-mod'), '2');
         await expect(total).toHaveText(String(before + 2 - original));
         await expect.poll(
            async () => (await readServerSystem(page, uuid)).rating.defense.mod.static,
            { message: 'the static mod is stored' },
         ).toBe(2);
         await setStaticModsShown(sheet, false);
         await expect(sheet.getByTestId('sheet-rating-defense-mod')).toHaveCount(0);
         await expect(total).toHaveText(String(before + 2 - original));
         expect((await readServerSystem(page, uuid)).rating.defense.mod.static).toBe(2);
      } finally {
         await setStaticModsShown(sheet, true);
         await commitText(sheet.getByTestId('sheet-rating-defense-mod'), String(original));
         await expect.poll(
            async () => (await readServerSystem(page, uuid)).rating.defense.mod.static,
            { message: 'the static mod is restored' },
         ).toBe(original);
      }
   });
});

test.describe('the header', () => {
   /** @type {string[]} The attributes with a header check button. */
   const attributes = [
      'body',
      'mind',
      'soul',
   ];

   /** @type {string[]} The resistances with a header check button. */
   const resistances = [
      'reflexes',
      'resilience',
      'willpower',
   ];

   /** @type {string[]} The test ids of the six header static mod inputs. */
   const headerModIds = [
      ...attributes.map((attribute) => `sheet-attribute-${attribute}-mod`),
      ...resistances.map((resistance) => `sheet-resistance-${resistance}-mod`),
   ];

   /** @type {string[]} The test ids of the six header totals, which show in both states. */
   const headerTotalIds = [
      ...attributes.map((attribute) => `sheet-attribute-${attribute}`),
      ...resistances.map((resistance) => `sheet-resistance-${resistance}`),
   ];

   /** @type {string} The uuid of the actor measured by the header tests. */
   let uuid;
   /** @type {import('@playwright/test').Locator} The actor's open sheet. */
   let sheet;

   test.beforeAll(async () => {
      uuid = `Actor.${await createActor(page, {
         name: 'E2E Static Mods Header',
         type: 'player',
      })}`;
   });

   test.beforeEach(async () => {
      sheet = await openSheetByUuid(page, uuid);
   });

   /**
    * Measures the width of each header check button: the three Attribute buttons, then the three Resistance buttons.
    * @returns {Promise<number[]>} The six button widths.
    */
   function measureCheckButtons() {
      return sheet.evaluate((element, selectors) => selectors.map((selector) => {
         /** @type {Element | null} The check button. */
         const button = element.querySelector(selector);
         return button === null ? -1 : button.getBoundingClientRect().width;
      }), [
         ...attributes.map((attribute) => `.container:has(> .button > button.${attribute}) .button button`),
         ...resistances.map((resistance) => `.container[data-resistance="${resistance}"] .button button`),
      ]);
   }

   test('hidden: the Attribute and Resistance static mod inputs are gone, totals and bases remain', async () => {
      await setStaticModsShown(sheet, false);
      for (const id of headerModIds) {
         await expect(sheet.getByTestId(id), id).toHaveCount(0);
      }
      for (const id of headerTotalIds) {
         await expect(sheet.getByTestId(id), id).toBeVisible();
      }

      /** @type {string[]} The text of each Attribute and Resistance stats group. */
      const statTexts = await sheet.evaluate((element, selectors) => selectors.map((selector) => {
         /** @type {Element | null} The stats group. */
         const stats = element.querySelector(selector);
         return stats === null ? null : stats.textContent;
      }), [
         ...attributes.map((attribute) => `.container:has(> .button > button.${attribute}) .stats`),
         ...resistances.map((resistance) => `.container[data-resistance="${resistance}"] .stats`),
      ]);
      expect(statTexts).toHaveLength(6);
      for (const text of statTexts) {
         expect(text, 'an Attribute or Resistance stats group exists').not.toBeNull();
         expect(text, 'the + is gone').not.toContain('+');
         expect(text, 'the = is kept').toContain('=');
      }
   });

   test('shown: all six header static mod inputs exist', async () => {
      await setStaticModsShown(sheet, true);
      for (const id of headerModIds) {
         await expect(sheet.getByTestId(id), id).toHaveCount(1);
      }
   });

   test('each header check button is wider hidden than shown', async () => {
      await setStaticModsShown(sheet, true);
      await expect(sheet.getByTestId('sheet-attribute-body-mod')).toHaveCount(1);

      /** @type {number[]} The button widths while shown. */
      const shown = await measureCheckButtons();
      await setStaticModsShown(sheet, false);
      await expect(sheet.getByTestId('sheet-attribute-body-mod')).toHaveCount(0);

      /** @type {number[]} The button widths while hidden. */
      const hidden = await measureCheckButtons();
      expect(shown).toHaveLength(6);
      for (const [index, width] of shown.entries()) {
         expect(width, `button ${index} exists`).toBeGreaterThan(0);
         expect(hidden[index] - width, `button ${index} growth`).toBeGreaterThan(40);
      }
   });
});

test.describe('the Skills tab', () => {
   /** @type {string} The uuid of the actor measured by the Skills tests. */
   let uuid;
   /** @type {import('@playwright/test').Locator} The actor's open sheet. */
   let sheet;

   test.beforeAll(async () => {
      uuid = `Actor.${await createActor(page, {
         name: 'E2E Static Mods Skills',
         type: 'player',
      })}`;
   });

   test.beforeEach(async () => {
      sheet = await openSheetByUuid(page, uuid);
      await openSheetTab(page, 'Skills');
      await expect(sheet.locator('.skill').first()).toBeVisible();
   });

   /**
    * Measures the Skills tab geometry: the skill name column, the content widths and the track of the stat groups of
    * the first row, and its minimum width.
    * @returns {Promise<{nameColumn: number, statWidths: number[], statTrack: number, rowMinWidth: string}>} The
    * measured values.
    */
   function measureSkills() {
      return sheet.evaluate((element) => {
         /** @type {Element} The first skill row. */
         const row = element.querySelector('.skill');

         /** @type {Element[]} The Training and Expertise groups of the first row. */
         const stats = [...row.querySelectorAll('.stats .stat')];
         return {
            nameColumn: element.querySelector('.skill-tab .head-name').getBoundingClientRect().width,
            statWidths: stats.map((stat) => {
               // Content width: the border box minus the divider's left border and the padding, which is what the 76
               // and 124 px group widths measure (the border box is 87 hidden and 135 shown).
               /** @type {CSSStyleDeclaration} The stat group's computed style. */
               const style = globalThis.getComputedStyle(stat);
               return stat.getBoundingClientRect().width - parseFloat(style.borderLeftWidth)
                  - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            }),
            statTrack: stats[1].getBoundingClientRect().left - stats[0].getBoundingClientRect().left,
            rowMinWidth: globalThis.getComputedStyle(row).minWidth,
         };
      });
   }

   test('hidden: no Training or Expertise mod input exists in any of the 18 skill rows, no Mod label', async () => {
      await setStaticModsShown(sheet, false);
      for (const skill of SKILLS) {
         await expect(sheet.getByTestId(`sheet-skill-${skill}-training-mod`), skill).toHaveCount(0);
         await expect(sheet.getByTestId(`sheet-skill-${skill}-expertise-mod`), skill).toHaveCount(0);
         await expect(sheet.getByTestId(`sheet-skill-${skill}-training`), skill).toBeVisible();
         await expect(sheet.getByTestId(`sheet-skill-${skill}-expertise`), skill).toBeVisible();
      }
      expect(await sheet.locator('.skill-tab .head-sub span').allTextContents()).toEqual([
         'Base',
         'Total',
         'Base',
         'Total',
      ]);
   });

   test('shown: all 36 skill mod inputs exist and the header has Base, Mod and Total twice', async () => {
      await setStaticModsShown(sheet, true);
      for (const skill of SKILLS) {
         await expect(sheet.getByTestId(`sheet-skill-${skill}-training-mod`), skill).toHaveCount(1);
         await expect(sheet.getByTestId(`sheet-skill-${skill}-expertise-mod`), skill).toHaveCount(1);
      }
      expect(SKILLS).toHaveLength(18);
      expect(await sheet.locator('.skill-tab .head-sub span').allTextContents()).toEqual([
         'Base',
         'Mod',
         'Total',
         'Base',
         'Mod',
         'Total',
      ]);
   });

   test('hidden skill geometry: name column 300, stat 76, entry minimum 495; shown 195, 124, 591', async () => {
      await setStaticModsShown(sheet, false);
      await expect(sheet.getByTestId('sheet-skill-arcana-training-mod')).toHaveCount(0);

      /** @type {Awaited<ReturnType<typeof measureSkills>>} The Skills tab measured hidden. */
      const hidden = await measureSkills();
      expect(hidden.nameColumn, 'hidden name column').toBe(300);
      expect(hidden.statWidths, 'hidden stat widths').toEqual([
         76,
         76,
      ]);
      expect(hidden.statTrack, 'hidden stat track').toBe(97);
      expect(hidden.rowMinWidth, 'hidden entry minimum').toBe('495px');
      await setStaticModsShown(sheet, true);
      await expect(sheet.getByTestId('sheet-skill-arcana-training-mod')).toHaveCount(1);

      /** @type {Awaited<ReturnType<typeof measureSkills>>} The Skills tab measured shown. */
      const shown = await measureSkills();
      expect(shown.nameColumn, 'shown name column').toBe(195);
      expect(shown.statWidths, 'shown stat widths').toEqual([
         124,
         124,
      ]);
      expect(shown.statTrack, 'shown stat track').toBe(145);
      expect(shown.rowMinWidth, 'shown entry minimum').toBe('591px');
   });
});

test.describe('who sees and uses the button', () => {
   test('an Observer sees the effect but no button; an Owner sees the button; a toggle reaches the other client',
      async ({ browser }) => {
         /** @type {string} The new actor's id. */
         const actorId = await createActor(page, {
            name: 'E2E Static Mods Observer',
            type: 'player',
         });

         /** @type {string} The new actor's uuid. */
         const uuid = `Actor.${actorId}`;

         /**
          * Gives E2E Player 1 an ownership level of the actor and waits until the player's client holds it.
          * @param {import('@playwright/test').Page} playerPage - The logged-in client of E2E Player 1.
          * @param {'OBSERVER'|'OWNER'} level - The level to give.
          * @returns {Promise<void>} Resolves once the player's client resolves that level.
          */
         async function giveLevel(playerPage, level) {
            await setOwnership(page, actorId, 'E2E Player 1', level);
            await playerPage.waitForFunction(
               ({ actorId, level }) => game.actors.get(actorId)?.getUserLevel(game.user)
                  === CONST.DOCUMENT_OWNERSHIP_LEVELS[level],
               {
                  actorId,
                  level,
               },
               { timeout: 1000 },
            );
         }

         await withClients(browser, { player: 'E2E Player 1' }, async ({ player }) => {
            await giveLevel(player, 'OBSERVER');

            /** @type {import('@playwright/test').Locator} The player's view of the sheet. */
            const playerSheet = await openSheetByUuid(player, uuid);

            /** @type {import('@playwright/test').Locator} The GM's view of the sheet. */
            const gmSheet = await openSheetByUuid(page, uuid);
            await expect(playerSheet.locator('.window-header .static-mods-button'), 'an Observer has no button')
               .toHaveCount(0);
            await setStaticModsShown(gmSheet, true);

            /** @type {import('@playwright/test').Locator} The Defense static mod input on the player's sheet. */
            const playerInput = playerSheet.getByTestId('sheet-rating-defense-mod');
            await expect(playerInput, 'the effect reaches the Observer without a reload').toBeVisible();
            await expect(playerInput, 'the Observer cannot edit it').toBeDisabled();
            await giveLevel(player, 'OWNER');

            /** @type {import('@playwright/test').Locator} The player's Static Mods button. */
            const playerButton = playerSheet.locator('.window-header .static-mods-button');
            await expect(playerButton, 'an Owner has the button').toHaveCount(1);
            await setStaticModsShown(playerSheet, false);
            await expect(gmSheet.locator('.window-header .static-mods-button'), 'the GM button follows')
               .toHaveAttribute('aria-pressed', 'false');
            await expect(gmSheet.getByTestId('sheet-rating-defense-mod'), 'the GM inputs follow').toHaveCount(0);
         });
      });
});

test.describe('an unlinked token', () => {
   test('its sheet keeps its own setting and leaves the base actor alone', async () => {
      /** @type {string} The shared scene's id. */
      const sceneId = await shared(page, 'scene');
      await viewScene(page, sceneId);

      /** @type {string} The new base actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Static Mods Token Actor',
         type: 'player',
      });

      /** @type {string} The placed token's id. */
      const tokenId = await placeToken(page, actorId);
      await unlinkPlacedToken(page, tokenId);

      /** @type {string} The uuid of the token's synthetic actor. */
      const tokenActorUuid = await page.evaluate(
         async (uuid) => (await fromUuid(uuid)).actor.uuid,
         `Scene.${sceneId}.Token.${tokenId}`,
      );

      /** @type {string} The uuid of the base actor. */
      const baseUuid = `Actor.${actorId}`;

      /** @type {import('@playwright/test').Locator} The token actor's sheet. */
      const tokenSheet = await openSheetByUuid(page, tokenActorUuid);

      await setStaticModsShown(tokenSheet, true);
      await expect.poll(() => readFlag(page, tokenActorUuid), { message: 'the token actor stores the flag' })
         .toBe(true);
      expect(await readFlag(page, baseUuid), 'the base actor stores no flag').toBeUndefined();

      /** @type {import('@playwright/test').Locator} The base actor's sheet, opened over the token actor's. */
      const baseSheet = await openSheetByUuid(page, baseUuid);
      await expect(baseSheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'false');
      await expect(tokenSheet.locator('.window-header .static-mods-button')).toHaveAttribute('aria-pressed', 'true');
   });
});
