import { expect, test } from './harness.js';
import { readNewestCheckFlags } from './checkDialog.js';
import { login } from './fixtures.js';
import {
   controlPlacedToken,
   createItemMacro,
   openCreateMacroDialog,
   placeToken,
   runHotbarMacro,
   shared,
   viewScene,
} from './flows.js';
import { setClientSetting } from './settings.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Hotbar macros, made the way a user makes them: an owned item's row is dragged onto a slot of the core hotbar and the
 * Create Macro dialog fills in the kind and the way the macro finds the item. Each macro kind is then run with a click
 * on its slot, so each generated command must resolve to a real method. A check macro rolls for the controlled
 * Character through its `request<Type>Check` (the `never` check-options choice rolls straight to chat); the
 * sheet-toggle macro opens and then closes the Item's sheet. The macros and their hotbar slots are on the running
 * list, and the suite-end teardown clears the slots and deletes the macros.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the Character that owns the items. */
let rollerUuid;
/** @type {string} The id of the Character's placed token. */
let tokenId;
/** @type {Record<string, string>} The ids of the Character's weapon, spell and ability, by type. */
const itemIds = {};

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // The core hotbar is hidden until the client shows it, and the check options dialog stays closed so a macro rolls
   // straight to chat.
   await setClientSetting(page, 'showFoundryHotbar', true);
   await setClientSetting(page, 'getCheckOptions', 'never');

   // The shared roller owns copies of the shared weapon, spell and ability (the ability has one check); a check macro
   // rolls for the Characters whose tokens are controlled.
   /** @type {string} The Character's id. */
   const rollerId = await shared(page, 'roller');
   rollerUuid = `Actor.${rollerId}`;
   for (const type of [
      'weapon',
      'spell',
      'ability',
   ]) {
      itemIds[type] = await page.evaluate(
         ({ rollerId, type }) => game.actors.get(rollerId).items.find((item) => item.type === type).id,
         {
            rollerId,
            type,
         },
      );
   }
   await viewScene(page, await shared(page, 'scene'));
   tokenId = await placeToken(page, rollerId);
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Makes a check macro of one of the Character's items, runs it with a click on its hotbar slot while the Character's
 * token is controlled, and returns the subtype of the chat message it posts.
 * @param {object} macro - The macro to make.
 * @param {string} macro.itemType - The type of the owned item the macro rolls (`weapon`, `spell` or `ability`).
 * @param {string} macro.type - The Macro Type to choose in the dialog.
 * @param {string} macro.idMethod - The ID Method to choose in the dialog.
 * @param {string} macro.name - The macro's name.
 * @param {string} expectedType - The message subtype the macro rolls.
 * @returns {Promise<string>} The subtype of the posted message.
 */
async function runCheckMacro({ itemType, type, idMethod, name }, expectedType) {
   /** @type {{macroId: string, slot: number}} The macro and the hotbar slot that holds it. */
   const { slot } = await createItemMacro(page, rollerUuid, itemIds[itemType], {
      name,
      type,
      idMethod,
   });
   await controlPlacedToken(page, tokenId);

   /** @type {number} The chat-message count before the macro runs. */
   const baseline = await page.evaluate(() => game.messages.size);
   await runHotbarMacro(page, slot);
   return (await readNewestCheckFlags(page, baseline, expectedType)).type;
}

test('an Attack Check macro identified by the Item\'s TITAN uuid rolls the Attack Check', async () => {
   expect(await runCheckMacro({
      itemType: 'weapon',
      type: 'attackCheck',
      idMethod: 'uuid',
      name: 'E2E Macro Attack Check',
   }, 'attackCheck')).toBe('attackCheck');
});

test('a Casting Check macro identified by the Item\'s name rolls the Casting Check', async () => {
   expect(await runCheckMacro({
      itemType: 'spell',
      type: 'castingCheck',
      idMethod: 'name',
      name: 'E2E Macro Casting Check',
   }, 'castingCheck')).toBe('castingCheck');
});

test('an Item Check macro identified by the Item\'s document id rolls the Item Check', async () => {
   expect(await runCheckMacro({
      itemType: 'ability',
      type: 'itemCheck',
      idMethod: 'documentId',
      name: 'E2E Macro Item Check',
   }, 'itemCheck')).toBe('itemCheck');
});

test('a sheet-toggle macro opens and then closes the Item\'s sheet', async () => {
   /** @type {{macroId: string, slot: number}} The macro and the hotbar slot that holds it. */
   const { slot } = await createItemMacro(page, rollerUuid, itemIds.weapon, {
      name: 'E2E Macro Sheet Toggle',
      type: 'toggleDocumentSheet',
   });
   await closeAllApps(page);

   /**
    * Reads whether the weapon's sheet is open.
    * @returns {Promise<boolean>} True when the sheet is rendered.
    */
   const sheetOpen = () => page.evaluate(
      ({ rollerUuid, weaponId }) => fromUuid(rollerUuid).then((actor) => actor.items.get(weaponId).sheet.rendered),
      {
         rollerUuid,
         weaponId: itemIds.weapon,
      },
   );
   expect(await sheetOpen(), 'the sheet is closed before the macro runs').toBe(false);

   // The first run opens the sheet; the same macro run again closes it.
   await runHotbarMacro(page, slot);
   await expect.poll(sheetOpen, { message: 'the first run opens the sheet' }).toBe(true);
   await runHotbarMacro(page, slot);
   await expect.poll(sheetOpen, { message: 'the second run closes the sheet' }).toBe(false);
});

test('the Create Macro dialog names the attack of a weapon, and a cancelled dialog makes no macro', async () => {
   /** @type {number} The number of macros before the drop. */
   const before = await page.evaluate(() => game.macros.size);
   /** @type {{dialog: import('@playwright/test').Locator, slot: number}} The open dialog and the slot it fills. */
   const { dialog, slot } = await openCreateMacroDialog(page, rollerUuid, itemIds.weapon);

   // The Attack select lists the attack by its label and position, as plain text and not a localization key.
   /** @type {string} The dialog's text. */
   const text = await dialog.innerText();
   expect(text, 'the dialog lists the attack by label and position').toMatch(/Attack \(1\)/);
   expect(text, 'the dialog shows no untranslated text').not.toContain('LOCAL.');
   await dialog.getByRole('button', { name: 'Cancel' }).click();
   await expect(dialog, 'Cancel closes the dialog').toHaveCount(0);
   expect(await page.evaluate((slot) => game.user.hotbar[slot], slot), 'the slot stays empty').toBeUndefined();
   expect(await page.evaluate(() => game.macros.size), 'no macro was made').toBe(before);
});
