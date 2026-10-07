import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addAttack,
   addCheck,
   addCustomAspect,
   addRulesElement,
   createActor,
   createWorldItem,
} from './flows.js';
import { clickSheetTab, clickTabButton, commitText, dragGrip } from './actions.js';
import { clickRoll } from './checkDialog.js';
import { selectTitanOption } from './select.js';
import { settle } from './settle.js';
import { setWorldSetting } from './settings.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The contract of the action helpers: each returns only after the document operations, renders and (for the helpers
 * that add or move a row, switch a tab or change a choice) window transitions its action started have finished
 * (`settle.js`), so the caller's next action cannot land before the re-render of the previous one (CLOSED_BUGS #131).
 * Each test makes the documents it needs through the real flows (the suite's registry deletes them), brings the page
 * to rest, runs one helper and reads what is in flight in a single `evaluate` the moment the helper returns, with no
 * wait in between. The tests of `selectTitanOption`, `clickRoll`, `dragGrip` and `commitText` read the helper's
 * stored effect in the same `evaluate`. A last test types into two fields of a new row back to back and reads both
 * stored values (the shape of #122 and #128).
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
 * What nothing in flight reads as: no tracked operation or render, and no finite animation in an application window.
 * @type {{pending: number, animations: number}}
 */
const IDLE = {
   pending: 0,
   animations: 0,
};

/**
 * Names a document of the running test. The repeat index keeps the name unique when Playwright repeats the test
 * (`--repeat-each`), as the directory lookup of the create flows needs exactly one entry per name.
 * @param {string} name - The test's own name for the document.
 * @returns {string} The name with the repeat index.
 */
function documentName(name) {
   return `${name} ${test.info().repeatEachIndex}`;
}

/**
 * Makes a world item through the Items tab, as every test of this file needs its own documents.
 * @param {string} type - The item subtype (`weapon`, `spell`).
 * @param {string} name - The test's own name for the item, before the repeat index.
 * @returns {Promise<{id: string, uuid: string}>} The item's id and uuid.
 */
async function makeItem(type, name) {
   /** @type {string} The new item's id. */
   const id = await createWorldItem(page, {
      name: documentName(name),
      type,
   });
   return {
      id,
      uuid: `Item.${id}`,
   };
}

/**
 * Reads how many attacks a world weapon stores.
 * @param {string} id - The weapon's id.
 * @returns {Promise<number>} The number of stored attacks.
 */
function attackCount(id) {
   return page.evaluate((id) => game.items.get(id).system.attack.length, id);
}

/**
 * Waits until nothing is in flight, so what is in flight right after a helper returns comes from that helper alone.
 * @returns {Promise<void>} Resolves once the page is at rest.
 */
function rest() {
   return settle(page, { transitions: true });
}

/**
 * Reads what is in flight in the page right now, in one `evaluate`.
 * @returns {Promise<{pending: number, animations: number}>} The tracked operations and renders, and the finite
 * animations running inside application windows.
 */
function readInFlight() {
   return page.evaluate(() => ({
      pending: globalThis.titanPending,
      animations: globalThis.titanWindowTransitions(),
   }));
}

test.describe('an action helper returns with nothing in flight', () => {
   test('addAttack', async () => {
      const { uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon addAttack');
      await rest();
      await addAttack(page, uuid);
      expect(await readInFlight()).toEqual(IDLE);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('addRulesElement', async () => {
      const { uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon addRulesElement');
      await rest();
      await addRulesElement(page, uuid, {});
      expect(await readInFlight()).toEqual(IDLE);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('addCheck', async () => {
      const { uuid } = await makeItem('spell', 'E2E Action Helpers Spell addCheck');
      await rest();
      await addCheck(page, uuid);
      expect(await readInFlight()).toEqual(IDLE);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('addCustomAspect', async () => {
      const { uuid } = await makeItem('spell', 'E2E Action Helpers Spell addCustomAspect');
      await rest();
      await addCustomAspect(page, uuid);
      expect(await readInFlight()).toEqual(IDLE);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('clickSheetTab', async () => {
      const { uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon clickSheetTab');
      const sheet = await openSheetByUuid(page, uuid);
      await rest();
      await clickSheetTab(sheet, 'Rules Elements');
      expect(await readInFlight()).toEqual(IDLE);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('clickTabButton', async () => {
      const { uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon clickTabButton');
      const sheet = await openSheetByUuid(page, uuid);
      await rest();
      await clickTabButton(sheet.locator('.tab-list button').filter({ hasText: 'Rules Elements' }));
      expect(await readInFlight()).toEqual(IDLE);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('selectTitanOption', async () => {
      const { id, uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon selectTitanOption');
      await addRulesElement(page, uuid, {});
      const sheet = await openSheetByUuid(page, uuid);
      await rest();
      await selectTitanOption(
         page,
         sheet.locator('.rules-element').first().locator('.operation [role="combobox"]'),
         'conditionalCheckModifier',
      );

      /** @type {{operation: string, pending: number, animations: number}} The operation and what is in flight. */
      const read = await page.evaluate((id) => ({
         operation: game.items.get(id).system.rulesElement[0].operation,
         pending: globalThis.titanPending,
         animations: globalThis.titanWindowTransitions(),
      }), id);
      expect(read).toEqual({
         operation: 'conditionalCheckModifier',
         ...IDLE,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('clickRoll', async () => {
      const actorId = await createActor(page, {
         name: documentName('E2E Action Helpers Roller'),
         type: 'player',
      });
      await setWorldSetting(page, 'getCheckOptions', 'always');
      await page.evaluate(
         (actorId) => game.actors.get(actorId).system.requestAttributeCheck({ attribute: 'body' }),
         actorId,
      );

      /** @type {import('@playwright/test').Locator} The attribute check dialog the request opened. */
      const dialog = page.locator(`.application.titan-dialog[id^="titan-attribute-check-dialog-${actorId}"]`);
      await expect(dialog).toBeVisible();
      await rest();

      /** @type {number} The number of chat messages before the roll. */
      const baseline = await clickRoll(dialog, page);

      /** @type {{messages: number, pending: number, animations: number}} The chat messages and what is in flight. */
      const read = await page.evaluate(() => ({
         messages: game.messages.size,
         pending: globalThis.titanPending,
         animations: globalThis.titanWindowTransitions(),
      }));
      expect(read).toEqual({
         messages: baseline + 1,
         ...IDLE,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('dragGrip', async () => {
      const { id, uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon dragGrip');
      await addAttack(page, uuid);
      const sheet = await openSheetByUuid(page, uuid);
      await rest();

      /** @type {import('@playwright/test').Locator} The attack rows. */
      const rows = sheet.locator('li.reorder-row');
      await expect(rows).toHaveCount(await attackCount(id));

      /** @type {string[]} The attacks' uuids in stored order before the drag. */
      const before = await page.evaluate((id) => game.items.get(id).system.attack.map((attack) => attack.uuid), id);
      await dragGrip(rows.nth(0), rows.nth(1), 'bottom');

      /** @type {{order: string[], pending: number, animations: number}} The stored order and what is in flight. */
      const read = await page.evaluate((id) => ({
         order: game.items.get(id).system.attack.map((attack) => attack.uuid),
         pending: globalThis.titanPending,
         animations: globalThis.titanWindowTransitions(),
      }), id);
      expect(read).toEqual({
         order: [
            before[1],
            before[0],
         ],
         ...IDLE,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('commitText stores the typed value and leaves nothing in flight', async () => {
      const { id, uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon commitText');

      /** @type {number} The index the new attack gets. */
      const index = await attackCount(id);
      await addAttack(page, uuid);
      const sheet = await openSheetByUuid(page, uuid);
      await rest();
      await commitText(sheet.locator('li.reorder-row').nth(index).locator('.header .label input'), 'E2E Attack Label');

      /** @type {{label: string, pending: number, animations: number}} The stored label and what is in flight. */
      const read = await page.evaluate(({ id, index }) => ({
         label: game.items.get(id).system.attack[index].label,
         pending: globalThis.titanPending,
         animations: globalThis.titanWindowTransitions(),
      }), {
         id,
         index,
      });
      expect(read).toEqual({
         label: 'E2E Attack Label',
         ...IDLE,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('commitText twice in a row on the fields of a new row stores both values', async () => {
      const { id, uuid } = await makeItem('weapon', 'E2E Action Helpers Weapon commitText twice');

      /** @type {number} The index the new attack gets. */
      const index = await attackCount(id);
      await addAttack(page, uuid);
      const sheet = await openSheetByUuid(page, uuid);
      await rest();

      /** @type {import('@playwright/test').Locator} The new attack's row. */
      const row = sheet.locator('li.reorder-row').nth(index);
      await commitText(row.locator('.header .label input'), 'E2E Attack Label Twice');
      await commitText(row.locator('.field', { hasText: 'Damage' }).locator('input.titan-number-input'), 7);

      /** @type {{label: string, damage: number}} The stored values, read with no wait after the second commit. */
      const read = await page.evaluate(({ id, index }) => ({
         label: game.items.get(id).system.attack[index].label,
         damage: game.items.get(id).system.attack[index].damage,
      }), {
         id,
         index,
      });
      expect(read).toEqual({
         label: 'E2E Attack Label Twice',
         damage: 7,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
