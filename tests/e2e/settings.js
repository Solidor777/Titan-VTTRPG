/**
 * Sets a world-scope TITAN setting from a GM client (world scope requires a GM writer).
 * The setting is read live by system code, so no reload is needed for it to take effect.
 * @param {import('@playwright/test').Page} pageGm - A logged-in GM client.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @param {*} value - The value to store.
 * @returns {Promise<void>} Resolves once the setting is written.
 */
export async function setWorldSetting(pageGm, key, value) {
   await pageGm.evaluate(
      ({ key, value }) => game.settings.set('titan', key, value),
      { key, value },
   );
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
      { key, value },
   );
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
