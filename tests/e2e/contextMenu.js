import { expect } from '@playwright/test';

/**
 * Page-object helpers for driving Foundry's core `ContextMenu` (`#context-menu`, one `li.context-item` per entry).
 *
 * Constraint: core `ContextMenu#close()` awaits a 200 ms collapse animation and only then calls `_close()`, which
 * removes whatever menu element the instance holds AT THAT MOMENT. Every document click while `ui.context` is set
 * queues another such close, so clicks made during the collapse (e.g. in the dialog an entry just opened) leave
 * closes pending that remove the instance's NEXT menu the moment it renders — a later right-click on the same
 * directory then shows no menu. Waiting for the chosen menu to detach before any further click means `ui.context`
 * is already cleared, so no close is ever left pending.
 */

/**
 * Clicks a context-menu entry, then waits for the menu to finish closing.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {import('@playwright/test').Locator} entry - The `#context-menu` entry to click.
 * @returns {Promise<void>} Resolves once the menu element has been removed from the DOM.
 */
export async function chooseContextMenuEntry(page, entry) {
   await entry.click();
   await expect(page.locator('#context-menu')).toHaveCount(0);
}
