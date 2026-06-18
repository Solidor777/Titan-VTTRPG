/**
 * Page-object helpers for driving the TITAN custom Select (a `role="combobox"` button that opens a
 * `role="listbox"` portaled to `document.body`). Only one list is open at a time, so option rows can
 * be matched document-wide by their `data-value`.
 */

/**
 * Opens the given Select trigger and clicks the option carrying the target value.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {import('@playwright/test').Locator} trigger - The Select trigger (role=combobox).
 * @param {string|number} value - The `data-value` of the option to choose.
 * @returns {Promise<void>} Resolves once the option is clicked.
 */
export async function selectTitanOption(page, trigger, value) {
   await trigger.click();
   await page.locator(`[role="option"][data-value="${value}"]`).click();
}

/**
 * Opens the given Select trigger and returns every visible option's `data-value`, then closes the list.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {import('@playwright/test').Locator} trigger - The Select trigger (role=combobox).
 * @returns {Promise<string[]>} The option values in DOM order.
 */
export async function titanSelectOptionValues(page, trigger) {
   await trigger.click();

   // The portaled rows for the single open list.
   const values = await page.locator('[role="option"]').evaluateAll(
      (rows) => rows.map((row) => row.getAttribute('data-value')),
   );
   await page.keyboard.press('Escape');
   return values;
}

/**
 * Reads the committed value from a Select trigger.
 * @param {import('@playwright/test').Locator} trigger - The Select trigger (role=combobox).
 * @returns {Promise<string|null>} The trigger's `data-value`.
 */
export async function readTitanSelectValue(trigger) {
   return trigger.getAttribute('data-value');
}
