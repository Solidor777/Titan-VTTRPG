import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Chat-message mount keying (TODO #10): one message renders into up to three elements (main chat
 * log, notification pane, chat popout); each element carries its OWN tracked Svelte mount, and every
 * removal path tears its mount down. Leak probe: each mounted card's ReactiveDocument bridge holds
 * exactly one `updateChatMessage` hook registration while mounted, so
 * `Hooks.events.updateChatMessage?.length` deltas count live mounts (public Foundry API).
 */

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
 * Reads the current number of registered `updateChatMessage` hook handlers (the live-mount probe).
 * @returns {Promise<number>} The registration count.
 */
function hookCount() {
   return page.evaluate(() => Hooks.events.updateChatMessage?.length ?? 0);
}

/**
 * Counts the rendered children of a message's `.message-content` region under a root selector.
 * Pre-fix, a surface blanked by the single-slot collision reports 0.
 * @param {string} rootSelector - Selector for the containing log root (e.g. '#chat').
 * @param {string} messageId - The message id to look up.
 * @returns {Promise<number>} The content child count (0 when the card or content region is absent).
 */
function contentChildCount(rootSelector, messageId) {
   return page.evaluate(({ rootSelector, messageId }) => {
      /** @type {HTMLElement | null} The card content region for the message under the root. */
      const content = document.querySelector(
         `${rootSelector} li[data-message-id="${messageId}"] .message-content`,
      );
      return content?.children.length ?? 0;
   }, { rootSelector, messageId });
}

/**
 * Rebuilds the mount-roller fixture actor and rolls a dialog-bypassing attribute check, returning
 * the created message's id.
 * @returns {Promise<string>} The created check message's id.
 */
async function rollCheckMessage() {
   return page.evaluate(async () => {
      const stale = game.actors.getName('E2E Mount Roller');
      if (stale) {
         await stale.delete();
      }
      const actor = await Actor.create({ name: 'E2E Mount Roller', type: 'player' });
      const before = game.messages.size;
      await actor.system.rollAttributeCheck({ attribute: 'body' });
      await globalThis.titanWait(() => game.messages.size > before, { message: 'check message created' });
      return game.messages.contents.at(-1).id;
   });
}

test.describe('chat-message mount keying', () => {
   test('notification pane and main log each hold a live mount through update, dismissal, delete', async () => {
      // Force card notifications and park the sidebar on a non-chat tab so notifications post.
      await page.evaluate(async () => {
         globalThis.__e2ePriorUiConfig = game.settings.get('core', 'uiConfig');
         await game.settings.set('core', 'uiConfig', {
            ...globalThis.__e2ePriorUiConfig,
            chatNotifications: 'cards',
         });
         ui.sidebar.changeTab('actors', 'primary');
      });

      try {
         const baseline = await hookCount();
         const messageId = await rollCheckMessage();

         // Both surfaces hold mounted content (pre-fix the MAIN LOG card is blank: the notification
         // render's teardown unmounted it).
         await expect
            .poll(() => contentChildCount('#chat', messageId), { message: 'main log card has content' })
            .toBeGreaterThan(0);
         await expect
            .poll(() => contentChildCount('#chat-notifications', messageId),
               { message: 'notification card has content' })
            .toBeGreaterThan(0);
         await expect.poll(hookCount, { message: 'two live mounts' }).toBe(baseline + 2);

         // An update re-renders both surfaces without blanking either or leaking mounts.
         await page.evaluate(async (id) => {
            await game.messages.get(id).update({ 'flags.titan.e2eTouch': 1 });
         }, messageId);
         await expect
            .poll(() => contentChildCount('#chat', messageId), { message: 'main log card after update' })
            .toBeGreaterThan(0);
         await expect
            .poll(() => contentChildCount('#chat-notifications', messageId),
               { message: 'notification card after update' })
            .toBeGreaterThan(0);
         await expect.poll(hookCount, { message: 'still two live mounts after update' }).toBe(baseline + 2);

         // Dismissing the notification removes its element with no render; the observer unmounts it.
         await page.evaluate((id) => {
            document.querySelector(
               `#chat-notifications li[data-message-id="${id}"] [data-action="dismissMessage"]`,
            ).click();
         }, messageId);
         await expect.poll(hookCount, { message: 'notification mount torn down' }).toBe(baseline + 1);

         // Deleting the message tears the remaining mount down via deleteChatMessage.
         await page.evaluate(async (id) => {
            await game.messages.get(id).delete();
         }, messageId);
         await expect.poll(hookCount, { message: 'all mounts torn down' }).toBe(baseline);
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      }
      finally {
         await page.evaluate(async () => {
            await game.settings.set('core', 'uiConfig', globalThis.__e2ePriorUiConfig);
            ui.sidebar.changeTab('chat', 'primary');
         });
      }
   });

   test('popout and main log each hold a live mount; closing the popout reaps via sweep', async () => {
      // Chat tab active: notifications never post; the popout is the second surface.
      await page.evaluate(() => {
         ui.sidebar.changeTab('chat', 'primary');
      });
      await page.evaluate(async () => {
         await ui.chat.renderPopout();
         await globalThis.titanWait(() => ui.chat.popout?.rendered === true, { message: 'chat popout rendered' });
      });

      // Baseline AFTER the popout opens (it re-renders any existing messages into its own log).
      const baseline = await hookCount();
      const messageId = await rollCheckMessage();

      // Both surfaces hold mounted content (pre-fix the MAIN LOG card is blank: the popout render's
      // teardown unmounted it).
      await expect
         .poll(() => contentChildCount('#chat', messageId), { message: 'main log card has content' })
         .toBeGreaterThan(0);
      await expect
         .poll(() => contentChildCount('#chat-popout', messageId), { message: 'popout card has content' })
         .toBeGreaterThan(0);
      await expect.poll(hookCount, { message: 'two live mounts' }).toBe(baseline + 2);

      // Closing the popout removes its DOM; the next render's entry sweep reaps the orphaned mount.
      await page.evaluate(async (id) => {
         await ui.chat.popout.close();
         await game.messages.get(id).update({ 'flags.titan.e2eTouch': 2 });
      }, messageId);
      await expect.poll(hookCount, { message: 'popout mount swept' }).toBe(baseline + 1);

      // Delete restores the baseline.
      await page.evaluate(async (id) => {
         await game.messages.get(id).delete();
      }, messageId);
      await expect.poll(hookCount, { message: 'all mounts torn down' }).toBe(baseline);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
