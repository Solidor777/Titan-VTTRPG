import { expect } from '@playwright/test';
import { openSheetByUuid } from './fixtures.js';
import { selectTitanOption } from './select.js';
import { settle } from './settle.js';

/**
 * Page-object helpers for driving the rendered Svelte check-option dialogs from Playwright.
 *
 * Each roll button opens its dialog when the `titan.getCheckOptions` setting is `always` (and no
 * modifier key inverts it — headless Playwright never holds one). Every dialog extends `TitanDialog`
 * (ApplicationV2) so its window root carries `.application.titan-dialog`; the per-type window is
 * identified by its element id prefix `titan-<type>-check-dialog-<actorId>...` (the actor id is
 * suffixed with a generated UUID by the base constructor). The per-type CSS class declared in each
 * subclass's `_getDialogClasses()` does NOT reach the DOM (the v14 `TitanDialog` never invokes that
 * leftover method), so id-prefix targeting is the stable per-type selector. Option inputs are
 * widgets: `NumberInput` renders a text `<input class="titan-number-input">` that live-commits plain
 * numbers on keyup and evaluates math expressions on change/Enter; `Select` renders a bespoke
 * combobox; `CheckboxInput` renders a toggle
 * `<button>` whose checked state is the presence of an `i.fa-check`. Totals render as text inside a
 * `.tag` carrying a `check-summary-*` test id.
 */

/**
 * Per-type dialog metadata: the selector of the per-type window.
 * @type {Record<string, string>}
 */
const DIALOG_SELECTORS = {
   attribute: '.application.titan-dialog[id^="titan-attribute-check-dialog-"]',
   resistance: '.application.titan-dialog[id^="titan-resistance-check-dialog-"]',
   attack: '.application.titan-dialog[id^="titan-attack-check-dialog-"]',
   casting: '.application.titan-dialog[id^="titan-casting-check-dialog-"]',
   item: '.application.titan-dialog[id^="titan-item-check-dialog-"]',
};

/**
 * Opens the dialog of a check type with the roll button a user clicks. An Attribute or Resistance Check opens from the
 * actor's sheet header (a button named for the Attribute or Resistance); an Attack, Casting or Item Check opens from
 * the roll button in the sidebar of the owned item's sheet (the attack or the check at the given position). The
 * `getCheckOptions` setting must be `always` (or `situational` with a situational modifier on the check), or the click
 * rolls straight to chat and no dialog opens.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {('attribute'|'resistance'|'attack'|'casting'|'item')} type - The check type to open.
 * @param {string} uuid - The uuid of the actor (an Attribute or Resistance Check) or of the owned item (an Attack,
 * Casting or Item Check) whose roll button is clicked.
 * @param {object} [options] - Which roll button to click.
 * @param {string} [options.button] - The localized name of the header button of an Attribute or Resistance Check
 * (`Body` and `Resilience` by default).
 * @param {number} [options.index] - The position of the roll button among the item sheet's attacks or checks (0 by
 * default).
 * @returns {Promise<import('@playwright/test').Locator>} A locator for the visible dialog root.
 */
export async function openCheckDialog(page, type, uuid, { button, index = 0 } = {}) {
   /** @type {import('@playwright/test').Locator} The sheet that holds the roll button. */
   const sheet = await openSheetByUuid(page, uuid);
   if (type === 'attribute' || type === 'resistance') {
      await sheet.getByRole('button', {
         name: button ?? (type === 'attribute' ? 'Body' : 'Resilience'),
         exact: true,
      }).first().click();
   }
   else {
      await sheet.locator('.sidebar-check .header .roll button').nth(index).click();
   }

   /** @type {import('@playwright/test').Locator} The dialog window root; assert it mounted before returning. */
   const dialog = page.locator(DIALOG_SELECTORS[type]).first();
   await expect(dialog).toBeVisible();
   return dialog;
}

/**
 * Drags a dialog's window by its header to the left edge of the page, so that the sheet it opened from is not under
 * it: a dialog opens over the middle of the sheet and covers controls the test then clicks.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @returns {Promise<void>} Resolves once the dialog sits left of the sheet's left edge.
 */
export async function moveDialogAside(dialog) {
   /** @type {import('@playwright/test').Page} The page the dialog is on. */
   const page = dialog.page();

   /** @type {{x: number, y: number, width: number, height: number}} The header's box. */
   const header = await dialog.locator('header.window-header').boundingBox();
   await page.mouse.move(header.x + (header.width / 2), header.y + (header.height / 2));
   await page.mouse.down();
   await page.mouse.move(100, header.y + (header.height / 2), { steps: 10 });
   await page.mouse.up();
   await expect.poll(
      async () => (await dialog.boundingBox()).x,
      { message: 'the drag moved the dialog to the left edge' },
   ).toBeLessThan(200);
}

/**
 * Sets a numeric option field and triggers the keyup that commits `NumberInput`'s value.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {number} value - The numeric value to enter.
 * @returns {Promise<void>} Resolves once the value is committed.
 */
export async function setNumberField(dialog, key, value) {
   // The native number input inside the field wrapper.
   const input = dialog.getByTestId(`check-field-${key}`).locator('input');
   await input.fill(String(value));

   // NumberInput commits in its keyup handler; `.fill()` updates the bound string but does not key up.
   await input.dispatchEvent('keyup', { key: 'End' });
}

/**
 * Selects an option in a TITAN custom Select field by its value (which equals the label for these
 * enum fields). Opens the `role="combobox"` trigger, then clicks the portaled option row.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {string|number} value - The option value to select.
 * @returns {Promise<void>} Resolves once the option is selected.
 */
export async function setSelectField(dialog, key, value) {
   // The combobox trigger inside the field wrapper.
   const trigger = dialog.getByTestId(`check-field-${key}`).locator('[role="combobox"]');
   await selectTitanOption(dialog.page(), trigger, value);
}

/**
 * Sets a checkbox option (a toggle `<button>`) to the desired checked state.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {boolean} desired - The desired checked state.
 * @returns {Promise<void>} Resolves once the checkbox matches the desired state.
 */
export async function setCheckbox(dialog, key, desired) {
   // The field wrapper; checked state is the presence of the check icon.
   const field = dialog.getByTestId(`check-field-${key}`);
   const checked = (await field.locator('i.fa-check').count()) > 0;
   if (checked !== desired) {
      await field.locator('button').click();
      await expect(field.locator('i.fa-check'), `the ${key} checkbox is ${desired ? '' : 'un'}checked`)
         .toHaveCount(desired ? 1 : 0);
   }
}

/**
 * Reads a numeric total from a summary tag.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The summary key (testId is `check-summary-<key>`).
 * @returns {Promise<number>} The parsed numeric value.
 */
export async function readSummary(dialog, key) {
   const text = await dialog.getByTestId(`check-summary-${key}`).innerText();
   return Number(text.trim());
}

/**
 * Captures the pre-roll chat-message count, clicks the dialog's Roll button (which rolls the
 * check and closes the dialog), and returns that baseline so the caller can poll for exactly
 * the message this roll produces.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<number>} The chat-message count captured immediately before the roll.
 */
export async function clickRoll(dialog, page) {
   const baseline = await page.evaluate(() => game.messages.size);
   await dialog.getByTestId('check-dialog-roll').click();
   await expect(dialog, 'the roll closed the dialog').toHaveCount(0);
   await settle(page);
   return baseline;
}

/**
 * Polls for the newest check chat message created after the given baseline count and returns its id, subtype,
 * parameters, and results. The wait is bounded by the message actually appearing, and a message created before the
 * roll is never read.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {number} baseline - The chat-message count captured immediately before the roll.
 * @param {string} [type] - The check subtype to wait for (e.g. `attributeCheck`); any check subtype when omitted.
 * @returns {Promise<{ id: string, type: string, parameters: object, results: object }>} The newest check message's
 * data.
 */
export async function readNewestCheckFlags(page, baseline, type = undefined) {
   /** @type {{ id: string, type: string, parameters: object, results: object } | null} The resolved message data. */
   let flags = null;
   await expect.poll(
      async () => {
         flags = await page.evaluate(({ base, subtype }) => {
            /** @type {string[]} The accepted subtypes: the requested one, or all five check subtypes. */
            const checkTypes = subtype ?
               [subtype] :
               [
                  'attributeCheck',
                  'resistanceCheck',
                  'attackCheck',
                  'castingCheck',
                  'itemCheck',
               ];

            // Only consider messages created after the baseline; return the newest accepted one.
            if (game.messages.size <= base) {
               return null;
            }

            /** @type {ChatMessage[]} The messages created after the baseline. */
            const created = game.messages.contents.slice(base);

            /** @type {ChatMessage|null} The newest accepted check message, if any. */
            const message = [...created].reverse().find((msg) => checkTypes.includes(msg?.type)) ?? null;
            return message ?
               {
                  id: message.id,
                  type: message.type,
                  parameters: message.system.parameters,
                  results: message.system.results,
               } :
               null;
         }, {
            base: baseline,
            subtype: type,
         });
         return flags?.type ?? null;
      },
      {
         message: 'a titan check chat message should be created after the roll',
         timeout: 1000,
      },
   ).not.toBeNull();
   return flags;
}
