import { expect, test } from './harness.js';
import { loginPlayer } from './checkCards.js';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat } from './world.js';

/**
 * `clearChat` deletes the world's chat messages only after every joined client has finished presenting the messages it
 * received lately. Core posts a message's toast in steps and throws `Cannot set properties of null (setting 'hidden')`
 * when the message is deleted before the steps end; a plain message created and cleared at once raises it on a client
 * that shows toasts (`world.js` `awaitChatToasts`). The test creates a plain message on the GM client, clears the chat
 * at once, and reads on Player 1's client, from the times it recorded, that the toast was shown before the message was
 * deleted; it also asserts that the client raised no error and that the toast is gone afterwards.
 */

/** @type {import('@playwright/test').Page} The GM's page (one world boot per file). */
let page;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, whose client shows the toast. */
let playerPage;
/** @type {string[]} Uncaught errors collected on Player 1's page. */
let playerErrors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   await login(page);
   playerPage = await loginPlayer(browser);
   playerErrors = attachPageErrors(playerPage);
});

test.afterAll(async () => {
   await playerPage?.context().close();
   await page?.close();
});

test.describe('clearing the chat while another client posts a toast', () => {
   test('the toast is shown before the message is deleted, and the client raises no error', async () => {
      expect(
         await playerPage.evaluate(() => ui.chat._shouldShowNotifications()),
         'Player 1\'s client shows toasts for new messages',
      ).toBe(true);

      // Record, on the player's client, when each toast first shows and when each message's deletion arrives.
      await playerPage.evaluate(() => {
         /** @type {Record<string, {shown?: number, deleted?: number}>} The times, in milliseconds, per message id. */
         const times = {};
         globalThis.titanToastTimes = times;
         Hooks.on('deleteChatMessage', (message) => {
            (times[message.id] ??= {}).deleted = globalThis.performance.now();
         });
         new MutationObserver(() => {
            for (const toast of document.querySelectorAll('#chat-notifications li.message[data-message-id]')) {
               if (!toast.hidden) {
                  times[toast.dataset.messageId] ??= {};
                  times[toast.dataset.messageId].shown ??= globalThis.performance.now();
               }
            }
         }).observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
         });
      });

      /** @type {string} The id of the message created and cleared at once. */
      const id = await page.evaluate(async () => (await ChatMessage.create({ content: 'E2E clearChat toast' })).id);
      await clearChat(page);
      await expect.poll(
         () => playerPage.evaluate((messageId) => globalThis.titanToastTimes[messageId], id),
         { message: 'Player 1\'s client recorded the toast and the deletion' },
      ).toMatchObject({
         shown: expect.any(Number),
         deleted: expect.any(Number),
      });

      /** @type {{shown: number, deleted: number}} The recorded times. */
      const recorded = await playerPage.evaluate((messageId) => globalThis.titanToastTimes[messageId], id);
      expect(recorded.shown, 'the toast was shown before the deletion arrived').toBeLessThan(recorded.deleted);
      await expect(
         playerPage.locator(`#chat-notifications li.message[data-message-id="${id}"]`),
         'the toast is gone with its message',
      ).toHaveCount(0);
      expect(playerErrors, `Player 1 raised errors:\n${playerErrors.join('\n')}`).toEqual([]);
   });
});
