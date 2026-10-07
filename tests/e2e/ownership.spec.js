import { expect, flushPageErrors, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import {
   addCheck,
   createActor,
   createOwnedItem,
   setAttributeBase,
   setOwnership,
} from './flows.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * What a player sees and can do on a character's sheet at each ownership level: an owner views and edits, an observer
 * views and reads every tab and row but edits nothing, a limited viewer is shown what the measured behaviour below
 * records, and the roll button of an item sheet shows only for the owner. One session: E2E GM 1 makes the character
 * and sets the level in the Configure Ownership window; E2E Player 1 opens the sheets.
 */

/** @type {import('@playwright/test').Page} The page of E2E GM 1, who makes the documents and sets the levels. */
let gm;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who opens the sheets. */
let player;
/** @type {string[]} Uncaught page errors collected on the first GM's page during the current test. */
let errors;
/** @type {string} The id of the character the player is given a level on. */
let actorId;
/** @type {string} The uuid of that character. */
let actorUuid;
/** @type {string} The uuid of the character's equipment, which carries one check. */
let equipmentUuid;

/**
 * Gives E2E Player 1 an ownership level of the character and waits until the player's client holds it.
 * @param {'NONE'|'LIMITED'|'OBSERVER'|'OWNER'} level - The level to give.
 * @returns {Promise<void>} Resolves once the player's client resolves that level.
 */
async function giveLevel(level) {
   await setOwnership(gm, actorId, 'E2E Player 1', level);
   await player.waitForFunction(
      ({ id, level }) => {
         const actor = game.actors.get(id);
         return actor?.getUserLevel(game.user) === CONST.DOCUMENT_OWNERSHIP_LEVELS[level];
      },
      {
         id: actorId,
         level,
      },
      { timeout: 1000 },
   );
}

/**
 * Counts the inputs and buttons of a sheet that a user can use.
 * @param {import('@playwright/test').Locator} sheet - The sheet's window.
 * @returns {Promise<{inputs: number, disabledInputs: number, tabs: string[]}>} The sheet's inputs, how many are
 * disabled, and the labels of its tab buttons.
 */
function readControls(sheet) {
   return sheet.evaluate((element) => ({
      inputs: element.querySelectorAll('input').length,
      disabledInputs: [...element.querySelectorAll('input')].filter((input) => input.disabled).length,
      tabs: [...element.querySelectorAll('.tab-list button')].map((button) => button.textContent.trim()),
   }));
}

test.beforeAll(async ({ browser }) => {
   gm = await browser.newPage();
   errors = attachPageErrors(gm);
   await login(gm);
   await clearChat(gm);
   player = await (await browser.newContext()).newPage();
   await login(player, 'E2E Player 1');

   // The character has an ability and an equipment with one check; the tests set the player's level on it.
   actorId = await createActor(gm, {
      name: 'E2E Ownership Actor',
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   await createOwnedItem(gm, actorId, 'ability', 'E2E Ownership Ability');
   equipmentUuid = `${actorUuid}.Item.${await createOwnedItem(gm, actorId, 'equipment', 'E2E Ownership Equipment')}`;
   await addCheck(gm, equipmentUuid, { label: 'E2E Ownership Check' });
   await closeAllApps(gm);
});

test.afterEach(async () => {
   await closeAllApps(gm);
   await closeAllApps(player);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   // The second client delivers its errors before its context closes: a closed page cannot be flushed.
   await flushPageErrors(player);
   await player?.context().close();
   await gm?.close();
});

test('OWNER: the player can view and edit', async () => {
   await giveLevel('OWNER');
   expect(await player.evaluate((id) => ({
      observer: game.actors.get(id).testUserPermission(game.user, 'OBSERVER'),
      owner: game.actors.get(id).testUserPermission(game.user, 'OWNER'),
   }), actorId)).toEqual({
      observer: true,
      owner: true,
   });

   /** @type {import('@playwright/test').Locator} The player's view of the sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   const controls = await readControls(sheet);
   expect(controls.tabs, 'every tab shows').toEqual([
      'Skills',
      'Inventory',
      'Abilities',
      'Spells',
      'Effects',
      'Notes',
   ]);
   expect(controls.disabledInputs, 'no input is disabled').toBe(0);

   // The sheet edits: the player types a Body base value and the character stores it; the original is typed back.
   /** @type {number} The Body base value before the edit. */
   const original = await player.evaluate((id) => game.actors.get(id).system.attribute.body.baseValue, actorId);
   await setAttributeBase(player, actorUuid, 'body', original + 1);
   expect(await gm.evaluate((id) => game.actors.get(id).system.attribute.body.baseValue, actorId), 'the GM client')
      .toBe(original + 1);
   await setAttributeBase(player, actorUuid, 'body', original);
});

test('OBSERVER: the player can view but not edit', async () => {
   await giveLevel('OBSERVER');
   expect(await player.evaluate((id) => ({
      observer: game.actors.get(id).testUserPermission(game.user, 'OBSERVER'),
      owner: game.actors.get(id).testUserPermission(game.user, 'OWNER'),
   }), actorId)).toEqual({
      observer: true,
      owner: false,
   });

   /** @type {import('@playwright/test').Locator} The player's view of the sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   const controls = await readControls(sheet);
   expect(controls.inputs, 'the sheet has inputs').toBeGreaterThan(0);
   expect(controls.disabledInputs, 'every input is disabled').toBe(controls.inputs);
   expect(await player.evaluate((id) => game.actors.get(id).sheet.isEditable, actorId), 'the sheet is read-only')
      .toBe(false);
});

test('LIMITED: the TITAN sheet shows a limited viewer what it shows an observer: the whole sheet, read-only', async () => {
   // Pins the measured behaviour (the user's ruling: leave it as it is): a limited viewer meets the sheet's view
   // permission, so the sheet opens with every tab and the same controls as an observer's, all of them disabled.
   await giveLevel('LIMITED');
   expect(await player.evaluate((id) => ({
      limited: game.actors.get(id).testUserPermission(game.user, 'LIMITED'),
      observer: game.actors.get(id).testUserPermission(game.user, 'OBSERVER'),
      owner: game.actors.get(id).testUserPermission(game.user, 'OWNER'),
   }), actorId)).toEqual({
      limited: true,
      observer: false,
      owner: false,
   });

   /** @type {import('@playwright/test').Locator} The player's view of the sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   const limited = await readControls(sheet);
   expect(limited.tabs, 'every tab shows to a limited viewer').toEqual([
      'Skills',
      'Inventory',
      'Abilities',
      'Spells',
      'Effects',
      'Notes',
   ]);
   expect(limited.inputs, 'the sheet has inputs').toBeGreaterThan(0);
   expect(limited.disabledInputs, 'every input is disabled').toBe(limited.inputs);
   expect(await player.evaluate((id) => game.actors.get(id).sheet.isEditable, actorId), 'the sheet is read-only')
      .toBe(false);

   // The same sheet at the observer level shows the same tabs and the same number of inputs.
   await closeAllApps(player);
   await giveLevel('OBSERVER');

   /** @type {{inputs: number, disabledInputs: number, tabs: string[]}} The observer's view of the same sheet. */
   const observer = await readControls(await openSheetByUuid(player, actorUuid));
   expect(observer, 'an observer sees the same controls').toEqual(limited);
});

test('an observer can switch character and item sheet tabs and expand rows, but not edit', async () => {
   await giveLevel('OBSERVER');
   expect(await player.evaluate((id) => game.actors.get(id).isOwner, actorId), 'the player is not an owner')
      .toBe(false);

   // Character sheet: switch to Abilities and expand the ability row.
   /** @type {import('@playwright/test').Locator} The player's view of the character sheet. */
   const sheet = await openSheetByUuid(player, actorUuid);
   await expect(sheet.locator('.tab-list').getByText('Abilities', { exact: true }), 'the tab button is enabled')
      .toBeEnabled();
   await clickSheetTab(sheet, 'Abilities');

   /** @type {import('@playwright/test').Locator} The ability's row. */
   const row = sheet.locator('[data-item-id]').first();
   await expect(row, 'the Abilities tab opened').toBeVisible();

   /** @type {import('@playwright/test').Locator} The row's expand toggle. */
   const expand = row.locator('.header .label .button button').first();
   await expect(expand, 'the expand toggle is enabled').toBeEnabled();
   await expect(row.locator('.expandable-content')).toHaveCount(0);
   await expand.click();
   await expect(row.locator('.expandable-content'), 'the row expanded').toBeVisible();

   // Editing stays disabled: the ability row's delete button is owner-gated.
   await expect(row.getByRole('button', { name: 'Delete Item' }), 'editing controls stay disabled').toBeDisabled();

   // Item sheet: switch to the Checks tab.
   /** @type {import('@playwright/test').Locator} The player's view of the equipment's sheet. */
   const itemSheet = await openSheetByUuid(player, equipmentUuid);
   await expect(itemSheet.locator('.tab-list').getByText('Checks', { exact: true }), 'the item tab button is enabled')
      .toBeEnabled();
   await clickSheetTab(itemSheet, 'Checks');
});

test('the roll button of an item sheet shows only when the player owns the item\'s actor', async () => {
   /** @type {string} The selector of the sidebar check's roll button. */
   const rollButton = '.sidebar-check .header .roll button';
   /** @type {string} The selector of the sidebar check's static info line. */
   const infoLine = '.sidebar-check .header .info';

   // OWNER: the roll button renders and the static info line is gone.
   await giveLevel('OWNER');

   /** @type {import('@playwright/test').Locator} The owner's view of the equipment's sheet. */
   const ownedSheet = await openSheetByUuid(player, equipmentUuid);
   await expect(ownedSheet.locator(rollButton).first(), 'the owner sees the roll button').toBeVisible();
   await expect(ownedSheet.locator(infoLine).first(), 'the owner sees no info line').toHaveCount(0);

   // OBSERVER, on the same item: the info line shows first, then the button is absent from the same surface.
   await closeAllApps(player);
   await giveLevel('OBSERVER');

   /** @type {import('@playwright/test').Locator} The observer's view of the equipment's sheet. */
   const observedSheet = await openSheetByUuid(player, equipmentUuid);
   await expect(observedSheet.locator(infoLine).first(), 'the observer sees the static info line').toBeVisible();
   await expect(observedSheet.locator(rollButton), 'the observer sees no roll button').toHaveCount(0);
});
