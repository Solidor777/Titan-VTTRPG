import { expect } from '@playwright/test';
import { settle } from './settle.js';

// Action helpers shared by the flows and the specs. Each returns only after the observable effect of its own action:
// the control shows the new state, and the document operations, renders and (for an action that changes what the
// window shows) window transitions the action started have finished (`settle.js`). A caller therefore never has to
// wait before its next action.

/**
 * Clicks a tab in a sheet's tab strip and waits until the tab is the active one and the operations, renders and
 * transitions the click started have finished (the tab's content slides in after the click's render). Scoped to the
 * given sheet so another open sheet's tab strip is never clicked.
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
   await settle(sheet.page(), { transitions: true });
}

/**
 * Clicks a tab button of a sheet's tab strip and waits until its tab is the active one and the operations, renders and
 * transitions the click started have finished.
 * @param {import('@playwright/test').Locator} button - The tab's button inside `.tab-list`.
 * @returns {Promise<void>} Resolves once the tab is active.
 */
export async function clickTabButton(button) {
   await button.click();

   // The nearest ancestor div whose class list holds the `button` token (not a class that merely contains the text).
   await expect(
      button.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " button ")][1]'),
      'the tab is active',
   ).toHaveClass(/(^|\s)active(\s|$)/);
   await settle(button.page(), { transitions: true });
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

/**
 * Drags the grip of a row onto another row and waits until the operations and row transitions the drop started have
 * finished. The drop's own effect (a reorder, a copy, a refusal) differs by caller, so the caller waits for it.
 * @param {import('@playwright/test').Locator} source - The row whose grip is dragged.
 * @param {import('@playwright/test').Locator} target - The row the grip is dropped on.
 * @param {'top' | 'bottom'} half - Whether the drop lands in the upper or the lower half of the target row, which
 * decides whether the dragged row is inserted before or after it.
 * @returns {Promise<void>} Resolves once the drop has been dispatched and its operations have finished.
 */
export async function dragGrip(source, target, half) {
   /** @type {{height: number}} The target row's box. */
   const box = await target.boundingBox();
   await source.locator('[data-drag-handle]').first().dragTo(target, {
      targetPosition: {
         x: 20,
         y: half === 'top' ? 3 : box.height - 3,
      },
   });
   await settle(source.page(), { transitions: true });
}
