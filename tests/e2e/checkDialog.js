import { expect } from '@playwright/test';

/**
 * Page-object helpers for driving the rendered Svelte check-option dialogs from Playwright.
 *
 * Each `request<Type>Check` opens its dialog when the `titan.getCheckOptions` setting is on (and no
 * modifier key inverts it — headless Playwright never holds one). Every dialog extends `TitanDialog`
 * (ApplicationV2) so its window root carries `.application.titan-dialog`; the per-type window is
 * identified by its element id prefix `titan-<type>-check-dialog-<actorId>...` (the actor id is
 * suffixed with a generated UUID by the base constructor). The per-type CSS class declared in each
 * subclass's `_getDialogClasses()` does NOT reach the DOM (the v14 `TitanDialog` never invokes that
 * leftover method), so id-prefix targeting is the stable per-type selector. Option inputs are native
 * widgets: `NumberInput` renders `<input type="number">`
 * and commits on keyup; `Select` renders a native `<select>`; `CheckboxInput` renders a toggle
 * `<button>` whose checked state is the presence of an `i.fa-check`. Totals render as text inside a
 * `.tag` carrying a `check-summary-*` test id.
 */

/**
 * Per-type dialog metadata: the per-type window selector and the stringified request invocation that
 * opens the dialog from the E2E Roller actor. `fixtures` is resolved in {@link openCheckDialog}.
 * @type {Record<string, { selector: string, request: string }>}
 */
const DIALOG_META = {
   attribute: {
      selector: '.application.titan-dialog[id^="titan-attribute-check-dialog-"]',
      request: 'await actor.system.requestAttributeCheck({ attribute: "body" });',
   },
   resistance: {
      selector: '.application.titan-dialog[id^="titan-resistance-check-dialog-"]',
      request: 'await actor.system.requestResistanceCheck({ resistance: "resilience" });',
   },
   attack: {
      selector: '.application.titan-dialog[id^="titan-attack-check-dialog-"]',
      request: 'await actor.system.requestAttackCheck({ itemId: fixtures.weaponId, attackIdx: 0 });',
   },
   casting: {
      selector: '.application.titan-dialog[id^="titan-casting-check-dialog-"]',
      request: 'await actor.system.requestCastingCheck({ itemId: fixtures.spellId });',
   },
   item: {
      selector: '.application.titan-dialog[id^="titan-item-check-dialog-"]',
      request: 'await actor.system.requestItemCheck({ itemId: fixtures.abilityId, checkIdx: 0 });',
   },
};

/**
 * Enables the check-options setting and opens the dialog for the given check type from the E2E Roller.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {('attribute'|'resistance'|'attack'|'casting'|'item')} type - The check type to open.
 * @returns {Promise<import('@playwright/test').Locator>} A locator for the visible dialog root.
 */
export async function openCheckDialog(page, type) {
   // The per-type selector + request invocation for the requested check type.
   const meta = DIALOG_META[type];

   // Turn the dialog gate on, resolve the roller's owned-item ids, and fire the gated request.
   await page.evaluate(async (requestSrc) => {
      await game.settings.set('titan', 'getCheckOptions', true);
      const actor = game.actors.getName('E2E Roller');
      const fixtures = {
         weaponId: actor.items.find((i) => i.type === 'weapon')?.id,
         spellId: actor.items.find((i) => i.type === 'spell')?.id,
         abilityId: actor.items.find((i) => i.type === 'ability')?.id,
      };
      await new Function('actor', 'fixtures', `return (async () => { ${requestSrc} })();`)(actor, fixtures);
   }, meta.request);

   // The dialog window root; assert it mounted before returning.
   const dialog = page.locator(meta.selector).first();
   await expect(dialog).toBeVisible();
   return dialog;
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
 * Selects an option in a native `<select>` field by its visible label.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {string|number} label - The visible option label to select.
 * @returns {Promise<void>} Resolves once the option is selected.
 */
export async function setSelectField(dialog, key, label) {
   const select = dialog.getByTestId(`check-field-${key}`).locator('select');
   await select.selectOption({ label: String(label) });
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
   return baseline;
}

/**
 * Polls for the newest titan-flagged chat message created after the given baseline count and
 * returns its flags. Replaces a fixed settle delay + global-newest read so the wait is bounded
 * by the message actually appearing, and never reads a message created before this roll.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {number} baseline - The chat-message count captured immediately before the roll.
 * @returns {Promise<{ type: string, parameters: object, results: object }>} The newest message flags.
 */
export async function readNewestCheckFlags(page, baseline) {
   /** @type {{ type: string, parameters: object, results: object } | null} The resolved flags. */
   let flags = null;
   await expect.poll(
      async () => {
         flags = await page.evaluate((base) => {
            // The five check subtypes created by the check engine.
            const checkTypes = ['attributeCheck', 'resistanceCheck', 'attackCheck', 'castingCheck', 'itemCheck'];

            // Only consider messages created after the baseline; return the newest check one.
            if (game.messages.size <= base) {
               return null;
            }
            const created = game.messages.contents.slice(base);
            const message = [...created].reverse().find((msg) => checkTypes.includes(msg?.type)) ?? null;
            return message
               ? {
                  type: message.type,
                  parameters: message.system.parameters,
                  results: message.system.results,
               }
               : null;
         }, baseline);
         return flags?.type ?? null;
      },
      {
         message: 'a titan check chat message should be created after the roll',
         timeout: 10000,
      },
   ).not.toBeNull();
   return flags;
}
