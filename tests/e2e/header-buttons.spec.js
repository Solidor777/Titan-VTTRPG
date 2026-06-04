import { test, expect } from '@playwright/test';
import { ensureDocument, login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Render a document's sheet inside the Foundry runtime and return a locator for its frame element.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} locateSrc - Stringified locator function body returning the document.
 * @param {string} sheetClass - A CSS class the rendered sheet frame exposes (without the dot).
 * @returns {Promise<import('@playwright/test').Locator>} Locator for the sheet frame element.
 */
async function renderSheetFrame(page, locateSrc, sheetClass) {
   // Render the sheet inside the world and capture its application id.
   const appId = await page.evaluate(async (src) => {
      const doc = new Function(`return (${src})()`)();
      if (!doc) {
         return null;
      }
      const app = await doc.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
      return app.id;
   }, locateSrc);

   // The fixture and its rendered sheet must exist.
   expect(appId, 'document fixture not found in world').not.toBeNull();
   const sheet = page.locator(`[id="${appId}"]`);
   await expect(sheet).toBeVisible();
   await expect(sheet).toHaveClass(new RegExp(sheetClass));
   return sheet;
}

test.describe('always-visible Svelte header buttons', () => {
   // The actor sheet shows inline Edit Token + Toggle Link buttons without opening the dropdown.
   test('actor sheet shows inline header buttons', async () => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Header Player');
      const sheet = await renderSheetFrame(page, locate, 'titan-player-sheet');

      await expect(sheet.locator('.window-header .edit-token-button')).toBeVisible();
      await expect(sheet.locator('.window-header .toggle-token-linked-button')).toBeVisible();
   });

   // The Toggle Link button's icon reacts to the prototype token link state via the document bridge.
   test('actor toggle-link button reacts to prototype link state', async () => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Header Player');
      const sheet = await renderSheetFrame(page, locate, 'titan-player-sheet');
      const icon = sheet.locator('.window-header .toggle-token-linked-button i');

      // Force the unlinked state, then flip to linked; the icon class must follow.
      await page.evaluate((src) => {
         const doc = new Function(`return (${src})()`)();
         return doc.prototypeToken.update({ actorLink: false });
      }, locate);
      await expect(icon).toHaveClass(/(?:^|\s)unlinked(?:\s|$)/);

      await page.evaluate((src) => {
         const doc = new Function(`return (${src})()`)();
         return doc.prototypeToken.update({ actorLink: true });
      }, locate);
      await expect(icon).toHaveClass(/(?:^|\s)linked(?:\s|$)/);
   });

   // The item sheet's inline Send-to-Chat button posts a chat message.
   test('item send-to-chat header button posts a message', async () => {
      const locate = await ensureDocument(page, 'Item', 'weapon', 'E2E Header Weapon');
      const sheet = await renderSheetFrame(page, locate, 'titan-item-sheet');

      const sendToChat = sheet.locator('.window-header .send-to-chat-button');
      await expect(sendToChat).toBeVisible();

      const baseline = await page.evaluate(() => game.messages.size);
      await sendToChat.click();
      await expect
         .poll(() => page.evaluate(() => game.messages.size))
         .toBeGreaterThan(baseline);
   });

   // The effect-subtype ActiveEffect sheet's inline Send-to-Chat button posts a chat message.
   test('effect send-to-chat header button posts a message', async () => {
      // Create an effect-subtype ActiveEffect on a player actor and render its sheet.
      const appId = await page.evaluate(async () => {
         const actor = game.actors.find((a) => a.type === 'player')
            ?? await Actor.create({ name: 'E2E Header Effect Host', type: 'player' });
         let effect = actor.effects.find((e) => e.type === 'effect' && e.name === 'E2E Header Effect');
         if (!effect) {
            const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [
               { name: 'E2E Header Effect', type: 'effect' },
            ]);
            effect = created;
         }
         const app = await effect.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
         return app.id;
      });

      const sheet = page.locator(`[id="${appId}"]`);
      await expect(sheet).toHaveClass(/titan-effect-sheet/);

      const sendToChat = sheet.locator('.window-header .send-to-chat-button');
      await expect(sendToChat).toBeVisible();

      const baseline = await page.evaluate(() => game.messages.size);
      await sendToChat.click();
      await expect
         .poll(() => page.evaluate(() => game.messages.size))
         .toBeGreaterThan(baseline);
   });
});
