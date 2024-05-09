/**
 * Helper function for localizing a string using the Titan system's localization files.
 * @param {string}   string   String to localize.
 * @returns {string}          Localized string.
 */
export default function localize(string) {
   return game.i18n.localize(`LOCAL.${string}.label`);
}
