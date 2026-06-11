/**
 * Resolves the active theme id from the current settings snapshot. Pure: all inputs are injected.
 * @param {object} options - The resolution inputs.
 * @param {string} options.selectedThemeId - The user's client theme selection ('auto' or a theme id).
 * @param {boolean} options.prefersDark - Whether the resolved Foundry color scheme is dark.
 * @param {string} options.defaultDarkThemeId - The GM's world-default dark theme id.
 * @param {string} options.defaultLightThemeId - The GM's world-default light theme id.
 * @param {function(string): boolean} options.themeExists - Whether a theme id resolves to a known theme.
 * @returns {string} The id of the theme to apply.
 */
export default function resolveActiveThemeId(
   { selectedThemeId, prefersDark, defaultDarkThemeId, defaultLightThemeId, themeExists }) {
   // An explicit, existing selection always wins.
   if (selectedThemeId !== 'auto' && themeExists(selectedThemeId)) {
      return selectedThemeId;
   }

   // Auto (or a dangling selection): the world default matching the preferred scheme.
   const worldDefault = prefersDark ? defaultDarkThemeId : defaultLightThemeId;
   if (themeExists(worldDefault)) {
      return worldDefault;
   }

   // Last resort: the built-in heritage theme for the preferred scheme.
   return prefersDark ? 'heritage-dark' : 'heritage-light';
}
