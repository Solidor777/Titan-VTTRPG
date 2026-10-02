import { recordSetting } from './registry.js';
import { settle } from './settle.js';

// `setWorldSetting` records the value a world setting held before the suite first set it on the running list
// (`registry.js`), so `global-teardown.js` restores it. Setting through the API is the interpretation of the Project
// Scope rule that settings are configuration, not documents. A client-scope setting is not recorded: it lives in the
// browser context that set it and no other context or browser sees it (measured: `getCheckOptions` set in one context
// read its default in another context and in another browser), so it ends with its context.

/**
 * Records a world setting's current value as its prior value, unless the suite already recorded one.
 * @param {import('@playwright/test').Page} page - A GM client that is about to change the setting.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @returns {Promise<void>} Resolves once the prior value is on the list.
 */
async function recordPriorValue(page, key) {
   recordSetting({
      scope: 'world',
      namespace: 'titan',
      key,
      prior: await page.evaluate((key) => game.settings.get('titan', key), key),
   });
}

/**
 * Sets a world-scope TITAN setting from a GM client (world scope requires a GM writer), recording the prior value for
 * the teardown. The setting is read live by system code, so no reload is needed for it to take effect.
 * @param {import('@playwright/test').Page} pageGm - A logged-in GM client.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @param {*} value - The value to store.
 * @returns {Promise<void>} Resolves once the setting is written.
 */
export async function setWorldSetting(pageGm, key, value) {
   await recordPriorValue(pageGm, key);
   await pageGm.evaluate(
      ({ key, value }) => game.settings.set('titan', key, value),
      {
         key,
         value,
      },
   );
   await settle(pageGm);
}

/**
 * Sets a client-scope TITAN setting on a specific client (each client holds its own value).
 * @param {import('@playwright/test').Page} page - The client whose setting to change.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @param {*} value - The value to store.
 * @returns {Promise<void>} Resolves once the setting is written.
 */
export async function setClientSetting(page, key, value) {
   await page.evaluate(
      ({ key, value }) => game.settings.set('titan', key, value),
      {
         key,
         value,
      },
   );
   await settle(page);
}

/**
 * Reads a TITAN setting value from a client.
 * @param {import('@playwright/test').Page} page - The client to read from.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @returns {Promise<*>} The current value of the setting on that client.
 */
export async function getSetting(page, key) {
   return page.evaluate((key) => game.settings.get('titan', key), key);
}
