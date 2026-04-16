/**
 * Helper function for localizing a string using the Titan system's localization files.
 * @param {string} string - String to localize.
 * @returns {string} Localized string.
 */
export default function localize(string) {
   return typeof string === 'string' && string.length > 0
      ? game.i18n.localize(`LOCAL.${string}.text`)
      : '';
}
