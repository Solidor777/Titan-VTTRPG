import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { collectLocalizationOffenders, login, openSheetByUuid, renderSheet } from './fixtures.js';
import {
   addEffect,
   createActor,
   createWorldItem,
   openSidebarTab,
   pickPortrait,
   shared,
   sharedUuid,
} from './flows.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { getSetting, setClientSetting } from './settings.js';
import { attachPageErrors, closeAllApps, reloadWorld, waitForAnimations } from './world.js';

/**
 * Every surface a user opens renders on a document a flow made: no uncaught page error, no `LOCAL.` text (a missing or
 * double-localized key) on any sheet, spell tab, check dialog or the effect tray; the sheet layouts that once
 * collapsed; the portrait pick through Foundry's own file picker; the Edit Unique ID dialog; opening a sheet from the
 * directory.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

/** @type {string[]} The seven item subtypes; each is also the key of the shared world item of that type. */
const ITEM_TYPES = [
   'ability',
   'armor',
   'commodity',
   'equipment',
   'shield',
   'spell',
   'weapon',
];

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
 * Asserts that no text under a root element contains the `LOCAL.` namespace of an unresolved localization key.
 * @param {string} rootSelector - CSS selector of the root element to scan.
 * @param {string} what - What the root is, for the failure message.
 * @returns {Promise<void>} Resolves once the scan found nothing.
 */
async function expectNoLocalOffenders(rootSelector, what) {
   /** @type {string[]} The offending strings. */
   const offenders = await collectLocalizationOffenders(page, rootSelector);
   expect(offenders, `LOCAL. text on ${what}:\n${offenders.join('\n')}`).toEqual([]);
}

/**
 * Opens the first tab of a sheet. A document's sheet keeps the tab it last showed, so a shared fixture's sheet may
 * come up on another tab.
 * @param {import('@playwright/test').Locator} sheet - The open sheet.
 * @returns {Promise<void>} Resolves once the first tab's button has been clicked.
 */
async function showFirstTab(sheet) {
   await sheet.locator('.tab-list button').first().click();
}

test.describe('every sheet type renders without errors or LOCAL. text', () => {
   test('player actor sheet', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'player'), '.titan-player-sheet', errors);
      await showFirstTab(sheet);
      await expectNoLocalOffenders('.titan-player-sheet', 'the player sheet');
   });

   test('npc actor sheet', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'npc'), '.titan-npc-sheet', errors);
      await showFirstTab(sheet);
      await expectNoLocalOffenders('.titan-npc-sheet', 'the npc sheet');
   });

   for (const type of ITEM_TYPES) {
      test(`${type} item sheet, with its rarity label once in the header`, async () => {
         const sheet = await renderSheet(page, await sharedUuid(page, type), '.titan-item-sheet', errors);
         await showFirstTab(sheet);
         await expectNoLocalOffenders('.titan-item-sheet', `the ${type} sheet`);

         // Every item type shares ItemSheetRaritySelect, which carries its own label.
         await expect(sheet.locator('.header').getByText('Rarity', { exact: true }), `${type} header Rarity label`)
            .toHaveCount(1);
      });
   }

   test('effect sheet', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'effect'), '.titan-effect-sheet', errors);
      await showFirstTab(sheet);
      await expectNoLocalOffenders('.titan-effect-sheet', 'the effect sheet');
   });
});

test.describe('sheet layouts', () => {
   test('the weapon attacks tab renders its seeded attack', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'weapon'), '.titan-item-sheet', errors);
      expect(
         await page.evaluate(
            async (uuid) => (await fromUuid(uuid)).system.attack.length,
            await sharedUuid(page, 'weapon'),
         ),
         'the weapon seeds a default attack',
      ).toBe(1);
      await sheet.getByRole('button', {
         name: 'Attacks',
         exact: true,
      }).first().click();
      await expect(sheet.locator('.attack').first(), 'attack settings render').toBeVisible();
   });

   test('the item description editor mounts toggled and fills the tab', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'ability'), '.titan-item-sheet', errors);

      // The description is the ability sheet's first tab.
      await showFirstTab(sheet);
      /** @type {import('@playwright/test').Locator} The editor element. */
      const editor = page.locator('.titan-item-sheet prose-mirror');
      await expect(editor, 'prose-mirror element present on the description tab').toBeVisible();
      await expect(editor, 'editor mounted in toggled mode').toHaveAttribute('toggled', '');
      await expect(editor.locator('button.toggle, button .fa-edit').first(), 'toggled editor exposes the edit button')
         .toBeAttached();
      expect(
         Math.round((await editor.boundingBox()).height),
         'editor fills the tab (px)',
      ).toBeGreaterThan(200);
   });

   test('the effect sheet body is not collapsed to the tab strip', async () => {
      await renderSheet(page, await sharedUuid(page, 'effect'), '.titan-effect-sheet', errors);

      // The sheet mounts before it finishes sizing; the body is measured once it has settled.
      await waitForAnimations(page, '.titan-effect-sheet');
      const bodyHeight = await page.evaluate(() => {
         const body = document.querySelector('.titan-effect-sheet .titan-sheet > .body');
         return body ? Math.round(body.getBoundingClientRect().height) : -1;
      });
      expect(bodyHeight, 'effect sheet body (tab content) height in px').toBeGreaterThan(200);
   });

   test('the effect sheet shows a description typed in the editor in the inactive view', async () => {
      // A per-test actor and effect: the description is typed into the editor and saved, so the shared effects stay
      // as they are.
      /** @type {string} The id of the effect's host actor. */
      const hostId = await createActor(page, {
         name: `E2E Described Host ${Date.now()}`,
         type: 'player',
      });
      /** @type {string} The new effect's id. */
      const effectId = await addEffect(page, hostId, `E2E Described Effect ${Date.now()}`);
      const sheet = await openSheetByUuid(page, `Actor.${hostId}.ActiveEffect.${effectId}`);

      /** @type {import('@playwright/test').Locator} The description editor element. */
      const editor = sheet.locator('prose-mirror');
      await editor.hover();
      await editor.locator('button.toggle').click();
      await editor.locator('[contenteditable="true"]').click();
      await page.keyboard.type('Blessed by the sun.');
      await editor.locator('[data-action="save"]').click();
      await expect(editor.locator('.editor-content'), 'inactive editor view shows the description')
         .toHaveText('Blessed by the sun.');
      await expect(editor).toHaveClass(/inactive/);
   });

   test('the spells tab renders a spell row with a custom trait', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'roller'), '.titan-player-sheet', errors);
      await clickSheetTab(sheet, 'Spells');
      await expect(sheet.locator('[data-item-id]', { hasText: 'E2E Shared Spell' })).toBeVisible();
   });
});

test.describe('spell surfaces', () => {
   test('the spell sheet sidebar labels the aspect resistance', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'spell'), '.titan-item-sheet', errors);
      const tag = sheet.locator('.labeled-stat .value .tag.resilience');
      await expect(tag).toBeVisible();
      await expect(tag).toHaveText('Resilience');
   });

   test('every spell tab shows no LOCAL. text with range, duration and inflict-condition aspects', async () => {
      const sheet = await renderSheet(page, await sharedUuid(page, 'spell'), '.titan-item-sheet', errors);
      const tabButtons = sheet.locator('.tab-list button');
      const tabCount = await tabButtons.count();
      expect(tabCount, 'the spell sheet has tabs').toBeGreaterThan(1);
      for (let index = 0; index < tabCount; index++) {
         await tabButtons.nth(index).click();
         await expectNoLocalOffenders('.titan-item-sheet', `spell sheet tab ${index}`);
      }
   });
});

test.describe('check-options dialogs', () => {
   /** @type {string} The getCheckOptions value before the tests. */
   let priorOptions;

   test.beforeAll(async () => {
      priorOptions = await getSetting(page, 'getCheckOptions');
      await setClientSetting(page, 'getCheckOptions', 'always');
   });

   test.afterAll(async () => {
      await setClientSetting(page, 'getCheckOptions', priorOptions);
   });

   test('every check type opens its options dialog without LOCAL. text', async () => {
      /** @type {string} The roller actor's uuid; it owns a weapon, a spell and an ability with a check. */
      const rollerUuid = await sharedUuid(page, 'roller');

      /** @type {{id: string, type: string}[]} The roller's owned items. */
      const items = await page.evaluate(async (uuid) => (await fromUuid(uuid)).items.map((item) => ({
         id: item.id,
         type: item.type,
      })), rollerUuid);

      /** @type {Record<string, () => Promise<void>>} What a user clicks to open each check type's dialog. */
      const opens = {
         attribute: async () => {
            await (await renderSheet(page, rollerUuid, '.titan-player-sheet', errors))
               .getByRole('button', {
                  name: 'Body',
                  exact: true,
               }).first().click();
         },
         resistance: async () => {
            await (await renderSheet(page, rollerUuid, '.titan-player-sheet', errors))
               .getByRole('button', {
                  name: 'Resilience',
                  exact: true,
               }).first().click();
         },
         item: async () => {
            const sheet = await openSheetByUuid(
               page,
               `${rollerUuid}.Item.${items.find((item) => item.type === 'ability').id}`,
            );
            await sheet.getByRole('button', { name: /^\d+:\d+ / }).first().click();
         },
         casting: async () => {
            const sheet = await openSheetByUuid(
               page,
               `${rollerUuid}.Item.${items.find((item) => item.type === 'spell').id}`,
            );
            await sheet.getByRole('button', { name: /^\d+:\d+ / }).first().click();
         },
         attack: async () => {
            const sheet = await openSheetByUuid(
               page,
               `${rollerUuid}.Item.${items.find((item) => item.type === 'weapon').id}`,
            );
            await clickSheetTab(sheet, 'Attacks');
            await sheet.locator('.attack .check-button button').first().click();
         },
      };

      /** @type {Record<string, string[]>} The offending strings found in each dialog. */
      const offendersByDialog = {};
      for (const [type, open] of Object.entries(opens)) {
         await open();
         await expect(page.locator(`.titan-dialog[id^="titan-${type}-check-dialog-"]`)).toBeVisible();
         offendersByDialog[type] = await collectLocalizationOffenders(page, '.titan-dialog');
         await closeAllApps(page);
      }
      for (const [type, offenders] of Object.entries(offendersByDialog)) {
         expect(offenders, `LOCAL. text in the ${type} check dialog:\n${offenders.join('\n')}`).toEqual([]);
      }
   });
});

test.describe('the effect tray', () => {
   test('the header, rows and a row context menu show no LOCAL. text', async () => {
      /** @type {string} The tray pack's collection id; the pack holds one effect. */
      const packId = await shared(page, 'trayPack');
      await openSidebarTab(page, 'titanEffects');
      await page.locator('[data-testid="effect-tray-pack-select"]').selectOption(packId);
      await expect(page.locator('[data-testid="effect-tray-row"]').first()).toBeVisible();
      await expectNoLocalOffenders('[data-testid="effect-tray"]', 'the effect tray');

      await page.locator('[data-testid="effect-tray-row"]').first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      await expectNoLocalOffenders('#context-menu', 'the effect row context menu');
   });
});

test.describe('portrait pick through the file picker', () => {
   /** @type {string} The file every pick ends on, in `icons/svg/`. */
   const PICKED_FILE = 'mystery-man.svg';

   /** @type {string} The file of the first pick, so the final pick is a change. */
   const FIRST_FILE = 'book.svg';

   /** @type {string} The stored path of the final pick. */
   const PICKED = `icons/svg/${PICKED_FILE}`;

   /**
    * Reads a document's stored (source) image.
    * @param {string} uuid - The document's uuid.
    * @returns {Promise<string>} The stored image path.
    */
   const storedImage = (uuid) => page.evaluate(async (uuid) => (await fromUuid(uuid))._source.img, uuid);

   /**
    * Picks two portraits through the open sheet's portrait button and checks that the last one survives a reload.
    * @param {string} uuid - The uuid of the document whose sheet is open.
    * @param {import('@playwright/test').Locator} sheet - The open sheet.
    * @returns {Promise<void>} Resolves once the reloaded world holds the portrait.
    */
   async function pickAndReload(uuid, sheet) {
      await pickPortrait(page, sheet, FIRST_FILE);
      await expect.poll(() => storedImage(uuid), { message: 'the first pick was stored' })
         .toBe(`icons/svg/${FIRST_FILE}`);
      await pickPortrait(page, sheet, PICKED_FILE);

      // Persisted, not merely assigned in memory.
      await expect.poll(() => storedImage(uuid), { message: 'the pick was stored' }).toBe(PICKED);
      await reloadWorld(page);
      expect(await storedImage(uuid), 'the pick survives a reload').toBe(PICKED);
   }

   test('a character sheet portrait pick persists across a reload', async () => {
      test.setTimeout(120_000);
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: `E2E Portrait Player ${Date.now()}`,
         type: 'player',
      });
      const sheet = await openSheetByUuid(page, `Actor.${actorId}`);
      await pickAndReload(`Actor.${actorId}`, sheet);
   });

   test('an item sheet portrait pick persists across a reload', async () => {
      test.setTimeout(120_000);
      /** @type {string} The new item's id. */
      const itemId = await createWorldItem(page, {
         name: `E2E Portrait Weapon ${Date.now()}`,
         type: 'weapon',
      });
      const sheet = await openSheetByUuid(page, `Item.${itemId}`);
      await pickAndReload(`Item.${itemId}`, sheet);
   });
});

test.describe('the sidebar directory', () => {
   test('a double-click on a directory entry opens the actor sheet', async () => {
      /** @type {string} The shared player's id. */
      const actorId = await shared(page, 'player');
      const panel = await openSidebarTab(page, 'actors');
      await panel.locator(`.directory-item.entry[data-entry-id="${actorId}"]`).dblclick();
      await expect(page.locator(`.application.titan-player-sheet[id$="Actor-${actorId}"]`)).toBeVisible();
   });

   test('the Edit Unique ID dialog stores the entered id', async () => {
      // A per-test actor: the dialog changes the stored id.
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: `E2E Uuid Actor ${Date.now()}`,
         type: 'player',
      });
      const panel = await openSidebarTab(page, 'actors');
      await panel.locator(`.directory-item.entry[data-entry-id="${actorId}"]`).click({ button: 'right' });
      await chooseContextMenuEntry(
         page,
         page.locator('#context-menu li.context-item', { hasText: 'Edit Unique ID' }).first(),
      );

      /** @type {import('@playwright/test').Locator} The Edit Unique ID dialog. */
      const dialog = page.locator(`[id^="edit-uuid-dialog-${actorId}"]`);
      await expect(dialog).toBeVisible();
      await dialog.locator('textarea').fill('e2e-edited-unique-id');
      await dialog.getByRole('button', { name: 'Apply Edits' }).click();
      await expect(dialog).toHaveCount(0);
      await expect.poll(
         () => page.evaluate((id) => game.actors.get(id).flags.titan?.uuid, actorId),
         { message: 'the dialog stored the unique id' },
      ).toBe('e2e-edited-unique-id');
   });
});
