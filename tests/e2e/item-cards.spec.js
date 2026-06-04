import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/**
 * Item chat cards are first-class `ChatMessage` subtypes. `item.sendToChat()` creates a message whose
 * `type` is the item type and whose `system` is a snapshot of the item's prepared system data (plus
 * `name`/`img`); the message self-renders via `TitanChatMessage#renderHTML`, which mounts the subtype's
 * Svelte card (`ChatMessageContent` → `document.data.system.component`) into `.message-content`. This
 * spec asserts, per item type, that the posted message carries the right subtype and that its card
 * renders with non-empty content showing the item's name, all without uncaught page errors.
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

/** @type {string[]} The seven item subtypes that post first-class chat-message cards. */
const ITEM_TYPES = [
   'weapon',
   'armor',
   'spell',
   'ability',
   'shield',
   'equipment',
   'commodity',
];

test.describe('item chat-message subtype cards', () => {
   // One test per item type: create a temp item, send it to chat, then assert subtype + card render.
   for (const type of ITEM_TYPES) {
      test(`${type} item posts a ${type} chat-message subtype card`, async () => {
         // A name unique to this test run so the card's name read is unambiguous within the chat log.
         const itemName = `E2E ${type} card ${Date.now()}`;

         // A description unique to this test run, used to prove the snapshot carries `system.description`
         // (regression for the missing-description bug) and that the card renders it.
         const itemDescription = `E2E desc ${type} ${Date.now()}`;

         // Create the temp item, post it to chat, and report the new message's id and subtype. The temp
         // item is deleted here so item state does not accumulate; the posted chat message persists (the
         // file's beforeAll clearChat is the per-file reset) but is scoped by its unique data-message-id.
         const result = await page.evaluate(async ({ type, itemName, itemDescription }) => {
            // Snapshot the message count so the post can be awaited deterministically.
            const before = game.messages.size;

            // Create the temp item with a non-empty description so the chat snapshot includes it.
            const item = await Item.create({ name: itemName, type, system: { description: itemDescription } });

            // Ensure the description took (fall back to an explicit update if creation did not set it).
            if (item.system.description !== itemDescription) {
               await item.update({ system: { description: itemDescription } });
            }

            // Post the item's chat card.
            const message = await item.sendToChat();

            // Wait for the new chat message to register before reading it back.
            await titanWait(() => game.messages.size > before, { message: 'new chat message' });

            // Delete the temp item now that the snapshot-based card has been posted.
            await item.delete();

            return {
               before,
               after: game.messages.size,
               messageId: message?.id,
               messageType: message?.type,
            };
         }, { type, itemName, itemDescription });

         // A new message must have been created with the expected subtype.
         expect(result.after, 'message count should increase after sendToChat').toBeGreaterThan(result.before);
         expect(result.messageId, 'posted message id').toBeTruthy();
         expect(result.messageType, 'message subtype matches the item type').toBe(type);

         // The message subtype, read back from the world collection, must equal the item type.
         await expect
            .poll(
               () => page.evaluate((id) => game.messages.get(id)?.type, result.messageId),
               { message: `world message ${result.messageId} has type ${type}` },
            )
            .toBe(type);

         // The mounted item card must be present and visible in the rendered chat log. Foundry renders
         // each message in more than one log (the sidebar chat-log plus the chat-scroll/popout), so the
         // card is located by its own root class `.item-chat-message` and the first visible mount is used.
         const card = page.locator(`.message[data-message-id="${result.messageId}"] .item-chat-message`).first();
         await expect(card, 'mounted item-chat-message card is visible').toBeVisible();

         // The card must have rendered non-empty text (the card is not a blank mount).
         await expect
            .poll(
               () => card.textContent().then((text) => (text ?? '').trim().length),
               { message: 'card content has non-empty text' },
            )
            .toBeGreaterThan(0);

         // The snapshot name must show on the card (the header label renders `system.name`).
         await expect(
            card.getByText(itemName, { exact: false }),
            'card displays the item name',
         ).toBeVisible();

         // The snapshot description must render on the card. This is the regression guard for the
         // missing-description bug: `getRollData()` must include `description` so the snapshot carries it
         // and the card's description guard (`item.description && item.description !== ''`) does not hide it.
         await expect(
            card.getByText(itemDescription, { exact: false }),
            'card displays the item description',
         ).toBeVisible();

         // No uncaught errors may have fired during the card lifecycle.
         expect(errors, `uncaught errors during ${type} card lifecycle:\n${errors.join('\n')}`).toEqual([]);
      });
   }
});
