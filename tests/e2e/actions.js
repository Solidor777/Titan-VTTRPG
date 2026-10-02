import { expect } from '@playwright/test';
import { settle } from './settle.js';

// Action helpers shared by the flows and the specs. Each returns only after the observable effect of its own action:
// the control shows the new state, and the document operations and renders the action started have finished
// (`settle.js`). A caller therefore never has to wait before its next action.

/**
 * Clicks a tab in a sheet's tab strip and waits until the tab is the active one and the operations the click started
 * have finished. Scoped to the given sheet so another open sheet's tab strip is never clicked.
 * @param {import('@playwright/test').Locator} sheet - The sheet's window element.
 * @param {string} label - The tab's visible label.
 * @returns {Promise<void>} Resolves once the tab is active.
 */
export async function clickSheetTab(sheet, label) {
   await sheet.locator('.tab-list').getByText(label, { exact: true }).first().click();
   await expect(
      sheet.locator('.tab-list .button.active').getByText(label, { exact: true }).first(),
      `the ${label} tab is active`,
   ).toBeVisible();
   await settle(sheet.page());
}

/**
 * Types a value into a text or number input, commits it with a blur, and waits until the operations the commit started
 * have finished, so a re-render of the commit cannot discard what the caller does next.
 * @param {import('@playwright/test').Locator} input - The input that receives the text.
 * @param {string|number} value - The value to type.
 * @returns {Promise<void>} Resolves once the commit has been processed.
 */
export async function commitText(input, value) {
   await input.fill(String(value));
   await input.blur();
   await settle(input.page());
}
