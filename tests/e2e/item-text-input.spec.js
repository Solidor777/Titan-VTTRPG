import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addCheck, createActor, createOwnedItem, readServerSystem } from './flows.js';
import { clickSheetTab, commitText } from './actions.js';
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

/**
 * Counts the updates of an item that reach the page's `preUpdateItem` hook, from the call on, in
 * `globalThis.titanUpdates`.
 * @param {string} uuid - The uuid of the item.
 * @returns {Promise<void>} Resolves once the listener is installed.
 */
async function observeUpdates(uuid) {
   await page.evaluate((uuid) => {
      globalThis.titanUpdates = {
         count: 0,
         id: Hooks.on('preUpdateItem', (item) => {
            if (item.uuid === uuid) {
               globalThis.titanUpdates.count++;
            }
         }),
      };
   }, uuid);
}

/**
 * Reads the number of observed updates.
 * @returns {Promise<number>} The updates counted since `observeUpdates`.
 */
function readUpdateCount() {
   return page.evaluate(() => globalThis.titanUpdates.count);
}

/**
 * Removes the update listener.
 * @returns {Promise<void>} Resolves once the listener is gone.
 */
async function stopObservingUpdates() {
   await page.evaluate(() => {
      if (globalThis.titanUpdates) {
         Hooks.off('preUpdateItem', globalThis.titanUpdates.id);
         delete globalThis.titanUpdates;
      }
   });
}

/**
 * Makes a weapon with one check and opens its sheet.
 * @param {string} tag - A name part that tells the test's documents apart.
 * @returns {Promise<{uuid: string, input: import('@playwright/test').Locator}>} The weapon's uuid and its check's label
 * input.
 */
async function weaponWithCheck(tag) {
   /** @type {string} The new actor's id. */
   const actorId = await createActor(page, {
      name: `E2E ${tag} Actor`,
      type: 'player',
   });

   /** @type {string} The weapon's id. */
   const itemId = await createOwnedItem(page, actorId, 'weapon', `E2E ${tag} Weapon`);

   /** @type {string} The weapon's uuid. */
   const uuid = `Actor.${actorId}.Item.${itemId}`;
   await addCheck(page, uuid);

   /** @type {import('@playwright/test').Locator} The weapon's sheet, open on the Checks tab. */
   const sheet = await openSheetByUuid(page, uuid);
   return {
      uuid,
      input: sheet.locator('.check .header .label input').first(),
   };
}

test.afterEach(async () => {
   await stopObservingUpdates();
});

test('a check label composed with an input method is sent when the composition ends', async () => {
   const { uuid, input } = await weaponWithCheck('Composition');

   /** @type {import('@playwright/test').CDPSession} The browser session that drives the input method editor. */
   const client = await page.context().newCDPSession(page);
   try {
      /** @type {string} The text the composition ends with. */
      const composed = 'E2E Composed Label';
      await input.focus();
      await input.press('Control+A');
      await observeUpdates(uuid);

      // The browser shows the composition text in the input while the composition runs; nothing is sent meanwhile.
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
      expect(await readUpdateCount(), 'no update was sent while the composition ran').toBe(0);
      expect(
         (await readServerSystem(page, uuid)).check[0].label,
         'the server still holds the label from before the composition',
      ).toBe('Check');

      // The composition ends with the text committed, which is sent once.
      await client.send('Input.insertText', { text: composed });
      await settle(page);
      expect(await input.inputValue(), 'the input shows the committed text').toBe(composed);
      expect(await readUpdateCount(), 'the end of the composition sent one update').toBe(1);
      await expect.poll(
         async () => (await readServerSystem(page, uuid)).check[0].label,
         { message: 'the server stores the committed text before the input blurs' },
      ).toBe(composed);
      await input.blur();
      await settle(page);
      expect(await input.inputValue(), 'the input still shows the committed text after the blur').toBe(composed);
      expect((await readServerSystem(page, uuid)).check[0].label, 'the server still stores it').toBe(composed);
   }
   finally {
      await client.detach();
   }
});

test('a cancelled composition leaves the label as it was and sends nothing while it runs', async () => {
   const { uuid, input } = await weaponWithCheck('Cancelled Composition');
   await commitText(input, 'E2E Cancel Original');
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check[0].label,
      { message: 'the server stores the original label' },
   ).toBe('E2E Cancel Original');

   /** @type {import('@playwright/test').CDPSession} The browser session that drives the input method editor. */
   const client = await page.context().newCDPSession(page);
   try {
      await input.focus();
      await input.press('End');
      await observeUpdates(uuid);
      await client.send('Input.imeSetComposition', {
         text: ' extra',
         selectionStart: 6,
         selectionEnd: 6,
      });
      await expect.poll(() => input.inputValue(), { message: 'the input shows the composition text' })
         .toBe('E2E Cancel Original extra');
      expect(await readUpdateCount(), 'no update was sent while the composition ran').toBe(0);

      // An empty composition text cancels the composition.
      await client.send('Input.imeSetComposition', {
         text: '',
         selectionStart: 0,
         selectionEnd: 0,
      });
      await expect.poll(() => input.inputValue(), { message: 'the cancel took the composition text away' })
         .toBe('E2E Cancel Original');
      await input.blur();
      await settle(page);
      expect(await readUpdateCount(), 'the end of the cancelled composition sent one update').toBe(1);
      expect(await input.inputValue(), 'the input shows the original label').toBe('E2E Cancel Original');
      expect((await readServerSystem(page, uuid)).check[0].label, 'the server holds the original label')
         .toBe('E2E Cancel Original');
   }
   finally {
      await client.detach();
   }
});

test('a check label held down on one key is saved and the input keeps what was typed', async () => {
   const { uuid, input } = await weaponWithCheck('Held Key');
   await input.focus();
   await input.press('Control+A');

   // Pressing a key that is already down makes the browser dispatch auto-repeat keydown events.
   for (let repeat = 0; repeat < 12; repeat++) {
      await page.keyboard.down('x');
   }
   await page.keyboard.up('x');
   await settle(page);
   expect(await input.inputValue(), 'the input keeps all repeated characters').toBe('x'.repeat(12));
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check[0].label,
      { message: 'the server stores the repeated characters before the input blurs' },
   ).toBe('x'.repeat(12));
   await input.blur();
   await settle(page);
   expect(await input.inputValue(), 'the input still shows them after the blur').toBe('x'.repeat(12));
});

test('a composition that is running when another client renames the item is not lost', async ({ browser }) => {
   const { uuid, input } = await weaponWithCheck('Remote Composition');

   /** @type {import('@playwright/test').CDPSession} The browser session that drives the input method editor. */
   const client = await page.context().newCDPSession(page);
   try {
      /** @type {string} The text the composition ends with. */
      const composed = 'E2E Remote Composed';
      await input.focus();
      await input.press('Control+A');
      await client.send('Input.imeSetComposition', {
         text: 'E2E Remote',
         selectionStart: 10,
         selectionEnd: 10,
      });
      await expect.poll(() => input.inputValue(), { message: 'the input shows the composition text' })
         .toBe('E2E Remote');
      await withClients(browser, { other: 'E2E GM 2' }, async ({ other }) => {
         /** @type {import('@playwright/test').Locator} The weapon's sheet on the other client. */
         const otherSheet = await openSheetByUuid(other, uuid);
         await commitText(otherSheet.locator('.document-name input'), 'E2E Remote Composition Weapon Renamed');
         await expect.poll(
            () => page.evaluate(async (uuid) => (await fromUuid(uuid)).name, uuid),
            { message: 'the rename reached the first page' },
         ).toBe('E2E Remote Composition Weapon Renamed');
      });
      await settle(page);
      await expect.poll(() => input.inputValue(), { message: 'the rename left the composition text in the input' })
         .toBe('E2E Remote');
      await client.send('Input.imeSetComposition', {
         text: composed,
         selectionStart: composed.length,
         selectionEnd: composed.length,
      });
      await client.send('Input.insertText', { text: composed });
      await settle(page);
      expect(await input.inputValue(), 'the input shows the committed text').toBe(composed);
      await input.blur();
      await settle(page);
      await expect.poll(
         async () => (await readServerSystem(page, uuid)).check[0].label,
         { message: 'the server stores the committed text' },
      ).toBe(composed);
      expect(await input.inputValue(), 'the input shows the committed text after the blur').toBe(composed);
   }
   finally {
      await client.detach();
   }
});

test('an unfocused label input shows the label another client set', async ({ browser }) => {
   const { uuid, input } = await weaponWithCheck('Follow Unfocused');
   await input.blur();
   await withClients(browser, { other: 'E2E GM 2' }, async ({ other }) => {
      /** @type {import('@playwright/test').Locator} The weapon's sheet on the other client. */
      const otherSheet = await openSheetByUuid(other, uuid);
      await clickSheetTab(otherSheet, 'Checks');
      await commitText(otherSheet.locator('.check .header .label input').first(), 'E2E Remote Label');
      await expect.poll(
         async () => (await readServerSystem(page, uuid)).check[0].label,
         { message: 'the server stores the remote label' },
      ).toBe('E2E Remote Label');
   });
   await expect(input, 'the unfocused input shows the remote label').toHaveValue('E2E Remote Label');
});

test('a focused, unedited label input shows a label another client set once it loses focus', async ({ browser }) => {
   const { uuid, input } = await weaponWithCheck('Follow After Blur');
   await input.focus();
   await withClients(browser, { other: 'E2E GM 2' }, async ({ other }) => {
      /** @type {import('@playwright/test').Locator} The weapon's sheet on the other client. */
      const otherSheet = await openSheetByUuid(other, uuid);
      await clickSheetTab(otherSheet, 'Checks');
      await commitText(otherSheet.locator('.check .header .label input').first(), 'E2E Remote Label');
      await expect.poll(
         () => page.evaluate(async (uuid) => (await fromUuid(uuid)).system.check[0].label, uuid),
         { message: 'the remote label reached the first page' },
      ).toBe('E2E Remote Label');
   });
   await input.blur();
   await expect(input, 'the input shows the remote label after the blur').toHaveValue('E2E Remote Label');
   await settle(page);
   expect((await readServerSystem(page, uuid)).check[0].label, 'the blur changed nothing')
      .toBe('E2E Remote Label');
});
