import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addCheck, createActor, createOwnedItem, readServerSystem } from './flows.js';
import { commitText } from './actions.js';
import { withClients } from './multiClient.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Text entered into a document text input without a key event (the Playwright `fill`, a paste with the mouse, an input
 * method) is sent to the server even when another client's update reaches the page before the input loses focus. The
 * other client renames the same item through its own sheet, so the echo is a real replicated update that rebuilds the
 * first page's document while the typed text is still unsent. The same holds for a numeric input (the Resolve Cost of a
 * check). Text typed key by key with no delay between keys is saved and the input keeps what was typed.
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

test('a check label typed without a key event is saved when another client renames the item before the input blurs',
   async ({ browser }) => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Text Input Actor',
         type: 'player',
      });

      /** @type {string} The weapon's id. */
      const itemId = await createOwnedItem(page, actorId, 'weapon', 'E2E Text Input Weapon');

      /** @type {string} The weapon's uuid. */
      const uuid = `Actor.${actorId}.Item.${itemId}`;
      await addCheck(page, uuid);

      /** @type {import('@playwright/test').Locator} The weapon's sheet, open on the Checks tab. */
      const sheet = await openSheetByUuid(page, uuid);

      /** @type {import('@playwright/test').Locator} The new check's label input. */
      const input = sheet.locator('.check .header .label input').first();
      await expect(input, 'the new check shows its default label').toHaveValue('Check');
      await input.fill('E2E Typed Label');

      // The other client renames the item through its sheet; its update replicates to this page while the label is
      // still only in the input.
      await withClients(browser, { other: 'E2E GM 2' }, async ({ other }) => {
         /** @type {import('@playwright/test').Locator} The weapon's sheet on the other client. */
         const otherSheet = await openSheetByUuid(other, uuid);
         await commitText(otherSheet.locator('.document-name input'), 'E2E Text Input Weapon Renamed');
         await expect.poll(
            () => page.evaluate(async (uuid) => (await fromUuid(uuid)).name, uuid),
            { message: 'the rename reached the first page' },
         ).toBe('E2E Text Input Weapon Renamed');
      });
      await settle(page);
      await input.blur();
      await settle(page);
      await expect.poll(
         async () => (await readServerSystem(page, uuid)).check[0].label,
         { message: 'the server stores the typed label' },
      ).toBe('E2E Typed Label');
      await expect(input, 'the input shows the typed label').toHaveValue('E2E Typed Label');
   });

test('a resolve cost typed without a key event is saved when another client renames the item before the input blurs',
   async ({ browser }) => {
      /** @type {string} The new actor's id. */
      const actorId = await createActor(page, {
         name: 'E2E Number Input Actor',
         type: 'player',
      });

      /** @type {string} The weapon's id. */
      const itemId = await createOwnedItem(page, actorId, 'weapon', 'E2E Number Input Weapon');

      /** @type {string} The weapon's uuid. */
      const uuid = `Actor.${actorId}.Item.${itemId}`;
      await addCheck(page, uuid);

      /** @type {import('@playwright/test').Locator} The weapon's sheet, open on the Checks tab. */
      const sheet = await openSheetByUuid(page, uuid);

      /** @type {import('@playwright/test').Locator} The new check's Resolve Cost input. */
      const input = sheet.locator('.check .field')
         .filter({ has: page.getByText('Resolve Cost', { exact: true }) })
         .first()
         .locator('input');
      await expect(input, 'the new check shows its default resolve cost').toHaveValue('0');
      await input.fill('7');
      await withClients(browser, { other: 'E2E GM 2' }, async ({ other }) => {
         /** @type {import('@playwright/test').Locator} The weapon's sheet on the other client. */
         const otherSheet = await openSheetByUuid(other, uuid);
         await commitText(otherSheet.locator('.document-name input'), 'E2E Number Input Weapon Renamed');
         await expect.poll(
            () => page.evaluate(async (uuid) => (await fromUuid(uuid)).name, uuid),
            { message: 'the rename reached the first page' },
         ).toBe('E2E Number Input Weapon Renamed');
      });
      await settle(page);
      await input.blur();
      await settle(page);
      await expect.poll(
         async () => (await readServerSystem(page, uuid)).check[0].resolveCost,
         { message: 'the server stores the typed resolve cost' },
      ).toBe(7);
      await expect(input, 'the input shows the typed resolve cost').toHaveValue('7');
   });

test('a check label typed key by key with no delay is saved and the input keeps what was typed', async () => {
   /** @type {string} The new actor's id. */
   const actorId = await createActor(page, {
      name: 'E2E Typing Actor',
      type: 'player',
   });

   /** @type {string} The weapon's id. */
   const itemId = await createOwnedItem(page, actorId, 'weapon', 'E2E Typing Weapon');

   /** @type {string} The weapon's uuid. */
   const uuid = `Actor.${actorId}.Item.${itemId}`;
   await addCheck(page, uuid);

   /** @type {import('@playwright/test').Locator} The weapon's sheet, open on the Checks tab. */
   const sheet = await openSheetByUuid(page, uuid);

   /** @type {import('@playwright/test').Locator} The new check's label input. */
   const input = sheet.locator('.check .header .label input').first();

   /** @type {string} The text typed key by key. */
   const typed = 'E2E Typed Key By Key';
   await input.focus();
   await input.press('Control+A');
   await input.pressSequentially(typed, { delay: 0 });
   await settle(page);
   expect(await input.inputValue(), 'the input keeps what was typed').toBe(typed);
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check[0].label,
      { message: 'the server stores the typed label before the input blurs' },
   ).toBe(typed);
   await input.blur();
   await settle(page);
   expect(await input.inputValue(), 'the input still shows the typed label after the blur').toBe(typed);
   expect((await readServerSystem(page, uuid)).check[0].label, 'the server still stores it').toBe(typed);
});

test('a check label composed with an input method is saved and the input keeps the composition', async () => {
   /** @type {string} The new actor's id. */
   const actorId = await createActor(page, {
      name: 'E2E Composition Actor',
      type: 'player',
   });

   /** @type {string} The weapon's id. */
   const itemId = await createOwnedItem(page, actorId, 'weapon', 'E2E Composition Weapon');

   /** @type {string} The weapon's uuid. */
   const uuid = `Actor.${actorId}.Item.${itemId}`;
   await addCheck(page, uuid);

   /** @type {import('@playwright/test').Locator} The weapon's sheet, open on the Checks tab. */
   const sheet = await openSheetByUuid(page, uuid);

   /** @type {import('@playwright/test').Locator} The new check's label input. */
   const input = sheet.locator('.check .header .label input').first();

   /** @type {import('@playwright/test').CDPSession} The browser session that drives the input method editor. */
   const client = await page.context().newCDPSession(page);

   /** @type {string} The text the composition ends with. */
   const composed = 'E2E Composed Label';
   await input.focus();
   await input.press('Control+A');

   // The browser shows the composition text in the input while the composition runs.
   await client.send('Input.imeSetComposition', {
      text: 'E2E Comp',
      selectionStart: 8,
      selectionEnd: 8,
   });
   await expect.poll(() => input.inputValue(), { message: 'the input shows the first composition text' })
      .toBe('E2E Comp');
   await client.send('Input.imeSetComposition', {
      text: composed,
      selectionStart: composed.length,
      selectionEnd: composed.length,
   });
   await expect.poll(() => input.inputValue(), { message: 'the input shows the second composition text' })
      .toBe(composed);
   await settle(page);
   await expect.poll(() => input.inputValue(), { message: 'the input keeps the composition after the updates' })
      .toBe(composed);

   // The composition ends with the text committed.
   await client.send('Input.insertText', { text: composed });
   await settle(page);
   expect(await input.inputValue(), 'the input shows the committed text').toBe(composed);
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check[0].label,
      { message: 'the server stores the committed text before the input blurs' },
   ).toBe(composed);
   await input.blur();
   await settle(page);
   expect(await input.inputValue(), 'the input still shows the committed text after the blur').toBe(composed);
   expect((await readServerSystem(page, uuid)).check[0].label, 'the server still stores it').toBe(composed);
   await client.detach();
});
