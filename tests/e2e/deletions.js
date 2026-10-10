import { expect } from './harness.js';
import { chooseContextMenuEntry } from './contextMenu.js';
import { openSidebarTab } from './flows.js';
import { settle } from './settle.js';

// Helpers for the deletion-with-open-surfaces specs: what a page collects while a document goes away, and the user
// flows that delete a document from a directory or a placed token from the canvas.

/**
 * @typedef {object} DeletionWatch
 * @property {string[]} consoleErrors - The console error messages the page logged since the last reset.
 */

/**
 * Starts watching a page for console errors and records every warning or error notification the page raises (a read-only
 * wrapper around `ui.notifications.notify`). Call once per page.
 * @param {import('@playwright/test').Page} page - A logged-in page.
 * @returns {Promise<DeletionWatch>} The live console-error list.
 */
export async function watchDeletions(page) {
   /** @type {DeletionWatch} The watch. */
   const watch = { consoleErrors: [] };
   page.on('console', (message) => {
      // Refused connections to port 31416 are the Wiretap module retrying its sidecar from login onward (read:
      // docs/POST_WORK_FINDINGS.md); no TITAN source opens that port (grep of src and tests).
      if (message.type() === 'error' && !/^Failed to load resource: net::ERR_CONNECTION_REFUSED/.test(message.text())) {
         watch.consoleErrors.push(`${message.text()} @ ${message.location().url}`);
      }
   });
   await page.evaluate(() => {
      globalThis.e2eNotices = [];
      /** @type {Function} The original notify. */
      const original = ui.notifications.notify;
      ui.notifications.notify = function (message, type, options) {
         globalThis.e2eNotices.push({
            type,
            message: String(message),
         });
         return original.call(this, message, type, options);
      };
   });
   return watch;
}

/**
 * Clears what a watch and the page's notice recorder hold.
 * @param {import('@playwright/test').Page} page - The watched page.
 * @param {DeletionWatch} watch - The page's watch.
 * @returns {Promise<void>} Resolves once both are empty.
 */
export async function resetDeletionWatch(page, watch) {
   watch.consoleErrors.length = 0;
   await page.evaluate(() => {
      globalThis.e2eNotices = [];
   });
}

/**
 * Asserts that the page raised no console error and no warning or error notification since the last reset.
 * @param {import('@playwright/test').Page} page - The watched page.
 * @param {DeletionWatch} watch - The page's watch.
 * @param {string[]} errors - The page's uncaught-error collector (from `attachPageErrors`).
 * @param {string} what - What was deleted, for the failure message.
 * @returns {Promise<void>} Resolves once the page is shown clean.
 */
export async function expectNoDeletionErrors(page, watch, errors, what) {
   await settle(page);

   /** @type {{type: string, message: string}[]} The warning and error notifications raised. */
   const notices = await page.evaluate(() => globalThis.e2eNotices.filter((notice) => notice.type !== 'info'
      && notice.type !== 'success'));
   expect(errors, `uncaught page errors after deleting ${what}:\n${errors.join('\n')}`).toEqual([]);
   expect(watch.consoleErrors, `console errors after deleting ${what}`).toEqual([]);
   expect(notices, `warning or error notifications after deleting ${what}`).toEqual([]);
}

/**
 * Deletes a world document with the Delete entry of its directory entry's context menu and the confirmation dialog.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} tab - The sidebar tab (`actors`, `items`).
 * @param {string} id - The document's id.
 * @returns {Promise<void>} Resolves once the world no longer holds the document.
 */
export async function deleteFromDirectory(page, tab, id) {
   /** @type {import('@playwright/test').Locator} The directory's panel. */
   const panel = await openSidebarTab(page, tab);
   await panel.locator(`.directory-item.entry[data-entry-id="${id}"]`).click({ button: 'right' });
   await chooseContextMenuEntry(
      page,
      page.locator('#context-menu li.context-item', { hasText: /^\s*Delete\s*$/ }).first(),
   );
   await page.locator('dialog.application.dialog button[data-action="yes"]').click();
   await expect(panel.locator(`.directory-item.entry[data-entry-id="${id}"]`)).toHaveCount(0);
}

/**
 * Deletes the controlled token with core's Delete key.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The controlled token.
 * @returns {Promise<void>} Resolves once the scene no longer holds the token.
 */
export async function deleteControlledToken(page, tokenId) {
   await page.keyboard.press('Delete');
   await expect.poll(
      () => page.evaluate((tokenId) => !canvas.scene.tokens.has(tokenId), tokenId),
      { message: 'the Delete key deleted the token' },
   ).toBe(true);
}
