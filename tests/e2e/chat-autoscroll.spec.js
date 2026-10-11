import { expect, test } from './harness.js';
import { readNewestCheckFlags } from './checkDialog.js';
import { loginPlayer } from './checkCards.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addRulesElement, createActor, createOwnedItem, setOwnership } from './flows.js';
import { setClientSetting } from './settings.js';
import { settle } from './settle.js';
import { attachPageErrors, clearChat, closeAllApps, showChatLog } from './world.js';

/**
 * The chat log's scroll position when a check card with a rules element message is posted. The message is filled in
 * after the card is in the log, so the card grows once the log has scrolled; the log must end at its very bottom when
 * it was at the bottom, and must stay where the user scrolled it when the user had scrolled up. Measured on the
 * sidebar's chat log of the GM, for a roll the GM makes and for a roll another user makes.
 */

/** @type {string} The text of the Roll Message element: long, so its paragraph wraps onto several lines. */
const MESSAGE_TEXT = 'E2E autoscroll rules element message. '.repeat(8).trim();

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {import('@playwright/test').Page} The page of E2E Player 1, who owns the roller. */
let playerPage;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the character whose Body check shows the rules element message. */
let rollerUuid;
/** @type {string} The uuid of the character whose Body checks fill the log. */
let fillerUuid;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await setClientSetting(page, 'getCheckOptions', 'never');
   playerPage = await loginPlayer(browser);
   await setClientSetting(playerPage, 'getCheckOptions', 'never');
   await clearChat(page);

   /** @type {string} The id of the actor whose Body check shows the message. */
   const rollerId = await createActor(page, {
      name: 'E2E Autoscroll Roller',
      type: 'player',
   });
   rollerUuid = `Actor.${rollerId}`;

   /** @type {string} The id of the ability that carries the Roll Message element. */
   const abilityId = await createOwnedItem(page, rollerId, 'ability', 'E2E Autoscroll Ability');

   // A new Roll Message element applies to any Attribute Check of Body.
   await addRulesElement(page, `${rollerUuid}.Item.${abilityId}`, {
      operation: 'rollMessage',
      message: MESSAGE_TEXT,
   });
   await setOwnership(page, rollerId, 'E2E Player 1', 'OWNER');
   fillerUuid = `Actor.${await createActor(page, {
      name: 'E2E Autoscroll Filler',
      type: 'player',
   })}`;
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   await closeAllApps(playerPage);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await playerPage?.context().close();
   await page?.close();
});

/**
 * Clicks the Body button on a character's sheet and waits for the Attribute Check card it posts.
 * @param {import('@playwright/test').Page} rolling - The client that rolls.
 * @param {string} actorUuid - The uuid of the character.
 * @returns {Promise<string>} The id of the posted message.
 */
async function rollBody(rolling, actorUuid) {
   /** @type {import('@playwright/test').Locator} The character's sheet. */
   const sheet = await openSheetByUuid(rolling, actorUuid);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await rolling.evaluate(() => game.messages.size);
   await sheet.getByRole('button', {
      name: 'Body',
      exact: true,
   }).first().click();
   await settle(rolling);

   /** @type {string} The posted message's id. */
   const id = (await readNewestCheckFlags(rolling, baseline, 'attributeCheck')).id;

   // A client whose chat log is hidden shows the card as a toast, and core renders the toast after the roll lands: a
   // message deleted before that render ends makes core throw, so the toast is awaited.
   if (await rolling.evaluate(() => ui.chat._shouldShowNotifications())) {
      await expect(
         rolling.locator(`#chat-notifications li.chat-message[data-message-id="${id}"]`),
         'the toast of the card is shown',
      ).toBeVisible();
   }
   return id;
}

/**
 * Reads how far the GM's sidebar chat log is from its bottom edge.
 * @returns {Promise<{distance: number, scrollTop: number, scrollable: number}>} The distance in pixels between the
 * bottom of the visible part and the bottom of the content, the scroll offset, and the content height beyond the
 * visible height.
 */
function readLog() {
   return page.evaluate(() => {
      /** @type {HTMLElement} The scrolling element of the sidebar chat log. */
      const log = document.querySelector('#chat .chat-scroll');
      return {
         distance: log.scrollHeight - log.clientHeight - log.scrollTop,
         scrollTop: log.scrollTop,
         scrollable: log.scrollHeight - log.clientHeight,
      };
   });
}

/**
 * Fills the GM's chat log with check cards until it scrolls by a few hundred pixels, and leaves it scrolled to the
 * bottom.
 * @returns {Promise<void>} Resolves once the log is scrollable and at its bottom.
 */
async function fillLog() {
   await clearChat(page);
   await showChatLog(page);
   for (let rolls = 0; rolls < 20 && (await readLog()).scrollable < 400; rolls += 1) {
      await rollBody(page, fillerUuid);
   }
   await closeAllApps(page);
   expect((await readLog()).scrollable, 'the log holds more than it shows').toBeGreaterThanOrEqual(400);
   await expect.poll(async () => (await readLog()).distance, { message: 'the filled log is at its bottom' })
      .toBeLessThanOrEqual(1);
}

/**
 * The GM's card of a message in the sidebar chat log.
 * @param {string} messageId - The id of the chat message the card shows.
 * @returns {import('@playwright/test').Locator} The message's list entry in the GM's log.
 */
function gmCard(messageId) {
   return page.locator(`#chat .chat-log li[data-message-id="${messageId}"]`);
}

test.describe('a check card with a rules element message', () => {
   test('a roll the GM makes leaves the log at its bottom, and it stays there', async () => {
      await fillLog();

      /** @type {string} The posted message. */
      const id = await rollBody(page, rollerUuid);
      await expect(gmCard(id), 'the card shows the rules element message').toContainText(MESSAGE_TEXT);
      await expect.poll(async () => (await readLog()).distance, { message: 'the log is at its bottom' })
         .toBeLessThanOrEqual(1);

      // Fonts, images and the enrichment of the message have settled; the log is still at its bottom.
      await settle(page);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect((await readLog()).distance, 'the log is still at its bottom after the card settled')
         .toBeLessThanOrEqual(1);
   });

   test('a roll another user makes leaves a log that was at its bottom at its bottom', async () => {
      await fillLog();

      /** @type {string} The posted message. */
      const id = await rollBody(playerPage, rollerUuid);
      await expect(gmCard(id), 'the GM\'s card shows the rules element message').toContainText(MESSAGE_TEXT);
      await expect.poll(async () => (await readLog()).distance, { message: 'the log is at its bottom' })
         .toBeLessThanOrEqual(1);
      await settle(page);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect((await readLog()).distance, 'the log is still at its bottom after the card settled')
         .toBeLessThanOrEqual(1);
   });

   test('a roll another user makes does not move a log the GM scrolled up', async () => {
      await fillLog();

      // The GM scrolls up by 300 px with the mouse wheel over the log.
      /** @type {{x: number, y: number, width: number, height: number}} The log's box. */
      const box = await page.locator('#chat .chat-scroll').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -300);
      await expect.poll(async () => (await readLog()).distance, { message: 'the wheel scrolled the log up' })
         .toBeGreaterThan(100);

      /** @type {{distance: number, scrollTop: number}} The log where the GM left it. */
      const before = await readLog();

      /** @type {string} The posted message. */
      const id = await rollBody(playerPage, rollerUuid);
      await expect(gmCard(id), 'the GM\'s card shows the rules element message').toContainText(MESSAGE_TEXT);
      await settle(page);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      /** @type {{distance: number, scrollTop: number}} The log after the card settled. */
      const after = await readLog();
      expect(after.scrollTop, 'the log keeps the offset the GM scrolled to').toBeCloseTo(before.scrollTop, 0);
      expect(after.distance, 'the new card is below the visible part').toBeGreaterThan(before.distance);
   });
});
